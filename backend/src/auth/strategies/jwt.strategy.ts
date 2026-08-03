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
      // Usar la clave secreta de las variables de entorno, con un fallback seguro para evitar errores de tipado
      secretOrKey: configService.get<string>('JWT_SECRET') || 'default_fallback_jwt_secret_key_12345',
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
