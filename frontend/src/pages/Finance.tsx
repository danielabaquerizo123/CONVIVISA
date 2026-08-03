import React, { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { Table } from '../components/Table';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Drawer } from '../components/Drawer';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SkeletonTable } from '../components/SkeletonTable';
import { 
  Plus, 
  Edit3, 
  Landmark, 
  HardHat, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  PiggyBank, 
  AlertCircle, 
  CheckCircle,
  HandCoins
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  location: string;
  estimatedBudget: number;
}

interface BudgetPlanned {
  materials: number;
  labor: number;
  subcontracts: number;
  equipment: number;
  total: number;
}

interface BudgetActual {
  materials: number;
  labor: number;
  subcontracts: number;
  equipment: number;
  total: number;
}

interface BudgetDeviation {
  materials: number;
  labor: number;
  subcontracts: number;
  equipment: number;
  total: number;
}

interface ComparisonData {
  projectId: string;
  projectName: string;
  planned: BudgetPlanned;
  actual: BudgetActual;
  deviation: BudgetDeviation;
}

interface AccountPayable {
  id: string;
  purchaseOrderId: string | null;
  supplierId: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  paidAt: string | null;
  createdAt: string;
  supplier: {
    id: string;
    name: string;
    taxId: string;
  };
  purchaseOrder: {
    id: string;
    totalAmount: number;
  } | null;
}

interface AccountReceivable {
  id: string;
  projectId: string;
  invoiceNumber: string | null;
  amount: number;
  description: string;
  dueDate: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  paidAt: string | null;
  createdAt: string;
  project: {
    id: string;
    name: string;
    location: string;
  };
}

export const Finance: React.FC = () => {
  const { request } = useApi();
  const { hasPermission } = useAuth();

  // Navegación de pestañas
  const [activeTab, setActiveTab] = useState<'budget' | 'payables' | 'receivables'>('budget');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Datos globales / catálogos
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // =============================================================
  // ESTADOS: PESTAÑA 1 - PRESUPUESTO DE OBRA
  // =============================================================
  const [hasBudget, setHasBudget] = useState<boolean>(false);
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [isBudgetDrawerOpen, setIsBudgetDrawerOpen] = useState(false);
  const [budgetFormData, setBudgetFormData] = useState({
    materialsPlanned: '',
    laborPlanned: '',
    subcontractsPlanned: '',
    equipmentPlanned: '',
  });
  const [budgetErrors, setBudgetErrors] = useState<Record<string, string>>({});
  const [isBudgetSaving, setIsBudgetSaving] = useState(false);

  // =============================================================
  // ESTADOS: PESTAÑA 2 - CUENTAS POR PAGAR
  // =============================================================
  const [payables, setPayables] = useState<AccountPayable[]>([]);
  const [payableFilter, setPayableFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');
  const [isPayConfirmOpen, setIsPayConfirmOpen] = useState(false);
  const [payableToPay, setPayableToPay] = useState<AccountPayable | null>(null);

  // =============================================================
  // ESTADOS: PESTAÑA 3 - CUENTAS POR COBRAR
  // =============================================================
  const [receivables, setReceivables] = useState<AccountReceivable[]>([]);
  const [receivableFilter, setReceivableFilter] = useState<'ALL' | 'PENDING' | 'PAID'>('ALL');
  const [isReceivableDrawerOpen, setIsReceivableDrawerOpen] = useState(false);
  const [receivableFormData, setReceivableFormData] = useState({
    projectId: '',
    invoiceNumber: '',
    amount: '',
    description: '',
    dueDate: '',
  });
  const [receivableErrors, setReceivableErrors] = useState<Record<string, string>>({});
  const [isReceivableSaving, setIsReceivableSaving] = useState(false);

  // Confirmación de cobro
  const [isCollectConfirmOpen, setIsCollectConfirmOpen] = useState(false);
  const [receivableToCollect, setReceivableToCollect] = useState<AccountReceivable | null>(null);

  // Cargar proyectos iniciales
  const loadProjects = async () => {
    try {
      setLoading(true);
      const res = await request('/api/projects');
      setProjects(res);
    } catch (err: any) {
      setError(err.message || 'Error al obtener proyectos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  // Cargar información de presupuestos al seleccionar un proyecto
  const loadProjectBudgetData = async (projectId: string) => {
    if (!projectId) {
      setComparison(null);
      setHasBudget(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // 1. Obtener comparativa real vs planificado
      const compRes = await request(`/api/finance/costs/project/${projectId}/comparison`);
      setComparison(compRes);

      // 2. Verificar si hay un presupuesto registrado en base de datos
      try {
        await request(`/api/finance/budgets/project/${projectId}`);
        setHasBudget(true);
      } catch (budgetErr: any) {
        if (budgetErr.status === 404) {
          setHasBudget(false);
        } else {
          throw budgetErr;
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar el presupuesto del proyecto.');
      setComparison(null);
      setHasBudget(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      loadProjectBudgetData(selectedProjectId);
    } else {
      setComparison(null);
      setHasBudget(false);
    }
  }, [selectedProjectId]);

  const loadPayables = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await request('/api/finance/payables');
      setPayables(res);
    } catch (err: any) {
      setError(err.message || 'Error al obtener cuentas por pagar.');
    } finally {
      setLoading(false);
    }
  };

  const loadReceivables = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await request('/api/finance/receivables');
      setReceivables(res);
    } catch (err: any) {
      setError(err.message || 'Error al obtener cuentas por cobrar.');
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos según pestaña activa
  const handleTabChange = (tab: 'budget' | 'payables' | 'receivables') => {
    setActiveTab(tab);
    setError(null);
    if (tab === 'budget') {
      if (selectedProjectId) {
        loadProjectBudgetData(selectedProjectId);
      }
    } else if (tab === 'payables') {
      loadPayables();
    } else if (tab === 'receivables') {
      loadReceivables();
    }
  };

  useEffect(() => {
    if (activeTab === 'payables') {
      loadPayables();
    } else if (activeTab === 'receivables') {
      loadReceivables();
    }
  }, [activeTab]);

  // =============================================================
  // ACCIONES: PESTAÑA 1 - PRESUPUESTO
  // =============================================================
  const handleOpenBudgetDrawer = () => {
    setBudgetErrors({});
    if (hasBudget && comparison) {
      setBudgetFormData({
        materialsPlanned: comparison.planned.materials.toString(),
        laborPlanned: comparison.planned.labor.toString(),
        subcontractsPlanned: comparison.planned.subcontracts.toString(),
        equipmentPlanned: comparison.planned.equipment.toString(),
      });
    } else {
      setBudgetFormData({
        materialsPlanned: '',
        laborPlanned: '',
        subcontractsPlanned: '',
        equipmentPlanned: '',
      });
    }
    setIsBudgetDrawerOpen(true);
  };

  const validateBudgetForm = () => {
    const errors: Record<string, string> = {};
    const checkPositiveNum = (val: string, fieldName: string) => {
      const parsed = parseFloat(val);
      if (!val) {
        errors[fieldName] = 'El monto planificado es requerido.';
      } else if (isNaN(parsed) || parsed < 0) {
        errors[fieldName] = 'El monto planificado no puede ser negativo.';
      }
    };

    checkPositiveNum(budgetFormData.materialsPlanned, 'materialsPlanned');
    checkPositiveNum(budgetFormData.laborPlanned, 'laborPlanned');
    checkPositiveNum(budgetFormData.subcontractsPlanned, 'subcontractsPlanned');
    checkPositiveNum(budgetFormData.equipmentPlanned, 'equipmentPlanned');

    setBudgetErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateBudgetForm()) return;

    try {
      setIsBudgetSaving(true);
      const payload = {
        projectId: selectedProjectId,
        materialsPlanned: parseFloat(budgetFormData.materialsPlanned),
        laborPlanned: parseFloat(budgetFormData.laborPlanned),
        subcontractsPlanned: parseFloat(budgetFormData.subcontractsPlanned),
        equipmentPlanned: parseFloat(budgetFormData.equipmentPlanned),
      };

      if (hasBudget) {
        // Actualizar
        await request(`/api/finance/budgets/project/${selectedProjectId}`, {
          method: 'PUT',
          body: JSON.stringify({
            materialsPlanned: payload.materialsPlanned,
            laborPlanned: payload.laborPlanned,
            subcontractsPlanned: payload.subcontractsPlanned,
            equipmentPlanned: payload.equipmentPlanned,
          }),
        });
      } else {
        // Crear
        await request('/api/finance/budgets', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setIsBudgetDrawerOpen(false);
      loadProjectBudgetData(selectedProjectId);
    } catch (err: any) {
      setBudgetErrors({ api: err.message || 'Error al guardar el presupuesto.' });
    } finally {
      setIsBudgetSaving(false);
    }
  };

  // Cálculo automático del total del formulario de presupuesto
  const formTotal = 
    (parseFloat(budgetFormData.materialsPlanned) || 0) +
    (parseFloat(budgetFormData.laborPlanned) || 0) +
    (parseFloat(budgetFormData.subcontractsPlanned) || 0) +
    (parseFloat(budgetFormData.equipmentPlanned) || 0);

  // =============================================================
  // ACCIONES: PESTAÑA 2 - CUENTAS POR PAGAR
  // =============================================================
  const handleOpenPayConfirm = (payable: AccountPayable) => {
    setPayableToPay(payable);
    setIsPayConfirmOpen(true);
  };

  const handleConfirmPay = async () => {
    if (!payableToPay) return;

    try {
      await request(`/api/finance/payables/${payableToPay.id}/pay`, {
        method: 'POST',
        body: JSON.stringify({
          paidAt: new Date().toISOString(),
        }),
      });
      setIsPayConfirmOpen(false);
      setPayableToPay(null);
      loadPayables();
    } catch (err: any) {
      alert(`❌ Error al liquidar pago: ${err.message || 'Error desconocido'}`);
    }
  };

  const filteredPayables = payables.filter((p) => {
    if (payableFilter === 'ALL') return true;
    return p.status === payableFilter;
  });

  // =============================================================
  // ACCIONES: PESTAÑA 3 - CUENTAS POR COBRAR
  // =============================================================
  const handleOpenReceivableDrawer = () => {
    setReceivableErrors({});
    setReceivableFormData({
      projectId: '',
      invoiceNumber: '',
      amount: '',
      description: '',
      dueDate: new Date().toISOString().split('T')[0],
    });
    setIsReceivableDrawerOpen(true);
  };

  const validateReceivableForm = () => {
    const errors: Record<string, string> = {};
    if (!receivableFormData.projectId) errors.projectId = 'Debe seleccionar un proyecto.';
    if (!receivableFormData.description.trim()) errors.description = 'La descripción es requerida.';
    if (!receivableFormData.dueDate) errors.dueDate = 'La fecha de vencimiento es requerida.';
    
    const amt = parseFloat(receivableFormData.amount);
    if (!receivableFormData.amount) {
      errors.amount = 'El monto es requerido.';
    } else if (isNaN(amt) || amt <= 0) {
      errors.amount = 'El monto debe ser mayor a cero.';
    }

    setReceivableErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveReceivable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateReceivableForm()) return;

    try {
      setIsReceivableSaving(true);
      const payload = {
        projectId: receivableFormData.projectId,
        invoiceNumber: receivableFormData.invoiceNumber.trim() || undefined,
        amount: parseFloat(receivableFormData.amount),
        description: receivableFormData.description.trim(),
        dueDate: new Date(receivableFormData.dueDate).toISOString(),
      };

      await request('/api/finance/receivables', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setIsReceivableDrawerOpen(false);
      loadReceivables();
    } catch (err: any) {
      setReceivableErrors({ api: err.message || 'Error al crear la planilla de cobro.' });
    } finally {
      setIsReceivableSaving(false);
    }
  };

  const handleOpenCollectConfirm = (receivable: AccountReceivable) => {
    setReceivableToCollect(receivable);
    setIsCollectConfirmOpen(true);
  };

  const handleConfirmCollect = async () => {
    if (!receivableToCollect) return;

    try {
      await request(`/api/finance/receivables/${receivableToCollect.id}/collect`, {
        method: 'POST',
        body: JSON.stringify({
          paidAt: new Date().toISOString(),
        }),
      });
      setIsCollectConfirmOpen(false);
      setReceivableToCollect(null);
      loadReceivables();
    } catch (err: any) {
      alert(`❌ Error al registrar cobro: ${err.message || 'Error desconocido'}`);
    }
  };

  const filteredReceivables = receivables.filter((r) => {
    if (receivableFilter === 'ALL') return true;
    return r.status === receivableFilter;
  });

  return (
    <div className="space-y-6 font-sans text-left">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-brand-text font-serif">Gestión Financiera</h1>
          <p className="text-sm text-brand-secondary">Presupuestos de obras, flujo de caja, cuentas por pagar y cuentas por cobrar</p>
        </div>
      </div>

      {/* Pestañas de Navegación */}
      <div className="flex border-b border-brand-secondary/20">
        <button
          onClick={() => handleTabChange('budget')}
          className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'budget'
              ? 'border-brand-primary text-brand-primary font-bold'
              : 'border-transparent text-brand-secondary hover:text-brand-text'
          }`}
        >
          <Landmark className="w-4 h-4" />
          Presupuesto de Obra
        </button>
        <button
          onClick={() => handleTabChange('payables')}
          className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'payables'
              ? 'border-brand-primary text-brand-primary font-bold'
              : 'border-transparent text-brand-secondary hover:text-brand-text'
          }`}
        >
          <TrendingDown className="w-4 h-4" />
          Cuentas por Pagar
        </button>
        <button
          onClick={() => handleTabChange('receivables')}
          className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'receivables'
              ? 'border-brand-primary text-brand-primary font-bold'
              : 'border-transparent text-brand-secondary hover:text-brand-text'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Cuentas por Cobrar
        </button>
      </div>

      {/* Manejo de carga general */}
      {loading && !isBudgetDrawerOpen ? (
        <SkeletonTable cols={4} rows={3} />
      ) : error ? (
        <div className="p-4 bg-brand-negative/10 border border-brand-negative/30 rounded text-brand-negative text-sm">
          {error}
        </div>
      ) : (
        <>
          {/* =============================================================
              PESTAÑA 1: PRESUPUESTO DE OBRA
              ============================================================= */}
          {activeTab === 'budget' && (
            <div className="space-y-6">
              {/* Selector de Obra */}
              <Card className="bg-white/70 border border-brand-secondary/20 p-5 shadow-sm">
                <div className="max-w-md">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-2">
                    Seleccionar Proyecto / Obra
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  >
                    <option value="">Seleccione un proyecto activo...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} − {p.location}
                      </option>
                    ))}
                  </select>
                </div>
              </Card>

              {!selectedProjectId ? (
                <div className="bg-white/60 border border-brand-secondary/20 p-12 rounded-lg text-center text-brand-secondary">
                  <HardHat className="w-16 h-16 mx-auto text-brand-secondary/40 mb-3" />
                  <p className="font-medium text-sm">Seleccione un proyecto para visualizar e ingresar su planificación presupuestaria.</p>
                </div>
              ) : !comparison ? (
                <div className="text-center py-6">
                  <p className="text-brand-secondary text-sm">Cargando comparativa...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Tarjetas de Resumen Financiero */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <Card className="bg-white border border-brand-secondary/20 shadow-sm p-5 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-secondary block">
                          Presupuesto Planificado
                        </span>
                        <span className="text-2xl font-bold text-brand-text font-serif block mt-1">
                          ${comparison.planned.total.toLocaleString('es-CL')}
                        </span>
                      </div>
                      <div className="p-3 bg-brand-primary/10 rounded-full text-brand-primary">
                        <PiggyBank className="w-6 h-6" />
                      </div>
                    </Card>

                    <Card className="bg-white border border-brand-secondary/20 shadow-sm p-5 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-secondary block">
                          Costo Real Ejecutado
                        </span>
                        <span className="text-2xl font-bold text-brand-text font-serif block mt-1">
                          ${comparison.actual.total.toLocaleString('es-CL')}
                        </span>
                      </div>
                      <div className="p-3 bg-brand-forest/10 rounded-full text-brand-forest">
                        <DollarSign className="w-6 h-6" />
                      </div>
                    </Card>

                    <Card className="bg-white border border-brand-secondary/20 shadow-sm p-5 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-secondary block">
                          Desviación Acumulada
                        </span>
                        <span className={`text-2xl font-bold font-serif block mt-1 ${
                          comparison.deviation.total <= 0 ? 'text-brand-positive' : 'text-brand-negative'
                        }`}>
                          {comparison.deviation.total > 0 ? '+' : ''}
                          ${comparison.deviation.total.toLocaleString('es-CL')}
                        </span>
                      </div>
                      <div className={`p-3 rounded-full ${
                        comparison.deviation.total <= 0 ? 'bg-brand-positive/10 text-brand-positive' : 'bg-brand-negative/10 text-brand-negative'
                      }`}>
                        {comparison.deviation.total <= 0 ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                      </div>
                    </Card>
                  </div>

                  {/* Comparativa por Categoría */}
                  <Card className="bg-white/70 border border-brand-secondary/20 shadow-sm p-0 overflow-hidden">
                    <div className="p-5 border-b border-brand-secondary/15 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <h2 className="text-lg font-bold text-brand-text font-serif">Desglose Comparativo por Partida</h2>
                        <p className="text-xs text-brand-secondary">Controles de desviación y avance por cada categoría de costos</p>
                      </div>
                      <div className="flex gap-2">
                        {hasBudget ? (
                          hasPermission('UPDATE', 'FINANCIERO') && (
                            <Button variant="secondary" size="sm" onClick={handleOpenBudgetDrawer} className="flex items-center gap-1.5">
                              <Edit3 className="w-3.5 h-3.5" /> Re-ajustar Presupuesto
                            </Button>
                          )
                        ) : (
                          hasPermission('CREATE', 'FINANCIERO') && (
                            <Button variant="primary" size="sm" onClick={handleOpenBudgetDrawer} className="flex items-center gap-1.5">
                              <Plus className="w-4 h-4" /> Definir Presupuesto
                            </Button>
                          )
                        )}
                      </div>
                    </div>

                    {!hasBudget ? (
                      <div className="p-8 text-center text-brand-secondary">
                        <AlertCircle className="w-10 h-10 mx-auto text-brand-secondary/40 mb-2" />
                        <p className="text-sm font-medium">Este proyecto no cuenta con presupuesto detallado por partida.</p>
                        <p className="text-xs mt-0.5">Defina el presupuesto para habilitar los análisis de desviación acumulada.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-brand-bg/60 border-b border-brand-secondary/15 text-[10px] font-bold uppercase tracking-wider text-brand-secondary">
                              <th className="px-6 py-4">Partida / Categoría</th>
                              <th className="px-6 py-4">Presupuesto Planificado</th>
                              <th className="px-6 py-4">Costo Real Ejecutado</th>
                              <th className="px-6 py-4">Desviación (Presupuesto - Real)</th>
                              <th className="px-6 py-4 w-64">% Consumo</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-brand-secondary/10 text-xs">
                            {/* Fila Materiales */}
                            <tr className="hover:bg-brand-bg/40">
                              <td className="px-6 py-4 font-semibold text-brand-text font-serif">Materiales</td>
                              <td className="px-6 py-4 font-mono">${comparison.planned.materials.toLocaleString('es-CL')}</td>
                              <td className="px-6 py-4 font-mono">${comparison.actual.materials.toLocaleString('es-CL')}</td>
                              <td className={`px-6 py-4 font-mono font-semibold ${comparison.deviation.materials <= 0 ? 'text-brand-positive' : 'text-brand-negative'}`}>
                                {comparison.deviation.materials > 0 ? '+' : ''}${(-comparison.deviation.materials).toLocaleString('es-CL')}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-full bg-brand-secondary/15 rounded-full h-2 overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full transition-all ${
                                        comparison.actual.materials > comparison.planned.materials ? 'bg-brand-negative' : 'bg-brand-positive'
                                      }`}
                                      style={{ width: `${Math.min((comparison.actual.materials / (comparison.planned.materials || 1)) * 100, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-mono text-brand-secondary min-w-[32px] text-right">
                                    {Math.round((comparison.actual.materials / (comparison.planned.materials || 1)) * 100)}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                            
                            {/* Fila Mano de Obra */}
                            <tr className="hover:bg-brand-bg/40">
                              <td className="px-6 py-4 font-semibold text-brand-text font-serif">Mano de Obra</td>
                              <td className="px-6 py-4 font-mono">${comparison.planned.labor.toLocaleString('es-CL')}</td>
                              <td className="px-6 py-4 font-mono">${comparison.actual.labor.toLocaleString('es-CL')}</td>
                              <td className={`px-6 py-4 font-mono font-semibold ${comparison.deviation.labor <= 0 ? 'text-brand-positive' : 'text-brand-negative'}`}>
                                {comparison.deviation.labor > 0 ? '+' : ''}${(-comparison.deviation.labor).toLocaleString('es-CL')}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-full bg-brand-secondary/15 rounded-full h-2 overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full transition-all ${
                                        comparison.actual.labor > comparison.planned.labor ? 'bg-brand-negative' : 'bg-brand-positive'
                                      }`}
                                      style={{ width: `${Math.min((comparison.actual.labor / (comparison.planned.labor || 1)) * 100, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-mono text-brand-secondary min-w-[32px] text-right">
                                    {Math.round((comparison.actual.labor / (comparison.planned.labor || 1)) * 100)}%
                                  </span>
                                </div>
                              </td>
                            </tr>

                            {/* Fila Subcontratos */}
                            <tr className="hover:bg-brand-bg/40">
                              <td className="px-6 py-4 font-semibold text-brand-text font-serif">Subcontratos</td>
                              <td className="px-6 py-4 font-mono">${comparison.planned.subcontracts.toLocaleString('es-CL')}</td>
                              <td className="px-6 py-4 font-mono">${comparison.actual.subcontracts.toLocaleString('es-CL')}</td>
                              <td className={`px-6 py-4 font-mono font-semibold ${comparison.deviation.subcontracts <= 0 ? 'text-brand-positive' : 'text-brand-negative'}`}>
                                {comparison.deviation.subcontracts > 0 ? '+' : ''}${(-comparison.deviation.subcontracts).toLocaleString('es-CL')}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-full bg-brand-secondary/15 rounded-full h-2 overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full transition-all ${
                                        comparison.actual.subcontracts > comparison.planned.subcontracts ? 'bg-brand-negative' : 'bg-brand-positive'
                                      }`}
                                      style={{ width: `${Math.min((comparison.actual.subcontracts / (comparison.planned.subcontracts || 1)) * 100, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-mono text-brand-secondary min-w-[32px] text-right">
                                    {Math.round((comparison.actual.subcontracts / (comparison.planned.subcontracts || 1)) * 100)}%
                                  </span>
                                </div>
                              </td>
                            </tr>

                            {/* Fila Equipos e Indirectos */}
                            <tr className="hover:bg-brand-bg/40">
                              <td className="px-6 py-4 font-semibold text-brand-text font-serif">Equipos e Indirectos</td>
                              <td className="px-6 py-4 font-mono">${comparison.planned.equipment.toLocaleString('es-CL')}</td>
                              <td className="px-6 py-4 font-mono">${comparison.actual.equipment.toLocaleString('es-CL')}</td>
                              <td className={`px-6 py-4 font-mono font-semibold ${comparison.deviation.equipment <= 0 ? 'text-brand-positive' : 'text-brand-negative'}`}>
                                {comparison.deviation.equipment > 0 ? '+' : ''}${(-comparison.deviation.equipment).toLocaleString('es-CL')}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-full bg-brand-secondary/15 rounded-full h-2 overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full transition-all ${
                                        comparison.actual.equipment > comparison.planned.equipment ? 'bg-brand-negative' : 'bg-brand-positive'
                                      }`}
                                      style={{ width: `${Math.min((comparison.actual.equipment / (comparison.planned.equipment || 1)) * 100, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-mono text-brand-secondary min-w-[32px] text-right">
                                    {Math.round((comparison.actual.equipment / (comparison.planned.equipment || 1)) * 100)}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* =============================================================
              PESTAÑA 2: CUENTAS POR PAGAR
              ============================================================= */}
          {activeTab === 'payables' && (
            <div className="space-y-4">
              {/* Filtros rápidos */}
              <div className="flex justify-between items-center bg-white border border-brand-secondary/20 p-4 rounded-lg shadow-sm">
                <div className="flex gap-2">
                  <button
                    onClick={() => setPayableFilter('ALL')}
                    className={`px-4 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
                      payableFilter === 'ALL'
                        ? 'bg-brand-primary text-white'
                        : 'bg-brand-bg text-brand-secondary hover:bg-brand-secondary/10'
                    }`}
                  >
                    Ver Todas
                  </button>
                  <button
                    onClick={() => setPayableFilter('PENDING')}
                    className={`px-4 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
                      payableFilter === 'PENDING'
                        ? 'bg-brand-primary text-white'
                        : 'bg-brand-bg text-brand-secondary hover:bg-brand-secondary/10'
                    }`}
                  >
                    Pendientes
                  </button>
                  <button
                    onClick={() => setPayableFilter('PAID')}
                    className={`px-4 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
                      payableFilter === 'PAID'
                        ? 'bg-brand-primary text-white'
                        : 'bg-brand-bg text-brand-secondary hover:bg-brand-secondary/10'
                    }`}
                  >
                    Pagadas
                  </button>
                </div>
              </div>

              {filteredPayables.length === 0 ? (
                <div className="bg-white/60 border border-brand-secondary/20 p-8 rounded-lg text-center text-brand-secondary">
                  <HandCoins className="w-12 h-12 mx-auto text-brand-secondary/40 mb-3" />
                  <p className="font-medium text-sm">No hay cuentas por pagar registradas con el filtro seleccionado.</p>
                </div>
              ) : (
                <Card className="bg-white/70 border border-brand-secondary/20 shadow-sm p-0 overflow-hidden">
                  <Table headers={['Factura / Vencimiento', 'Proveedor / Tax ID', 'OC Origen', 'Neto', 'IVA (15%)', 'Monto Total', 'Estado', 'Acciones']}>
                    {filteredPayables.map((p) => {
                      const net = Number(p.amount);
                      const iva = net * 0.15;
                      const total = net * 1.15;
                      return (
                        <tr key={p.id} className="hover:bg-brand-bg/50 border-b border-brand-secondary/15 text-xs text-left">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-brand-text font-serif">{p.invoiceNumber}</div>
                            <div className="text-[10px] text-brand-secondary mt-0.5">
                              Vence: {new Date(p.dueDate).toLocaleDateString('es-CL')}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-brand-text">{p.supplier.name}</div>
                            <div className="text-[10px] text-brand-secondary font-mono mt-0.5">{p.supplier.taxId}</div>
                          </td>
                          <td className="px-6 py-4 font-mono text-brand-secondary">
                            {p.purchaseOrder ? (
                              `OC-${p.purchaseOrder.id.substring(0, 8).toUpperCase()}`
                            ) : (
                              'N/A'
                            )}
                          </td>
                          <td className="px-6 py-4 font-mono text-brand-text">${net.toLocaleString('es-CL')}</td>
                          <td className="px-6 py-4 font-mono text-brand-secondary">${iva.toLocaleString('es-CL')}</td>
                          <td className="px-6 py-4 font-mono text-brand-text font-bold">${total.toLocaleString('es-CL')}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.status === 'PAID'
                                ? 'bg-brand-positive/10 text-brand-positive'
                                : p.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-brand-negative/10 text-brand-negative'
                            }`}>
                              {p.status === 'PAID' ? 'Liquidada' : p.status === 'PENDING' ? 'Pendiente' : 'Vencida'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {p.status === 'PENDING' && hasPermission('APPROVE', 'FINANCIERO') ? (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleOpenPayConfirm(p)}
                                className="flex items-center gap-1"
                              >
                                <HandCoins className="w-3.5 h-3.5" /> Liquidar Pago
                              </Button>
                            ) : (
                              <span className="text-brand-secondary/50 font-medium italic">Sin acciones</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </Table>
                </Card>
              )}
            </div>
          )}

          {/* =============================================================
              PESTAÑA 3: CUENTAS POR COBRAR
              ============================================================= */}
          {activeTab === 'receivables' && (
            <div className="space-y-4">
              {/* Controles y Filtros */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-brand-secondary/20 p-4 rounded-lg shadow-sm">
                <div className="flex gap-2">
                  <button
                    onClick={() => setReceivableFilter('ALL')}
                    className={`px-4 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
                      receivableFilter === 'ALL'
                        ? 'bg-brand-primary text-white'
                        : 'bg-brand-bg text-brand-secondary hover:bg-brand-secondary/10'
                    }`}
                  >
                    Ver Todas
                  </button>
                  <button
                    onClick={() => setReceivableFilter('PENDING')}
                    className={`px-4 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
                      receivableFilter === 'PENDING'
                        ? 'bg-brand-primary text-white'
                        : 'bg-brand-bg text-brand-secondary hover:bg-brand-secondary/10'
                    }`}
                  >
                    Pendientes
                  </button>
                  <button
                    onClick={() => setReceivableFilter('PAID')}
                    className={`px-4 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
                      receivableFilter === 'PAID'
                        ? 'bg-brand-primary text-white'
                        : 'bg-brand-bg text-brand-secondary hover:bg-brand-secondary/10'
                    }`}
                  >
                    Cobradas
                  </button>
                </div>

                {hasPermission('CREATE', 'FINANCIERO') && (
                  <Button variant="primary" size="sm" onClick={handleOpenReceivableDrawer} className="flex items-center gap-1.5">
                    <Plus className="w-4 h-4" /> Nueva Planilla
                  </Button>
                )}
              </div>

              {filteredReceivables.length === 0 ? (
                <div className="bg-white/60 border border-brand-secondary/20 p-8 rounded-lg text-center text-brand-secondary">
                  <DollarSign className="w-12 h-12 mx-auto text-brand-secondary/40 mb-3" />
                  <p className="font-medium text-sm">No hay planillas de cobro registradas con el filtro seleccionado.</p>
                </div>
              ) : (
                <Card className="bg-white/70 border border-brand-secondary/20 shadow-sm p-0 overflow-hidden">
                  <Table headers={['Planilla / Proyecto', 'Descripción', 'Neto', 'IVA (15%)', 'Monto Total', 'Fecha Vence', 'Estado', 'Acciones']}>
                    {filteredReceivables.map((r) => {
                      const net = Number(r.amount);
                      const iva = net * 0.15;
                      const total = net * 1.15;
                      return (
                        <tr key={r.id} className="hover:bg-brand-bg/50 border-b border-brand-secondary/15 text-xs text-left">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-brand-text font-serif">{r.invoiceNumber || 'Sin Factura'}</div>
                            <div className="text-[10px] text-brand-secondary font-mono mt-0.5">{r.project.name}</div>
                          </td>
                          <td className="px-6 py-4 text-brand-secondary leading-relaxed max-w-xs truncate">
                            {r.description}
                          </td>
                          <td className="px-6 py-4 font-mono text-brand-text">${net.toLocaleString('es-CL')}</td>
                          <td className="px-6 py-4 font-mono text-brand-secondary">${iva.toLocaleString('es-CL')}</td>
                          <td className="px-6 py-4 font-mono text-brand-text font-bold">${total.toLocaleString('es-CL')}</td>
                          <td className="px-6 py-4 text-brand-secondary font-mono">
                            {new Date(r.dueDate).toLocaleDateString('es-CL')}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              r.status === 'PAID'
                                ? 'bg-brand-positive/10 text-brand-positive'
                                : r.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-brand-negative/10 text-brand-negative'
                            }`}>
                              {r.status === 'PAID' ? 'Cobrada' : r.status === 'PENDING' ? 'Pendiente' : 'Vencida'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {r.status === 'PENDING' && hasPermission('APPROVE', 'FINANCIERO') ? (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleOpenCollectConfirm(r)}
                                className="flex items-center gap-1"
                              >
                                <DollarSign className="w-3.5 h-3.5" /> Registrar Cobro
                              </Button>
                            ) : (
                              <span className="text-brand-secondary/50 font-medium italic">Sin acciones</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </Table>
                </Card>
              )}
            </div>
          )}
        </>
      )}

      {/* =============================================================
          DRAWER: REGISTRAR / EDITAR PRESUPUESTO
          ============================================================= */}
      <Drawer
        isOpen={isBudgetDrawerOpen}
        onClose={() => setIsBudgetDrawerOpen(false)}
        title={hasBudget ? 'Editar Presupuesto de Obra' : 'Registrar Presupuesto de Obra'}
      >
        <form onSubmit={handleSaveBudget} className="space-y-4">
          {budgetErrors.api && (
            <div className="p-3 bg-brand-negative/10 border border-brand-negative/20 rounded text-brand-negative text-xs text-left">
              {budgetErrors.api}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">
              Partida: Materiales
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-brand-secondary text-sm">$</span>
              <input
                type="number"
                required
                min="0"
                step="any"
                value={budgetFormData.materialsPlanned}
                onChange={(e) => setBudgetFormData({ ...budgetFormData, materialsPlanned: e.target.value })}
                className="block w-full pl-7 pr-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                placeholder="0"
              />
            </div>
            {budgetErrors.materialsPlanned && <p className="text-[10px] text-brand-negative mt-1">{budgetErrors.materialsPlanned}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">
              Partida: Mano de Obra
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-brand-secondary text-sm">$</span>
              <input
                type="number"
                required
                min="0"
                step="any"
                value={budgetFormData.laborPlanned}
                onChange={(e) => setBudgetFormData({ ...budgetFormData, laborPlanned: e.target.value })}
                className="block w-full pl-7 pr-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                placeholder="0"
              />
            </div>
            {budgetErrors.laborPlanned && <p className="text-[10px] text-brand-negative mt-1">{budgetErrors.laborPlanned}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">
              Partida: Subcontratos
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-brand-secondary text-sm">$</span>
              <input
                type="number"
                required
                min="0"
                step="any"
                value={budgetFormData.subcontractsPlanned}
                onChange={(e) => setBudgetFormData({ ...budgetFormData, subcontractsPlanned: e.target.value })}
                className="block w-full pl-7 pr-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                placeholder="0"
              />
            </div>
            {budgetErrors.subcontractsPlanned && <p className="text-[10px] text-brand-negative mt-1">{budgetErrors.subcontractsPlanned}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">
              Partida: Equipos e Indirectos
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-brand-secondary text-sm">$</span>
              <input
                type="number"
                required
                min="0"
                step="any"
                value={budgetFormData.equipmentPlanned}
                onChange={(e) => setBudgetFormData({ ...budgetFormData, equipmentPlanned: e.target.value })}
                className="block w-full pl-7 pr-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                placeholder="0"
              />
            </div>
            {budgetErrors.equipmentPlanned && <p className="text-[10px] text-brand-negative mt-1">{budgetErrors.equipmentPlanned}</p>}
          </div>

          {/* Suma Total Estimada */}
          <div className="p-3.5 bg-brand-bg rounded-lg border border-brand-secondary/15 flex justify-between items-center text-xs">
            <span className="font-semibold text-brand-secondary uppercase">Monto Total Consolidado</span>
            <span className="font-bold text-sm text-brand-text font-mono">${formTotal.toLocaleString('es-CL')}</span>
          </div>

          <div className="pt-3 border-t border-brand-secondary/15 flex justify-end gap-3">
            <Button variant="secondary" size="sm" type="button" onClick={() => setIsBudgetDrawerOpen(false)} disabled={isBudgetSaving}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={isBudgetSaving}>
              {isBudgetSaving ? 'Guardando...' : hasBudget ? 'Actualizar Presupuesto' : 'Registrar Presupuesto'}
            </Button>
          </div>
        </form>
      </Drawer>
      {/* CONFIRMACIÓN: Liquidar Pago Proveedor */}
      <ConfirmDialog
        isOpen={isPayConfirmOpen}
        onClose={() => {
          setIsPayConfirmOpen(false);
          setPayableToPay(null);
        }}
        onConfirm={handleConfirmPay}
        title="Confirmar Liquidación de Pago"
        description={`¿Está seguro de que desea liquidar y pagar la factura "${payableToPay?.invoiceNumber}" de ${payableToPay?.supplier.name} por un monto neto de $${Number(payableToPay?.amount ?? 0).toLocaleString('es-CL')} (Total con IVA: $${(Number(payableToPay?.amount ?? 0) * 1.15).toLocaleString('es-CL')})? Esta acción registrará la salida real de dinero.`}
        confirmText="Confirmar Pago"
        cancelText="Volver"
        type="warning"
      />

      {/* DRAWER: Registrar Nueva Planilla de Cobro */}
      <Drawer
        isOpen={isReceivableDrawerOpen}
        onClose={() => setIsReceivableDrawerOpen(false)}
        title="Registrar Planilla de Avance (Cuentas por Cobrar)"
      >
        <form onSubmit={handleSaveReceivable} className="space-y-4">
          {receivableErrors.api && (
            <div className="p-3 bg-brand-negative/10 border border-brand-negative/20 rounded text-brand-negative text-xs text-left">
              {receivableErrors.api}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">
              Proyecto / Obra
            </label>
            <select
              required
              value={receivableFormData.projectId}
              onChange={(e) => setReceivableFormData({ ...receivableFormData, projectId: e.target.value })}
              className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
            >
              <option value="">Seleccione el proyecto...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {receivableErrors.projectId && <p className="text-[10px] text-brand-negative mt-1">{receivableErrors.projectId}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">
              Número de Factura / Planilla (Opcional)
            </label>
            <input
              type="text"
              value={receivableFormData.invoiceNumber}
              onChange={(e) => setReceivableFormData({ ...receivableFormData, invoiceNumber: e.target.value })}
              className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
              placeholder="FAC-CLI-1002"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">
              Monto Neto
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-brand-secondary text-sm">$</span>
              <input
                type="number"
                required
                min="0.01"
                step="any"
                value={receivableFormData.amount}
                onChange={(e) => setReceivableFormData({ ...receivableFormData, amount: e.target.value })}
                className="block w-full pl-7 pr-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                placeholder="0.00"
              />
            </div>
            {receivableErrors.amount && <p className="text-[10px] text-brand-negative mt-1">{receivableErrors.amount}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">
              Descripción / Glosa del Cobro
            </label>
            <textarea
              required
              rows={3}
              value={receivableFormData.description}
              onChange={(e) => setReceivableFormData({ ...receivableFormData, description: e.target.value })}
              className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
              placeholder="Planilla correspondiente al 15% de avance en obra negra..."
            />
            {receivableErrors.description && <p className="text-[10px] text-brand-negative mt-1">{receivableErrors.description}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">
              Fecha de Vencimiento
            </label>
            <input
              type="date"
              required
              value={receivableFormData.dueDate}
              onChange={(e) => setReceivableFormData({ ...receivableFormData, dueDate: e.target.value })}
              className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
            />
            {receivableErrors.dueDate && <p className="text-[10px] text-brand-negative mt-1">{receivableErrors.dueDate}</p>}
          </div>

          <div className="pt-3 border-t border-brand-secondary/15 flex justify-end gap-3">
            <Button variant="secondary" size="sm" type="button" onClick={() => setIsReceivableDrawerOpen(false)} disabled={isReceivableSaving}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={isReceivableSaving}>
              {isReceivableSaving ? 'Guardando...' : 'Registrar Planilla'}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* CONFIRMACIÓN: Registrar Cobro Realizado */}
      <ConfirmDialog
        isOpen={isCollectConfirmOpen}
        onClose={() => {
          setIsCollectConfirmOpen(false);
          setReceivableToCollect(null);
        }}
        onConfirm={handleConfirmCollect}
        title="Confirmar Registro de Cobro"
        description={`¿Está seguro de que desea registrar el cobro de la planilla/factura "${receivableToCollect?.invoiceNumber || 'Sin Factura'}" asociada al proyecto "${receivableToCollect?.project.name}" por un monto neto de $${Number(receivableToCollect?.amount ?? 0).toLocaleString('es-CL')} (Total con IVA: $${(Number(receivableToCollect?.amount ?? 0) * 1.15).toLocaleString('es-CL')})? Esto registrará el ingreso real de fondos.`}
        confirmText="Confirmar Cobro"
        cancelText="Volver"
        type="info"
      />
    </div>
  );
};
