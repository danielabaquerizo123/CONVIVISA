import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserStatus } from '@prisma/client';

export class UpdateUserStatusDto {
  @IsEnum(UserStatus, { message: 'El estado del usuario no es válido' })
  @IsNotEmpty({ message: 'El estado es requerido' })
  status: UserStatus;
}
