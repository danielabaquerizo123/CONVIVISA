import { IsString, IsNotEmpty } from 'class-validator';

export class CheckInDto {
  @IsString()
  @IsNotEmpty({ message: 'El ID de empleado es requerido' })
  employeeId: string;

  @IsString()
  @IsNotEmpty({ message: 'El ID de proyecto es requerido' })
  projectId: string;
}
