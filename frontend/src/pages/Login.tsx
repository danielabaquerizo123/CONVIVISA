import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Shield,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import constructionImage from '../assets/login-construction.png';

const BrandMark: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <div
    className={`relative mx-auto flex items-end justify-center ${
      compact
        ? 'h-[clamp(3.25rem,5.3vh,4.25rem)] w-[clamp(3.25rem,5.3vh,4.25rem)] rounded-full bg-[#00523f] shadow-[0_10px_22px_rgba(0,0,0,0.23)] ring-[3px] ring-white'
        : 'h-[clamp(4.05rem,7.8vh,5.2rem)] w-[clamp(5.7rem,9.6vw,7rem)]'
    }`}
  >
    <svg
      viewBox="0 0 110 88"
      className={
        compact
          ? 'h-[clamp(2.7rem,4.6vh,3.45rem)] w-[clamp(2.7rem,4.6vh,3.45rem)] drop-shadow-sm'
          : 'h-[clamp(3.55rem,6.6vh,4.55rem)] w-[clamp(4.85rem,8.4vw,6.1rem)] drop-shadow-md'
      }
      aria-hidden="true"
    >
      <path d="M18 72V42L36 32V72H18Z" fill="#fffdf6" />
      <path d="M45 72V18L62 6L74 16V72H45Z" fill="#d2893e" />
      <path d="M82 72V40L102 53V72H82Z" fill="#c26d23" />
      <path d="M14 78H106" stroke="#9d5b24" strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
    </svg>
  </div>
);

const DecorativeRule: React.FC<{ wide?: boolean }> = ({ wide = false }) => (
  <div className={`mx-auto flex items-center justify-center ${wide ? 'w-[clamp(7.4rem,8.6vw,9.6rem)]' : 'w-[clamp(4.8rem,6vw,6.2rem)]'}`} aria-hidden="true">
    <span className="h-[2px] flex-1 bg-[#b8661e]" />
    <span className="mx-2 h-[0.55rem] w-[0.55rem] rounded-full bg-[#c36f25]" />
    <span className="h-px flex-1 bg-[#b8661e]" />
  </div>
);

const BuildingLine: React.FC = () => (
  <svg
    viewBox="0 0 680 160"
    className="pointer-events-none absolute bottom-0 left-1/2 h-[clamp(5.25rem,10.5vh,7.6rem)] w-[94%] -translate-x-1/2 text-[#d2a679] opacity-28"
    fill="none"
    aria-hidden="true"
  >
    <path d="M7 118H673" stroke="currentColor" strokeWidth="2" />
    <path d="M61 116V42M61 42h170M93 42v74M123 42v74M154 42v74M185 42v74M216 42v74" stroke="currentColor" />
    <path d="M46 44l55-18 138 16M79 29l31 87M110 29l30 87M142 33l25 83M173 37l18 79M204 39l10 77" stroke="currentColor" />
    <path d="M286 116V52l20-18 18 18v64M324 116V38l18-18 20 18v78M362 116V56l22-22 24 22v60" stroke="currentColor" strokeWidth="2" />
    <path d="M274 116V75h148v41M293 75v41M318 75v41M343 75v41M368 75v41M393 75v41" stroke="currentColor" />
    <path d="M470 116V50h72v66M490 50v66M518 50v66M470 72h72M470 94h72" stroke="currentColor" strokeWidth="2" />
    <path d="M565 116V58h60v58M580 58v58M608 58v58M565 80h60M565 101h60" stroke="currentColor" />
    <path d="M523 43l84-25 58 18M607 18v98M587 25l20 91M627 27l-20 89" stroke="currentColor" />
  </svg>
);

export const Login: React.FC = () => {
  const { login, error, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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

  const featureItems = [
    {
      title: 'Control Total',
      text: 'Gestiona tus proyectos\nen tiempo real.',
      icon: BarChart3,
    },
    {
      title: 'Seguridad',
      text: 'Protegemos tu información\ncon altos estándares.',
      icon: ShieldCheck,
    },
    {
      title: 'Eficiencia',
      text: 'Optimiza procesos y toma\ndecisiones inteligentes.',
      icon: UsersRound,
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#fbf7ef] font-sans text-[#103b31] lg:h-screen lg:max-h-screen">
      <div className="absolute right-7 top-7 grid grid-cols-10 gap-[12px] opacity-40" aria-hidden="true">
        {Array.from({ length: 90 }).map((_, index) => (
          <span key={index} className="h-[3px] w-[3px] rounded-full bg-[#cf914f]" />
        ))}
      </div>

      <div className="absolute bottom-0 right-0 h-72 w-[34rem] opacity-25" aria-hidden="true">
        <svg viewBox="0 0 560 320" className="h-full w-full text-[#d4ad7e]" fill="none">
          <path d="M170 330C248 218 344 165 560 148" stroke="currentColor" />
          <path d="M205 330C286 226 374 182 560 168" stroke="currentColor" />
          <path d="M240 330C318 242 402 203 560 193" stroke="currentColor" />
          <path d="M280 330C344 262 422 231 560 222" stroke="currentColor" />
        </svg>
      </div>

      <main className="relative grid min-h-screen grid-cols-1 lg:grid-cols-[49%_51%] lg:h-screen lg:max-h-screen lg:min-h-0">
        <section className="relative min-h-[50rem] overflow-hidden bg-[#062d25] text-white lg:h-screen lg:min-h-0">
          <img
            src={constructionImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-left opacity-95 [filter:contrast(1.12)_saturate(1.06)_brightness(0.98)_sepia(0.18)]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(137,73,16,0.22),rgba(18,45,33,0.12)_34%,rgba(4,32,27,0.12))]" />
          <div
            className="absolute inset-y-[-13%] right-[-4.6rem] hidden w-[78%] bg-[radial-gradient(circle_at_52%_30%,#124c3d,#022a23_62%,#00271f_100%)] shadow-[-18px_0_50px_rgba(0,0,0,0.28)] lg:block"
            style={{ borderRadius: '72% 0 0 74% / 56% 0 0 58%' }}
            aria-hidden="true"
          />
          <div
            className="absolute inset-y-[-11%] right-[-0.35rem] hidden w-[1.65rem] rotate-[7deg] rounded-full bg-[#c77728] shadow-[0_0_20px_rgba(222,134,53,0.72)] lg:block"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_45%_70%,rgba(22,96,72,0.26),transparent_34%)]" />
          <div
            className="absolute bottom-0 left-0 h-[28%] w-[78%] opacity-25"
            style={{
              backgroundImage:
                'radial-gradient(circle, rgba(193,113,36,0.75) 1px, transparent 1.5px), linear-gradient(30deg, transparent 49.5%, rgba(193,113,36,0.28) 50%, transparent 50.5%), linear-gradient(150deg, transparent 49.5%, rgba(193,113,36,0.22) 50%, transparent 50.5%)',
              backgroundSize: '34px 34px, 42px 42px, 42px 42px',
            }}
            aria-hidden="true"
          />

          <div className="relative z-10 mx-auto flex min-h-[50rem] max-w-[45rem] flex-col items-center px-9 py-20 text-center lg:h-screen lg:min-h-0 lg:translate-y-[0.4vh] lg:justify-center lg:pb-[clamp(1.8rem,3.6vh,3.4rem)] lg:pl-14 lg:pr-20 lg:pt-[clamp(1.5rem,3vh,3rem)]">
            <BrandMark />

            <h1 className="mt-[clamp(0.45rem,1vh,0.95rem)] font-serif text-[clamp(2.8rem,4vw,4.65rem)] font-black leading-none tracking-[0.015em] text-white drop-shadow-[0_3px_3px_rgba(0,0,0,0.28)] [@media(max-height:800px)]:text-[clamp(2.5rem,3.7vw,4.05rem)] [@media(max-height:900px)]:text-[clamp(2.65rem,3.85vw,4.35rem)]">
              CONSVIVISA
            </h1>
            <p className="mt-[clamp(0.75rem,1.8vh,1.35rem)] text-[clamp(1rem,1.35vw,1.3rem)] font-medium leading-[1.34] text-[#f2ad66]">
              ERP de Control Operativo
              <br />y Financiero de Obras
            </p>

            <div className="mt-[clamp(0.95rem,2.4vh,1.75rem)]">
              <DecorativeRule />
            </div>

            <p className="mt-[clamp(1.65rem,4vh,3rem)] text-[clamp(0.9rem,1.18vw,1.08rem)] font-extrabold text-white">Integra. Controla. Optimiza.</p>
            <p className="mt-[clamp(0.35rem,0.9vh,0.65rem)] text-[clamp(0.82rem,1.05vw,0.98rem)] font-normal text-white/95">Construye el futuro con información precisa.</p>

            <div className="mt-[clamp(1.55rem,3.4vh,2.65rem)] grid h-[clamp(9.65rem,17.5vh,11.4rem)] w-full max-w-[clamp(28.5rem,34vw,32.5rem)] grid-cols-3 gap-[clamp(0.8rem,1.45vw,1.25rem)] rounded-lg border border-white/10 bg-[#001f1a]/68 px-[clamp(1rem,1.6vw,1.65rem)] py-[clamp(1rem,2.25vh,1.5rem)] shadow-[0_24px_55px_rgba(0,0,0,0.28)] backdrop-blur-[2px] [@media(max-height:800px)]:h-[9.2rem] [@media(max-height:800px)]:max-w-[30rem] [@media(max-height:900px)]:h-[10.2rem]">
              {featureItems.map(({ title, text, icon: Icon }) => (
                <div key={title} className="flex flex-col items-center text-center">
                  <div className="flex h-[clamp(2.9rem,5.3vh,3.45rem)] w-[clamp(2.9rem,5.3vh,3.45rem)] items-center justify-center rounded-full border-2 border-[#d76d19] text-white shadow-[0_0_0_1px_rgba(0,0,0,0.2)]">
                    <Icon className="h-[clamp(1.3rem,2.45vh,1.58rem)] w-[clamp(1.3rem,2.45vh,1.58rem)]" strokeWidth={2.2} />
                  </div>
                  <h2 className="mt-[clamp(0.55rem,1.45vh,0.95rem)] text-[clamp(0.7rem,0.9vw,0.82rem)] font-extrabold text-white">{title}</h2>
                  <p className="mt-[clamp(0.3rem,0.9vh,0.55rem)] whitespace-pre-line text-[clamp(0.6rem,0.76vw,0.7rem)] font-medium leading-[1.28] text-white/90">
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative flex min-h-screen flex-col items-center justify-start px-6 py-12 lg:h-screen lg:min-h-0 lg:overflow-hidden lg:px-14 lg:pt-[clamp(2.1rem,4.5vh,3.5rem)]">
          <div className="relative w-full max-w-[clamp(29.5rem,35.5vw,34.5rem)] rounded-[1.8rem] border border-[#e5ddd2] bg-white/88 px-[clamp(1.95rem,3vw,3rem)] pb-[clamp(3.6rem,7vh,4.8rem)] pt-[clamp(1.6rem,3.5vh,2.4rem)] shadow-[0_25px_56px_rgba(49,38,24,0.13)] backdrop-blur-sm [@media(max-height:800px)]:max-w-[31.5rem] [@media(max-height:800px)]:pb-[3.25rem] [@media(max-height:800px)]:pt-[1.35rem] [@media(max-height:900px)]:max-w-[33rem]">
            <BrandMark compact />
            <h2 className="mt-[clamp(0.75rem,1.75vh,1.35rem)] text-center text-[clamp(1.35rem,1.75vw,1.78rem)] font-black leading-tight tracking-normal text-[#073b30] [@media(max-height:800px)]:text-[1.42rem] [@media(max-height:900px)]:text-[1.58rem]">
              Ingreso al Portal Ejecutivo
            </h2>
            <div className="mt-[clamp(0.6rem,1.55vh,1.15rem)]">
              <DecorativeRule wide />
            </div>
            <p className="mx-auto mt-[clamp(0.65rem,1.55vh,1.05rem)] max-w-[24rem] text-center text-[clamp(0.82rem,1vw,0.98rem)] leading-[1.35] text-[#6d6660]">
              Bienvenido de nuevo, inicia sesión para
              <br />
              acceder a tu cuenta.
            </p>

            <form className="mt-[clamp(0.95rem,2.25vh,1.65rem)] space-y-[clamp(0.8rem,1.95vh,1.35rem)]" onSubmit={handleSubmit}>
              {(error || localError) && (
                <div className="flex items-start gap-3 rounded-md border border-[#b5502e]/30 bg-[#b5502e]/10 p-3 text-left">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#b5502e]" />
                  <span className="text-xs font-semibold text-[#b5502e]">{localError || error}</span>
                </div>
              )}

              <div>
                <label className="mb-[clamp(0.45rem,1.1vh,0.75rem)] block text-[clamp(0.72rem,0.82vw,0.82rem)] font-black uppercase tracking-[0.02em] text-[#2e302d]">
                  CORREO ELECTRÓNICO
                </label>
                <div className="group flex h-[clamp(3.05rem,5.6vh,3.55rem)] overflow-hidden rounded-md border border-[#d8d0c8] bg-[#fbfaf8] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] focus-within:border-[#c8792e] focus-within:ring-2 focus-within:ring-[#d9904c]/20 [@media(max-height:800px)]:h-[3.05rem] [@media(max-height:900px)]:h-[3.25rem]">
                  <span className="flex w-[clamp(3.05rem,5.6vh,3.55rem)] items-center justify-center border-r border-[#eaded2] bg-[#f8efe6] text-[#c07835]">
                    <Mail className="h-[clamp(1.05rem,2vh,1.25rem)] w-[clamp(1.05rem,2vh,1.25rem)]" strokeWidth={2.2} />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@consvivisa.com"
                    className="min-w-0 flex-1 bg-transparent px-5 text-[clamp(0.92rem,1vw,1.04rem)] font-medium text-[#2b312d] placeholder:text-[#8f8a84] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-[clamp(0.45rem,1.1vh,0.75rem)] block text-[clamp(0.72rem,0.82vw,0.82rem)] font-black uppercase tracking-[0.02em] text-[#2e302d]">
                  CONTRASEÑA
                </label>
                <div className="group flex h-[clamp(3.05rem,5.6vh,3.55rem)] overflow-hidden rounded-md border border-[#d8d0c8] bg-[#fbfaf8] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] focus-within:border-[#c8792e] focus-within:ring-2 focus-within:ring-[#d9904c]/20 [@media(max-height:800px)]:h-[3.05rem] [@media(max-height:900px)]:h-[3.25rem]">
                  <span className="flex w-[clamp(3.05rem,5.6vh,3.55rem)] items-center justify-center border-r border-[#eaded2] bg-[#f8efe6] text-[#c07835]">
                    <KeyRound className="h-[clamp(1.05rem,2vh,1.25rem)] w-[clamp(1.05rem,2vh,1.25rem)]" strokeWidth={2.2} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="min-w-0 flex-1 bg-transparent px-5 text-[clamp(0.92rem,1vw,1.04rem)] font-medium text-[#2b312d] placeholder:tracking-[0.28em] placeholder:text-[#8f8a84] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="flex w-[clamp(3.1rem,5.4vh,3.8rem)] items-center justify-center text-[#c07835] transition hover:text-[#9f5618]"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff className="h-[clamp(1.05rem,2vh,1.25rem)] w-[clamp(1.05rem,2vh,1.25rem)]" /> : <Eye className="h-[clamp(1.05rem,2vh,1.25rem)] w-[clamp(1.05rem,2vh,1.25rem)]" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-[clamp(0.4rem,1vh,0.75rem)] flex h-[clamp(3.1rem,5.7vh,3.6rem)] w-full items-center justify-center gap-[clamp(1rem,1.65vw,1.45rem)] rounded-md bg-[linear-gradient(180deg,#d78632,#b75b0b)] text-[clamp(0.86rem,0.95vw,0.98rem)] font-extrabold text-white shadow-[0_10px_18px_rgba(183,91,11,0.22)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-75 [@media(max-height:800px)]:h-[3.1rem] [@media(max-height:900px)]:h-[3.3rem]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Iniciando Sesión...
                  </span>
                ) : (
                  <>
                    <span>Ingresar al Portal</span>
                    <ArrowRight className="h-6 w-6" strokeWidth={1.9} />
                  </>
                )}
              </button>
            </form>

            <BuildingLine />
          </div>

          <div className="mt-[clamp(0.9rem,2vh,1.55rem)] flex items-center gap-4 text-[#6e6962]">
            <Shield className="h-[clamp(1.45rem,3vh,1.85rem)] w-[clamp(1.45rem,3vh,1.85rem)] shrink-0 text-[#c07835]" strokeWidth={2} />
            <p className="text-[clamp(0.82rem,1vw,1rem)] leading-[1.35]">
              Todos los datos están protegidos
              <br />
              con cifrado SSL 256-bit
            </p>
          </div>

          <p className="mt-[clamp(1.05rem,3vh,2.25rem)] text-center text-[clamp(0.72rem,0.82vw,0.84rem)] text-[#6f6961]">
            © 2026 <span className="text-[#c46d22]">Consvivisa</span> SA Portal de Negocios Corporativos.
          </p>
        </section>
      </main>
    </div>
  );
};
