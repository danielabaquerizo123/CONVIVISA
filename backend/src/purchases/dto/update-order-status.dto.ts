import { IsEnum, IsNotEmpty } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus, { message: 'El estado de la orden no es válido (SENT, CANCELLED, COMPLETED)' })
  @IsNotEmpty({ message: 'El estado es requerido' })
  status: OrderStatus;
}
