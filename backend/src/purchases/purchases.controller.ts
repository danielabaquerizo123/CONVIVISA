import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { CreateRequisitionDto } from './dto/create-requisition.dto';
import { UpdateRequisitionStatusDto } from './dto/update-requisition-status.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CreateReceptionDto } from './dto/create-reception.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { AuditLogAction } from '../auth/decorators/audit-action.decorator';

@Controller('purchases')
@UseGuards(JwtAuthGuard, PermissionsGuard) // Resguardar con sesión y permisos
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  // =============================================================
  // PROVEEDORES (CRUD)
  // =============================================================

  @Post('suppliers')
  @RequirePermission('CREATE', 'COMPRAS')
  @AuditLogAction('CREATE_SUPPLIER')
  createSupplier(@Body() createSupplierDto: CreateSupplierDto) {
    return this.purchasesService.createSupplier(createSupplierDto);
  }

  @Get('suppliers')
  @RequirePermission('READ', 'COMPRAS')
  findAllSuppliers() {
    return this.purchasesService.findAllSuppliers();
  }

  @Get('suppliers/:id')
  @RequirePermission('READ', 'COMPRAS')
  findOneSupplier(@Param('id') id: string) {
    return this.purchasesService.findOneSupplier(id);
  }

  @Put('suppliers/:id')
  @RequirePermission('UPDATE', 'COMPRAS')
  @AuditLogAction('UPDATE_SUPPLIER')
  updateSupplier(@Param('id') id: string, @Body() updateSupplierDto: UpdateSupplierDto) {
    return this.purchasesService.updateSupplier(id, updateSupplierDto);
  }

  @Delete('suppliers/:id')
  @RequirePermission('DELETE', 'COMPRAS')
  @AuditLogAction('DELETE_SUPPLIER')
  removeSupplier(@Param('id') id: string) {
    return this.purchasesService.removeSupplier(id);
  }

  // =============================================================
  // REQUISICIONES DESDE OBRA
  // =============================================================

  @Post('requisitions')
  @RequirePermission('CREATE', 'COMPRAS')
  @AuditLogAction('CREATE_REQUISITION')
  createRequisition(@Body() createRequisitionDto: CreateRequisitionDto, @Req() req: any) {
    const userId = req.user.id;
    return this.purchasesService.createRequisition(createRequisitionDto, userId);
  }

  @Get('requisitions')
  @RequirePermission('READ', 'COMPRAS')
  findAllRequisitions() {
    return this.purchasesService.findAllRequisitions();
  }

  @Get('requisitions/:id')
  @RequirePermission('READ', 'COMPRAS')
  findOneRequisition(@Param('id') id: string) {
    return this.purchasesService.findOneRequisition(id);
  }

  @Put('requisitions/:id/status')
  @RequirePermission('APPROVE', 'COMPRAS')
  @AuditLogAction('APPROVE_REJECT_REQUISITION')
  updateRequisitionStatus(
    @Param('id') id: string,
    @Body() dto: UpdateRequisitionStatusDto,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.purchasesService.updateRequisitionStatus(id, dto, userId);
  }

  // =============================================================
  // ÓRDENES DE COMPRA
  // =============================================================

  @Post('orders')
  @RequirePermission('CREATE', 'COMPRAS')
  @AuditLogAction('CREATE_PURCHASE_ORDER')
  createPurchaseOrder(@Body() createPurchaseOrderDto: CreatePurchaseOrderDto) {
    return this.purchasesService.createPurchaseOrder(createPurchaseOrderDto);
  }

  @Get('orders')
  @RequirePermission('READ', 'COMPRAS')
  findAllPurchaseOrders() {
    return this.purchasesService.findAllPurchaseOrders();
  }

  @Get('orders/:id')
  @RequirePermission('READ', 'COMPRAS')
  findOnePurchaseOrder(@Param('id') id: string) {
    return this.purchasesService.findOnePurchaseOrder(id);
  }

  @Put('orders/:id/status')
  @RequirePermission('APPROVE', 'COMPRAS')
  @AuditLogAction('UPDATE_ORDER_STATUS')
  updateOrderStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.purchasesService.updateOrderStatus(id, dto);
  }

  // =============================================================
  // RECEPCIONES DE ALMACÉN
  // =============================================================

  @Post('receptions')
  @RequirePermission('CREATE', 'COMPRAS')
  @AuditLogAction('REGISTER_RECEPTION')
  registerReception(@Body() createReceptionDto: CreateReceptionDto, @Req() req: any) {
    const userId = req.user.id;
    return this.purchasesService.registerReception(createReceptionDto, userId);
  }

  @Get('receptions')
  @RequirePermission('READ', 'COMPRAS')
  findAllReceptions() {
    return this.purchasesService.findAllReceptions();
  }
}
