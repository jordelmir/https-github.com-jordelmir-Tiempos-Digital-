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
    
    // Animation delay
    setTimeout(async () => {
        await signOut();
        setIsShuttingDown(false); // Reset just in case
        navigate(ROUTES.LOGIN);
    }, 1500); // Time for the CRT animation
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
            <div className="bg-[#050a14] border border-cyber-danger rounded-2xl max-w-sm w-full shadow-[0_0_50px_rgba(255,0,60,0.3)] text-center relative overflow-hidden group">
                 {/* Scanning line */}
                 <div className="absolute top-0 left-0 w-full h-1 bg-cyber-danger/50 shadow-[0_0_15px_#ff003c] animate-[scanline_1.5s_linear_infinite]"></div>
                 
                 <div className="w-16 h-16 rounded-full bg-cyber-danger/10 flex items-center justify-center mx-auto mb-6 border border-cyber-danger/30 group-hover:scale-110 transition-transform shadow-neon-red">
                     <i className="fas fa-power-off text-3xl text-cyber-danger"></i>
                 </div>
                 
                 <h3 className="text-xl font-display font-bold text-white mb-2 uppercase tracking-widest text-shadow-red">¿Desconectar?</h3>
                 <p className="text-cyber-danger/70 text-xs font-mono mb-8">Se cerrará el túnel seguro con el Núcleo.</p>
                 
                 <div className="flex gap-4 p-4">
                     <button 
                        onClick={() => setShowLogoutConfirm(false)}
                        className="flex-1 py-3 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold uppercase text-xs tracking-wider transition-colors"
                     >
                         Cancelar
                     </button>
                     <button 
                        onClick={confirmSignOut}
                        className="flex-1 py-3 rounded-lg bg-cyber-danger text-black font-bold uppercase text-xs tracking-wider shadow-neon-red hover:bg-white hover:text-cyber-danger transition-all"
                     >
                         Apagar
                     </button>
                 </div>
            </div>
        </div>
      )}

      {/* --- TOP COMMAND HUD (Sticky Header) --- */}
      <header className="sticky top-0 z-50 w-full border-b border-cyber-neon/20 bg-[#02040a]/70 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.5)] transition-all duration-300">
        
        {/* Animated Top Line */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyber-neon to-transparent opacity-80 shadow-[0_0_10px_#00f0ff]"></div>

        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between relative">
          
          {/* 1. IDENTITY MODULE (Logo) */}
          <div className="flex items-center gap-6 cursor-pointer group shrink-0" onClick={() => navigate(ROUTES.DASHBOARD)}>
             <div className="relative w-10 h-10 flex items-center justify-center bg-cyber-panel/50 rounded-lg border border-cyber-neon/30 group-hover:border-cyber-neon group-hover:shadow-neon-cyan transition-all duration-300">
                <i className="fas fa-brain text-xl text-cyber-neon animate-pulse drop-shadow-[0_0_5px_rgba(0,240,255,0.8)]"></i>
             </div>
             <div className="flex flex-col">
                <h1 className="text-2xl font-display font-black italic tracking-wider text-white leading-none drop-shadow-md">
                  TIEMPOS<span className="text-cyber-neon text-glow">PRO</span>
                </h1>
                <div className="flex items-center gap-2 mt-1">
                   <div className="w-1 h-1 bg-cyber-success rounded-full animate-ping shadow-[0_0_5px_#0aff60]"></div>
                   <span className="text-[9px] text-cyber-blue font-mono tracking-[0.3em] uppercase font-bold text-glow-sm">Phront v3.3 Connected</span>
                </div>
             </div>
          </div>

          {/* 2. NAVIGATION BRIDGE (Desktop - Centered) */}
          <nav className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-1 bg-black/40 p-1 rounded-full border border-white/10 backdrop-blur-md shadow-lg">
             <NavItem 
               icon="fa-chart-pie" 
               label="Panel" 
               active={isActive(ROUTES.DASHBOARD)} 
               onClick={() => navigate(ROUTES.DASHBOARD)} 
               color="cyber-neon"
             />
             {user.role === UserRole.SuperAdmin && (
                <NavItem 
                icon="fa-dna" 
                label="Auditoría" 
                active={isActive(ROUTES.AUDIT)} 
                onClick={() => navigate(ROUTES.AUDIT)} 
                color="cyber-purple"
              />
             )}
             <NavItem 
               icon="fa-server" 
               label="Libro" 
               active={isActive(ROUTES.LEDGER)} 
               onClick={() => navigate(ROUTES.LEDGER)} 
               color="cyber-success"
             />
          </nav>

          {/* 3. USER COMMAND NODE (Unified Capsule) */}
          <div className="flex items-center justify-end shrink-0 gap-4">
             
             {/* Desktop Integrated Capsule */}
             <div className="hidden md:flex items-center bg-[#050a14]/60 backdrop-blur-md border border-white/10 rounded-full p-1 pl-6 gap-6 shadow-inner group transition-all duration-300 hover:border-cyber-neon/30 hover:shadow-neon-cyan">
                
                {/* User Details */}
                <div className="flex flex-col items-end">
                   <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyber-success animate-pulse shadow-[0_0_5px_lime]"></span>
                      <span className="text-[9px] text-cyber-blue font-mono uppercase tracking-widest font-bold">{user.role}</span>
                   </div>
                   <span className="font-display font-bold text-white text-sm tracking-wide text-glow-sm">{user.name.split(' ')[0]}</span>
                </div>
                
                {/* Balance & Actions Cluster */}
                <div className="flex items-center gap-1 bg-black/40 rounded-full p-1 pr-1 border border-white/5 group-hover:border-cyber-neon/20 transition-colors">
                   
                   {/* Balance Display */}
                   <div className="px-4 py-1.5 rounded-full bg-cyber-panel/50 border border-cyber-neon/20 text-cyber-neon font-mono font-bold text-sm shadow-[0_0_15px_rgba(0,240,255,0.15)]">
                      {formatCurrency(user.balance_bigint)}
                   </div>

                   {/* Divider */}
                   <div className="w-px h-6 bg-white/10 mx-1"></div>

                   {/* Logout Button (Integrated) */}
                   <button 
                      onClick={requestSignOut}
                      className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-cyber-danger hover:shadow-neon-red transition-all duration-300"
                      title="Desconectar del Núcleo"
                   >
                      <i className="fas fa-power-off text-xs"></i>
                   </button>
                </div>
             </div>

             {/* Mobile Toggle */}
             <button 
               onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
               className="lg:hidden w-10 h-10 flex items-center justify-center text-white border border-white/10 rounded bg-white/5"
             >
                <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
             </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
           <div className="lg:hidden border-t border-cyber-border bg-[#050a14]/95 backdrop-blur-xl p-4 space-y-2 animate-in slide-in-from-top-2 absolute w-full z-50 shadow-2xl">
              <MobileNavItem label="Panel Principal" icon="fa-chart-pie" onClick={() => { navigate(ROUTES.DASHBOARD); setIsMobileMenuOpen(false); }} active={isActive(ROUTES.DASHBOARD)} />
              {user.role === UserRole.SuperAdmin && <MobileNavItem label="Auditoría" icon="fa-dna" onClick={() => { navigate(ROUTES.AUDIT); setIsMobileMenuOpen(false); }} active={isActive(ROUTES.AUDIT)} />}
              <MobileNavItem label="Libro Mayor" icon="fa-server" onClick={() => { navigate(ROUTES.LEDGER); setIsMobileMenuOpen(false); }} active={isActive(ROUTES.LEDGER)} />
              
              <div className="h-px bg-white/10 my-4"></div>
              
              {/* Mobile User Info */}
              <div className="px-4 py-2 flex justify-between items-center bg-black/40 rounded-lg border border-cyber-neon/20 mb-2">
                 <span className="text-xs text-cyber-blue font-bold">{user.name}</span>
                 <span className="text-cyber-neon font-mono font-bold text-glow-sm">{formatCurrency(user.balance_bigint)}</span>
              </div>

              <button onClick={requestSignOut} className="w-full text-left px-4 py-3 text-cyber-danger font-display font-bold uppercase tracking-widest flex items-center gap-3 hover:bg-white/5 rounded-lg transition-colors text-shadow-red">
                 <i className="fas fa-power-off"></i> Cerrar Sesión
              </button>
           </div>
        )}
      </header>

      {/* --- MAIN SCROLLABLE CONTENT AREA --- */}
      <main className="flex-1 relative z-10 w-full max-w-8xl mx-auto p-4 sm:p-6 lg:p-10 pb-20">
        
        {/* Background Ambient Effects (Fixed to viewport but behind content) - REDUCED OPACITY for Matrix Rain Visibility */}
        <div className="fixed top-0 left-0 w-full h-screen overflow-hidden pointer-events-none z-[-1]">
           <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-cyber-blue/5 rounded-full blur-[150px]"></div>
           <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyber-purple/5 rounded-full blur-[120px]"></div>
        </div>

        {/* Content Inject */}
        {children}

      </main>

      {/* --- FOOTER / STATUS BAR --- */}
      <footer className="border-t border-cyber-border/30 bg-[#02040a]/80 backdrop-blur-md py-6 mt-auto relative z-20">
         <div className="max-w-8xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-[10px] font-mono text-cyber-blue uppercase tracking-widest gap-4">
            <div className="flex items-center gap-4">
               <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-cyber-success rounded-full shadow-[0_0_5px_lime]"></div> System Normal</span>
               <span className="text-slate-600">|</span>
               <span className="text-cyber-purple">Latency: 12ms</span>
            </div>
            <div className="text-slate-500">
               &copy; 2025 <span className="text-white font-bold text-glow-sm">PHRONT MAESTRO ARCHITECTURE</span>. ALL RIGHTS RESERVED.
            </div>
         </div>
      </footer>
    </div>
  );
};

// --- COMPONENTS ---

const NavItem = ({ icon, label, active, onClick, color }: any) => {
  const colors: any = {
    'cyber-neon': 'group-hover:text-cyber-neon group-hover:shadow-[0_0_10px_#00f0ff]',
    'cyber-purple': 'group-hover:text-cyber-purple group-hover:shadow-[0_0_10px_#bc13fe]',
    'cyber-success': 'group-hover:text-cyber-success group-hover:shadow-[0_0_10px_#0aff60]',
  };

  return (
    <button 
      onClick={onClick}
      className={`
        relative px-5 py-2 rounded-full font-display font-bold text-[10px] md:text-xs uppercase tracking-widest transition-all duration-300 group overflow-hidden
        ${active ? 'text-black bg-white shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'text-slate-400 hover:text-white hover:bg-white/10'}
      `}
    >
       <div className="relative z-10 flex items-center gap-2">
          <i className={`fas ${icon} ${active ? 'text-black' : ''} ${!active ? colors[color] : ''} transition-all`}></i>
          {label}
       </div>
    </button>
  );
};

const MobileNavItem = ({ label, icon, onClick, active }: any) => (
   <button onClick={onClick} className={`w-full flex items-center gap-4 px-4 py-4 rounded-lg transition-colors ${active ? 'bg-cyber-neon/10 text-cyber-neon border border-cyber-neon/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
      <i className={`fas ${icon} w-6 text-center`}></i>
      <span className="font-display font-bold uppercase tracking-wider text-sm">{label}</span>
   </button>
);