import { IsString, IsNotEmpty, IsEmail, IsEnum, IsOptional } from 'class-validator';
import { EmployeeStatus } from '@prisma/client';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'El apellido es requerido' })
  lastName: string;

  @IsString()
  @IsNotEmpty({ message: 'El documento de identidad es requerido' })
  documentId: string;

  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsNotEmpty({ message: 'El correo electrónico es requerido' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'El teléfono es requerido' })
  phone: string;

  @IsEnum(EmployeeStatus, { message: 'El estado del empleado no es válido' })
  @IsOptional()
  status?: EmployeeStatus;

  @IsString()
  @IsOptional()
  userId?: string;
}
