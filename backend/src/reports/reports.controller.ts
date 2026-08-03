import { Controller, Get, Put, Body, Param, Res, UseGuards } from '@nestjs/common';
import * as express from 'express';
import { ReportsService } from './reports.service';
import { UpdateThresholdDto } from './dto/update-threshold.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { AuditLogAction } from '../auth/decorators/audit-action.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard) // Resguardar todo el controlador con sesión y permisos
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard/general')
  @RequirePermission('READ', 'REPORTES')
  getGeneralDashboard() {
    return this.reportsService.getGeneralDashboard();
  }

  @Get('dashboard/project/:projectId')
  @RequirePermission('READ', 'REPORTES')
  getProjectDashboard(@Param('projectId') projectId: string) {
    return this.reportsService.getProjectDashboard(projectId);
  }

  @Get('alerts')
  @RequirePermission('READ', 'REPORTES')
  getAlerts() {
    return this.reportsService.getAlerts();
  }

  @Put('threshold')
  @RequirePermission('UPDATE', 'REPORTES') // Exige permiso de edición para ajustar políticas de riesgo
  @AuditLogAction('UPDATE_ALERT_THRESHOLD') // Auditar cambio de umbral
  async updateThreshold(@Body() dto: UpdateThresholdDto) {
    return this.reportsService.updateRiskBudgetThreshold(dto.threshold);
  }

  @Get('export/excel')
  @RequirePermission('READ', 'REPORTES')
  async exportExcel(@Res() res: express.Response) {
    const csv = await this.reportsService.exportExcel();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte_gerencial.csv');
    return res.status(200).send(csv);
  }

  @Get('export/pdf')
  @RequirePermission('READ', 'REPORTES')
  async exportPdf(@Res() res: express.Response) {
    const html = await this.reportsService.exportPdf();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte_gerencial.html');
    return res.status(200).send(html);
  }
}
