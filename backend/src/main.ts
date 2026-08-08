import 'dotenv/config'; // Cargar variables de entorno de inmediato
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Prefijo global para todas las rutas del API
  app.setGlobalPrefix('api');

  // Configuración global de validación de payloads (DTOs)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Habilitar CORS
  // Por defecto se permite cualquier origen (comportamiento previo).
  // En producción se puede restringir con CORS_ORIGIN (lista separada por comas).
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : undefined;

  app.enableCors({
    origin: allowedOrigins ?? '*',
  });

  // Escuchar en el puerto de Railway (process.env.PORT) o el 3000 local
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Servidor corriendo en: http://localhost:${port}/api`);
}
bootstrap();
