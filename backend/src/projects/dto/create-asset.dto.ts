import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { AssetType } from '@prisma/client';

export class CreateAssetDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre del activo es requerido' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'El código (barras o serie) es requerido' })
  code: string;

  @IsEnum(AssetType, { message: 'El tipo de activo no es válido (MACHINERY, TOOL, VEHICLE)' })
  @IsNotEmpty({ message: 'El tipo de activo es requerido' })
  type: AssetType;
}
