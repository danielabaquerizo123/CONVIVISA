import { IsString, IsNotEmpty, IsEmail, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class UpdateSupplierDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del proveedor no puede estar vacío' })
  @IsOptional()
  name?: string;

  @IsString()
  @IsNotEmpty({ message: 'El ID tributario (RUC/NIT/RFC) no puede estar vacío' })
  @IsOptional()
  taxId?: string;

  @IsEmail({}, { message: 'El correo electrónico debe ser una dirección válida' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsNotEmpty({ message: 'El teléfono no puede estar vacío' })
  @IsOptional()
  phone?: string;

  @IsString()
  @IsNotEmpty({ message: 'La dirección no puede estar vacía' })
  @IsOptional()
  address?: string;

  @IsString()
  @IsNotEmpty({ message: 'Los términos de pago no pueden estar vacíos' })
  @IsOptional()
  paymentTerms?: string;

  @IsNumber()
  @Min(1.0)
  @Max(5.0)
  @IsOptional()
  rating?: number;
}
