import React, { ReactNode, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { UserRole } from '../types';
import { formatCurrency, ROUTES } from '../constants';
import { useNavigate, useLocation } from 'react-router-dom';

interface LayoutProps {
  children?: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // States for Logout Sequence
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isShuttingDown, setIsShuttingDown] = useState(false);

  const requestSignOut = () => {
      setShowLogoutConfirm(true);
  };

  const confirmSignOut = async () => {
    setShowLogoutConfirm(false);
    setIsShuttingDown(true);
    
    setTimeout(async () => {
        await signOut();
        setIsShuttingDown(false);
        navigate(ROUTES.LOGIN);
    }, 1500);
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  if (!user) return <>{children}</>;

  return (
    <div className={`min-h-screen flex flex-col text-slate-200 font-sans selection:bg-cyber-neon selection:text-black transition-opacity duration-300 ${isShuttingDown ? 'opacity-0 scale-95 filter blur-lg' : 'opacity-100'}`}>
      
      {/* --- SHUTDOWN ANIMATION OVERLAY (CRT EFFECT) --- */}
      {isShuttingDown && (
          <div className="fixed inset-0 z-[100] bg-black pointer-events-none flex items-center justify-center">
              <div className="w-full h-[2px] bg-white animate-[shutdownH_0.4s_ease-out_forwards] shadow-[0_0_20px_white]"></div>
              <div className="absolute h-full w-[2px] bg-white animate-[shutdownV_0.4s_ease-out_0.4s_forwards] shadow-[0_0_20px_white]"></div>
              <div className="absolute text-cyber-neon font-mono text-xs mt-10 animate-pulse text-glow">SYSTEM_HALT...</div>
              <style>{`
                @keyframes shutdownH { 0% { height: 100vh; background: white; } 50% { height: 2px; background: white; } 100% { height: 2px; width: 0; background: white; } }
                @keyframes shutdownV { 0% { width: 100vw; opacity: 0; } 50% { width: 2px; opacity: 1; } 100% { height: 0; width: 2px; opacity: 0; } }
              `}</style>
          </div>
      )}

      {/* --- LOGOUT CONFIRMATION MODAL --- */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[#050a14] border-2 border-cyber-danger rounded-2xl max-w-sm w-full shadow-[0_0_50px_rgba(255,0,60,0.3)] text-center relative overflow-hidden group">
                 <div className="absolute top-0 left-0 w-full h-1 bg-cyber-danger/50 shadow-[0_0_15px_#ff003c] animate-[scanline_1.5s_linear_infinite]"></div>
                 <div className="w-16 h-16 rounded-full bg-cyber-danger/10 flex items-center justify-center mx-auto mb-6 border-2 border-cyber-danger group-hover:scale-110 transition-transform shadow-neon-red mt-8">
                     <i className="fas fa-power-off text-3xl text-cyber-danger"></i>
                 </div>
                 <h3 className="text-xl font-display font-bold text-white mb-2 uppercase tracking-widest text-shadow-red">¿Desconectar?</h3>
                 <p className="text-cyber-danger/70 text-xs font-mono mb-8">Se cerrará el túnel seguro con el Núcleo.</p>
                 <div className="flex gap-4 p-6 border-t border-white/10 bg-black/40">
                     <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold uppercase text-xs tracking-wider transition-colors shadow-[0_0_10px_rgba(255,255,255,0.05)]">Cancelar</button>
                     <button onClick={confirmSignOut} className="flex-1 py-3 rounded-lg bg-cyber-danger text-black font-bold uppercase text-xs tracking-wider shadow-neon-red hover:bg-white hover:text-cyber-danger transition-all">Apagar</button>
                 </div>
            </div>
        </div>
      )}

      {/* --- FLOATING COMMAND HUD (New Layout) --- */}
      <header className="fixed top-4 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 pointer-events-none">
        <div className="max-w-7xl mx-auto pointer-events-auto">
            <div className="bg-[#050a14]/80 backdrop-blur-xl border border-white/10 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.05)] p-2 pl-6 pr-2 flex items-center justify-between relative overflow-hidden group-header">
                
                {/* Header Glow Line */}
                <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent shadow-[0_0_10px_white]"></div>

                {/* 1. IDENTITY MODULE */}
                <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate(ROUTES.DASHBOARD)}>
                    <div className="w-8 h-8 flex items-center justify-center bg-cyber-neon/10 rounded-lg border border-cyber-neon/50 shadow-[0_0_15px_rgba(0,240,255,0.3)]">
                        <i className="fas fa-cube text-cyber-neon animate-pulse"></i>
                    </div>
                    <h1 className="hidden sm:block text-xl font-display font-black italic tracking-wider text-white leading-none">
                        TIEMPOS<span className="text-cyber-neon">PRO</span>
                    </h1>
                </div>

                {/* 2. NAVIGATION BRIDGE (Desktop) */}
                <nav className="hidden lg:flex items-center gap-1 mx-8">
                    <NavItem icon="fa-chart-pie" label="Panel" active={isActive(ROUTES.DASHBOARD)} onClick={() => navigate(ROUTES.DASHBOARD)} color="cyber-neon" />
                    
                    {/* ADMIN ONLY MODULES */}
                    {user.role === UserRole.SuperAdmin && (
                        <>
                            <NavItem icon="fa-dna" label="Auditoría" active={isActive(ROUTES.AUDIT)} onClick={() => navigate(ROUTES.AUDIT)} color="cyber-purple" />
                            <NavItem icon="fa-server" label="Libro" active={isActive(ROUTES.LEDGER)} onClick={() => navigate(ROUTES.LEDGER)} color="cyber-success" />
                        </>
                    )}
                </nav>

                {/* 3. USER COMMAND CAPSULE (Deep Abyss - Phosphorescent) */}
                <div className="relative group/capsule">
                    {/* Living Backlight */}
                    <div className="absolute -inset-1 bg-[#1e3a8a] rounded-full opacity-20 blur-md animate-pulse group-hover/capsule:opacity-40 transition-opacity duration-500"></div>
                    
                    <div className="relative flex items-center bg-[#050a14] border-2 border-[#1e3a8a] rounded-full pl-1 pr-1 py-1 gap-3 shadow-[0_0_20px_rgba(30,58,138,0.4)] transition-all duration-500">
                        
                        {/* Balance Pill */}
                        <div className="hidden md:flex items-center px-4 py-1.5 rounded-full bg-black/60 border-2 border-cyber-neon/50 shadow-neon-cyan">
                            <span className="text-xs font-mono font-bold text-cyber-neon">{formatCurrency(user.balance_bigint)}</span>
                        </div>

                        {/* Role Badge */}
                        <div className={`hidden md:flex items-center justify-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border-2 shadow-[0_0_15px_currentColor] ${
                            user.role === UserRole.SuperAdmin ? 'bg-cyber-emerald/20 border-cyber-emerald text-cyber-emerald' :
                            user.role === UserRole.Vendedor ? 'bg-cyber-purple/20 border-cyber-purple text-cyber-purple' :
                            'bg-cyber-blue/20 border-cyber-blue text-cyber-blue'
                        }`}>
                            {user.role === UserRole.SuperAdmin ? 'ADMIN' : user.role.substring(0,4)}
                        </div>

                        <div className="flex flex-col items-end leading-none mr-2 md:mr-0">
                            <span className="text-xs font-bold text-white">{user.name.split(' ')[0]}</span>
                        </div>

                        {/* Logout Button - Emergency Eject */}
                        <button 
                            onClick={requestSignOut}
                            className="relative w-8 h-8 flex items-center justify-center rounded-full bg-cyber-danger/10 text-cyber-danger border-2 border-cyber-danger hover:bg-white hover:text-cyber-danger transition-all shadow-[0_0_10px_#ff003c]"
                        >
                            <div className="absolute inset-0 bg-cyber-danger rounded-full blur-sm opacity-0 hover:opacity-50 transition-opacity animate-pulse"></div>
                            <i className="fas fa-power-off text-xs relative z-10"></i>
                        </button>
                    </div>
                </div>

                {/* Mobile Toggle */}
                <button 
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="lg:hidden w-10 h-10 flex items-center justify-center rounded-full border-2 border-cyber-neon bg-white/5 text-white ml-4 shadow-neon-cyan"
                >
                    <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
                </button>
            </div>
        </div>

        {/* Mobile Dropdown */}
        {isMobileMenuOpen && (
           <div className="absolute top-full left-0 right-0 mt-4 px-4 animate-in slide-in-from-top-4 duration-300 pointer-events-auto">
              <div className="bg-[#050a14]/95 backdrop-blur-xl border-2 border-cyber-neon rounded-2xl p-4 shadow-[0_10px_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-cyber-neon shadow-neon-cyan"></div>
                  
                  <div className="space-y-2">
                      <MobileNavItem label="Panel Principal" icon="fa-chart-pie" color="neon" onClick={() => { navigate(ROUTES.DASHBOARD); setIsMobileMenuOpen(false); }} active={isActive(ROUTES.DASHBOARD)} />
                      
                      {/* ADMIN ONLY MOBILE MODULES */}
                      {user.role === UserRole.SuperAdmin && (
                        <>
                            <MobileNavItem label="Auditoría Forense" icon="fa-dna" color="purple" onClick={() => { navigate(ROUTES.AUDIT); setIsMobileMenuOpen(false); }} active={isActive(ROUTES.AUDIT)} />
                            <MobileNavItem label="Libro Mayor" icon="fa-server" color="success" onClick={() => { navigate(ROUTES.LEDGER); setIsMobileMenuOpen(false); }} active={isActive(ROUTES.LEDGER)} />
                        </>
                      )}
                  </div>
                  
                  {/* Mobile User Section */}
                  <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="flex items-center justify-between bg-black/40 p-3 rounded-xl border-2 border-cyber-blue shadow-neon-blue">
                          <div className="flex flex-col">
                              <span className="text-[9px] text-slate-500 font-mono">SALDO</span>
                              <span className="text-cyber-neon font-bold">{formatCurrency(user.balance_bigint)}</span>
                          </div>
                          <div className="flex flex-col items-end">
                              <span className="text-[9px] text-slate-500 font-mono">ROL</span>
                              <span className="text-white font-bold">{user.role === UserRole.SuperAdmin ? 'ADMIN' : user.role}</span>
                          </div>
                      </div>
                      <button onClick={requestSignOut} className="w-full mt-2 py-3 bg-cyber-danger/10 border-2 border-cyber-danger text-cyber-danger rounded-xl font-bold uppercase text-xs tracking-wider flex items-center justify-center gap-2 shadow-neon-red">
                          <i className="fas fa-power-off"></i> Desconectar
                      </button>
                  </div>
              </div>
           </div>
        )}
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 relative z-10 w-full max-w-8xl mx-auto pt-28 px-4 sm:px-6 lg:px-8 pb-24">
        {children}
      </main>

      {/* --- LIVE TELEMETRY TICKER (New Footer) --- */}
      <footer className="fixed bottom-0 left-0 w-full bg-[#02040a] border-t border-cyber-border/50 z-40 h-10 flex items-center overflow-hidden shadow-[0_-5px_20px_rgba(30,58,138,0.3)]">
         <div className="flex-shrink-0 px-4 bg-cyber-blue/20 h-full flex items-center border-r border-cyber-blue/30 z-10">
             <div className="w-2 h-2 bg-cyber-success rounded-full animate-pulse mr-2 shadow-[0_0_5px_lime]"></div>
             <span className="text-[10px] font-mono font-bold text-cyber-blue tracking-widest">SYSTEM LIVE</span>
         </div>
         
         <div className="flex-1 overflow-hidden relative">
             <div className="absolute whitespace-nowrap animate-scroll-ticker flex gap-12 items-center text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                 <span><i className="fas fa-server text-cyber-purple mr-2"></i> Edge-Node-01: ONLINE</span>
                 <span><i className="fas fa-shield-alt text-cyber-success mr-2"></i> Integrity: 100%</span>
                 <span><i className="fas fa-clock text-cyber-neon mr-2"></i> Sync Latency: 12ms</span>
                 <span><i className="fas fa-database text-blue-500 mr-2"></i> Ledger Hash: Verified</span>
                 <span><i className="fas fa-users text-cyber-orange mr-2"></i> Active Users: 1,042</span>
                 <span><i className="fas fa-bolt text-yellow-400 mr-2"></i> Voltage: Stable</span>
                 {/* Repeat for infinite loop illusion */}
                 <span><i className="fas fa-server text-cyber-purple mr-2"></i> Edge-Node-01: ONLINE</span>
                 <span><i className="fas fa-shield-alt text-cyber-success mr-2"></i> Integrity: 100%</span>
                 <span><i className="fas fa-clock text-cyber-neon mr-2"></i> Sync Latency: 12ms</span>
             </div>
         </div>

         <div className="flex-shrink-0 px-4 h-full flex items-center border-l border-white/10 bg-black z-10 text-[9px] text-slate-600 font-mono">
             PHRONT v4.0
         </div>
      </footer>
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick, color }: any) => {
  const colors: any = {
    'cyber-neon': 'shadow-[0_0_15px_#00f0ff]',
    'cyber-purple': 'shadow-[0_0_15px_#bc13fe]',
    'cyber-success': 'shadow-[0_0_15px_#0aff60]',
  };

  return (
    <button 
      onClick={onClick}
      className={`
        relative px-6 py-2 rounded-full font-bold text-[10px] uppercase tracking-widest transition-all duration-300 overflow-hidden border-2 shadow-[0_0_10px_rgba(0,0,0,0)]
        ${active 
            ? `bg-white text-black border-white ${colors[color]}` 
            : 'bg-transparent text-slate-400 border-transparent hover:text-white hover:bg-white/5 hover:border-white/20'}
      `}
    >
       <div className="flex items-center gap-2 relative z-10">
          <i className={`fas ${icon} ${active ? 'text-black' : ''}`}></i>
          {label}
       </div>
    </button>
  );
};

const MobileNavItem = ({ label, icon, onClick, active, color }: any) => {
    const themeColors: any = {
        'neon': 'border-cyber-neon text-cyber-neon shadow-neon-cyan',
        'purple': 'border-cyber-purple text-cyber-purple shadow-neon-purple',
        'success': 'border-cyber-success text-cyber-success shadow-neon-green'
    };

    return (
       <button onClick={onClick} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 border-2 ${active ? `bg-black ${themeColors[color]}` : 'border-white/10 text-slate-400 hover:border-white/30 hover:text-white'}`}>
          <i className={`fas ${icon}`}></i>
          <span className="font-bold uppercase tracking-wider text-xs">{label}</span>
       </button>
    );
};