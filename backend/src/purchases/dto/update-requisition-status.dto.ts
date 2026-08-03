import { IsEnum, IsNotEmpty } from 'class-validator';
import { RequisitionStatus } from '@prisma/client';

export class UpdateRequisitionStatusDto {
  @IsEnum(RequisitionStatus, { message: 'El estado de la requisición no es válido (APPROVED, REJECTED)' })
  @IsNotEmpty({ message: 'El estado es requerido' })
  status: RequisitionStatus;
}
