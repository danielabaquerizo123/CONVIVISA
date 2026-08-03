import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  BarChart3, 
  Users, 
  HardHat, 
  ShoppingBag, 
  Landmark, 
  LogOut 
} from 'lucide-react';
import { Dashboard } from '../pages/Dashboard';
import { Projects } from '../pages/Projects';
import { ProjectDetail } from './ProjectDetail';
import { Purchases } from '../pages/Purchases';
import { Admin } from '../pages/Admin';
import { Finance } from '../pages/Finance';

interface AppShellProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const AppShell: React.FC<AppShellProps> = ({ activeTab, setActiveTab }) => {
  const { user, logout, hasPermission } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null);

  // Al cambiar de pestaña principal, resetear el proyecto seleccionado para volver al listado
  React.useEffect(() => {
    setSelectedProjectId(null);
  }, [activeTab]);

  const menuItems = [
    { id: 'dashboard', label: 'Reportes y Dashboard', module: 'REPORTES', icon: BarChart3 },
    { id: 'admin', label: 'Administración', module: 'ADMINISTRATIVO', icon: Users },
    { id: 'projects', label: 'Proyectos y Obras', module: 'PROYECTOS', icon: HardHat },
    { id: 'purchases', label: 'Compras y Almacén', module: 'COMPRAS', icon: ShoppingBag },
    { id: 'finance', label: 'Gestión Financiera', module: 'FINANCIERO', icon: Landmark },
  ];

  // Filtrar los módulos del sidebar según los permisos reales del usuario
  const visibleMenuItems = menuItems.filter(item => 
    hasPermission('READ', item.module)
  );

  return (
    <div className="flex h-screen overflow-hidden bg-brand-bg">
      {/* Sidebar fijo verde bosque */}
      <aside className="w-64 h-full bg-brand-forest text-[#FAF7F2] flex flex-col justify-between shadow-lg shrink-0">
        <div className="flex flex-col">
          {/* Cabecera Sidebar */}
          <div className="p-6 border-b border-white/10 text-center">
            <h2 className="text-2xl font-bold tracking-wider font-serif text-[#FAF7F2]">
              CONSVIVISA
            </h2>
            <span className="text-[10px] text-white/60 tracking-widest uppercase block mt-1">
              Portal ERP
            </span>
          </div>

          {/* Menú de Navegación */}
          <nav className="p-4 space-y-1">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-brand-primary text-white font-semibold shadow-sm'
                      : 'hover:bg-white/5 text-white/80 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-white/70'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sección de Usuario e Inicio de Sesión */}
        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-9 h-9 rounded-full bg-brand-primary/20 border border-brand-primary/30 flex items-center justify-center text-brand-primary font-bold shrink-0">
              {user?.firstName.charAt(0)}{user?.lastName.charAt(0)}
            </div>
            <div className="overflow-hidden text-left">
              <p className="text-xs font-bold text-white truncate font-sans">
                {user?.firstName} {user?.lastName}
              </p>
              <span className="text-[9px] text-white/50 uppercase font-semibold tracking-wider font-mono">
                {user?.role}
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-4 py-2 rounded text-xs font-semibold text-white/70 hover:text-white hover:bg-brand-negative/20 transition-all duration-150 text-left border border-white/10 hover:border-brand-negative/30"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Área de Contenido Principal */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          {activeTab === 'dashboard' && <Dashboard />}

          {/* Placeholders elegantes para los otros módulos */}
          {activeTab === 'admin' && <Admin />}

          {activeTab === 'projects' && (
            selectedProjectId ? (
              <ProjectDetail 
                projectId={selectedProjectId} 
                onBack={() => setSelectedProjectId(null)} 
              />
            ) : (
              <Projects onViewProject={(id) => setSelectedProjectId(id)} />
            )
          )}

          {activeTab === 'purchases' && <Purchases />}

          {activeTab === 'finance' && <Finance />}
        </div>
      </main>
    </div>
  );
};
