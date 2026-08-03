import { IsDateString, IsNotEmpty } from 'class-validator';

export class RecordPaymentDto {
  @IsDateString({}, { message: 'La fecha de pago debe ser una fecha ISO válida' })
  @IsNotEmpty({ message: 'La fecha de pago es requerida' })
  paidAt: string;
}
