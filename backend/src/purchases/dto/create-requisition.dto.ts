import { IsUUID, IsNotEmpty, IsArray, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

class RequisitionItemDto {
  @IsUUID('4', { message: 'El ID de material debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID de material es requerido' })
  materialId: string;

  @IsNumber()
  @Min(0.01, { message: 'La cantidad debe ser mayor a cero' })
  @IsNotEmpty({ message: 'La cantidad es requerida' })
  quantity: number;
}

export class CreateRequisitionDto {
  @IsUUID('4', { message: 'El ID de proyecto debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID de proyecto es requerido' })
  projectId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequisitionItemDto)
  @IsNotEmpty({ message: 'Los artículos de la requisición son requeridos' })
  items: RequisitionItemDto[];
}
