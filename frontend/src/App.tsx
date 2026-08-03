import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { AppShell } from './components/AppShell';

const AppContent: React.FC = () => {
  const { isAuthenticated, user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Seleccionar la pestaña inicial basada en los permisos del rol del usuario
  useEffect(() => {
    if (isAuthenticated && user) {
      if (hasPermission('READ', 'REPORTES')) {
        setActiveTab('dashboard');
      } else {
        const modules = [
          { id: 'admin', module: 'ADMINISTRATIVO' },
          { id: 'projects', module: 'PROYECTOS' },
          { id: 'purchases', module: 'COMPRAS' },
          { id: 'finance', module: 'FINANCIERO' },
        ];
        const firstVisible = modules.find(m => hasPermission('READ', m.module));
        if (firstVisible) {
          setActiveTab(firstVisible.id);
        }
      }
    }
  }, [isAuthenticated, user]);

  return isAuthenticated ? (
    <AppShell activeTab={activeTab} setActiveTab={setActiveTab} />
  ) : (
    <Login />
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
