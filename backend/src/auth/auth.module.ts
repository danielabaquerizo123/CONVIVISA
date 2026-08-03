import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PermissionsGuard } from './guards/permissions.guard';

@Module({
  imports: [
    // Registrar Passport con la estrategia JWT por defecto
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // Registrar el módulo JWT de forma asíncrona leyendo desde ConfigService
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          // Cast as any para evitar incompatibilidad de tipos en TypeScript con StringValue
          expiresIn: configService.get<any>('JWT_EXPIRATION', '24h'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, PermissionsGuard],
  // Exportar JwtModule para que JwtService sea accesible en otros módulos del monorepo
  exports: [AuthService, PassportModule, JwtStrategy, PermissionsGuard, JwtModule],
})
export class AuthModule {}
