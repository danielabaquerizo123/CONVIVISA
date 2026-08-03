import { IsString, IsNotEmpty, IsDateString, IsOptional, IsNumber, IsUUID, IsEnum } from 'class-validator';
import { ProjectStatus } from '@prisma/client';

export class UpdateProjectDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del proyecto no puede estar vacío' })
  @IsOptional()
  name?: string;

  @IsString()
  @IsNotEmpty({ message: 'La ubicación no puede estar vacía' })
  @IsOptional()
  location?: string;

  @IsDateString({}, { message: 'La fecha de inicio debe ser una fecha válida' })
  @IsOptional()
  startDate?: string;

  @IsDateString({}, { message: 'La fecha de finalización debe ser una fecha válida' })
  @IsOptional()
  endDate?: string;

  @IsNumber({}, { message: 'El presupuesto estimado debe ser un número' })
  @IsOptional()
  estimatedBudget?: number;

  @IsUUID('4', { message: 'El ID del ingeniero residente debe ser un UUID válido' })
  @IsOptional()
  residentEngineerId?: string;

  @IsEnum(ProjectStatus, { message: 'El estado del proyecto no es válido' })
  @IsOptional()
  status?: ProjectStatus;
}
