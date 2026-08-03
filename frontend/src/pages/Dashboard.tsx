import React, { useEffect, useState, useTransition } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/Card';
import { Table } from '../components/Table';
import { Button } from '../components/Button';
import { 
  TrendingUp, 
  AlertTriangle, 
  FileSpreadsheet, 
  FileText, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  Percent 
} from 'lucide-react';

interface ProjectSummary {
  projectId: string;
  projectName: string;
  location: string;
  status: string;
  metrics: {
    physicalProgress: number;
    administrativeProgress: number;
    tasksCount: {
      total: number;
      completed: number;
      pending: number;
    };
  };
  finances: {
    totalBudget: number;
    executedCost: number;
    committedCost: number;
    availableBudget: number;
  };
  risk: {
    inRisk: boolean;
    reasons: string[];
    financialRisk: boolean;
    scheduleRisk: boolean;
    overdueTasksCount: number;
  };
}

interface GeneralDashboardData {
  companySummary: {
    totalBudget: number;
    executedCost: number;
    committedCost: number;
    availableBudget: number;
    projectsCount: number;
    inRiskProjectsCount: number;
    inRiskRatio: number;
    overallPhysicalProgress: number;
    overallAdministrativeProgress: number;
  };
  projects: ProjectSummary[];
}

export const Dashboard: React.FC = () => {
  const { request } = useApi();
  const { hasPermission } = useAuth();
  const [data, setData] = useState<GeneralDashboardData | null>(null);
  const [threshold, setThreshold] = useState<number>(0.90);
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await request('/api/reports/dashboard/general');
      setData(res);
      
      // Consultar umbral activo en base de datos
      const alertsData = await request('/api/reports/alerts');
      if (alertsData && typeof alertsData.threshold === 'number') {
        setThreshold(alertsData.threshold);
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleUpdateThreshold = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateMsg(null);
    try {
      const res = await request('/api/reports/threshold', {
        method: 'PUT',
        body: JSON.stringify({ threshold }),
      });
      setUpdateMsg(`Umbral actualizado exitosamente a ${(res.threshold * 100)}% y persistido en BD.`);
      // Recargar datos para recalcular riesgos
      const updatedDash = await request('/api/reports/dashboard/general');
      setData(updatedDash);
    } catch (err: any) {
      setUpdateMsg(`Error: ${err.message}`);
    }
  };

  const handleExportExcel = async () => {
    try {
      const text = await request('/api/reports/export/excel');
      const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reporte_gerencial_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert(`Error al descargar Excel: ${err.message}`);
    }
  };

  const handleExportPdf = async () => {
    try {
      const html = await request('/api/reports/export/pdf');
      const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `reporte_gerencial_${new Date().toISOString().split('T')[0]}.html`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert(`Error al descargar PDF: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4 font-sans">
        <svg className="animate-spin h-10 w-10 text-brand-primary" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-brand-secondary font-medium">Consolidando métricas gerenciales...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-brand-negative/10 border border-brand-negative/30 rounded-lg text-brand-negative font-sans max-w-xl mx-auto mt-12 text-left">
        <h3 className="font-bold text-lg mb-2 font-serif">Error de Carga</h3>
        <p>{error || 'No se pudieron recuperar los datos consolidados.'}</p>
        <Button onClick={fetchDashboardData} variant="primary" className="mt-4">
          Reintentar
        </Button>
      </div>
    );
  }

  const projectsInRisk = data.projects.filter(p => p.risk.inRisk);

  return (
    <div className="space-y-8 font-sans text-left">
      {/* Encabezado y Exportaciones */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-brand-secondary/15 pb-5">
        <div>
          <h1 className="text-3xl font-bold text-brand-text font-serif">Control Gerencial</h1>
          <p className="text-sm text-brand-secondary">Consolidado general de obras y desviaciones presupuestarias</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={handleExportExcel} className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-brand-positive" />
            Exportar Excel
          </Button>
          <Button variant="secondary" onClick={handleExportPdf} className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-primary" />
            Imprimir Reporte (PDF)
          </Button>
        </div>
      </div>

      {/* Alertas Críticas de Riesgo */}
      {projectsInRisk.length > 0 && (
        <div className="bg-brand-negative/5 border border-brand-negative/30 rounded-lg p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-brand-negative">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <h3 className="text-lg font-bold font-serif">Alerta: Hay {projectsInRisk.length} Proyectos en Riesgo</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-8">
            {projectsInRisk.map((p) => (
              <div key={p.projectId} className="bg-white/50 border border-brand-negative/20 rounded p-3 text-xs space-y-1.5 shadow-sm">
                <span className="font-semibold text-brand-text text-sm font-serif">{p.projectName}</span>
                <div className="space-y-1 text-brand-negative">
                  {p.risk.reasons.map((r, idx) => (
                    <div key={idx} className="flex items-start gap-1">
                      <span>•</span>
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPIs Financieros Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white/70 shadow-sm border border-brand-secondary/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-brand-secondary uppercase tracking-wider">Presupuesto Consolidado</span>
            <DollarSign className="w-5 h-5 text-brand-secondary/80" />
          </div>
          <div className="mt-2.5 text-2xl font-bold font-mono text-brand-text">
            ${data.companySummary.totalBudget.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-brand-secondary mt-1">Presupuesto total planificado</p>
        </Card>

        <Card className="bg-white/70 shadow-sm border border-brand-secondary/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-brand-secondary uppercase tracking-wider">Gasto Real Ejecutado</span>
            <TrendingUp className="w-5 h-5 text-brand-primary" />
          </div>
          <div className="mt-2.5 text-2xl font-bold font-mono text-brand-primary">
            ${data.companySummary.executedCost.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-brand-secondary mt-1">Costos de mano de obra y materiales conformes</p>
        </Card>

        <Card className="bg-white/70 shadow-sm border border-brand-secondary/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-brand-secondary uppercase tracking-wider">Compromisos Pendientes</span>
            <Clock className="w-5 h-5 text-brand-secondary" />
          </div>
          <div className="mt-2.5 text-2xl font-bold font-mono text-brand-text">
            ${data.companySummary.committedCost.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-brand-secondary mt-1">Cuentas por pagar devengadas no liquidadas</p>
        </Card>

        <Card className="bg-white/70 shadow-sm border border-brand-secondary/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-brand-secondary uppercase tracking-wider">Presupuesto Disponible Real</span>
            <CheckCircle2 className="w-5 h-5 text-brand-positive" />
          </div>
          <div className="mt-2.5 text-2xl font-bold font-mono text-brand-positive">
            ${data.companySummary.availableBudget.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[10px] text-brand-secondary mt-1">Margen libre (Presupuesto − Ejecutado − Compromisos)</p>
        </Card>
      </div>

      {/* Doble KPI de Avance Global */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-white/70 border border-brand-secondary/20 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-semibold text-brand-text uppercase tracking-wider">Avance Físico Global Promedio</h4>
              <p className="text-[10px] text-brand-secondary mt-0.5">Avance real de tareas ponderado por su duración en días</p>
            </div>
            <Percent className="w-5 h-5 text-brand-positive" />
          </div>
          <div className="space-y-3">
            <div className="text-3xl font-bold font-mono text-brand-positive">
              {data.companySummary.overallPhysicalProgress.toFixed(2)}%
            </div>
            {/* Signature progress bar: rounded ends, Sage to Terracota gradient */}
            <div className="w-full bg-brand-secondary/20 h-3 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-brand-positive to-brand-primary transition-all duration-500" 
                style={{ width: `${data.companySummary.overallPhysicalProgress}%` }}
              />
            </div>
          </div>
        </Card>

        <Card className="bg-white/70 border border-brand-secondary/20 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-semibold text-brand-text uppercase tracking-wider">Avance Administrativo Global Promedio</h4>
              <p className="text-[10px] text-brand-secondary mt-0.5">Porcentaje de tareas completadas de forma administrativa</p>
            </div>
            <Percent className="w-5 h-5 text-brand-text" />
          </div>
          <div className="space-y-3">
            <div className="text-3xl font-bold font-mono text-brand-text">
              {data.companySummary.overallAdministrativeProgress.toFixed(2)}%
            </div>
            {/* Signature progress bar: rounded ends, Sage to Terracota gradient */}
            <div className="w-full bg-brand-secondary/20 h-3 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-brand-positive to-brand-primary transition-all duration-500" 
                style={{ width: `${data.companySummary.overallAdministrativeProgress}%` }}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Grilla Detallada de Obras */}
      <Card title="Estado Detallado de Obras" className="bg-white/70 border border-brand-secondary/20 shadow-sm">
        <Table headers={['Obra / Ubicación', 'Presupuesto', 'Ejecutado', 'Comprometido', 'Disponible Real', 'Avance Físico', 'Avance Admin.', 'Estado']}>
          {data.projects.map((p) => (
            <tr key={p.projectId} className="hover:bg-brand-bg/50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="font-semibold text-brand-text font-serif">{p.projectName}</div>
                <div className="text-[11px] text-brand-secondary">{p.location}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap font-mono text-xs">
                ${p.finances.totalBudget.toLocaleString('es-CL')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-brand-primary">
                ${p.finances.executedCost.toLocaleString('es-CL')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-brand-secondary">
                ${p.finances.committedCost.toLocaleString('es-CL')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap font-mono text-xs font-semibold">
                ${p.finances.availableBudget.toLocaleString('es-CL')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap w-36">
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-xs font-semibold text-brand-positive">{p.metrics.physicalProgress}%</span>
                  <div className="w-full bg-brand-secondary/20 h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-brand-positive to-brand-primary" 
                      style={{ width: `${p.metrics.physicalProgress}%` }}
                    />
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap w-36">
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-xs font-semibold text-brand-text">{p.metrics.administrativeProgress}%</span>
                  <div className="w-full bg-brand-secondary/20 h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-brand-positive to-brand-primary" 
                      style={{ width: `${p.metrics.administrativeProgress}%` }}
                    />
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {p.risk.inRisk ? (
                  <span className="px-2.5 py-1 text-xs font-semibold rounded bg-brand-negative/10 text-brand-negative border border-brand-negative/20">
                    En Riesgo
                  </span>
                ) : (
                  <span className="px-2.5 py-1 text-xs font-semibold rounded bg-brand-positive/10 text-brand-positive border border-brand-positive/20">
                    Saludable
                  </span>
                )}
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      {/* Configuración de Umbral de Alerta Dinámica */}
      {hasPermission('UPDATE', 'REPORTES') && (
        <Card title="Ajuste de Políticas de Riesgo Corporativo" className="bg-white/70 border border-brand-secondary/20 shadow-sm max-w-2xl">
          <form onSubmit={handleUpdateThreshold} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-brand-text">
                Umbral de Desviación Financiera Autorizado: <span className="font-mono text-brand-primary font-bold text-sm">{(threshold * 100)}%</span>
              </label>
              <p className="text-[11px] text-brand-secondary">
                Los proyectos se marcarán automáticamente "En Riesgo" si la suma del costo ejecutado y comprometido supera este porcentaje de su presupuesto.
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0.05"
                max="1.0"
                step="0.05"
                value={threshold}
                onChange={(e) => startTransition(() => setThreshold(parseFloat(e.target.value)))}
                className="w-full accent-brand-primary bg-brand-bg rounded-lg h-2 cursor-pointer"
              />
              <Button type="submit" variant="primary" disabled={isPending}>
                Guardar Umbral
              </Button>
            </div>

            {updateMsg && (
              <p className={`text-xs font-medium ${updateMsg.startsWith('Error') ? 'text-brand-negative' : 'text-brand-positive'}`}>
                {updateMsg}
              </p>
            )}
          </form>
        </Card>
      )}
    </div>
  );
};
