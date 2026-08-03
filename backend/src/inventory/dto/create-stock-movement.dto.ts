import { IsUUID, IsNotEmpty, IsNumber, IsEnum, Min, IsOptional } from 'class-validator';
import { MovementType } from '@prisma/client';

export class CreateStockMovementDto {
  @IsUUID('4', { message: 'El ID de proyecto debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID de proyecto es requerido' })
  projectId: string;

  @IsUUID('4', { message: 'El ID de material debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID de material es requerido' })
  materialId: string;

  @IsNumber()
  @Min(0.01, { message: 'La cantidad debe ser mayor a cero' })
  @IsNotEmpty({ message: 'La cantidad es requerida' })
  quantity: number;

  @IsEnum(MovementType, { message: 'El tipo de movimiento no es válido (RECEIPT, CONSUMPTION, TRANSFER)' })
  @IsNotEmpty({ message: 'El tipo de movimiento es requerido' })
  type: MovementType;

  @IsUUID('4', { message: 'El ID del proyecto destino debe ser un UUID válido' })
  @IsOptional()
  toProjectId?: string;

  @IsUUID('4', { message: 'El ID de la tarea asociada debe ser un UUID válido' })
  @IsOptional()
  taskId?: string;

  @IsUUID('4', { message: 'El ID de la orden de compra asociada debe ser un UUID válido' })
  @IsOptional()
  purchaseOrderId?: string;
}
