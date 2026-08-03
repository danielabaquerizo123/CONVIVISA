import { IsString, IsNotEmpty, IsDateString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la tarea es requerido' })
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty({ message: 'La fase de la obra es requerida (ej. Cimentación, Estructura)' })
  phase: string;

  @IsDateString({}, { message: 'La fecha de inicio debe ser una fecha válida' })
  @IsNotEmpty({ message: 'La fecha de inicio es requerida' })
  startDate: string;

  @IsDateString({}, { message: 'La fecha de finalización debe ser una fecha válida' })
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  progress?: number;
}
