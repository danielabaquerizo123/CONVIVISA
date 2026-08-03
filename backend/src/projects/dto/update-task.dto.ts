import { IsString, IsNotEmpty, IsDateString, IsOptional, IsNumber, Min, Max, IsEnum } from 'class-validator';
import { TaskStatus } from '@prisma/client';

export class UpdateTaskDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la tarea no puede estar vacío' })
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty({ message: 'La fase de la obra no puede estar vacía' })
  @IsOptional()
  phase?: string;

  @IsDateString({}, { message: 'La fecha de inicio debe ser una fecha válida' })
  @IsOptional()
  startDate?: string;

  @IsDateString({}, { message: 'La fecha de finalización debe ser una fecha válida' })
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  progress?: number;

  @IsEnum(TaskStatus, { message: 'El estado de la tarea no es válido' })
  @IsOptional()
  status?: TaskStatus;
}
