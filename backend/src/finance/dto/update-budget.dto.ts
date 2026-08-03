import { IsNumber, Min, IsOptional } from 'class-validator';

export class UpdateBudgetDto {
  @IsNumber()
  @Min(0, { message: 'El presupuesto planificado de materiales no puede ser negativo' })
  @IsOptional()
  materialsPlanned?: number;

  @IsNumber()
  @Min(0, { message: 'El presupuesto planificado de mano de obra no puede ser negativo' })
  @IsOptional()
  laborPlanned?: number;

  @IsNumber()
  @Min(0, { message: 'El presupuesto planificado de subcontratos no puede ser negativo' })
  @IsOptional()
  subcontractsPlanned?: number;

  @IsNumber()
  @Min(0, { message: 'El presupuesto planificado de equipos no puede ser negativo' })
  @IsOptional()
  equipmentPlanned?: number;
}
