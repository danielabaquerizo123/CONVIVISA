import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { join } from 'path';
import { existsSync } from 'fs';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';

// Importación de Módulos del Sistema
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EmployeesModule } from './employees/employees.module';
import { ProjectsModule } from './projects/projects.module';
import { InventoryModule } from './inventory/inventory.module';
import { PurchasesModule } from './purchases/purchases.module';
import { FinanceModule } from './finance/finance.module';
import { ReportsModule } from './reports/reports.module';

// Importación de componentes de auditoría
import { AuditLogInterceptor } from './auth/interceptors/audit-log.interceptor';

// Resolutor dinámico y robusto para la ruta del frontend compilado
const getFrontendDistPath = (): string => {
  // En producción (ejecutando desde backend/dist/src/main.js): 3 niveles arriba
  const prodPath = join(__dirname, '..', '..', '..', 'frontend', 'dist');
  // En desarrollo local (ejecutando desde backend/src/main.ts): 2 niveles arriba
  const devPath = join(__dirname, '..', '..', 'frontend', 'dist');

  if (existsSync(prodPath)) {
    return prodPath;
  }
  return devPath;
};

@Module({
  imports: [
    // Configuración global de variables de entorno
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Acceso global a la base de datos con Prisma
    PrismaModule,
    // Servidor de estáticos de React + Vite con exclusión de API
    ServeStaticModule.forRoot({
      rootPath: getFrontendDistPath(),
      exclude: ['/api/(.*)'],
    }),
    // Módulos de Negocio y Seguridad
    AuthModule,
    UsersModule,
    EmployeesModule,
    ProjectsModule,
    InventoryModule,
    PurchasesModule,
    FinanceModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Inyección global del interceptor de bitácora de auditoría
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule {}
