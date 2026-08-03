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
  ShieldAlert, 
  Briefcase, 
  Lock,
  Mail,
  Phone
} from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: Permission[];
}

interface Permission {
  id: string;
  action: string;
  module: string;
  description: string | null;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  roleId: string;
  role: {
    id: string;
    name: string;
  };
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  documentId: string;
  email: string;
  phone: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';
  userId: string | null;
}

export const Admin: React.FC = () => {
  const { request } = useApi();
  const { hasPermission } = useAuth();

  // Estados de navegación interna
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'employees' | 'roles'>('users');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Datos base cargados de la API
  const [usersList, setUsersList] = useState<User[]>([]);
  const [employeesList, setEmployeesList] = useState<Employee[]>([]);
  const [rolesList, setRolesList] = useState<Role[]>([]);
  const [permissionsList, setPermissionsList] = useState<Permission[]>([]);

  // Estados del Drawer de Usuarios
  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    roleId: '',
    status: 'ACTIVE',
  });
  const [userErrors, setUserErrors] = useState<Record<string, string>>({});
  const [isUserSaving, setIsUserSaving] = useState(false);

  // Estados del Drawer de Empleados
  const [isEmployeeDrawerOpen, setIsEmployeeDrawerOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeFormData, setEmployeeFormData] = useState({
    firstName: '',
    lastName: '',
    documentId: '',
    email: '',
    phone: '',
    status: 'ACTIVE',
    userId: '',
  });
  const [employeeErrors, setEmployeeErrors] = useState<Record<string, string>>({});
  const [isEmployeeSaving, setIsEmployeeSaving] = useState(false);

  // Estados del diálogo de confirmación de bajas lógicas (Usuarios y Empleados)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'user' | 'employee';
    id: string;
    title: string;
    description: string;
  }>({
    isOpen: false,
    type: 'user',
    id: '',
    title: '',
    description: '',
  });

  // Estados de Matriz de Permisos
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);
  const [isMatrixSaving, setIsMatrixSaving] = useState(false);

  // Cargar datos según la pestaña activa
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (activeSubTab === 'users') {
        const [uRes, rRes] = await Promise.all([
          request('/api/users'),
          request('/api/users/roles')
        ]);
        setUsersList(uRes);
        setRolesList(rRes);
      } else if (activeSubTab === 'employees') {
        const [eRes, uRes] = await Promise.all([
          request('/api/employees'),
          request('/api/users')
        ]);
        setEmployeesList(eRes);
        setUsersList(uRes);
      } else if (activeSubTab === 'roles') {
        const [rRes, pRes] = await Promise.all([
          request('/api/users/roles'),
          request('/api/users/permissions')
        ]);
        setRolesList(rRes);
        setPermissionsList(pRes);
        
        // Seleccionar primer rol por defecto
        if (rRes.length > 0 && !selectedRoleId) {
          setSelectedRoleId(rRes[0].id);
          setSelectedPermissionIds(rRes[0].permissions.map((p: any) => p.id));
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error al obtener datos administrativos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeSubTab]);

  // Sincronizar permisos seleccionados al cambiar el rol activo en la matriz
  useEffect(() => {
    if (activeSubTab === 'roles' && selectedRoleId) {
      const activeRole = rolesList.find(r => r.id === selectedRoleId);
      if (activeRole) {
        setSelectedPermissionIds(activeRole.permissions.map(p => p.id));
      }
    }
  }, [selectedRoleId, rolesList]);

  // =============================================================
  // CRUD: USUARIOS (SYSTEM ACCOUNTS)
  // =============================================================
  const handleOpenUserDrawer = (user?: User) => {
    setUserErrors({});
    if (user) {
      setEditingUser(user);
      setUserFormData({
        email: user.email,
        password: '', // Contraseña en blanco para edición
        firstName: user.firstName,
        lastName: user.lastName,
        roleId: user.roleId,
        status: user.status,
      });
    } else {
      setEditingUser(null);
      setUserFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        roleId: rolesList[0]?.id || '',
        status: 'ACTIVE',
      });
    }
    setIsUserDrawerOpen(true);
  };

  const validateUserForm = () => {
    const errors: Record<string, string> = {};
    if (!userFormData.email.trim()) {
      errors.email = 'El correo electrónico es requerido.';
    } else if (!/\S+@\S+\.\S+/.test(userFormData.email)) {
      errors.email = 'El formato de correo no es válido.';
    }

    if (!editingUser && !userFormData.password) {
      errors.password = 'La contraseña es requerida para cuentas nuevas.';
    }

    if (!userFormData.firstName.trim()) errors.firstName = 'El nombre es requerido.';
    if (!userFormData.lastName.trim()) errors.lastName = 'El apellido es requerido.';
    if (!userFormData.roleId) errors.roleId = 'Debe seleccionar un rol.';

    setUserErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateUserForm()) return;

    try {
      setIsUserSaving(true);
      const payload: any = {
        email: userFormData.email,
        firstName: userFormData.firstName,
        lastName: userFormData.lastName,
        roleId: userFormData.roleId,
        status: userFormData.status,
      };

      if (userFormData.password) {
        payload.password = userFormData.password;
      }

      if (editingUser) {
        await request(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await request('/api/users', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setIsUserDrawerOpen(false);
      loadData();
    } catch (err: any) {
      setUserErrors({ api: err.message || 'Error al guardar usuario.' });
    } finally {
      setIsUserSaving(false);
    }
  };

  const handleDeleteUserClick = (user: User) => {
    setConfirmDialog({
      isOpen: true,
      type: 'user',
      id: user.id,
      title: 'Dar de baja cuenta de usuario',
      description: `¿Está seguro de que desea dar de baja la cuenta de "${user.firstName} ${user.lastName}" (${user.email})? La cuenta se cambiará a estado inactivo y no podrá iniciar sesión en el portal, conservando los registros históricos.`,
    });
  };

  // =============================================================
  // CRUD: EMPLEADOS (HUMAN RESOURCES)
  // =============================================================
  const handleOpenEmployeeDrawer = (employee?: Employee) => {
    setEmployeeErrors({});
    if (employee) {
      setEditingEmployee(employee);
      setEmployeeFormData({
        firstName: employee.firstName,
        lastName: employee.lastName,
        documentId: employee.documentId,
        email: employee.email,
        phone: employee.phone,
        status: employee.status,
        userId: employee.userId || '',
      });
    } else {
      setEditingEmployee(null);
      setEmployeeFormData({
        firstName: '',
        lastName: '',
        documentId: '',
        email: '',
        phone: '',
        status: 'ACTIVE',
        userId: '',
      });
    }
    setIsEmployeeDrawerOpen(true);
  };

  const validateEmployeeForm = () => {
    const errors: Record<string, string> = {};
    if (!employeeFormData.firstName.trim()) errors.firstName = 'El nombre es requerido.';
    if (!employeeFormData.lastName.trim()) errors.lastName = 'El apellido es requerido.';
    if (!employeeFormData.documentId.trim()) errors.documentId = 'El RUT o documento es requerido.';
    if (!employeeFormData.phone.trim()) errors.phone = 'El teléfono de contacto es requerido.';
    
    if (!employeeFormData.email.trim()) {
      errors.email = 'El correo institucional es requerido.';
    } else if (!/\S+@\S+\.\S+/.test(employeeFormData.email)) {
      errors.email = 'El formato de correo no es válido.';
    }

    setEmployeeErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmployeeForm()) return;

    try {
      setIsEmployeeSaving(true);
      const payload = {
        firstName: employeeFormData.firstName,
        lastName: employeeFormData.lastName,
        documentId: employeeFormData.documentId,
        email: employeeFormData.email,
        phone: employeeFormData.phone,
        status: employeeFormData.status,
        userId: employeeFormData.userId || undefined,
      };

      if (editingEmployee) {
        await request(`/api/employees/${editingEmployee.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await request('/api/employees', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setIsEmployeeDrawerOpen(false);
      loadData();
    } catch (err: any) {
      setEmployeeErrors({ api: err.message || 'Error al guardar ficha del empleado.' });
    } finally {
      setIsEmployeeSaving(false);
    }
  };

  const handleDeleteEmployeeClick = (employee: Employee) => {
    setConfirmDialog({
      isOpen: true,
      type: 'employee',
      id: employee.id,
      title: 'Dar de baja ficha de personal',
      description: `¿Está seguro de que desea dar de baja la ficha de personal de "${employee.firstName} ${employee.lastName}" (Doc ID: ${employee.documentId})? El empleado pasará a estado INACTIVE para detener asistencia y nóminas, manteniendo su historial laboral.`,
    });
  };

  // Confirmar baja lógica genérica
  const handleConfirmDelete = async () => {
    const { type, id } = confirmDialog;
    try {
      if (type === 'user') {
        await request(`/api/users/${id}`, { method: 'DELETE' });
      } else {
        await request(`/api/employees/${id}`, { method: 'DELETE' });
      }
      setConfirmDialog({ ...confirmDialog, isOpen: false });
      loadData();
    } catch (err: any) {
      alert(`Error al desactivar el registro: ${err.message}`);
    }
  };

  // =============================================================
  // LOGICA: MATRIZ DE ROLES Y PERMISOS
  // =============================================================
  const handlePermissionToggle = (permId: string) => {
    if (selectedPermissionIds.includes(permId)) {
      setSelectedPermissionIds(selectedPermissionIds.filter(id => id !== permId));
    } else {
      setSelectedPermissionIds([...selectedPermissionIds, permId]);
    }
  };

  const handleSavePermissionsMatrix = async () => {
    if (!selectedRoleId) return;
    try {
      setIsMatrixSaving(true);
      await request(`/api/users/roles/${selectedRoleId}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({
          permissionIds: selectedPermissionIds
        })
      });
      alert('✓ Matriz de permisos actualizada correctamente.');
      loadData();
    } catch (err: any) {
      alert(`Error al actualizar permisos del rol: ${err.message}`);
    } finally {
      setIsMatrixSaving(false);
    }
  };

  // Agrupar permisos por módulos para la visualización de la matriz
  const permissionsByModule: Record<string, Permission[]> = {};
  for (const perm of permissionsList) {
    if (!permissionsByModule[perm.module]) {
      permissionsByModule[perm.module] = [];
    }
    permissionsByModule[perm.module].push(perm);
  }

  return (
    <div className="space-y-6 font-sans text-left">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-brand-text font-serif">Administración y Seguridad</h1>
          <p className="text-sm text-brand-secondary">Configuración de cuentas de usuario, personal y matriz de privilegios</p>
        </div>
      </div>

      {/* Sub-Tabs de Navegación */}
      <div className="flex border-b border-brand-secondary/20">
        <button
          onClick={() => setActiveSubTab('users')}
          className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all ${
            activeSubTab === 'users'
              ? 'border-brand-primary text-brand-primary font-bold'
              : 'border-transparent text-brand-secondary hover:text-brand-text'
          }`}
        >
          <Lock className="w-4 h-4" />
          Cuentas de Usuario
        </button>
        <button
          onClick={() => setActiveSubTab('employees')}
          className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all ${
            activeSubTab === 'employees'
              ? 'border-brand-primary text-brand-primary font-bold'
              : 'border-transparent text-brand-secondary hover:text-brand-text'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Fichas de Empleado (RRHH)
        </button>
        <button
          onClick={() => setActiveSubTab('roles')}
          className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all ${
            activeSubTab === 'roles'
              ? 'border-brand-primary text-brand-primary font-bold'
              : 'border-transparent text-brand-secondary hover:text-brand-text'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          Matriz de Privilegios
        </button>
      </div>

      {/* Carga, Error y Vistas */}
      {loading ? (
        <SkeletonTable cols={activeSubTab === 'roles' ? 3 : 5} rows={4} />
      ) : error ? (
        <div className="p-4 bg-brand-negative/10 border border-brand-negative/30 rounded text-brand-negative text-sm">
          {error}
        </div>
      ) : (
        <>
          {/* TAB 1: CUENTAS DE USUARIO */}
          {activeSubTab === 'users' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                {hasPermission('CREATE', 'ADMINISTRATIVO') && (
                  <Button variant="primary" size="sm" onClick={() => handleOpenUserDrawer()} className="flex items-center gap-1.5">
                    <Plus className="w-4 h-4" /> Nuevo Usuario
                  </Button>
                )}
              </div>
              <Card className="bg-white/70 border border-brand-secondary/20 shadow-sm p-0 overflow-hidden">
                <Table headers={['Usuario / Email', 'Rol Asociado', 'Estado Cuenta', 'Acciones']}>
                  {usersList.map((user) => (
                    <tr key={user.id} className="hover:bg-brand-bg/50 border-b border-brand-secondary/15">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-brand-text text-sm font-serif">{user.firstName} {user.lastName}</div>
                        <div className="text-[10px] text-brand-secondary font-mono flex items-center gap-1 mt-0.5">
                          <Mail className="w-3.5 h-3.5" />
                          {user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-brand-forest">
                        {user.role?.name || 'Sin Rol'}
                      </td>
                      <td className="px-6 py-4">
                        {user.status === 'ACTIVE' && (
                          <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-brand-positive/10 text-brand-positive border border-brand-positive/20">ACTIVO</span>
                        )}
                        {user.status === 'INACTIVE' && (
                          <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/20">INACTIVO</span>
                        )}
                        {user.status === 'SUSPENDED' && (
                          <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-brand-negative/10 text-brand-negative border border-brand-negative/20">SUSPENDIDO</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {hasPermission('UPDATE', 'ADMINISTRATIVO') && (
                            <button
                              onClick={() => handleOpenUserDrawer(user)}
                              title="Editar cuenta"
                              className="text-brand-primary hover:text-brand-text hover:bg-brand-primary/10 rounded p-1 transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                          {hasPermission('DELETE', 'ADMINISTRATIVO') && user.email !== 'admin@consvivisa.com' && (
                            <button
                              onClick={() => handleDeleteUserClick(user)}
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
            </div>
          )}

          {/* TAB 2: FICHAS DE EMPLEADO */}
          {activeSubTab === 'employees' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                {hasPermission('CREATE', 'ADMINISTRATIVO') && (
                  <Button variant="primary" size="sm" onClick={() => handleOpenEmployeeDrawer()} className="flex items-center gap-1.5">
                    <Plus className="w-4 h-4" /> Registrar Empleado
                  </Button>
                )}
              </div>
              <Card className="bg-white/70 border border-brand-secondary/20 shadow-sm p-0 overflow-hidden">
                <Table headers={['Nombre Personal', 'Documento Identidad', 'Correo Institucional', 'Teléfono', 'Estado RRHH', 'Acciones']}>
                  {employeesList.map((emp) => (
                    <tr key={emp.id} className="hover:bg-brand-bg/50 border-b border-brand-secondary/15">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-brand-text text-sm font-serif">{emp.firstName} {emp.lastName}</div>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-brand-text">
                        {emp.documentId}
                      </td>
                      <td className="px-6 py-4 text-xs text-brand-secondary">
                        <div className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" />
                          {emp.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-brand-secondary">
                        <div className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          {emp.phone}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {emp.status === 'ACTIVE' && (
                          <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-brand-positive/10 text-brand-positive border border-brand-positive/20">CONTRATADO</span>
                        )}
                        {emp.status === 'INACTIVE' && (
                          <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/20">DESVINCULADO</span>
                        )}
                        {emp.status === 'ON_LEAVE' && (
                          <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-brand-primary/10 text-brand-primary border border-brand-primary/20">LICENCIA</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {hasPermission('UPDATE', 'ADMINISTRATIVO') && (
                            <button
                              onClick={() => handleOpenEmployeeDrawer(emp)}
                              title="Editar ficha"
                              className="text-brand-primary hover:text-brand-text hover:bg-brand-primary/10 rounded p-1 transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          )}
                          {hasPermission('DELETE', 'ADMINISTRATIVO') && (
                            <button
                              onClick={() => handleDeleteEmployeeClick(emp)}
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
            </div>
          )}

          {/* TAB 3: MATRIZ DE PRIVILEGIOS */}
          {activeSubTab === 'roles' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Listado de Roles */}
              <div className="md:col-span-1 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text mb-3">Roles del Sistema</h3>
                {rolesList.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRoleId(role.id)}
                    className={`w-full text-left p-3.5 rounded border transition-all ${
                      selectedRoleId === role.id
                        ? 'bg-brand-forest border-brand-forest text-[#FAF7F2] font-bold shadow-md'
                        : 'bg-white border-brand-secondary/25 hover:bg-brand-bg text-brand-text'
                    }`}
                  >
                    <div className="text-xs font-serif">{role.name}</div>
                    <div className={`text-[10px] mt-1 line-clamp-1 ${
                      selectedRoleId === role.id ? 'text-white/70' : 'text-brand-secondary'
                    }`}>
                      {role.description || 'Sin descripción'}
                    </div>
                  </button>
                ))}
              </div>

              {/* Matriz de Permisos */}
              <Card className="md:col-span-3 bg-white/70 border border-brand-secondary/20 shadow-sm p-6 space-y-6">
                <div className="flex justify-between items-center border-b border-brand-secondary/15 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-brand-text font-serif">
                      Asignar Privilegios para Rol: <span className="text-brand-forest">{(rolesList.find(r => r.id === selectedRoleId))?.name}</span>
                    </h3>
                    <p className="text-xs text-brand-secondary">Habilite o restrinja acciones específicas por módulo operativo</p>
                  </div>
                  {hasPermission('UPDATE', 'ADMINISTRATIVO') && (
                    <Button 
                      variant="primary" 
                      size="sm" 
                      onClick={handleSavePermissionsMatrix}
                      disabled={isMatrixSaving}
                    >
                      {isMatrixSaving ? 'Guardando...' : 'Guardar Matriz'}
                    </Button>
                  )}
                </div>

                <div className="space-y-6">
                  {Object.entries(permissionsByModule).map(([module, permissions]) => (
                    <div key={module} className="bg-brand-bg/40 border border-brand-secondary/15 p-4 rounded-lg space-y-3">
                      <h4 className="text-xs font-bold text-brand-text uppercase tracking-wider border-b border-brand-secondary/10 pb-1.5">
                        Módulo: {module}
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {permissions.map((perm) => {
                          const isChecked = selectedPermissionIds.includes(perm.id);
                          return (
                            <label 
                              key={perm.id} 
                              className={`flex items-center gap-2 p-2 rounded border cursor-pointer select-none text-xs transition-all ${
                                isChecked 
                                  ? 'bg-brand-forest/5 border-brand-forest/35 text-brand-forest font-semibold' 
                                  : 'bg-white border-brand-secondary/20 text-brand-secondary hover:bg-brand-bg'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={!hasPermission('UPDATE', 'ADMINISTRATIVO')}
                                onChange={() => handlePermissionToggle(perm.id)}
                                className="rounded text-brand-forest focus:ring-brand-forest w-3.5 h-3.5 border-brand-secondary/40"
                              />
                              <span>{perm.action}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      {/* DRAWER: Crear/Editar Usuario */}
      <Drawer
        isOpen={isUserDrawerOpen}
        onClose={() => setIsUserDrawerOpen(false)}
        title={editingUser ? 'Editar Cuenta de Usuario' : 'Registrar Cuenta de Usuario'}
      >
        <form onSubmit={handleSaveUser} className="space-y-4">
          {userErrors.api && (
            <div className="p-3 bg-brand-negative/10 border border-brand-negative/20 rounded text-brand-negative text-xs">
              {userErrors.api}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">Nombres</label>
              <input
                type="text"
                required
                value={userFormData.firstName}
                onChange={(e) => setUserFormData({ ...userFormData, firstName: e.target.value })}
                className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                placeholder="Pedro"
              />
              {userErrors.firstName && <p className="text-[10px] text-brand-negative mt-1">{userErrors.firstName}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">Apellidos</label>
              <input
                type="text"
                required
                value={userFormData.lastName}
                onChange={(e) => setUserFormData({ ...userFormData, lastName: e.target.value })}
                className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                placeholder="Reyes"
              />
              {userErrors.lastName && <p className="text-[10px] text-brand-negative mt-1">{userErrors.lastName}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">Correo Electrónico (Email)</label>
            <input
              type="email"
              required
              value={userFormData.email}
              onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
              className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
              placeholder="pedro.reyes@consvivisa.com"
            />
            {userErrors.email && <p className="text-[10px] text-brand-negative mt-1">{userErrors.email}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">
              Contraseña {editingUser && <span className="lowercase font-normal text-brand-secondary">(dejar en blanco para conservar)</span>}
            </label>
            <input
              type="password"
              required={!editingUser}
              value={userFormData.password}
              onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
              className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
              placeholder={editingUser ? '••••••••' : 'Ingrese clave...'}
            />
            {userErrors.password && <p className="text-[10px] text-brand-negative mt-1">{userErrors.password}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">Rol de Seguridad</label>
            <select
              value={userFormData.roleId}
              onChange={(e) => setUserFormData({ ...userFormData, roleId: e.target.value })}
              className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
            >
              {rolesList.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            {userErrors.roleId && <p className="text-[10px] text-brand-negative mt-1">{userErrors.roleId}</p>}
          </div>

          {editingUser && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">Estado Cuenta</label>
              <select
                value={userFormData.status}
                onChange={(e) => setUserFormData({ ...userFormData, status: e.target.value as any })}
                className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
              >
                <option value="ACTIVE">Activo</option>
                <option value="INACTIVE">Inactivo</option>
                <option value="SUSPENDED">Suspendido</option>
              </select>
            </div>
          )}

          <div className="pt-3 border-t border-brand-secondary/15 flex justify-end gap-3">
            <Button variant="secondary" size="sm" type="button" onClick={() => setIsUserDrawerOpen(false)} disabled={isUserSaving}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={isUserSaving}>
              {isUserSaving ? 'Guardando...' : editingUser ? 'Guardar Cambios' : 'Registrar'}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* DRAWER: Crear/Editar Empleado */}
      <Drawer
        isOpen={isEmployeeDrawerOpen}
        onClose={() => setIsEmployeeDrawerOpen(false)}
        title={editingEmployee ? 'Editar Ficha del Empleado' : 'Registrar Ficha del Empleado'}
      >
        <form onSubmit={handleSaveEmployee} className="space-y-4">
          {employeeErrors.api && (
            <div className="p-3 bg-brand-negative/10 border border-brand-negative/20 rounded text-brand-negative text-xs">
              {employeeErrors.api}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">Nombres</label>
              <input
                type="text"
                required
                value={employeeFormData.firstName}
                onChange={(e) => setEmployeeFormData({ ...employeeFormData, firstName: e.target.value })}
                className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                placeholder="Clara"
              />
              {employeeErrors.firstName && <p className="text-[10px] text-brand-negative mt-1">{employeeErrors.firstName}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">Apellidos</label>
              <input
                type="text"
                required
                value={employeeFormData.lastName}
                onChange={(e) => setEmployeeFormData({ ...employeeFormData, lastName: e.target.value })}
                className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
                placeholder="Guzmán"
              />
              {employeeErrors.lastName && <p className="text-[10px] text-brand-negative mt-1">{employeeErrors.lastName}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">Documento Identidad (RUT / DNI)</label>
            <input
              type="text"
              required
              value={employeeFormData.documentId}
              onChange={(e) => setEmployeeFormData({ ...employeeFormData, documentId: e.target.value })}
              className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
              placeholder="19.876.543-2"
            />
            {employeeErrors.documentId && <p className="text-[10px] text-brand-negative mt-1">{employeeErrors.documentId}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">Correo Electrónico</label>
            <input
              type="email"
              required
              value={employeeFormData.email}
              onChange={(e) => setEmployeeFormData({ ...employeeFormData, email: e.target.value })}
              className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
              placeholder="clara.guzman@consvivisa.com"
            />
            {employeeErrors.email && <p className="text-[10px] text-brand-negative mt-1">{employeeErrors.email}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">Teléfono de Contacto</label>
            <input
              type="text"
              required
              value={employeeFormData.phone}
              onChange={(e) => setEmployeeFormData({ ...employeeFormData, phone: e.target.value })}
              className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
              placeholder="+56987654321"
            />
            {employeeErrors.phone && <p className="text-[10px] text-brand-negative mt-1">{employeeErrors.phone}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">Cuenta de Usuario Vinculada (Opcional)</label>
            <select
              value={employeeFormData.userId}
              onChange={(e) => setEmployeeFormData({ ...employeeFormData, userId: e.target.value })}
              className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
            >
              <option value="">Ninguno (Sin cuenta de acceso)</option>
              {usersList.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName} ({user.email})
                </option>
              ))}
            </select>
          </div>

          {editingEmployee && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-brand-text mb-1.5">Estado Laboral</label>
              <select
                value={employeeFormData.status}
                onChange={(e) => setEmployeeFormData({ ...employeeFormData, status: e.target.value as any })}
                className="block w-full px-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
              >
                <option value="ACTIVE">Activo</option>
                <option value="INACTIVE">Inactivo (Desvinculado)</option>
                <option value="ON_LEAVE">Licencia Médica</option>
              </select>
            </div>
          )}

          <div className="pt-3 border-t border-brand-secondary/15 flex justify-end gap-3">
            <Button variant="secondary" size="sm" type="button" onClick={() => setIsEmployeeDrawerOpen(false)} disabled={isEmployeeSaving}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={isEmployeeSaving}>
              {isEmployeeSaving ? 'Guardando...' : editingEmployee ? 'Guardar Cambios' : 'Registrar'}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* DIALOGO DE CONFIRMACION COMUN (Bajas lógicas) */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={handleConfirmDelete}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText="Desactivar Registro"
        cancelText="Volver"
        type="danger"
      />
    </div>
  );
};
