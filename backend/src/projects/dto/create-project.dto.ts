import { IsString, IsNotEmpty, IsDateString, IsOptional, IsNumber, IsUUID } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del proyecto es requerido' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'La ubicación es requerida' })
  location: string;

  @IsDateString({}, { message: 'La fecha de inicio debe ser una fecha válida' })
  @IsNotEmpty({ message: 'La fecha de inicio es requerida' })
  startDate: string;

  @IsDateString({}, { message: 'La fecha de finalización debe ser una fecha válida' })
  @IsOptional()
  endDate?: string;

  @IsNumber({}, { message: 'El presupuesto estimado debe ser un número' })
  @IsNotEmpty({ message: 'El presupuesto estimado es requerido' })
  estimatedBudget: number;

  @IsUUID('4', { message: 'El ID del ingeniero residente debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID del ingeniero residente es requerido' })
  residentEngineerId: string;
}
