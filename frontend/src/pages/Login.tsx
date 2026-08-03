import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { KeyRound, Mail, AlertTriangle } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, error, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password) {
      setLocalError('Por favor complete todos los campos.');
      return;
    }

    try {
      await login(email, password);
    } catch (err: any) {
      // El error global ya se expone desde AuthContext
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-brand-forest font-serif">
            CONSVIVISA
          </h1>
          <p className="mt-2 text-sm text-brand-secondary font-sans">
            ERP de Control Operativo y Financiero de Obras
          </p>
        </div>

        <Card className="shadow-lg border border-brand-secondary/20 p-8 bg-white/80 backdrop-blur-md">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <h2 className="text-xl font-semibold text-brand-text font-serif text-center mb-6">
                Ingreso al Portal Ejecutivo
              </h2>
            </div>

            {(error || localError) && (
              <div className="bg-brand-negative/10 border border-brand-negative/30 rounded p-3 flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-brand-negative shrink-0 mt-0.5" />
                <span className="text-xs text-brand-negative font-medium text-left">
                  {localError || error}
                </span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-brand-text uppercase tracking-wider mb-2 text-left">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-brand-secondary">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@consvivisa.com"
                    className="block w-full pl-10 pr-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text placeholder-brand-secondary/60 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-text uppercase tracking-wider mb-2 text-left">
                  Contraseña
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-brand-secondary">
                    <KeyRound className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-10 pr-3 py-2 bg-brand-bg border border-brand-secondary/30 rounded text-brand-text placeholder-brand-secondary/60 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary"
                  />
                </div>
              </div>
            </div>

            <div>
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                className="w-full py-2.5 mt-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Iniciando Sesión...
                  </span>
                ) : (
                  'Ingresar'
                )}
              </Button>
            </div>
          </form>
        </Card>
        
        <div className="text-center text-xs text-brand-secondary mt-4 font-sans">
          © {new Date().getFullYear()} Consvivisa S.A. Portal de Negocios Corporativos.
        </div>
      </div>
    </div>
  );
};
