import { IsString, IsNotEmpty, IsNumber, Min, IsOptional } from 'class-validator';

export class UpdateMaterialDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del material no puede estar vacío' })
  @IsOptional()
  name?: string;

  @IsString()
  @IsNotEmpty({ message: 'La unidad de medida no puede estar vacía' })
  @IsOptional()
  unit?: string;

  @IsString()
  @IsNotEmpty({ message: 'El código SKU no puede estar vacío' })
  @IsOptional()
  sku?: string;

  @IsNumber()
  @Min(0, { message: 'El precio unitario no puede ser negativo' })
  @IsOptional()
  unitPrice?: number;
}
