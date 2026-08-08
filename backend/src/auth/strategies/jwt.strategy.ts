import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      // Extraer el JWT desde las cabeceras de autorización como Bearer Token
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Ignorar expiración en falso para validar que no esté vencido
      ignoreExpiration: false,
      // JWT_SECRET es obligatorio para que el backend no acepte tokens con una clave predecible.
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // Este método recibe el payload decodificado y retorna el objeto que NestJS inyectará en req.user
  async validate(payload: any) {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      roleId: payload.roleId, // Añadido para optimizar consultas de permisos en base de datos
    };
  }
}
