import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { AuditLogAction } from '../auth/decorators/audit-action.decorator';

@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard) // Resguardar todo el controlador con sesión y permisos
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // =============================================================
  // MOVIMIENTOS DE STOCK E INFORMES (Definidos primero)
  // =============================================================

  @Get('stock')
  @RequirePermission('READ', 'COMPRAS')
  findAllStock(
    @Query('projectId') projectId?: string,
    @Query('materialId') materialId?: string,
  ) {
    return this.inventoryService.findAllStock(projectId, materialId);
  }

  @Get('stock/low-alerts')
  @RequirePermission('READ', 'COMPRAS')
  getLowStockAlerts(@Query('projectId') projectId?: string) {
    return this.inventoryService.getLowStockAlerts(projectId);
  }

  @Post('movements')
  @RequirePermission('CREATE', 'COMPRAS')
  @AuditLogAction('REGISTER_STOCK_MOVEMENT') // Auditar movimientos de inventario
  registerMovement(@Body() createStockMovementDto: CreateStockMovementDto, @Req() req: any) {
    const userId = req.user.id;
    return this.inventoryService.registerMovement(createStockMovementDto, userId);
  }

  // =============================================================
  // CATÁLOGO DE MATERIALES (CRUD)
  // =============================================================

  @Post('materials')
  @RequirePermission('CREATE', 'COMPRAS')
  @AuditLogAction('CREATE_MATERIAL') // Auditar creación de material en catálogo
  createMaterial(@Body() createMaterialDto: CreateMaterialDto) {
    return this.inventoryService.createMaterial(createMaterialDto);
  }

  @Get('materials')
  @RequirePermission('READ', 'COMPRAS')
  findAllMaterials() {
    return this.inventoryService.findAllMaterials();
  }

  @Get('materials/:id')
  @RequirePermission('READ', 'COMPRAS')
  findOneMaterial(@Param('id') id: string) {
    return this.inventoryService.findOneMaterial(id);
  }

  @Put('materials/:id')
  @RequirePermission('UPDATE', 'COMPRAS')
  @AuditLogAction('UPDATE_MATERIAL') // Auditar actualización de material en catálogo
  updateMaterial(@Param('id') id: string, @Body() updateMaterialDto: UpdateMaterialDto) {
    return this.inventoryService.updateMaterial(id, updateMaterialDto);
  }
}
