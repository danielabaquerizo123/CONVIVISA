import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSION_KEY, RequiredPermission } from '../decorators/require-permission.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Obtener metadatos del permiso requerido (del controlador o del método)
    const requiredPermission = this.reflector.getAllAndOverride<RequiredPermission>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si la ruta no tiene el decorador de permiso, permitir el acceso
    if (!requiredPermission) {
      return true;
    }

    // 2. Obtener el usuario del request (inyectado por JwtAuthGuard / Passport)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.roleId) {
      throw new ForbiddenException('No autorizado: Información de usuario o rol faltante');
    }

    // 3. Consulta a la Base de Datos: verificar si el rol del usuario tiene el permiso
    // Se valida que coincida el módulo y que la acción sea la requerida o el comodín 'ALL'
    const permission = await this.prisma.permission.findFirst({
      where: {
        module: requiredPermission.module,
        action: {
          in: [requiredPermission.action, 'ALL'],
        },
        roles: {
          some: {
            id: user.roleId,
          },
        },
      },
    });

    if (!permission) {
      throw new ForbiddenException(
        `No tienes privilegios suficientes (${requiredPermission.action} en módulo ${requiredPermission.module})`,
      );
    }

    return true;
  }
}
