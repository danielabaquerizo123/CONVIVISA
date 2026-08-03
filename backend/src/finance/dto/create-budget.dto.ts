import { IsUUID, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CreateBudgetDto {
  @IsUUID('4', { message: 'El ID de proyecto debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID de proyecto es requerido' })
  projectId: string;

  @IsNumber()
  @Min(0, { message: 'El presupuesto planificado de materiales no puede ser negativo' })
  @IsNotEmpty({ message: 'El presupuesto planificado de materiales es requerido' })
  materialsPlanned: number;

  @IsNumber()
  @Min(0, { message: 'El presupuesto planificado de mano de obra no puede ser negativo' })
  @IsNotEmpty({ message: 'El presupuesto planificado de mano de obra es requerido' })
  laborPlanned: number;

  @IsNumber()
  @Min(0, { message: 'El presupuesto planificado de subcontratos no puede ser negativo' })
  @IsNotEmpty({ message: 'El presupuesto planificado de subcontratos es requerido' })
  subcontractsPlanned: number;

  @IsNumber()
  @Min(0, { message: 'El presupuesto planificado de equipos no puede ser negativo' })
  @IsNotEmpty({ message: 'El presupuesto planificado de equipos es requerido' })
  equipmentPlanned: number;
}
