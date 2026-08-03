import { IsUUID, IsNotEmpty, IsArray, ValidateNested, IsNumber, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class PurchaseOrderItemDto {
  @IsUUID('4', { message: 'El ID de material debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID de material es requerido' })
  materialId: string;

  @IsNumber()
  @Min(0.01, { message: 'La cantidad debe ser mayor a cero' })
  @IsNotEmpty({ message: 'La cantidad es requerida' })
  quantity: number;

  @IsNumber()
  @Min(0, { message: 'El precio unitario no puede ser negativo' })
  @IsNotEmpty({ message: 'El precio de compra unitario es requerido' })
  unitPrice: number;
}

export class CreatePurchaseOrderDto {
  @IsUUID('4', { message: 'El ID de proveedor debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID de proveedor es requerido' })
  supplierId: string;

  @IsUUID('4', { message: 'El ID de la requisición debe ser un UUID válido' })
  @IsOptional()
  requisitionId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  @IsNotEmpty({ message: 'Los artículos de la orden de compra son requeridos' })
  items: PurchaseOrderItemDto[];
}
