import { IsArray, IsString, IsNotEmpty } from 'class-validator';

export class AssignPermissionsDto {
  @IsArray({ message: 'Los permisos deben ser una lista (array)' })
  @IsString({ each: true, message: 'Cada ID de permiso debe ser una cadena de texto' })
  @IsNotEmpty({ each: true, message: 'El ID de permiso no puede estar vacío' })
  permissionIds: string[];
}
