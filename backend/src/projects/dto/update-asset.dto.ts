import { IsString, IsNotEmpty, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { AssetType, AssetStatus } from '@prisma/client';

export class UpdateAssetDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del activo no puede estar vacío' })
  @IsOptional()
  name?: string;

  @IsString()
  @IsNotEmpty({ message: 'El código no puede estar vacío' })
  @IsOptional()
  code?: string;

  @IsEnum(AssetType, { message: 'El tipo de activo no es válido (MACHINERY, TOOL, VEHICLE)' })
  @IsOptional()
  type?: AssetType;

  @IsEnum(AssetStatus, { message: 'El estado del activo no es válido' })
  @IsOptional()
  status?: AssetStatus;

  @IsDateString({}, { message: 'La fecha de último mantenimiento debe ser una fecha válida' })
  @IsOptional()
  lastMaintenance?: string;
}
