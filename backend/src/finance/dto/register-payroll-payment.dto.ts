import { IsUUID, IsNotEmpty, IsNumber, Min, IsString, IsOptional, IsDateString } from 'class-validator';

export class RegisterPayrollPaymentDto {
  @IsUUID('4', { message: 'El ID de proyecto debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID de proyecto es requerido' })
  projectId: string;

  @IsNumber()
  @Min(0.01, { message: 'El monto de nómina debe ser mayor a cero' })
  @IsNotEmpty({ message: 'El monto de la nómina es requerido' })
  amount: number;

  @IsString()
  @IsNotEmpty({ message: 'La descripción es requerida' })
  description: string;

  @IsDateString({}, { message: 'La fecha debe ser una fecha ISO válida' })
  @IsNotEmpty({ message: 'La fecha de pago es requerida' })
  date: string;

  @IsUUID('4', { message: 'El ID de empleado debe ser un UUID válido' })
  @IsOptional()
  employeeId?: string;
}
