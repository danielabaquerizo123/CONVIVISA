import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';
import { AUDIT_ACTION_KEY } from '../decorators/audit-action.decorator';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // 1. Obtener la acción del decorador @AuditLogAction
    const auditAction = this.reflector.get<string>(AUDIT_ACTION_KEY, context.getHandler());

    // Si el endpoint no está decorado para auditoría, continuar normal
    if (!auditAction) {
      return next.handle();
    }

    // 2. Interceptar cuando la petición termine exitosamente (usando tap)
    return next.handle().pipe(
      tap(async (responseBody) => {
        try {
          const request = context.switchToHttp().getRequest();
          const user = request.user;

          // Obtener el ID del usuario:
          // - De req.user si la ruta es protegida (por JwtAuthGuard)
          // - Del body de la respuesta si es la ruta de Login (donde req.user aún no está poblado)
          let userId = user?.id || responseBody?.user?.id;

          // 3. Resolución especial para flujos públicos (sin sesión activa)
          
          // Caso A: Solicitud de recuperación de contraseña (buscar por email en body)
          if (!userId && auditAction === 'PASSWORD_RECOVERY_REQUEST' && request.body?.email) {
            const userObj = await this.prisma.user.findUnique({
              where: { email: request.body.email },
            });
            userId = userObj?.id;
          }

          // Caso B: Restablecimiento de contraseña (desencriptar token en body para obtener email)
          if (!userId && auditAction === 'PASSWORD_RESET' && request.body?.token) {
            try {
              const decoded: any = this.jwtService.verify(request.body.token);
              if (decoded?.email) {
                const userObj = await this.prisma.user.findUnique({
                  where: { email: decoded.email },
                });
                userId = userObj?.id;
              }
            } catch (e) {
              // Ignorar errores del token en el log de auditoría
            }
          }

          if (!userId) {
            return; // No logueamos si no hay un usuario identificado
          }

          // 4. Sanitizar los detalles del request body (remover contraseñas)
          const requestBodyCopy = request.body ? { ...request.body } : {};
          
          // Eliminar cualquier campo de contraseña sensible
          const sensitiveFields = ['password', 'pass', 'contraseña', 'contrasena', 'newpassword'];
          for (const key of Object.keys(requestBodyCopy)) {
            if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
              delete requestBodyCopy[key];
            }
          }

          // 5. Obtener dirección IP
          const ip = request.headers['x-forwarded-for'] || request.socket.remoteAddress || null;
          const ipAddress = Array.isArray(ip) ? ip.join(', ') : (ip || null);

          // 6. Guardar en la base de datos AuditLog
          await this.prisma.auditLog.create({
            data: {
              userId,
              action: auditAction,
              details: JSON.stringify(requestBodyCopy),
              ipAddress,
            },
          });
        } catch (error) {
          // Logueamos el fallo en consola pero no bloqueamos la respuesta al cliente
          console.error('❌ Error en AuditLogInterceptor:', error.message);
        }
      }),
    );
  }
}
