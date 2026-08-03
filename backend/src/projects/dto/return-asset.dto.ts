import { IsUUID, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class ReturnAssetDto {
  @IsUUID('4', { message: 'El ID de activo debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID de activo es requerido' })
  assetId: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
