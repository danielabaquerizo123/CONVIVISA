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
  Trash2, 
  Eye, 
  Briefcase, 
  MapPin, 
  DollarSign, 
  UserCheck 
} from 'lucide-react';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
}

interface Project {
  id: string;
  name: string;
  location: string;
  startDate: string;
  endDate: string | null;
  estimatedBudget: number;
  status: 'PLANNING' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  residentEngineerId: string;
  residentEngineer: {
    id: string;
    firstName: string;
    lastName: string;
  };
  _count: {
    employees: number;
    tasks: number;
    assetAssignments: number;
  };
}

interface ProjectsProps {
  onViewProject: (projectId: string) => void;
}

export const Projects: React.FC<ProjectsProps> = ({ onViewProject }) => {
  const { request } = useApi();
  const { hasPermission } = useAuth();

  // Estados del listado
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Estados del Drawer (Crear/Editar)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    startDate: '',
    endDate: '',
    estimatedBudget: '',
    residentEngineerId: '',
    status: 'PLANNING',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Estados del diálogo de confirmación de bajas lógicas
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // Cargar listado de obras
  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = statusFilter ? `/api/projects?status=${statusFilter}` : '/api/projects';
      const res = await request(url);
      setProjects(res);
    } catch (err: any) {
      setError(err.message || 'Error al obtener listado de proyectos');
    } finally {
      setLoading(false);
    }
  };

  // Cargar lista de empleados para ingenieros residentes (módulo Administrativo)
  const loadEmployees = async () => {
    try {
      const res = await request('/api/employees');
      setEmployees(res);
    } catch (err) {
      console.log('No se pudieron cargar ingenieros (falta permiso ADMINISTRATIVO:READ):', err);
    }
  };

  useEffect(() => {
    loadProjects();
  }, [statusFilter]);

  useEffect(() => {
    if (isDrawerOpen) {
      loadEmployees();
    }
  }, [isDrawerOpen]);

  // Manejar eliminación lógica (dar de baja)
  const handleDeleteClick = (project: Project) => {
    setProjectToDelete(project);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    try {
      await request(`/api/projects/${projectToDelete.id}`, {
        method: 'DELETE',
      });
      setIsConfirmOpen(false);
      setProjectToDelete(null);
      loadProjects();
    } catch (err: any) {
      alert(`Error al dar de baja el proyecto: ${err.message}`);
    }
  };

  // Abrir Drawer para crear o editar
  const handleOpenDrawer = (project?: Project) => {
    setFormErrors({});
    if (project) {
      setEditingProject(project);
      setFormData({
        name: project.name,
        location: project.location,
        startDate: new Date(project.startDate).toISOString().split('T')[0],
        endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
        estimatedBudget: project.estimatedBudget.toString(),
        residentEngineerId: project.residentEngineerId,
        status: project.status,
      });
    } else {
      setEditingProject(null);
      setFormData({
        name: '',
        location: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        estimatedBudget: '',
        residentEngineerId: '',
        status: 'PLANNING',
      });
    }
    setIsDrawerOpen(true);
  };

  // Validaciones de formulario (reflejo de class-validator del DTO)
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'El nombre del proyecto es requerido.';
    if (!formData.location.trim()) errors.location = 'La ubicación es requerida.';
    if (!formData.startDate) errors.startDate = 'La fecha de inicio es requerida.';
    
    const budgetVal = parseFloat(formData.estimatedBudget);
    if (!formData.estimatedBudget) {
      errors.estimatedBudget = 'El presupuesto estimado es requerido.';
    } else if (isNaN(budgetVal) || budgetVal <= 0) {
      errors.estimatedBudget = 'El presupuesto estimado debe ser un número positivo.';
    }

    if (!formData.residentEngineerId) {
      errors.residentEngineerId = 'El ID del ingeniero residente es requerido.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Guardar formulario
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsSaving(true);
      const payload: any = {
        name: formData.name,
        location: formData.location,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
        estimatedBudget: parseFloat(formData.estimatedBudget),
        residentEngineerId: formData.residentEngineerId,
      };

      if (editingProject) {
        payload.status = formData.status;
      }

      if (editingProject) {
        await request(`/api/projects/${editingProject.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await request('/api/projects', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setIsDrawerOpen(false);
      loadProjects();
    } catch (err: any) {
      setFormErrors({ api: err.message || 'Error al guardar los datos del proyecto.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 font-sans text-left">
      {/* Encabezado y Filtrado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-brand-text font-serif">Proyectos y Obras</h1>
          <p className="text-sm text-brand-secondary">Fichas técnicas y estados de ejecución de obras activas</p>
        </div>
        {hasPermission('CREATE', 'PROYECTOS') && (
          <Button variant="primary" onClick={() => handleOpenDrawer()} className="flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            Nueva Obra
          </Button>
        )}
      </div>

      {/* Barra de Filtros */}
      <Card className="bg-white/70 border border-brand-secondary/20 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-brand-text">Filtrar por Estado</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-brand-bg border border-brand-secondary/30 rounded text-brand-text px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary w-48"
            >
              <option value="">Todos los Estados</option>
              <option value="PLANNING">Planificación</option>
              <option value="IN_PROGRESS">En Progreso</option>
              <option value="ON_HOLD">En Espera</option>
              <option value="COMPLETED">Completada</option>
              <option value="CANCELLED">Cancelada</option>
            </select>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setStatusFilter('')} className="mt-5">
            Limpiar Filtros
          </Button>
        </div>
      </Card>

      {/* Carga e Historial */}
      {loading ? (
        <SkeletonTable cols={6} rows={4} />
      ) : error ? (
        <div className="p-4 bg-brand-negative/10 border border-brand-negative/30 rounded text-brand-negative text-sm">
          {error}
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white/60 border border-brand-secondary/20 p-8 rounded-lg text-center text-brand-secondary">
          <Briefcase className="w-12 h-12 mx-auto text-brand-secondary/40 mb-3" />
          <p className="font-medium">No se encontraron obras registradas.</p>
        </div>
      ) : (
        <Card className="bg-white/70 border border-brand-secondary/20 shadow-sm p-0 overflow-hidden">
          <Table headers={['Nombre / Ubicación', 'Ing. Residente', 'Fechas', 'Presupuesto', 'Estado', 'Acciones']}>
            {projects.map((project) => (
              <tr key={project.id} className="hover:bg-brand-bg/50 border-b border-brand-secondary/15">
                <td className="px-6 py-4">
                  <div className="font-semibold text-brand-text font-serif text-sm">{project.name}</div>
                  <div className="text-[11px] text-brand-secondary flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-brand-secondary" />
                    {project.location}
                  </div>
                </td>
                <td className="px-6 py-4 text-xs text-brand-text">
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-brand-forest" />
                    <span>{project.residentEngineer ? `${project.residentEngineer.firstName} ${project.residentEngineer.lastName}` : 'No asignado'}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-[11px] text-brand-secondary">
                  <div className="flex flex-col gap-0.5">
                    <div><span className="font-medium text-brand-text">Inicio:</span> {new Date(project.startDate).toLocaleDateString()}</div>
                    {project.endDate && (
                      <div><span className="font-medium text-brand-text">Fin:</span> {new Date(project.endDate).toLocaleDateString()}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 font-mono text-xs text-brand-text font-medium">
                  ${project.estimatedBudget.toLocaleString('es-CL')}
                </td>
                <td className="px-6 py-4">
                  {project.status === 'PLANNING' && (
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/20">Planificación</span>
                  )}
                  {project.status === 'IN_PROGRESS' && (
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-brand-positive/10 text-brand-positive border border-brand-positive/20">En Progreso</span>
                  )}
                  {project.status === 'ON_HOLD' && (
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-brand-primary/10 text-brand-primary border border-brand-primary/20">En Espera</span>
                  )}
                  {project.status === 'COMPLETED' && (
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-brand-forest/10 text-[#faf7f2] border border-brand-forest/20">Completada</span>
                  )}
                  {project.status === 'CANCELLED' && (
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-brand-negative/10 text-brand-negative border border-brand-negative/20">Cancelada</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {hasPermission('READ', 'PROYECTOS') && (
                      <button
                        onClick={() => onViewProject(project.id)}
                        title="Ver detalle de fases"
                        className="text-brand-forest hover:text-brand-text hover:bg-brand-forest/10 rounded p-1 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    {hasPermission('UPDATE', 'PROYECTOS') && (
                      <button
                        onClick={() => handleOpenDrawer(project)}
                        title="Editar ficha"
                        className="text-brand-primary hover:text-brand-text hover:bg-brand-primary/10 rounded p-1 transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                    {hasPermission('DELETE', 'PROYECTOS') && (
                      <button
                        onClick={() => handleDeleteClick(project)}
                        title="Dar de baja"
                        className="text-brand-negative hover:text-brand-text hover:bg-brand-negative/10 rounded p-1 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {/* Drawer deslizante lateral para creación/edición */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingProject ? 'Editar Ficha de Obra' : 'Registrar Nueva Obra'}
      >
        <form onSubmit={handleSave} className="space-y-5">
          {formErrors.api && (
            <div className="p-3 bg-brand-negative/10 border border-brand-negative/20 rounded text-brand-negative text-xs">
              {formErrors.api}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">Nombre del Proyecto</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary"
              placeholder="Edificio Parque Central"
            />
            {formErrors.name && <p className="text-[10px] text-brand-negative mt-1">{formErrors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">Ubicación</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary"
              placeholder="Av. del Mar 1450, Coquimbo"
            />
            {formErrors.location && <p className="text-[10px] text-brand-negative mt-1">{formErrors.location}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">Fecha de Inicio</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary"
              />
              {formErrors.startDate && <p className="text-[10px] text-brand-negative mt-1">{formErrors.startDate}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">Fecha de Fin (Opcional)</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">Presupuesto Estimado ($)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-brand-secondary">
                <DollarSign className="w-4 h-4" />
              </span>
              <input
                type="number"
                value={formData.estimatedBudget}
                onChange={(e) => setFormData({ ...formData, estimatedBudget: e.target.value })}
                className="block w-full pl-9 pr-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary"
                placeholder="500000"
              />
            </div>
            {formErrors.estimatedBudget && <p className="text-[10px] text-brand-negative mt-1">{formErrors.estimatedBudget}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">Ingeniero Residente</label>
            <select
              value={formData.residentEngineerId}
              onChange={(e) => setFormData({ ...formData, residentEngineerId: e.target.value })}
              className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary"
            >
              <option value="">Seleccione un ingeniero...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}
                </option>
              ))}
            </select>
            {formErrors.residentEngineerId && <p className="text-[10px] text-brand-negative mt-1">{formErrors.residentEngineerId}</p>}
            {employees.length === 0 && (
              <p className="text-[9.5px] text-brand-secondary/80 mt-1 italic">
                * Cargando residentes. Si no posee permisos administrativos, solicite la precarga al departamento correspondiente.
              </p>
            )}
          </div>

          {editingProject && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">Estado de la Obra</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary"
              >
                <option value="PLANNING">Planificación</option>
                <option value="IN_PROGRESS">En Progreso</option>
                <option value="ON_HOLD">En Espera</option>
                <option value="COMPLETED">Completada</option>
                <option value="CANCELLED">Cancelada</option>
              </select>
            </div>
          )}

          <div className="pt-3 border-t border-brand-secondary/15 flex justify-end gap-3">
            <Button variant="secondary" size="sm" type="button" onClick={() => setIsDrawerOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={isSaving}>
              {isSaving ? 'Guardando...' : editingProject ? 'Guardar Cambios' : 'Registrar Obra'}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Diálogo de confirmación para bajas lógicas */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Dar de baja obra"
        description={`¿Está seguro de que desea dar de baja la obra "${projectToDelete?.name}"? Esta acción desactivará el proyecto y suspenderá los flujos operativos de forma lógica, conservando todos los registros históricos en la base de datos.`}
        confirmText="Desactivar Obra"
        cancelText="Volver"
        type="danger"
      />
    </div>
  );
};
