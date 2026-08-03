import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // =============================================================
  // CONFIGURACIÓN DE UMBRAL DE RIESGO
  // =============================================================

  async getRiskBudgetThreshold(): Promise<number> {
    const dbConfig = await this.prisma.systemConfig.findUnique({
      where: { key: 'RISK_BUDGET_THRESHOLD' },
    });
    if (dbConfig) {
      const val = parseFloat(dbConfig.value);
      if (!isNaN(val)) {
        return val;
      }
    }
    const envVal = process.env.RISK_BUDGET_THRESHOLD;
    if (envVal) {
      const val = parseFloat(envVal);
      if (!isNaN(val)) {
        return val;
      }
    }
    return 0.90; // 90% por defecto
  }

  async updateRiskBudgetThreshold(threshold: number): Promise<{ threshold: number }> {
    await this.prisma.systemConfig.upsert({
      where: { key: 'RISK_BUDGET_THRESHOLD' },
      update: { value: threshold.toString() },
      create: { key: 'RISK_BUDGET_THRESHOLD', value: threshold.toString() },
    });
    return { threshold };
  }

  // =============================================================
  // HELPER: CÁLCULO DE MÉTRICAS Y RIESGOS DE UN PROYECTO
  // =============================================================

  private async calculateProjectStats(project: any, threshold: number) {
    // 1. Avance Físico (Promedio Ponderado por duración de tareas)
    let totalWeight = 0;
    let weightedProgressSum = 0;

    for (const task of project.tasks) {
      const start = new Date(task.startDate);
      const end = task.endDate ? new Date(task.endDate) : start;
      // Duración en días (mínimo 1 día)
      const durationDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      weightedProgressSum += task.progress * durationDays;
      totalWeight += durationDays;
    }

    const physicalProgress = totalWeight > 0 ? Number((weightedProgressSum / totalWeight).toFixed(2)) : 0;

    // 2. Avance Administrativo (Tareas cerradas)
    const totalTasksCount = project.tasks.length;
    const completedTasksCount = project.tasks.filter((t: any) => t.status === 'COMPLETED').length;
    const administrativeProgress = totalTasksCount > 0 
      ? Number(((completedTasksCount / totalTasksCount) * 100).toFixed(2)) 
      : 0;

    // 3. Finanzas
    const totalBudget = project.budget ? Number(project.budget.totalPlanned) : Number(project.estimatedBudget);
    
    // Gasto Real Ejecutado (Suma de CostTransaction)
    const executedCost = project.costs.reduce((sum: number, cost: any) => sum + Number(cost.amount), 0);

    // Compromisos pendientes (AccountPayable no pagadas)
    const unpaidPayables = await this.prisma.accountPayable.findMany({
      where: {
        status: { not: PaymentStatus.PAID },
        purchaseOrder: {
          requisition: {
            projectId: project.id,
          },
        },
      },
    });
    const committedCost = unpaidPayables.reduce((sum: number, ap: any) => sum + Number(ap.amount), 0);

    // Presupuesto Disponible Real
    const availableBudget = totalBudget - executedCost - committedCost;

    // 4. Evaluación de Riesgos (OR lógico)
    const financialRisk = (executedCost + committedCost) > (threshold * totalBudget);

    const now = new Date();
    const overdueTasks = project.tasks.filter((t: any) => {
      if (t.status === 'COMPLETED') return false;
      if (!t.endDate) return false;
      return new Date(t.endDate) < now;
    });
    const scheduleRisk = overdueTasks.length > 0;

    const inRisk = financialRisk || scheduleRisk;
    const reasons: string[] = [];
    if (financialRisk) {
      reasons.push(`Riesgo financiero: El costo consolidado (ejecutado $${executedCost} + comprometido $${committedCost}) supera el ${(threshold * 100)}% del presupuesto ($${totalBudget}).`);
    }
    if (scheduleRisk) {
      reasons.push(`Riesgo de cronograma: Hay ${overdueTasks.length} tareas pendientes vencidas respecto a la fecha actual.`);
    }

    return {
      projectId: project.id,
      projectName: project.name,
      location: project.location,
      status: project.status,
      metrics: {
        physicalProgress,
        administrativeProgress,
        tasksCount: {
          total: totalTasksCount,
          completed: completedTasksCount,
          pending: totalTasksCount - completedTasksCount,
        },
      },
      finances: {
        totalBudget,
        executedCost,
        committedCost,
        availableBudget,
      },
      risk: {
        inRisk,
        reasons,
        financialRisk,
        scheduleRisk,
        overdueTasksCount: overdueTasks.length,
      },
    };
  }

  // =============================================================
  // ENDPOINTS CORE DE COBERTURA
  // =============================================================

  async getProjectDashboard(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        tasks: true,
        budget: true,
        costs: true,
      },
    });

    if (!project) {
      throw new NotFoundException(`El proyecto con ID ${projectId} no existe.`);
    }

    const threshold = await this.getRiskBudgetThreshold();
    return this.calculateProjectStats(project, threshold);
  }

  async getGeneralDashboard() {
    const projects = await this.prisma.project.findMany({
      include: {
        tasks: true,
        budget: true,
        costs: true,
      },
    });

    const threshold = await this.getRiskBudgetThreshold();
    const projectSummaries = [];
    let companyBudget = 0;
    let companyExecuted = 0;
    let companyCommitted = 0;
    let inRiskCount = 0;
    
    let totalPhysicalProgressSum = 0;
    let totalAdministrativeProgressSum = 0;

    for (const project of projects) {
      const stats = await this.calculateProjectStats(project, threshold);
      projectSummaries.push(stats);

      companyBudget += stats.finances.totalBudget;
      companyExecuted += stats.finances.executedCost;
      companyCommitted += stats.finances.committedCost;
      
      totalPhysicalProgressSum += stats.metrics.physicalProgress;
      totalAdministrativeProgressSum += stats.metrics.administrativeProgress;

      if (stats.risk.inRisk) {
        inRiskCount++;
      }
    }

    const projectsCount = projects.length;
    const companyAvailable = companyBudget - companyExecuted - companyCommitted;
    const riskRatio = projectsCount > 0 ? Number(((inRiskCount / projectsCount) * 100).toFixed(2)) : 0;
    
    const overallPhysicalProgress = projectsCount > 0 ? Number((totalPhysicalProgressSum / projectsCount).toFixed(2)) : 0;
    const overallAdministrativeProgress = projectsCount > 0 ? Number((totalAdministrativeProgressSum / projectsCount).toFixed(2)) : 0;

    return {
      companySummary: {
        totalBudget: companyBudget,
        executedCost: companyExecuted,
        committedCost: companyCommitted,
        availableBudget: companyAvailable,
        projectsCount,
        inRiskProjectsCount: inRiskCount,
        inRiskRatio: riskRatio,
        overallPhysicalProgress,
        overallAdministrativeProgress,
      },
      projects: projectSummaries,
    };
  }

  async getAlerts() {
    const dashboard = await this.getGeneralDashboard();
    return dashboard.projects.filter(p => p.risk.inRisk);
  }

  // =============================================================
  // GENERACIÓN DE REPORTES EXPORTABLES
  // =============================================================

  async exportExcel(): Promise<string> {
    const data = await this.getGeneralDashboard();
    
    // Generar formato CSV con UTF-8 BOM (\uFEFF) y delimitar separador para Excel
    let csv = '\uFEFFsep=,\r\n';
    csv += 'Proyecto,Ubicación,Estado,Avance Físico (%),Avance Administrativo (%),Presupuesto Total ($),Gasto Ejecutado ($),Compromisos ($),Disponible ($),En Riesgo,Alertas\r\n';

    for (const p of data.projects) {
      const alertStr = p.risk.reasons.join(' | ').replace(/"/g, '""');
      csv += `"${p.projectName}","${p.location}","${p.status}",${p.metrics.physicalProgress},${p.metrics.administrativeProgress},${p.finances.totalBudget},${p.finances.executedCost},${p.finances.committedCost},${p.finances.availableBudget},"${p.risk.inRisk ? 'SÍ' : 'NO'}","${alertStr}"\r\n`;
    }

    return csv;
  }

  async exportPdf(): Promise<string> {
    const data = await this.getGeneralDashboard();

    // Generamos un HTML estructurado y estilizado de forma premium para impresión directa
    let html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte Gerencial de Control de Obras</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      color: #333;
      margin: 30px;
      background-color: #fafbfc;
    }
    .header {
      border-bottom: 3px solid #1a365d;
      padding-bottom: 15px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #1a365d;
      margin: 0;
      font-size: 28px;
      letter-spacing: -0.5px;
    }
    .header p {
      color: #718096;
      margin: 5px 0 0 0;
      font-size: 14px;
    }
    .kpis-grid {
      display: flex;
      gap: 20px;
      margin-bottom: 35px;
    }
    .kpi-card {
      flex: 1;
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
    }
    .kpi-title {
      font-size: 11px;
      text-transform: uppercase;
      color: #718096;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .kpi-value {
      font-size: 22px;
      font-weight: 700;
      color: #2d3748;
    }
    .kpi-value.risk {
      color: #e53e3e;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
      margin-bottom: 30px;
    }
    th, td {
      padding: 12px 15px;
      text-align: left;
      font-size: 13px;
    }
    th {
      background-color: #f7fafc;
      color: #4a5568;
      font-weight: 700;
      border-bottom: 2px solid #edf2f7;
    }
    tr:not(:last-child) td {
      border-bottom: 1px solid #edf2f7;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 9999px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge.risk-yes {
      background-color: #fed7d7;
      color: #9b2c2c;
    }
    .badge.risk-no {
      background-color: #c6f6d5;
      color: #22543d;
    }
    .alert-section {
      background-color: #fffaf0;
      border-left: 4px solid #dd6b20;
      padding: 20px;
      border-radius: 6px;
      margin-top: 30px;
    }
    .alert-section h3 {
      margin-top: 0;
      color: #dd6b20;
      font-size: 16px;
    }
    .alert-item {
      font-size: 13px;
      margin-bottom: 8px;
      color: #7b341e;
    }
  </style>
</head>
<body>

  <div class="header">
    <h1>Reporte Gerencial de Control de Obras</h1>
    <p>Consolidado Corporativo - Generado el: ${new Date().toLocaleDateString('es-CL')} ${new Date().toLocaleTimeString('es-CL')}</p>
  </div>

  <div class="kpis-grid">
    <div class="kpi-card">
      <div class="kpi-title">Presupuesto Disponible</div>
      <div class="kpi-value">$${data.companySummary.availableBudget.toLocaleString('es-CL')}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Proyectos en Riesgo</div>
      <div class="kpi-value ${data.companySummary.inRiskProjectsCount > 0 ? 'risk' : ''}">
        ${data.companySummary.inRiskProjectsCount} / ${data.companySummary.projectsCount} (${data.companySummary.inRiskRatio}%)
      </div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Promedio Avance Físico</div>
      <div class="kpi-value">${data.companySummary.overallPhysicalProgress}%</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Promedio Tareas Cerradas</div>
      <div class="kpi-value">${data.companySummary.overallAdministrativeProgress}%</div>
    </div>
  </div>

  <h2>Desglose de Salud de Obras</h2>
  <table>
    <thead>
      <tr>
        <th>Proyecto</th>
        <th>Ubicación</th>
        <th>Estado</th>
        <th>Avance Físico</th>
        <th>Tareas Cerradas</th>
        <th>Presupuesto</th>
        <th>Disponible</th>
        <th>Riesgo</th>
      </tr>
    </thead>
    <tbody>
  `;

    for (const p of data.projects) {
      html += `
      <tr>
        <td><strong>${p.projectName}</strong></td>
        <td>${p.location}</td>
        <td>${p.status}</td>
        <td>${p.metrics.physicalProgress}%</td>
        <td>${p.metrics.administrativeProgress}%</td>
        <td>$${p.finances.totalBudget.toLocaleString('es-CL')}</td>
        <td>$${p.finances.availableBudget.toLocaleString('es-CL')}</td>
        <td>
          <span class="badge ${p.risk.inRisk ? 'risk-yes' : 'risk-no'}">
            ${p.risk.inRisk ? 'En Riesgo' : 'Saludable'}
          </span>
        </td>
      </tr>
      `;
    }

    html += `
    </tbody>
  </table>
  `;

    const riskProjects = data.projects.filter(p => p.risk.inRisk);
    if (riskProjects.length > 0) {
      html += `
      <div class="alert-section">
        <h3>Detalles de Desviaciones y Alertas de Riesgo</h3>
      `;
      for (const rp of riskProjects) {
        html += `
        <div style="margin-bottom: 12px;">
          <strong>${rp.projectName}:</strong>
        `;
        for (const reason of rp.risk.reasons) {
          html += `<div class="alert-item">• ${reason}</div>`;
        }
        html += `</div>`;
      }
      html += `</div>`;
    }

    html += `
</body>
</html>
    `;

    return html;
  }
}
