import { IsString, IsNotEmpty } from 'class-validator';

export class AssignProjectDto {
  @IsString()
  @IsNotEmpty({ message: 'El ID del proyecto es requerido' })
  projectId: string;
}
