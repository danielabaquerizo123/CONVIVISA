import { IsUUID, IsNotEmpty, IsNumber, Min, IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateReceivableDto {
  @IsUUID('4', { message: 'El ID de proyecto debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID de proyecto es requerido' })
  projectId: string;

  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @IsNumber()
  @Min(0.01, { message: 'El monto debe ser mayor a cero' })
  @IsNotEmpty({ message: 'El monto es requerido' })
  amount: number;

  @IsString()
  @IsNotEmpty({ message: 'La descripción es requerida' })
  description: string;

  @IsDateString({}, { message: 'La fecha de vencimiento debe ser una fecha ISO válida' })
  @IsNotEmpty({ message: 'La fecha de vencimiento es requerida' })
  dueDate: string;
}
