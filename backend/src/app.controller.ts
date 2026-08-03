import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './auth/guards/permissions.guard';
import { RequirePermission } from './auth/decorators/require-permission.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Endpoint de prueba que valida únicamente la sesión JWT
  @Get('test-auth')
  @UseGuards(JwtAuthGuard)
  testAuth(@Req() req: any) {
    return {
      message: 'Autenticación exitosa (Sesión válida)',
      user: req.user,
    };
  }

  // Endpoint de prueba que valida sesión JWT y requiere permisos específicos en base de datos
  @Get('test-permission')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('READ', 'PROYECTOS')
  testPermission(@Req() req: any) {
    return {
      message: 'Autorización exitosa (Permiso de lectura en PROYECTOS concedido)',
      user: req.user,
    };
  }
}
