import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, pass: string) {
    // Buscar al usuario por correo e incluir su rol y los permisos vinculados
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas (usuario no encontrado)');
    }

    // Comparar contraseña hashed
    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciales inválidas (contraseña incorrecta)');
    }

    // Definir el payload con sub (id de usuario), el rol y el id del rol
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
      roleId: user.roleId, // Inyectamos el ID del rol para optimizar consultas de permisos
    };

    // Firmar y retornar el token JWT real junto a los datos del perfil y sus permisos
    return {
      message: 'Inicio de sesión exitoso',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.name,
        permissions: user.role.permissions.map(p => ({
          action: p.action,
          module: p.module,
        })),
      },
      token: this.jwtService.sign(payload),
    };
  }

  // -------------------------------------------------------------
  // RECUPERACIÓN DE CONTRASEÑA
  // -------------------------------------------------------------

  async recoverPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // Por seguridad (para evitar la enumeración de cuentas), siempre retornamos éxito.
    if (!user) {
      return {
        message: 'Si el correo está registrado, se enviaron instrucciones de recuperación.',
      };
    }

    // Generar un token temporal firmado de corta duración (15 minutos)
    // Para hacerlo de un solo uso sin exponer el hash de contraseña, inyectamos su tokenVersion
    const payload = {
      email: user.email,
      action: 'RESET_PASSWORD',
      tokenVersion: user.tokenVersion, // El token solo es válido mientras coincida con tokenVersion en BD
    };
    const recoveryToken = this.jwtService.sign(payload, { expiresIn: '15m' });

    // Simulación de envío: imprimir URL en consola
    console.log(`\n🔑 [RECUPERACIÓN] Enlace generado para ${email}:`);
    console.log(`   http://localhost:3000/api/auth/reset-password?token=${recoveryToken}\n`);

    return {
      message: 'Si el correo está registrado, se enviaron instrucciones de recuperación.',
      // Se expone el token en respuesta solo en desarrollo para fines de testing automático
      token: process.env.NODE_ENV !== 'production' ? recoveryToken : undefined,
    };
  }

  async resetPassword(token: string, newPassword: string) {
    let decoded: any;
    try {
      // Verificar y decodificar el token temporal
      decoded = this.jwtService.verify(token);
    } catch (e) {
      throw new UnauthorizedException('El token de recuperación es inválido o ha expirado.');
    }

    // Validar el propósito del token
    if (decoded.action !== 'RESET_PASSWORD' || !decoded.email || decoded.tokenVersion === undefined) {
      throw new BadRequestException('Token no válido para el restablecimiento de contraseña.');
    }

    // Buscar al usuario
    const user = await this.prisma.user.findUnique({
      where: { email: decoded.email },
    });
    if (!user) {
      throw new NotFoundException('El usuario asociado a este token ya no existe.');
    }

    // CONTROL DE UN SOLO USO:
    // Si la versión del token en BD no coincide con la del token, significa que ya fue modificado.
    if (user.tokenVersion !== decoded.tokenVersion) {
      throw new UnauthorizedException('El enlace de recuperación ya ha sido utilizado.');
    }

    // Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Persistir nueva contraseña e incrementar tokenVersion
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        tokenVersion: { increment: 1 }, // Invalida de inmediato todos los tokens de reset emitidos anteriormente
      },
    });

    return {
      message: 'Contraseña restablecida exitosamente.',
    };
  }
}
