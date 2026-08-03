import { SetMetadata } from '@nestjs/common';

export interface RequiredPermission {
  action: string;
  module: string;
}

export const PERMISSION_KEY = 'permission';

// Decorador personalizado para asignar metadatos de acceso granular
export const RequirePermission = (action: string, module: string) =>
  SetMetadata(PERMISSION_KEY, { action, module } as RequiredPermission);
