import { IsString, IsNotEmpty, IsEmail, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del proveedor es requerido' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'El ID tributario (RUC/NIT/RFC) es requerido' })
  taxId: string;

  @IsEmail({}, { message: 'El correo electrónico debe ser una dirección válida' })
  @IsNotEmpty({ message: 'El correo electrónico es requerido' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'El teléfono es requerido' })
  phone: string;

  @IsString()
  @IsNotEmpty({ message: 'La dirección es requerida' })
  address: string;

  @IsString()
  @IsNotEmpty({ message: 'Los términos de pago son requeridos (ej. 30 días, contado)' })
  paymentTerms: string;

  @IsNumber()
  @Min(1.0)
  @Max(5.0)
  @IsOptional()
  rating?: number;
}
