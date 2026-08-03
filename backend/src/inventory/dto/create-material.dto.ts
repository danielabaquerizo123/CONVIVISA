import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CreateMaterialDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del material es requerido' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'La unidad de medida es requerida (ej. m3, kg, bolsas)' })
  unit: string;

  @IsString()
  @IsNotEmpty({ message: 'El código SKU es requerido' })
  sku: string;

  @IsNumber()
  @Min(0, { message: 'El precio unitario no puede ser negativo' })
  @IsNotEmpty({ message: 'El precio unitario es requerido' })
  unitPrice: number;
}
