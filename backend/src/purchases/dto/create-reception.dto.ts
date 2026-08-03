import { IsUUID, IsNotEmpty, IsArray, ValidateNested, IsNumber, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ReceptionStatus } from '@prisma/client';

class ReceptionItemDto {
  @IsUUID('4', { message: 'El ID de material debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID de material es requerido' })
  materialId: string;

  @IsNumber()
  @Min(0.01, { message: 'La cantidad recibida debe ser mayor a cero' })
  @IsNotEmpty({ message: 'La cantidad recibida es requerida' })
  quantityReceived: number;

  @IsEnum(ReceptionStatus, { message: 'El estado del artículo no es válido (CONFORM, DEFECTIVE, DISCREPANCY)' })
  @IsNotEmpty({ message: 'El estado de recepción del artículo es requerido' })
  status: ReceptionStatus;
}

export class CreateReceptionDto {
  @IsUUID('4', { message: 'El ID de la orden de compra debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID de la orden de compra es requerido' })
  purchaseOrderId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceptionItemDto)
  @IsNotEmpty({ message: 'Los artículos de recepción son requeridos' })
  items: ReceptionItemDto[];
}
