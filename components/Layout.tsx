
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
             
             {/* Desktop Integrated Capsule - DEEP NIGHT BLUE PHOSPHORESCENT (ABYSS) - LIVING UPGRADE */}
             <div className="hidden md:block relative group">
                
                {/* LIVING BACKLIGHT (The "Soul") */}
                <div className="absolute -inset-1 bg-[#1e3a8a] rounded-full opacity-20 blur-xl animate-[pulse_3s_ease-in-out_infinite] transition-all duration-500 group-hover:opacity-50 group-hover:blur-2xl"></div>
                
                {/* SOLID CONTAINER */}
                <div className="relative flex items-center bg-[#050a14]/95 backdrop-blur-xl border-2 border-[#1e3a8a] shadow-[0_0_30px_rgba(30,58,138,0.5)] rounded-full p-1 pl-6 gap-6 transition-all duration-500 group-hover:border-[#3b82f6] group-hover:shadow-[0_0_50px_rgba(30,58,138,0.8)]">
                    
                    {/* User Details */}
                    <div className="flex flex-col items-end">
                       {/* PHOSPHORESCENT ROLE BADGE (LIVING BORDER) */}
                       <div className={`px-3 py-1 rounded-lg border-2 text-[9px] font-mono uppercase tracking-widest font-bold mb-1 shadow-lg transition-all duration-500 ${
                           user.role === UserRole.SuperAdmin ? 'border-cyber-emerald text-cyber-emerald shadow-[0_0_15px_rgba(16,185,129,0.4)]' :
                           user.role === UserRole.Vendedor ? 'border-cyber-purple text-cyber-purple shadow-[0_0_15px_rgba(188,19,254,0.4)]' :
                           'border-cyber-blue text-cyber-blue shadow-[0_0_15px_rgba(36,99,235,0.4)]'
                       }`}>
                          {user.role}
                       </div>
                       <span className="font-display font-bold text-white text-sm tracking-wide text-glow-sm">{user.name.split(' ')[0]}</span>
                    </div>
                    
                    {/* Balance & Actions Cluster */}
                    <div className="flex items-center gap-3 bg-black/40 rounded-full p-1 pr-1 border border-white/5 group-hover:border-white/10 transition-colors">
                       
                       {/* Balance Display - PHOSPHORESCENT CYAN */}
                       <div className="px-4 py-1.5 rounded-full bg-[#0a1124] border-2 border-cyber-neon text-cyber-neon font-mono font-bold text-sm shadow-[0_0_20px_rgba(0,240,255,0.3)] animate-[pulse_4s_ease-in-out_infinite]">
                          {formatCurrency(user.balance_bigint)}
                       </div>

                       {/* Divider */}
                       <div className="w-px h-6 bg-white/10 mx-1"></div>

                       {/* Logout Button (LIVING PHOSPHORESCENT DANGER) */}
                       <button 
                          onClick={requestSignOut}
                          className="w-9 h-9 flex items-center justify-center rounded-full border-2 border-cyber-danger text-cyber-danger shadow-[0_0_10px_rgba(255,0,60,0.3)] bg-cyber-danger/5 hover:bg-cyber-danger hover:text-white hover:shadow-neon-red transition-all duration-300 group/logout relative overflow-hidden"
                          title="Desconectar del Núcleo"
                       >
                          <div className="absolute inset-0 bg-cyber-danger opacity-0 group-hover/logout:opacity-100 transition-opacity duration-300"></div>
                          <i className="fas fa-power-off text-xs relative z-10 group-hover/logout:animate-pulse"></i>
                       </button>
                    </div>
                </div>
             </div>

             {/* Mobile Toggle - PHOSPHORESCENT UPGRADE */}
             <button 
               onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
               className={`lg:hidden w-12 h-12 flex items-center justify-center rounded-xl border-2 transition-all duration-300 ${
                   isMobileMenuOpen 
                   ? 'bg-cyber-neon text-black border-cyber-neon shadow-neon-cyan rotate-90' 
                   : 'bg-black/50 text-cyber-neon border-cyber-neon/50 shadow-[0_0_15px_rgba(0,240,255,0.2)] hover:border-cyber-neon hover:shadow-neon-cyan'
               }`}
             >
                <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'} text-xl`}></i>
             </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown - HOLOGRAPHIC MODULE UPGRADE */}
        {isMobileMenuOpen && (
           <div className="lg:hidden absolute top-[calc(100%+1px)] left-0 w-full z-50 animate-in slide-in-from-top-2 duration-300">
              
              {/* Backdrop Blur & Border */}
              <div className="bg-[#050a14]/95 backdrop-blur-xl border-b-2 border-cyber-neon shadow-[0_10px_40px_rgba(0,0,0,0.8)] p-6 relative overflow-hidden">
                  
                  {/* Top Glow Line */}
                  <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyber-neon to-transparent opacity-50"></div>

                  <div className="space-y-3 relative z-10">
                      <MobileNavItem 
                        label="Panel Principal" 
                        icon="fa-chart-pie" 
                        color="neon"
                        onClick={() => { navigate(ROUTES.DASHBOARD); setIsMobileMenuOpen(false); }} 
                        active={isActive(ROUTES.DASHBOARD)} 
                      />
                      {user.role === UserRole.SuperAdmin && (
                        <MobileNavItem 
                            label="Auditoría Forense" 
                            icon="fa-dna" 
                            color="purple"
                            onClick={() => { navigate(ROUTES.AUDIT); setIsMobileMenuOpen(false); }} 
                            active={isActive(ROUTES.AUDIT)} 
                        />
                      )}
                      <MobileNavItem 
                        label="Libro Mayor" 
                        icon="fa-server" 
                        color="success"
                        onClick={() => { navigate(ROUTES.LEDGER); setIsMobileMenuOpen(false); }} 
                        active={isActive(ROUTES.LEDGER)} 
                      />
                  </div>
                  
                  <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-6"></div>
                  
                  {/* Mobile User Info - PHOSPHORESCENT CAPSULE */}
                  <div className="relative group/mobile-user mb-4">
                     <div className="absolute -inset-1 bg-[#1e3a8a] rounded-xl opacity-20 blur-lg animate-pulse"></div>
                     <div className="relative px-5 py-4 flex justify-between items-center bg-[#0a1124] rounded-xl border-2 border-[#1e3a8a] shadow-[0_0_20px_rgba(30,58,138,0.3)]">
                        <div className="flex flex-col">
                            <span className={`text-[9px] font-bold uppercase tracking-widest mb-1 px-2 py-0.5 rounded border w-fit ${
                                user.role === UserRole.SuperAdmin ? 'text-cyber-emerald border-cyber-emerald' : 
                                user.role === UserRole.Vendedor ? 'text-cyber-purple border-cyber-purple' : 
                                'text-cyber-blue border-cyber-blue'
                            }`}>
                                {user.role}
                            </span>
                            <span className="text-sm text-white font-display font-bold tracking-wider">{user.name}</span>
                        </div>
                        <div className="text-right">
                            <span className="block text-[8px] text-slate-500 uppercase tracking-widest">Saldo</span>
                            <span className="text-cyber-neon font-mono font-bold text-xl text-shadow-cyan">{formatCurrency(user.balance_bigint)}</span>
                        </div>
                     </div>
                  </div>

                  {/* Mobile Logout - DANGER ZONE */}
                  <button 
                    onClick={requestSignOut} 
                    className="w-full relative group/logout overflow-hidden rounded-xl border-2 border-cyber-danger/50 p-4 transition-all duration-300 hover:border-cyber-danger hover:shadow-neon-red"
                  >
                     <div className="absolute inset-0 bg-cyber-danger/10 group-hover/logout:bg-cyber-danger group-hover/logout:opacity-100 transition-all duration-300 opacity-0"></div>
                     <div className="relative z-10 flex items-center justify-center gap-3 text-cyber-danger group-hover/logout:text-white font-display font-black uppercase tracking-widest">
                        <i className="fas fa-power-off"></i> Desconectar
                     </div>
                  </button>
              </div>
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

const MobileNavItem = ({ label, icon, onClick, active, color }: any) => {
    const themeColors: any = {
        'neon': 'border-cyber-neon text-cyber-neon shadow-neon-cyan',
        'purple': 'border-cyber-purple text-cyber-purple shadow-neon-purple',
        'success': 'border-cyber-success text-cyber-success shadow-neon-green'
    };

    const activeClass = active 
        ? `bg-black border-2 ${themeColors[color] || 'border-white text-white'}`
        : 'border-2 border-white/5 text-slate-400 hover:border-white/20 hover:text-white hover:bg-white/5';

    return (
       <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 rounded-xl transition-all duration-300 group ${activeClass}`}>
          <div className={`w-8 h-8 rounded flex items-center justify-center ${active ? 'bg-white/10' : 'bg-black/40'}`}>
            <i className={`fas ${icon} text-lg group-hover:scale-110 transition-transform`}></i>
          </div>
          <span className="font-display font-bold uppercase tracking-wider text-sm">{label}</span>
          {active && <div className={`ml-auto w-2 h-2 rounded-full ${color === 'neon' ? 'bg-cyber-neon' : color === 'purple' ? 'bg-cyber-purple' : 'bg-cyber-success'} animate-pulse shadow-[0_0_5px_currentColor]`}></div>}
       </button>
    );
};
