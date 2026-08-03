import { IsUUID, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class AssignAssetDto {
  @IsUUID('4', { message: 'El ID de activo debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID de activo es requerido' })
  assetId: string;

  @IsUUID('4', { message: 'El ID de proyecto debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID de proyecto es requerido' })
  projectId: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
