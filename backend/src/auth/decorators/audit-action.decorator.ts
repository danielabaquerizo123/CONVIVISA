import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'audit_action';

// Decorador para identificar acciones que deben guardarse en la bitácora (AuditLog)
export const AuditLogAction = (action: string) => SetMetadata(AUDIT_ACTION_KEY, action);
