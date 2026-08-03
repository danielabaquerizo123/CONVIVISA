import { IsString, IsEmail, IsEnum, IsOptional } from 'class-validator';
import { EmployeeStatus } from '@prisma/client';

export class UpdateEmployeeDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  documentId?: string;

  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEnum(EmployeeStatus, { message: 'El estado del empleado no es válido' })
  @IsOptional()
  status?: EmployeeStatus;

  @IsString()
  @IsOptional()
  userId?: string;
}
