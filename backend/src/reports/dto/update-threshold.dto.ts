import { IsNumber, Min, Max } from 'class-validator';

export class UpdateThresholdDto {
  @IsNumber()
  @Min(0.01, { message: 'El umbral debe ser mayor a cero' })
  @Max(1.0, { message: 'El umbral no puede ser mayor a 1.0 (100%)' })
  threshold: number;
}
