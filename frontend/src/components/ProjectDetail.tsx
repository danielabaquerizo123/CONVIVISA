import React, { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { Card } from './Card';
import { Table } from './Table';
import { Button } from './Button';
import { Drawer } from './Drawer';
import { ConfirmDialog } from './ConfirmDialog';
import { 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  MapPin, 
  User, 
  Plus, 
  Edit3, 
  RotateCcw, 
  Hammer, 
  Truck, 
  Wrench, 
  HelpCircle, 
  Clock
} from 'lucide-react';

interface Task {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  phase: string;
  startDate: string;
  endDate: string | null;
  progress: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
}

interface Asset {
  id: string;
  name: string;
  code: string;
  type: 'MACHINERY' | 'TOOL' | 'VEHICLE';
  status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'RETIRED';
}

interface AssetAssignment {
  id: string;
  assetId: string;
  projectId: string;
  assignedById: string;
  assignedAt: string;
  returnedAt: string | null;
  notes: string | null;
  asset: Asset;
}

interface ProjectDetailData {
  id: string;
  name: string;
  location: string;
  startDate: string;
  endDate: string | null;
  estimatedBudget: number;
  status: string;
  residentEngineer: {
    firstName: string;
    lastName: string;
  };
  tasks: Task[];
  assetAssignments: AssetAssignment[];
}

interface ProjectDetailProps {
  projectId: string;
  onBack: () => void;
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({ projectId, onBack }) => {
  const { request } = useApi();
  const { hasPermission } = useAuth();

  // Estados de carga de datos
  const [project, setProject] = useState<ProjectDetailData | null>(null);
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'tasks' | 'assets'>('tasks');

  // Estados del Drawer de Tareas (Crear/Editar)
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskFormData, setTaskFormData] = useState({
    name: '',
    description: '',
    phase: '',
    startDate: '',
    endDate: '',
    progress: '0',
    status: 'PENDING',
  });
  const [taskErrors, setTaskErrors] = useState<Record<string, string>>({});
  const [isTaskSaving, setIsTaskSaving] = useState(false);

  // Estados del Drawer de Asignación de Activos
  const [isAssetDrawerOpen, setIsAssetDrawerOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [isAssetSaving, setIsAssetSaving] = useState(false);
  const [assetErrors, setAssetErrors] = useState<Record<string, string>>({});

  // Estados de Confirmación para retorno de activos
  const [isConfirmReturnOpen, setIsConfirmReturnOpen] = useState(false);
  const [assignmentToReturn, setAssignmentToReturn] = useState<AssetAssignment | null>(null);

  // Cargar información de obra
  const loadProjectDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await request(`/api/projects/${projectId}`);
      setProject(res);
    } catch (err: any) {
      setError(err.message || 'Error al obtener detalle del proyecto');
    } finally {
      setLoading(false);
    }
  };

  // Cargar lista de maquinaria disponible
  const loadAvailableAssets = async () => {
    try {
      const res = await request('/api/projects/assets?status=AVAILABLE');
      setAvailableAssets(res);
    } catch (err) {
      console.log('Error al cargar activos disponibles:', err);
    }
  };

  useEffect(() => {
    loadProjectDetail();
  }, [projectId]);

  useEffect(() => {
    if (isAssetDrawerOpen) {
      loadAvailableAssets();
    }
  }, [isAssetDrawerOpen]);

  // =============================================================
  // LOGICA: TAREAS Y CRONOGRAMA
  // =============================================================
  const handleOpenTaskDrawer = (task?: Task) => {
    setTaskErrors({});
    if (task) {
      setEditingTask(task);
      setTaskFormData({
        name: task.name,
        description: task.description || '',
        phase: task.phase,
        startDate: new Date(task.startDate).toISOString().split('T')[0],
        endDate: task.endDate ? new Date(task.endDate).toISOString().split('T')[0] : '',
        progress: task.progress.toString(),
        status: task.status,
      });
    } else {
      setEditingTask(null);
      setTaskFormData({
        name: '',
        description: '',
        phase: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        progress: '0',
        status: 'PENDING',
      });
    }
    setIsTaskDrawerOpen(true);
  };

  const validateTaskForm = () => {
    const errors: Record<string, string> = {};
    if (!taskFormData.name.trim()) errors.name = 'El nombre de la tarea es requerido.';
    if (!taskFormData.phase.trim()) errors.phase = 'La fase de la obra es requerida.';
    if (!taskFormData.startDate) errors.startDate = 'La fecha de inicio es requerida.';

    const progVal = parseInt(taskFormData.progress);
    if (isNaN(progVal) || progVal < 0 || progVal > 100) {
      errors.progress = 'El avance debe ser un número entre 0 y 100.';
    }

    setTaskErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateTaskForm()) return;

    try {
      setIsTaskSaving(true);
      const payload: any = {
        name: taskFormData.name,
        description: taskFormData.description || undefined,
        phase: taskFormData.phase,
        startDate: new Date(taskFormData.startDate).toISOString(),
        endDate: taskFormData.endDate ? new Date(taskFormData.endDate).toISOString() : undefined,
        progress: parseInt(taskFormData.progress),
      };

      if (editingTask) {
        payload.status = taskFormData.status;
      }

      if (editingTask) {
        await request(`/api/projects/tasks/${editingTask.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await request(`/api/projects/${projectId}/tasks`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setIsTaskDrawerOpen(false);
      loadProjectDetail();
    } catch (err: any) {
      setTaskErrors({ api: err.message || 'Error al guardar tarea.' });
    } finally {
      setIsTaskSaving(false);
    }
  };

  // =============================================================
  // LOGICA: ASIGNACION / RETORNO DE ACTIVOS
  // =============================================================
  const handleOpenAssetDrawer = () => {
    setAssetErrors({});
    setSelectedAssetId('');
    setAssignmentNotes('');
    setIsAssetDrawerOpen(true);
  };

  const handleAssignAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssetErrors({});
    if (!selectedAssetId) {
      setAssetErrors({ assetId: 'Debe seleccionar un activo disponible.' });
      return;
    }

    try {
      setIsAssetSaving(true);
      await request('/api/projects/assets/assign', {
        method: 'POST',
        body: JSON.stringify({
          assetId: selectedAssetId,
          projectId,
          notes: assignmentNotes || undefined,
        }),
      });

      setIsAssetDrawerOpen(false);
      loadProjectDetail();
    } catch (err: any) {
      setAssetErrors({ api: err.message || 'Error al asignar activo.' });
    } finally {
      setIsAssetSaving(false);
    }
  };

  const handleReturnClick = (assignment: AssetAssignment) => {
    setAssignmentToReturn(assignment);
    setIsConfirmReturnOpen(true);
  };

  const handleConfirmReturn = async () => {
    if (!assignmentToReturn) return;
    try {
      await request('/api/projects/assets/return', {
        method: 'POST',
        body: JSON.stringify({
          assetId: assignmentToReturn.assetId,
          notes: 'Retornado y liberado desde portal ERP.',
        }),
      });
      setIsConfirmReturnOpen(false);
      setAssignmentToReturn(null);
      loadProjectDetail();
    } catch (err: any) {
      alert(`Error al registrar el retorno: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4 font-sans">
        <svg className="animate-spin h-10 w-10 text-brand-primary" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-brand-secondary font-medium">Cargando bitácora de obra...</span>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-6 bg-brand-negative/10 border border-brand-negative/30 rounded-lg text-brand-negative font-sans max-w-xl mx-auto mt-12 text-left">
        <h3 className="font-bold text-lg mb-2 font-serif">Error</h3>
        <p>{error || 'No se pudo cargar la ficha del proyecto.'}</p>
        <Button onClick={onBack} variant="primary" className="mt-4 flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Volver
        </Button>
      </div>
    );
  }

  // Agrupar tareas por fases
  const tasksByPhase: Record<string, Task[]> = {};
  for (const t of project.tasks) {
    if (!tasksByPhase[t.phase]) {
      tasksByPhase[t.phase] = [];
    }
    tasksByPhase[t.phase].push(t);
  }

  // Filtrar solo asignaciones activas (sin returnedAt)
  const activeAssignments = project.assetAssignments.filter(a => a.returnedAt === null);

  const getAssetTypeIcon = (type: string) => {
    switch (type) {
      case 'MACHINERY': return <Hammer className="w-4 h-4" />;
      case 'VEHICLE': return <Truck className="w-4 h-4" />;
      case 'TOOL': return <Wrench className="w-4 h-4" />;
      default: return <HelpCircle className="w-4 h-4" />;
    }
  };

  const getAssetTypeLabel = (type: string) => {
    switch (type) {
      case 'MACHINERY': return 'Maquinaria Pesada';
      case 'VEHICLE': return 'Vehículo de Obra';
      case 'TOOL': return 'Herramienta Menor';
      default: return type;
    }
  };

  return (
    <div className="space-y-6 font-sans text-left">
      {/* Botón Volver y Cabecera */}
      <div className="flex flex-col gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-forest hover:text-brand-text uppercase tracking-wider transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al listado de obras
        </button>

        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold text-brand-text font-serif">{project.name}</h1>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-brand-secondary">
              <MapPin className="w-4 h-4" />
              <span>{project.location}</span>
              <span className="text-brand-secondary/35">•</span>
              <span className="capitalize font-medium">Estado: {project.status.toLowerCase().replace('_', ' ')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Ficha Técnica */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white/70 border border-brand-secondary/20 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-forest/10 flex items-center justify-center text-brand-forest">
            <User className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-brand-secondary block">Ingeniero Residente</span>
            <span className="text-sm font-semibold text-brand-text">
              {project.residentEngineer ? `${project.residentEngineer.firstName} ${project.residentEngineer.lastName}` : 'No asignado'}
            </span>
          </div>
        </Card>

        <Card className="bg-white/70 border border-brand-secondary/20 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-brand-secondary block">Fechas Planificadas</span>
            <span className="text-xs font-semibold text-brand-text">
              {new Date(project.startDate).toLocaleDateString()}
              {project.endDate ? ` − ${new Date(project.endDate).toLocaleDateString()}` : ' (Sin fecha término)'}
            </span>
          </div>
        </Card>

        <Card className="bg-white/70 border border-brand-secondary/20 shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-positive/10 flex items-center justify-center text-brand-positive">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-brand-secondary block">Presupuesto Estimado</span>
            <span className="text-sm font-bold font-mono text-brand-text">
              ${project.estimatedBudget.toLocaleString('es-CL', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-brand-secondary/20">
        <button
          onClick={() => setActiveSubTab('tasks')}
          className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all duration-150 ${
            activeSubTab === 'tasks'
              ? 'border-brand-primary text-brand-primary font-bold'
              : 'border-transparent text-brand-secondary hover:text-brand-text'
          }`}
        >
          Cronograma y Fases ({project.tasks.length})
        </button>
        <button
          onClick={() => setActiveSubTab('assets')}
          className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all duration-150 ${
            activeSubTab === 'assets'
              ? 'border-brand-primary text-brand-primary font-bold'
              : 'border-transparent text-brand-secondary hover:text-brand-text'
          }`}
        >
          Maquinaria y Activos ({activeAssignments.length})
        </button>
      </div>

      {/* Tab: Tareas y Cronograma */}
      {activeSubTab === 'tasks' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-brand-text font-serif">Fases Constructivas</h3>
            {hasPermission('CREATE', 'PROYECTOS') && (
              <Button variant="secondary" size="sm" onClick={() => handleOpenTaskDrawer()} className="flex items-center gap-1">
                <Plus className="w-4 h-4" /> Agregar Actividad
              </Button>
            )}
          </div>

          {project.tasks.length === 0 ? (
            <div className="bg-white/60 border border-brand-secondary/25 p-8 rounded-lg text-center text-brand-secondary">
              <Clock className="w-12 h-12 mx-auto text-brand-secondary/40 mb-3" />
              <p className="font-medium">No se registran tareas asociadas a esta obra.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(tasksByPhase).map(([phase, tasks]) => (
                <div key={phase} className="bg-white/40 border border-brand-secondary/15 rounded-lg p-5 space-y-4">
                  <h4 className="text-base font-bold text-brand-forest border-b border-brand-secondary/10 pb-2 font-serif">
                    Fase: {phase}
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tasks.map((task) => (
                      <Card key={task.id} className="bg-white border border-brand-secondary/20 shadow-sm p-4 relative flex flex-col justify-between min-h-[140px]">
                        <div>
                          <div className="flex justify-between items-start gap-4">
                            <span className="font-semibold text-brand-text text-sm font-serif text-left block">{task.name}</span>
                            
                            {/* Estatus Badge tal cual viene de BD */}
                            {task.status === 'PENDING' && (
                              <span className="px-2 py-0.5 text-[9px] font-semibold rounded bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/20 uppercase shrink-0">Pendiente</span>
                            )}
                            {task.status === 'IN_PROGRESS' && (
                              <span className="px-2 py-0.5 text-[9px] font-semibold rounded bg-brand-primary/10 text-brand-primary border border-brand-primary/20 uppercase shrink-0">En Progreso</span>
                            )}
                            {task.status === 'COMPLETED' && (
                              <span className="px-2 py-0.5 text-[9px] font-semibold rounded bg-brand-positive/10 text-brand-positive border border-brand-positive/20 uppercase shrink-0">Completada</span>
                            )}
                          </div>

                          {task.description && (
                            <p className="text-[11px] text-brand-secondary mt-1 line-clamp-2 text-left">{task.description}</p>
                          )}

                          <div className="text-[10px] text-brand-secondary mt-2 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Inicio: {new Date(task.startDate).toLocaleDateString()}</span>
                            {task.endDate && (
                              <>
                                <span>−</span>
                                <span>Término: {new Date(task.endDate).toLocaleDateString()}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Signature Progress Bar */}
                        <div className="mt-4 space-y-1">
                          <div className="flex justify-between items-center text-[10px] font-semibold text-brand-secondary">
                            <span>Avance Físico</span>
                            <span className="font-mono">{task.progress}%</span>
                          </div>
                          <div className="w-full bg-brand-secondary/20 h-2 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full bg-gradient-to-r from-brand-positive to-brand-primary" 
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Botón Editar Actividad */}
                        {hasPermission('UPDATE', 'PROYECTOS') && (
                          <button
                            onClick={() => handleOpenTaskDrawer(task)}
                            className="absolute bottom-3 right-3 text-brand-secondary hover:text-brand-primary p-1 rounded hover:bg-brand-bg transition-colors"
                            title="Editar actividad"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Activos y Maquinaria */}
      {activeSubTab === 'assets' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-brand-text font-serif">Maquinaria y Herramientas Asignadas</h3>
            {hasPermission('UPDATE', 'PROYECTOS') && (
              <Button variant="secondary" size="sm" onClick={handleOpenAssetDrawer} className="flex items-center gap-1">
                <Plus className="w-4 h-4" /> Asignar Activo
              </Button>
            )}
          </div>

          {activeAssignments.length === 0 ? (
            <div className="bg-white/60 border border-brand-secondary/25 p-8 rounded-lg text-center text-brand-secondary">
              <Truck className="w-12 h-12 mx-auto text-brand-secondary/40 mb-3" />
              <p className="font-medium">No se registran herramientas ni maquinaria activa asignada a esta obra.</p>
            </div>
          ) : (
            <Card className="bg-white/70 border border-brand-secondary/20 shadow-sm p-0 overflow-hidden">
              <Table headers={['Activo / Código', 'Categoría', 'Estado Actual', 'Fecha Asignación', 'Observaciones', 'Acción']}>
                {activeAssignments.map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-brand-bg/50 border-b border-brand-secondary/15">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-brand-text text-sm flex items-center gap-2">
                        {getAssetTypeIcon(assignment.asset.type)}
                        {assignment.asset.name}
                      </div>
                      <div className="text-[10px] text-brand-secondary font-mono mt-0.5">Cod: {assignment.asset.code}</div>
                    </td>
                    <td className="px-6 py-4 text-xs text-brand-text">
                      {getAssetTypeLabel(assignment.asset.type)}
                    </td>
                    <td className="px-6 py-4">
                      {assignment.asset.status === 'AVAILABLE' && (
                        <span className="px-2 py-0.5 text-[9px] font-semibold rounded bg-brand-positive/10 text-brand-positive border border-brand-positive/20">DISPONIBLE</span>
                      )}
                      {assignment.asset.status === 'IN_USE' && (
                        <span className="px-2 py-0.5 text-[9px] font-semibold rounded bg-brand-primary/10 text-brand-primary border border-brand-primary/20">EN USO</span>
                      )}
                      {assignment.asset.status === 'MAINTENANCE' && (
                        <span className="px-2 py-0.5 text-[9px] font-semibold rounded bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/20">MANTENIMIENTO</span>
                      )}
                      {assignment.asset.status === 'RETIRED' && (
                        <span className="px-2 py-0.5 text-[9px] font-semibold rounded bg-brand-negative/10 text-brand-negative border border-brand-negative/20">RETIRADO</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-brand-secondary">
                      {new Date(assignment.assignedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-xs text-brand-secondary max-w-xs truncate">
                      {assignment.notes || '−'}
                    </td>
                    <td className="px-6 py-4">
                      {hasPermission('UPDATE', 'PROYECTOS') && (
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          onClick={() => handleReturnClick(assignment)}
                          className="flex items-center gap-1 text-xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Registrar Retorno
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </Table>
            </Card>
          )}
        </div>
      )}

      {/* DRAWER: Crear/Editar Tarea */}
      <Drawer
        isOpen={isTaskDrawerOpen}
        onClose={() => setIsTaskDrawerOpen(false)}
        title={editingTask ? 'Modificar Actividad de Obra' : 'Crear Nueva Actividad'}
      >
        <form onSubmit={handleSaveTask} className="space-y-4">
          {taskErrors.api && (
            <div className="p-3 bg-brand-negative/10 border border-brand-negative/20 rounded text-brand-negative text-xs">
              {taskErrors.api}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">Nombre de la Actividad</label>
            <input
              type="text"
              required
              value={taskFormData.name}
              onChange={(e) => setTaskFormData({ ...taskFormData, name: e.target.value })}
              className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary"
              placeholder="Instalación de radier"
            />
            {taskErrors.name && <p className="text-[10px] text-brand-negative mt-1">{taskErrors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">Fase de la Obra</label>
            <input
              type="text"
              required
              value={taskFormData.phase}
              onChange={(e) => setTaskFormData({ ...taskFormData, phase: e.target.value })}
              className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary"
              placeholder="Cimentación"
            />
            {taskErrors.phase && <p className="text-[10px] text-brand-negative mt-1">{taskErrors.phase}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">Descripción</label>
            <textarea
              value={taskFormData.description}
              onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
              rows={3}
              className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary resize-none"
              placeholder="Detalle los materiales y requerimientos..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">Fecha Inicio</label>
              <input
                type="date"
                required
                value={taskFormData.startDate}
                onChange={(e) => setTaskFormData({ ...taskFormData, startDate: e.target.value })}
                className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary"
              />
              {taskErrors.startDate && <p className="text-[10px] text-brand-negative mt-1">{taskErrors.startDate}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">Fecha Término</label>
              <input
                type="date"
                value={taskFormData.endDate}
                onChange={(e) => setTaskFormData({ ...taskFormData, endDate: e.target.value })}
                className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5 flex justify-between">
              <span>Progreso Físico</span>
              <span className="font-mono text-brand-primary font-bold">{taskFormData.progress}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={taskFormData.progress}
              onChange={(e) => setTaskFormData({ ...taskFormData, progress: e.target.value })}
              className="w-full accent-brand-primary bg-brand-bg rounded-lg h-2 cursor-pointer mt-1"
            />
            {taskErrors.progress && <p className="text-[10px] text-brand-negative mt-1">{taskErrors.progress}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">Estado de la Tarea</label>
            <select
              value={taskFormData.status}
              onChange={(e) => setTaskFormData({ ...taskFormData, status: e.target.value })}
              className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary"
            >
              <option value="PENDING">Pendiente (No iniciada)</option>
              <option value="IN_PROGRESS">En Progreso (Activa)</option>
              <option value="COMPLETED">Completada (Cierre de Control)</option>
            </select>
          </div>

          <div className="pt-3 border-t border-brand-secondary/15 flex justify-end gap-3">
            <Button variant="secondary" size="sm" type="button" onClick={() => setIsTaskDrawerOpen(false)} disabled={isTaskSaving}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={isTaskSaving}>
              {isTaskSaving ? 'Guardando...' : editingTask ? 'Guardar Cambios' : 'Crear Tarea'}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* DRAWER: Asignar Activo */}
      <Drawer
        isOpen={isAssetDrawerOpen}
        onClose={() => setIsAssetDrawerOpen(false)}
        title="Asignar Activo / Herramienta a Obra"
      >
        <form onSubmit={handleAssignAsset} className="space-y-5">
          {assetErrors.api && (
            <div className="p-3 bg-brand-negative/10 border border-brand-negative/20 rounded text-brand-negative text-xs">
              {assetErrors.api}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">Maquinaria Disponible</label>
            <select
              required
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value)}
              className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary"
            >
              <option value="">Seleccione activo de bodega...</option>
              {availableAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.name} (Cod: {asset.code}) − {getAssetTypeLabel(asset.type)}
                </option>
              ))}
            </select>
            {assetErrors.assetId && <p className="text-[10px] text-brand-negative mt-1">{assetErrors.assetId}</p>}
            {availableAssets.length === 0 && (
              <p className="text-[10px] text-brand-secondary/80 mt-1.5 italic">
                * No hay maquinaria o herramientas disponibles en almacén en este momento.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">Notas de Despacho / Asignación</label>
            <textarea
              value={assignmentNotes}
              onChange={(e) => setAssignmentNotes(e.target.value)}
              rows={3}
              className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary resize-none"
              placeholder="Ej. Se envía con estanque lleno de combustible..."
            />
          </div>

          <div className="pt-3 border-t border-brand-secondary/15 flex justify-end gap-3">
            <Button variant="secondary" size="sm" type="button" onClick={() => setIsAssetDrawerOpen(false)} disabled={isAssetSaving}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={isAssetSaving || availableAssets.length === 0}>
              {isAssetSaving ? 'Asignando...' : 'Asignar Activo'}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* CONFIRMACION: Retorno de Activo */}
      <ConfirmDialog
        isOpen={isConfirmReturnOpen}
        onClose={() => setIsConfirmReturnOpen(false)}
        onConfirm={handleConfirmReturn}
        title="Registrar retorno de maquinaria"
        description={`¿Está seguro de que desea registrar el retorno de la maquinaria "${assignmentToReturn?.asset.name}" (Cod: ${assignmentToReturn?.asset.code}) a bodega? Esta acción liberará la maquinaria y modificará su estado a "DISPONIBLE" para que pueda ser asignada a otras obras constructivas.`}
        confirmText="Confirmar Retorno"
        cancelText="Volver"
        type="warning"
      />
    </div>
  );
};
