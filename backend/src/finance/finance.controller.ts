import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { RegisterPayrollPaymentDto } from './dto/register-payroll-payment.dto';
import { CreateReceivableDto } from './dto/create-receivable.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { AuditLogAction } from '../auth/decorators/audit-action.decorator';

@Controller('finance')
@UseGuards(JwtAuthGuard, PermissionsGuard) // Resguardar todo el controlador con sesión y permisos
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  // =============================================================
  // GESTIÓN DE PRESUPUESTOS (ProjectBudget)
  // =============================================================

  @Post('budgets')
  @RequirePermission('CREATE', 'FINANCIERO')
  @AuditLogAction('CREATE_BUDGET')
  createBudget(@Body() createBudgetDto: CreateBudgetDto) {
    return this.financeService.createBudget(createBudgetDto);
  }

  @Get('budgets/project/:projectId')
  @RequirePermission('READ', 'FINANCIERO')
  getBudgetByProject(@Param('projectId') projectId: string) {
    return this.financeService.getBudgetByProject(projectId);
  }

  @Put('budgets/project/:projectId')
  @RequirePermission('UPDATE', 'FINANCIERO')
  @AuditLogAction('UPDATE_BUDGET')
  updateBudget(@Param('projectId') projectId: string, @Body() updateBudgetDto: UpdateBudgetDto) {
    return this.financeService.updateBudget(projectId, updateBudgetDto);
  }

  // =============================================================
  // TRANSACCIONES DE COSTO Y COMPARATIVA
  // =============================================================

  @Post('costs/payroll-payment')
  @RequirePermission('APPROVE', 'FINANCIERO') // Exigir permiso APPROVE para registro de egresos (salida real de dinero)
  @AuditLogAction('REGISTER_PAYROLL_PAYMENT')
  registerPayrollPayment(@Body() dto: RegisterPayrollPaymentDto) {
    return this.financeService.registerPayrollPayment(dto);
  }

  @Get('costs/project/:projectId/comparison')
  @RequirePermission('READ', 'FINANCIERO')
  getBudgetComparison(@Param('projectId') projectId: string) {
    return this.financeService.getBudgetComparison(projectId);
  }

  // =============================================================
  // CUENTAS POR PAGAR (PAGOS A PROVEEDORES)
  // =============================================================

  @Get('payables')
  @RequirePermission('READ', 'FINANCIERO')
  findAllPayables() {
    return this.financeService.findAllPayables();
  }

  @Get('payables/:id')
  @RequirePermission('READ', 'FINANCIERO')
  findOnePayable(@Param('id') id: string) {
    return this.financeService.findOnePayable(id);
  }

  @Post('payables/:id/pay')
  @RequirePermission('APPROVE', 'FINANCIERO') // Requiere aprobación explícita de egresos
  @AuditLogAction('RECORD_PAYABLE_PAYMENT')
  recordPayablePayment(@Param('id') id: string, @Body() dto: RecordPaymentDto) {
    return this.financeService.recordPayablePayment(id, dto);
  }

  // =============================================================
  // CUENTAS POR COBRAR (PLANILLAS DE COBRO DE CLIENTES)
  // =============================================================

  @Post('receivables')
  @RequirePermission('CREATE', 'FINANCIERO')
  @AuditLogAction('CREATE_RECEIVABLE')
  createReceivable(@Body() dto: CreateReceivableDto) {
    return this.financeService.createReceivable(dto);
  }

  @Get('receivables')
  @RequirePermission('READ', 'FINANCIERO')
  findAllReceivables() {
    return this.financeService.findAllReceivables();
  }

  @Get('receivables/:id')
  @RequirePermission('READ', 'FINANCIERO')
  findOneReceivable(@Param('id') id: string) {
    return this.financeService.findOneReceivable(id);
  }

  @Post('receivables/:id/collect')
  @RequirePermission('APPROVE', 'FINANCIERO') // Requiere aprobación explícita de ingresos
  @AuditLogAction('RECORD_RECEIVABLE_COLLECTION')
  recordReceivableCollection(@Param('id') id: string, @Body() dto: RecordPaymentDto) {
    return this.financeService.recordReceivableCollection(id, dto);
  }
}
