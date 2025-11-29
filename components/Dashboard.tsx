
// ... [Imports] ...
import React, { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { UserRole, AppUser, DrawTime, GameMode } from '../types';
import UserCreationForm from './UserCreationForm';
import DataPurgeCard from './DataPurgeCard';
import RechargeModal from './RechargeModal';
import WithdrawModal from './WithdrawModal';
import AdminResultControl from './AdminResultControl';
import UserManagementPanel from './UserManagementPanel';
import ReventadosEffect from './ReventadosEffect';
import CountdownTimer from './CountdownTimer';
import LiveResultsPanel from './LiveResultsPanel'; 
import GlobalBetsTable from './GlobalBetsTable'; 
import RiskLimitManager from './RiskLimitManager';
import TopNumbersPanel from './TopNumbersPanel'; 
import PersonalBetsPanel from './PersonalBetsPanel';
import { useServerClock } from '../hooks/useServerClock';
import { formatCurrency } from '../constants';
import { supabase } from '../lib/supabaseClient';
import { api } from '../services/edgeApi';
import AnimatedIconUltra from './ui/AnimatedIconUltra';
import WinnerOverlay from './WinnerOverlay'; // IMPORT NEW COMPONENT

// ... [Existing PendingBet interface & SystemStatusHUD] ...
interface PendingBet {
    id: string;
    number: string;
    amount: number;
    draw: DrawTime;
    mode: GameMode;
}

const SystemStatusHUD = () => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Desktop View (The Card)
    const DesktopCard = (
        <div className="relative w-full">
            <div className="absolute -inset-1 bg-cyber-blue rounded-2xl opacity-10 blur-lg animate-pulse"></div>
            <div className="relative bg-cyber-panel/40 border border-white/5 rounded-2xl p-6 backdrop-blur-md z-10 shadow-xl">
                <h4 className="font-display font-bold text-slate-400 uppercase text-xs tracking-widest mb-4 flex items-center gap-2">
                    <i className="fas fa-server text-cyber-blue"></i> Estado del Sistema
                </h4>
                <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Conexión WebSocket</span>
                        <span className="text-cyber-success font-mono font-bold text-shadow-green flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            ESTABLE
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Latencia Edge</span>
                        <span className="text-white font-mono">14ms</span>
                    </div>
                    <div className="h-px bg-white/5 my-2"></div>
                    <div className="text-[10px] text-cyber-blue/70 leading-relaxed font-mono">
                        ADVERTENCIA: Todas las transacciones son finales y están auditadas criptográficamente por el núcleo Phront.
                    </div>
                </div>
            </div>
        </div>
    );

    // Mobile View (The Floating Bar)
    const MobileBar = (
        <div className="bg-[#050a14]/95 backdrop-blur-xl border-t border-cyber-blue/30 shadow-[0_-10px_20px_rgba(0,0,0,0.5)] w-full">
            {/* Header / Toggle */}
            <div 
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center justify-between px-4 py-2 cursor-pointer active:bg-white/5"
            >
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyber-success opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyber-success"></span>
                        </span>
                        <span className="text-[10px] font-bold text-cyber-blue uppercase tracking-wider">SYSTEM_OK</span>
                    </div>
                    <div className="h-3 w-px bg-white/10"></div>
                    <span className="text-[10px] font-mono text-slate-400">14ms</span>
                </div>
                <i className={`fas fa-chevron-up text-xs text-cyber-blue transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}></i>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-white/5 animate-in slide-in-from-bottom-2">
                    <div className="grid grid-cols-2 gap-4 mb-3">
                        <div className="bg-black/40 p-2 rounded border border-white/5">
                            <div className="text-[8px] text-slate-500 uppercase">Socket</div>
                            <div className="text-xs text-cyber-success font-bold">CONECTADO</div>
                        </div>
                        <div className="bg-black/40 p-2 rounded border border-white/5">
                            <div className="text-[8px] text-slate-500 uppercase">Cifrado</div>
                            <div className="text-xs text-white font-bold">TLS 1.3</div>
                        </div>
                    </div>
                    <p className="text-[9px] text-slate-500 font-mono leading-tight">
                        * Integridad de datos verificada. No apagar durante transacciones.
                    </p>
                </div>
            )}
        </div>
    );

    return (
        <>
            {/* Desktop: Sticky Sidebar */}
            <div className="hidden lg:block sticky top-28 z-30 transition-all duration-300">
                {DesktopCard}
            </div>

            {/* Mobile: Fixed Bottom Bar (Above Global Footer) */}
            <div className="lg:hidden fixed bottom-8 left-0 right-0 z-40">
                {MobileBar}
            </div>
        </>
    );
};

// ... [PowerCard Component] ...
const PowerCard = ({ label, value, sub, icon, theme, isMoney, isWarning, onClick, editable }: any) => (
  <div 
      onClick={onClick}
      className={`relative group bg-[#050a14] border-2 ${isWarning ? 'border-red-500 shadow-neon-red' : `${theme.border} ${theme.shadow}`} p-6 rounded-2xl backdrop-blur-md overflow-hidden transition-all duration-300 ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
  >
      {/* Internal Glow */}
      <div className={`absolute -inset-1 ${isWarning ? 'bg-red-600' : theme.glow} rounded-2xl opacity-10 blur-xl transition-opacity duration-500 group-hover:opacity-20`}></div>
      
      <div className="relative z-10 flex justify-between items-start">
          <div>
              <div className={`text-[10px] font-mono font-bold uppercase tracking-widest mb-2 ${isWarning ? 'text-red-500' : 'text-slate-400'}`}>
                  {label} {editable && <i className="fas fa-pencil-alt ml-2 opacity-50"></i>}
              </div>
              <div className={`text-3xl font-mono font-bold ${isWarning ? 'text-red-500 drop-shadow-[0_0_10px_red]' : isMoney ? theme.text : 'text-white'} text-glow-sm`}>
                  {value}
              </div>
              {sub && <div className="text-[9px] font-mono text-red-400 mt-1 animate-pulse">{sub}</div>}
          </div>
          
          <div className={`w-12 h-12 rounded-xl bg-black/50 flex items-center justify-center border ${isWarning ? 'border-red-500' : theme.border} shadow-inner`}>
              {/* ANIMATED ICON INTEGRATION */}
              <AnimatedIconUltra profile={{ animation: isWarning ? 'pulse' : 'infinite', theme: isWarning ? 'neon' : 'futuristic', speed: 3 }}>
                  <i className={`fas ${icon} text-xl ${isWarning ? 'text-red-500' : theme.text}`}></i>
              </AnimatedIconUltra>
          </div>
      </div>
  </div>
);

export default function Dashboard() {
  const { user, fetchUser, setUser } = useAuthStore(); 
  // ... [Existing state] ...
  const [players, setPlayers] = useState<AppUser[]>([]);
  const [vendors, setVendors] = useState<AppUser[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);

  // Recharge & Withdraw State
  const [rechargeModalOpen, setRechargeModalOpen] = useState(false);
  const [selectedUserForRecharge, setSelectedUserForRecharge] = useState<AppUser | null>(null);
  
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [selectedUserForWithdraw, setSelectedUserForWithdraw] = useState<AppUser | null>(null);

  // Admin God Mode State
  const [adminResultOpen, setAdminResultOpen] = useState(false);
  const [editingMultiplier, setEditingMultiplier] = useState(false);
  
  // Dual Core Multiplier State
  const [customMultiplier, setCustomMultiplier] = useState(90);
  const [customReventadosMultiplier, setCustomReventadosMultiplier] = useState(200);
  const [savingMultiplier, setSavingMultiplier] = useState(false);

  // Betting State
  const [selectedDraw, setSelectedDraw] = useState<DrawTime>(DrawTime.NOCHE);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.TIEMPOS);
  const [betNumber, setBetNumber] = useState('');
  const [betAmount, setBetAmount] = useState('');
  
  // QUEUE & EXECUTION STATE
  const [pendingBets, setPendingBets] = useState<PendingBet[]>([]);
  const [executingBatch, setExecutingBatch] = useState(false);
  const [batchSuccess, setBatchSuccess] = useState(false);

  // TRIGGER FOR TABLE REFRESH
  const [tableRefreshTrigger, setTableRefreshTrigger] = useState(0);

  // --- WINNER OVERLAY STATE ---
  const [winnerData, setWinnerData] = useState<{ amount: number; number: string; draw: string; type: 'TIEMPOS' | 'REVENTADOS'; newBalance?: number } | null>(null);

  // --- CLOCK & LOCK LOGIC ---
  const { status: marketStatus, nextDraw } = useServerClock();
  const isMarketClosed = marketStatus === 'CLOSED';

  // Role Checks
  const isAdmin = user?.role === UserRole.SuperAdmin;
  const isVendor = user?.role === UserRole.Vendedor;
  const isClient = user?.role === UserRole.Cliente;

  // ... [Existing useEffects and helper functions] ...
  useEffect(() => {
      if (nextDraw) setSelectedDraw(nextDraw);
  }, [nextDraw]);

  const fetchSettings = async () => {
      try {
          const res = await api.getGlobalSettings();
          if(res.data) {
              setCustomMultiplier(res.data.multiplier_tiempos || 90);
              setCustomReventadosMultiplier(res.data.multiplier_reventados || 200);
          }
      } catch (e) {
          console.error("Failed to load settings");
      }
  };

  useEffect(() => {
      fetchSettings();
  }, []);

  const theme = useMemo(() => {
    switch (selectedDraw) {
        case DrawTime.MEDIODIA: 
            return { name: 'solar', hex: '#ff5f00', shadow: 'shadow-neon-solar', glow: 'bg-cyber-solar', text: 'text-cyber-solar', border: 'border-cyber-solar', label: 'SOLAR CORE' }; 
        case DrawTime.TARDE: 
            return { name: 'vapor', hex: '#7c3aed', shadow: 'shadow-neon-vapor', glow: 'bg-cyber-vapor', text: 'text-cyber-vapor', border: 'border-cyber-vapor', label: 'IMPERIAL SYNC' }; 
        case DrawTime.NOCHE: 
            return { name: 'abyss', hex: '#1e3a8a', shadow: 'shadow-neon-abyss', glow: 'bg-cyber-abyss', text: 'text-blue-400', border: 'border-blue-900', label: 'ABYSS DEPTH' }; 
        default: 
            return { name: 'abyss', hex: '#1e3a8a', shadow: 'shadow-neon-abyss', glow: 'bg-cyber-abyss', text: 'text-blue-400', border: 'border-blue-900', label: 'ABYSS' };
    }
  }, [selectedDraw]);

  // ... [fetchLists, handleUserCreated, etc. - Unchanged] ...
  const fetchLists = async () => {
    if (!user) return;
    if (isClient) return; 

    setLoadingLists(true);
    
    if (isAdmin || isVendor) {
        const { data: clientsData } = await supabase.from('app_users').select('*').eq('role', 'Cliente').limit(100);
        if (clientsData) setPlayers(clientsData as AppUser[]);
    }

    if (isAdmin) {
        const { data: vendorsData } = await supabase.from('app_users').select('*').eq('role', 'Vendedor').limit(100);
        if (vendorsData) setVendors(vendorsData as AppUser[]);
    }
    
    setLoadingLists(false);
  };

  useEffect(() => {
    fetchLists();
  }, [user]);

  const handleUserCreated = (newUser: AppUser) => {
      if (newUser.role === UserRole.Cliente) {
          setPlayers(prev => [newUser, ...prev]);
      } else if (newUser.role === UserRole.Vendedor) {
          setVendors(prev => [newUser, ...prev]);
      }
  };

  const openRecharge = (target: AppUser) => {
      setSelectedUserForRecharge(target);
      setRechargeModalOpen(true);
  };

  const openWithdraw = (target: AppUser) => {
      setSelectedUserForWithdraw(target);
      setWithdrawModalOpen(true);
  };

  const handleUpdateMultiplier = async () => {
      if(!user || !isAdmin) return;
      setSavingMultiplier(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      const res = await api.updateGlobalMultiplier({ 
          baseValue: customMultiplier,
          reventadosValue: customReventadosMultiplier,
          actor_id: user.id 
      });
      setSavingMultiplier(false);
      setEditingMultiplier(false);
      fetchSettings(); 
  };

  const handleAddToQueue = () => {
      if (isMarketClosed) return;
      if (!betNumber || !betAmount || Number(betAmount) <= 0) return;
      
      const rawAmount = Number(betAmount);
      const systemAmount = rawAmount * 100;

      const newBet: PendingBet = {
          id: `draft-${Date.now()}-${Math.random()}`,
          number: betNumber,
          amount: systemAmount,
          draw: selectedDraw,
          mode: gameMode
      };

      setPendingBets(prev => [newBet, ...prev]);
      setBetNumber('');
      
      const numberInput = document.getElementById('betNumberInput');
      if(numberInput) numberInput.focus();
  };

  const handleRemoveFromQueue = (id: string) => {
      setPendingBets(prev => prev.filter(b => b.id !== id));
  };

  const handleClearQueue = () => {
      setPendingBets([]);
  };

  const handleExecuteBatch = async () => {
      if (isMarketClosed) {
          alert("MERCADO CERRADO: No se pueden procesar apuestas.");
          return;
      }
      if (pendingBets.length === 0 || !user) return;
      setExecutingBatch(true);

      const totalCost = pendingBets.reduce((acc, curr) => acc + curr.amount, 0);

      if (totalCost > user.balance_bigint) {
          alert(`SALDO INSUFICIENTE. Requerido: ${formatCurrency(totalCost)}`);
          setExecutingBatch(false);
          return;
      }

      try {
          let successCount = 0;
          for (const bet of pendingBets) {
               const res = await api.placeBet({
                  numbers: bet.number,
                  amount: bet.amount,
                  draw_id: bet.draw,
                  mode: bet.mode
               });
               if (!res.error) {
                   successCount++;
               } else if (res.error.includes("LIMIT_REACHED")) {
                   alert(`ERROR: ${res.error}`);
               }
          }

          if (successCount > 0) {
              fetchUser(true);
              if (successCount === pendingBets.length) {
                  setBatchSuccess(true);
                  setTableRefreshTrigger(prev => prev + 1);
                  setTimeout(() => {
                      setPendingBets([]);
                      setBatchSuccess(false);
                  }, 2000);
              } else {
                  setTableRefreshTrigger(prev => prev + 1);
                  alert("Algunas apuestas no se procesaron debido a límites de riesgo.");
                  setPendingBets([]);
              }
          } else {
              alert("Error al procesar el lote. Verifique límites de riesgo.");
          }

      } catch (e) {
          alert('FALLO CRÍTICO DE SINCRONIZACIÓN');
      } finally {
          setExecutingBatch(false);
      }
  };

  // Trigger Win Simulation from Admin Panel
  const handleAdminResultPublish = (resultData: any) => {
      // Simulate checking if current user won anything
      // For Demo: If Admin publishes, show the animation to admin as a preview
      // OR if Client is logged in, show if they matched
      
      const simulatedWinAmount = 15000000;
      
      setWinnerData({
          amount: simulatedWinAmount, // Example Win Amount
          number: resultData.number,
          draw: resultData.draw,
          type: resultData.reventado ? 'REVENTADOS' : 'TIEMPOS',
          newBalance: (user?.balance_bigint || 0) + simulatedWinAmount
      });
  };

  const queueTotal = pendingBets.reduce((acc, curr) => acc + curr.amount, 0);
  const isReventados = gameMode === GameMode.REVENTADOS;
  
  const consoleBorder = useMemo(() => {
      // ... [Border logic] ...
      if (isMarketClosed) return 'border-red-900 opacity-50';
      if (isReventados) return 'border-red-600 shadow-[0_0_40px_rgba(220,38,38,0.6),inset_0_0_20px_rgba(220,38,38,0.2)]'; 
      switch (selectedDraw) {
          case DrawTime.MEDIODIA: return 'border-cyber-solar shadow-[0_0_40px_rgba(255,95,0,0.4)]';
          case DrawTime.TARDE: return 'border-cyber-vapor shadow-[0_0_40px_rgba(124,58,237,0.4)]'; 
          case DrawTime.NOCHE: return 'border-blue-900 shadow-[0_0_40px_rgba(30,58,138,0.6)]'; 
          default: return 'border-blue-900 shadow-[0_0_40px_rgba(30,58,138,0.6)]';
      }
  }, [isMarketClosed, isReventados, selectedDraw]);
  
  const consoleBgHex = useMemo(() => {
        if (isMarketClosed) return '#0f0202';
        if (isReventados) return '#0f0202';
        switch (selectedDraw) {
            case DrawTime.MEDIODIA: return '#0c0400'; 
            case DrawTime.TARDE: return '#05020c'; 
            case DrawTime.NOCHE: return '#02040a'; 
            default: return '#02040a';
        }
  }, [isMarketClosed, isReventados, selectedDraw]);

  if (!user) return null;

  return (
    <div className="p-4 md:p-8 space-y-12 md:space-y-24 relative">
      <WinnerOverlay 
        isOpen={!!winnerData} 
        onClose={() => setWinnerData(null)} 
        data={winnerData} 
      />

      <RechargeModal 
        isOpen={rechargeModalOpen}
        targetUser={selectedUserForRecharge}
        onClose={() => setRechargeModalOpen(false)}
        onSuccess={fetchLists}
      />
      <WithdrawModal 
        isOpen={withdrawModalOpen}
        targetUser={selectedUserForWithdraw}
        onClose={() => setWithdrawModalOpen(false)}
        onSuccess={fetchLists}
      />
      
      {/* ADMIN ONLY: Result Control */}
      {isAdmin && (
          <AdminResultControl 
            isOpen={adminResultOpen}
            onClose={() => setAdminResultOpen(false)}
            onPublishSuccess={(data) => handleAdminResultPublish(data)} // PASS CALLBACK
          />
      )}

      {/* --- EDIT MULTIPLIER MODAL (ADMIN ONLY) --- */}
      {editingMultiplier && isAdmin && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
              <div className="relative w-[500px] perspective-1000">
                  <div className={`absolute -inset-4 rounded-full blur-3xl opacity-30 animate-breathe transition-all duration-1000 bg-gradient-to-r from-cyber-emerald to-red-600 ${savingMultiplier ? 'scale-150 opacity-80' : ''}`}></div>
                  <div className="bg-[#02040a] border-2 border-white/10 p-0 rounded-3xl relative z-10 w-full overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)]">
                    <div className="p-8 relative">
                        <h3 className="text-white font-black mb-4 uppercase">Calibración de Núcleo</h3>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                             <div>
                                 <label className="text-xs text-cyber-emerald block mb-2">Base (X)</label>
                                 <div className="relative">
                                     <input type="number" value={customMultiplier} onChange={e => setCustomMultiplier(Number(e.target.value))} className="bg-black border border-white/20 text-white p-2 rounded w-full z-20 relative" />
                                     <div className="absolute top-0 right-0 flex flex-col h-full z-30">
                                         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.1),transparent)] animate-pulse pointer-events-none"></div>
                                         <button onClick={() => setCustomMultiplier(p => Math.max(1, p+1))} className="flex-1 px-2 text-cyber-emerald hover:text-white transition-colors relative z-40 bg-black/50 hover:bg-white/10"><i className="fas fa-chevron-up text-[10px]"></i></button>
                                         <button onClick={() => setCustomMultiplier(p => Math.max(1, p-1))} className="flex-1 px-2 text-cyber-emerald hover:text-white transition-colors relative z-40 bg-black/50 hover:bg-white/10"><i className="fas fa-chevron-down text-[10px]"></i></button>
                                     </div>
                                 </div>
                             </div>
                             <div>
                                 <label className="text-xs text-red-500 block mb-2">Rev (Ω)</label>
                                 <div className="relative">
                                     <input type="number" value={customReventadosMultiplier} onChange={e => setCustomReventadosMultiplier(Number(e.target.value))} className="bg-black border-white/20 border text-white p-2 rounded w-full z-20 relative" />
                                     <div className="absolute top-0 right-0 flex flex-col h-full z-30">
                                         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,0,0.1),transparent)] animate-pulse pointer-events-none"></div>
                                         <button onClick={() => setCustomReventadosMultiplier(p => Math.max(1, p+1))} className="flex-1 px-2 text-red-500 hover:text-white transition-colors relative z-40 bg-black/50 hover:bg-white/10"><i className="fas fa-chevron-up text-[10px]"></i></button>
                                         <button onClick={() => setCustomReventadosMultiplier(p => Math.max(1, p-1))} className="flex-1 px-2 text-red-500 hover:text-white transition-colors relative z-40 bg-black/50 hover:bg-white/10"><i className="fas fa-chevron-down text-[10px]"></i></button>
                                     </div>
                                 </div>
                             </div>
                        </div>
                        <div className="flex gap-4 relative z-50">
                            <button onClick={() => setEditingMultiplier(false)} className="flex-1 p-3 bg-slate-800 rounded text-xs uppercase font-bold relative z-50 hover:bg-slate-700 transition-colors">Cancelar</button>
                            <button onClick={handleUpdateMultiplier} className="flex-1 p-3 bg-cyber-emerald text-black rounded text-xs uppercase font-bold relative z-50 hover:bg-white transition-colors">Guardar</button>
                        </div>
                    </div>
                  </div>
              </div>
          </div>
      )}

      {/* Header */}
      <header className="relative z-10 pb-4 md:pb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="relative">
                <div className={`absolute -left-10 -top-10 w-40 h-40 ${theme.glow} blur-[80px] opacity-30 pointer-events-none theme-transition duration-1000`}></div>
                
                <div className="flex items-center gap-3 mb-2 relative z-10">
                    <div className={`w-2 h-2 ${theme.glow} rounded-full animate-ping theme-transition shadow-[0_0_10px_currentColor]`}></div>
                    <span className="font-mono text-[10px] text-cyber-blue tracking-[0.4em] uppercase font-bold text-glow-sm">Sistema Bio-Digital v5.0</span>
                </div>
                <h2 className="text-4xl md:text-6xl font-display font-black text-white italic tracking-tighter uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                    PANEL DE <span className={`text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-500`}>MANDO</span>
                </h2>
            </div>

            <div className="flex items-center gap-6">
                 {isAdmin && (
                     <div className="relative group/btn">
                         <button 
                            onClick={() => setAdminResultOpen(true)}
                            className="relative overflow-hidden bg-[#050a14] border-2 border-[#1e3a8a] hover:border-[#3b82f6] text-[#3b82f6] px-8 py-3 rounded-xl backdrop-blur-md transition-all shadow-[0_0_20px_rgba(30,58,138,0.5)] group-hover/btn:scale-105"
                         >
                            <div className="flex items-center gap-3">
                                {/* ULTRA ANIMATION HERE */}
                                <AnimatedIconUltra profile={{ animation: 'spin3d', theme: 'cyber', speed: 4 }}>
                                    <i className="fas fa-cube text-xl"></i>
                                </AnimatedIconUltra>
                                <div className="flex flex-col items-start">
                                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-white text-shadow-sm">Centro de Control</span>
                                    <span className="text-[8px] font-mono text-[#3b82f6] opacity-90">RESULTADOS & TIEMPO</span>
                                </div>
                            </div>
                         </button>
                     </div>
                 )}
            </div>
        </div>
      </header>

      {/* --- LIVE RESULTS & TOP NUMBERS --- */}
      <div className="relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <LiveResultsPanel />
      </div>
      <div className="relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
          <TopNumbersPanel />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10 relative z-10">
        <PowerCard 
            label={isClient ? "Tu Saldo Disponible" : "Fondo Operativo"}
            value={formatCurrency(user.balance_bigint)} 
            icon="fa-wallet" 
            theme={theme}
            isMoney={true}
        />
        <PowerCard 
            label="Multiplicador Activo" 
            value={gameMode === GameMode.REVENTADOS ? `${customReventadosMultiplier}x` : `${customMultiplier}x`} 
            icon="fa-crosshairs" 
            theme={theme}
            isWarning={gameMode === GameMode.REVENTADOS}
            onClick={isAdmin ? () => setEditingMultiplier(true) : undefined}
            editable={isAdmin}
        />
        <CountdownTimer role={user.role} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-24 relative z-10">
        
        <div className="lg:col-span-2 space-y-12 md:space-y-20">
            
            {/* CONSOLE */}
            <div className="relative perspective-1000">
                {isMarketClosed && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm rounded-[3rem] border-2 border-red-900/50">
                        <AnimatedIconUltra profile={{ animation: 'pulse', theme: 'neon', speed: 1 }}>
                            <i className="fas fa-lock text-6xl text-red-600 mb-4 drop-shadow-[0_0_20px_red]"></i>
                        </AnimatedIconUltra>
                        <h3 className="text-2xl font-black text-white uppercase tracking-widest">MERCADO CERRADO</h3>
                    </div>
                )}

                <div className={`absolute -inset-1 ${isReventados ? 'bg-red-600 animate-pulse' : theme.glow} rounded-[3rem] opacity-30 blur-xl ${isReventados ? '' : 'animate-plasma-pulse'} theme-transition duration-1000`}></div>
                
                <div 
                    className={`relative rounded-[3rem] p-1 overflow-hidden border ${consoleBorder} transition-all duration-700 z-10`}
                    style={{ backgroundColor: consoleBgHex }} 
                >
                    {isReventados && <ReventadosEffect />}

                    <div className="relative z-10 p-6 md:p-12">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 md:mb-16 gap-6">
                            <div>
                                <h3 className="text-2xl md:text-3xl font-display font-black text-white uppercase tracking-widest flex items-center gap-4 drop-shadow-lg">
                                    <div className={`relative w-12 h-12 flex items-center justify-center rounded-full border border-white/20 bg-black/50 shadow-[0_0_15px_rgba(255,255,255,0.1)]`}>
                                        <div className={`absolute inset-0 rounded-full ${isReventados ? 'bg-red-600' : theme.glow} opacity-30 blur-md animate-pulse theme-transition`}></div>
                                        <AnimatedIconUltra profile={{ animation: isReventados ? 'bounce' : 'infinite', theme: isReventados ? 'neon' : 'cyber', speed: 2 }}>
                                            <i className={`fas fa-gamepad ${isReventados ? 'text-red-500' : theme.text} relative z-10`}></i>
                                        </AnimatedIconUltra>
                                    </div>
                                    Consola de Juego
                                </h3>
                            </div>
                            
                            <div className={`p-1.5 rounded-full flex gap-2 border-2 backdrop-blur-md shadow-lg self-center md:self-auto relative z-20 transition-all duration-500 group/mode
                                ${isReventados ? 'bg-black/90 border-red-500 shadow-[0_0_20px_rgba(220,38,38,0.6)]' : `bg-black/90 ${theme.border} ${theme.shadow}` }
                            `}>
                                <button 
                                    onClick={() => setGameMode(GameMode.TIEMPOS)}
                                    disabled={isMarketClosed}
                                    className={`relative px-6 md:px-8 py-2 md:py-3 rounded-full font-bold text-xs uppercase tracking-widest transition-all duration-300 border-2 ${gameMode === GameMode.TIEMPOS ? `bg-slate-900/50 text-white ${theme.border} ${theme.shadow}` : `border-${theme.border.split('-')[1]}-${theme.border.split('-')[2]} text-slate-500 hover:text-white hover:bg-white/5`}`}
                                >
                                    Tiempos
                                </button>
                                
                                <button 
                                    onClick={() => setGameMode(GameMode.REVENTADOS)}
                                    disabled={isMarketClosed}
                                    className={`relative overflow-hidden px-6 md:px-8 py-2 md:py-3 rounded-full font-bold text-xs uppercase tracking-widest transition-all duration-300 border-2 ${gameMode === GameMode.REVENTADOS ? 'bg-red-900/80 text-white border-red-500 shadow-[0_0_30px_rgba(255,0,60,0.4)]' : 'border-transparent text-slate-500 hover:text-red-400 hover:bg-white/5'}`}
                                >
                                    Reventados
                                </button>
                            </div>
                        </div>

                        {/* DRAW SELECTOR */}
                        <div className="grid grid-cols-3 gap-3 md:gap-6 mb-10 md:mb-16">
                            {Object.values(DrawTime).map((time) => {
                                const isSelected = selectedDraw === time;
                                let borderColor = 'border-blue-900';
                                let textColor = 'text-blue-400';
                                let activeGlow = '';
                                let iconName = 'fa-sun';

                                if (time.includes('Mediodía')) {
                                    borderColor = 'border-cyber-solar';
                                    textColor = 'text-cyber-solar';
                                    if(isSelected) activeGlow = "bg-cyber-solar/10 shadow-[0_0_40px_rgba(255,95,0,0.6)]";
                                } else if (time.includes('Tarde')) {
                                    borderColor = 'border-cyber-vapor';
                                    textColor = 'text-cyber-vapor';
                                    iconName = 'fa-cloud-sun';
                                    if(isSelected) activeGlow = "bg-cyber-vapor/10 shadow-[0_0_40px_rgba(124,58,237,0.6)]";
                                } else {
                                    borderColor = 'border-blue-600';
                                    textColor = 'text-blue-400';
                                    iconName = 'fa-moon';
                                    if(isSelected) activeGlow = "bg-blue-900/20 shadow-[0_0_40px_rgba(30,58,138,0.8)]";
                                }

                                return (
                                    <button
                                        key={time}
                                        onClick={() => setSelectedDraw(time)}
                                        className={`relative h-24 md:h-32 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 md:gap-3 backdrop-blur-md overflow-hidden transition-all duration-500 ease-out group/btn 
                                            ${borderColor} ${textColor}
                                            ${isSelected ? activeGlow : 'bg-black/40 hover:bg-white/5'}
                                        `}
                                    >
                                        <AnimatedIconUltra profile={{ animation: isSelected ? 'bounce' : 'infinite', enabled: isSelected }}>
                                            <i className={`fas ${iconName} text-2xl md:text-3xl`}></i>
                                        </AnimatedIconUltra>
                                        <span className={`text-[10px] md:text-xs font-black uppercase tracking-widest transition-colors duration-500 ${isSelected ? 'text-white text-glow' : ''}`}>{time.split(' ')[0]}</span>
                                    </button>
                                )
                            })}
                        </div>
                        
                        {/* Betting Inputs */}
                        <div className="flex flex-col md:flex-row gap-8 items-stretch relative z-20">
                            <div className="flex-1 relative group/field">
                                <div className={`relative bg-black/90 rounded-2xl border-2 p-1 h-full overflow-hidden ${theme.border}`}>
                                    <div className="h-full rounded-xl bg-gradient-to-b from-slate-900/50 to-black/80 flex flex-col items-center justify-center p-4 relative">
                                        <label className={`text-[10px] font-mono font-bold ${isReventados ? 'text-red-400' : 'text-cyber-blue'} uppercase tracking-wider mb-2`}>Número</label>
                                        <input 
                                            id="betNumberInput"
                                            type="number" 
                                            value={betNumber}
                                            onChange={(e) => setBetNumber(e.target.value.slice(0,2))}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddToQueue()}
                                            disabled={isMarketClosed}
                                            className={`bg-transparent text-5xl sm:text-6xl md:text-7xl font-mono ${isReventados ? 'text-red-500 drop-shadow-[0_0_10px_red]' : 'text-white'} text-center focus:outline-none placeholder-slate-800 w-full z-10`}
                                            placeholder="00"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 relative group/field">
                                <div className={`relative bg-black/90 rounded-2xl border-2 p-1 h-full overflow-hidden ${theme.border}`}>
                                    <div className="h-full rounded-xl bg-gradient-to-b from-slate-900/50 to-black/80 flex flex-col items-center justify-center p-4 relative">
                                        <label className={`text-[10px] font-mono font-bold ${isReventados ? 'text-red-400' : 'text-cyber-blue'} uppercase tracking-wider mb-2`}>Inversión</label>
                                        <input 
                                            type="number" 
                                            value={betAmount}
                                            onChange={(e) => setBetAmount(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddToQueue()}
                                            disabled={isMarketClosed}
                                            className={`bg-transparent text-3xl sm:text-4xl md:text-5xl font-mono ${isReventados ? 'text-red-500 drop-shadow-[0_0_10px_red]' : 'text-white'} text-center focus:outline-none placeholder-slate-800 w-full z-10`}
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={handleAddToQueue}
                                disabled={!betNumber || !betAmount || isMarketClosed}
                                className={`w-full md:w-36 py-6 md:py-0 rounded-2xl relative overflow-visible group/action transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed border-2 ${isReventados ? 'border-red-500 shadow-neon-red' : 'border-cyber-success shadow-neon-green'}`}
                             >
                                <div className="relative z-10 h-full flex flex-col items-center justify-center gap-1">
                                    <AnimatedIconUltra profile={{ animation: 'bounce', theme: isReventados ? 'neon' : 'cyber', speed: 2 }}>
                                        <i className={`fas ${isReventados ? 'fa-bomb' : 'fa-bolt'} text-4xl ${isReventados ? 'text-red-500' : 'text-cyber-success'}`}></i>
                                    </AnimatedIconUltra>
                                    <span className={`text-[9px] font-bold ${isReventados ? 'text-red-500' : 'text-cyber-success'} uppercase tracking-widest mt-1`}>Cargar</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- BUFFER DE TRANSMISIÓN --- */}
            {(pendingBets.length > 0 || batchSuccess) && (
                <div className="animate-in slide-in-from-top-4 fade-in duration-500 relative">
                    <div className="absolute -inset-1 bg-cyber-success rounded-2xl opacity-20 blur-lg animate-pulse"></div>

                    <div className="bg-cyber-panel/80 border border-cyber-success rounded-2xl p-6 shadow-[0_0_40px_rgba(10,255,96,0.15)] relative overflow-hidden backdrop-blur-md z-10 min-h-[300px] flex flex-col">
                        
                        {batchSuccess ? (
                            // SUCCESS ANIMATION STATE
                            <div className="flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in duration-500">
                                <div className="w-24 h-24 bg-cyber-success rounded-full flex items-center justify-center shadow-[0_0_60px_#0aff60] mb-6 animate-bounce">
                                    <AnimatedIconUltra profile={{ animation: 'pulse', theme: 'minimal' }}>
                                        <i className="fas fa-check text-5xl text-black"></i>
                                    </AnimatedIconUltra>
                                </div>
                                <h3 className="text-3xl font-display font-black text-white uppercase tracking-tighter mb-2 drop-shadow-[0_0_15px_rgba(10,255,96,0.8)]">
                                    Transmisión Exitosa
                                </h3>
                            </div>
                        ) : (
                            // LIST STATE
                            <>
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-display font-black text-white uppercase tracking-widest flex items-center gap-3">
                                        <AnimatedIconUltra profile={{ animation: 'pulse', theme: 'cyber' }}><i className="fas fa-satellite-dish text-cyber-success"></i></AnimatedIconUltra>
                                        Buffer de Transmisión
                                        <span className="text-[10px] bg-cyber-success text-black px-2 py-0.5 rounded ml-2 font-mono shadow-[0_0_10px_#0aff60]">
                                            {pendingBets.length} PENDIENTES
                                        </span>
                                    </h3>
                                    <button onClick={handleClearQueue} className="text-xs text-red-400 hover:text-red-300 uppercase font-bold tracking-wider">
                                        <i className="fas fa-trash-alt mr-1"></i> Limpiar
                                    </button>
                                </div>

                                {/* Bets List */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                                    {pendingBets.map((bet) => (
                                        <div key={bet.id} className={`bg-black/60 border ${bet.mode === GameMode.REVENTADOS ? 'border-red-900' : 'border-white/10'} rounded-lg p-3 flex justify-between items-center group hover:border-cyber-success/50 transition-colors relative overflow-hidden`}>
                                            <div>
                                                <div className={`text-2xl font-mono font-bold ${bet.mode === GameMode.REVENTADOS ? 'text-red-500' : 'text-white'}`}>{bet.number}</div>
                                                <div className="text-[9px] text-slate-400 uppercase tracking-wider">
                                                    {bet.draw.split(' ')[0]} 
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-cyber-success font-bold font-mono text-glow-green">{formatCurrency(bet.amount)}</div>
                                                <button onClick={() => handleRemoveFromQueue(bet.id)} className="text-[9px] text-red-500 hover:text-white mt-1 uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                                                    Eliminar
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-t border-white/10 pt-6 mt-auto">
                                     <div className="text-center md:text-left">
                                        <div className="text-[10px] text-cyber-blue uppercase tracking-widest font-bold">Inversión Total del Lote</div>
                                        <div className="text-3xl font-mono font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
                                            {formatCurrency(queueTotal)}
                                        </div>
                                     </div>

                                     <button 
                                        onClick={handleExecuteBatch}
                                        disabled={executingBatch || isMarketClosed}
                                        className="w-full md:w-auto px-12 py-4 rounded-xl font-display font-black uppercase tracking-[0.2em] relative overflow-hidden group/btn shadow-neon-green transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-cyber-success"
                                     >
                                        <div className="absolute inset-0 bg-cyber-success group-hover/btn:bg-white transition-colors"></div>
                                        
                                        <span className="relative z-10 flex items-center justify-center gap-3 text-black group-hover/btn:text-cyber-success">
                                            {executingBatch ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-paper-plane"></i>}
                                            {executingBatch ? 'SINCRONIZANDO...' : 'CONFIRMAR JUGADA'}
                                        </span>
                                     </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
            
            {/* --- GLOBAL BETS TABLE (ALL ROLES) --- */}
            <div className="space-y-12 relative z-0">
                <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                <GlobalBetsTable refreshTrigger={tableRefreshTrigger} />
            </div>

            {/* --- PERSONAL HISTORY (CLIENT ONLY) --- */}
            {isClient && (
                <div className="space-y-12 relative z-0">
                    <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                    <PersonalBetsPanel theme={theme} refreshTrigger={tableRefreshTrigger} />
                </div>
            )}

            {/* --- ADMIN / VENDOR MANAGEMENT SECTION --- */}
            {(isAdmin || isVendor) && (
                <div className="space-y-12 relative z-0">
                     <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

                     <div className="grid grid-cols-1 xl:grid-cols-1 gap-24 items-start">
                         {/* RISK MANAGER (ADMIN ONLY) */}
                         {isAdmin && (
                             <div className="mb-8">
                                 <RiskLimitManager />
                             </div>
                         )}

                         <div className="relative z-20 max-w-2xl mx-auto w-full">
                             <UserCreationForm onCreated={handleUserCreated} theme={theme} />
                         </div>
                     </div>

                     <UserManagementPanel 
                        players={players}
                        vendors={vendors}
                        onRecharge={openRecharge}
                        onWithdraw={openWithdraw}
                        onRefresh={fetchLists}
                     />

                     {/* MAINTENANCE (ADMIN ONLY) */}
                     {isAdmin && (
                         <div className="mt-12 pt-12 border-t border-white/5 flex justify-center opacity-80 hover:opacity-100 transition-opacity">
                             <div className="max-w-xl w-full">
                                <DataPurgeCard theme={theme} />
                             </div>
                         </div>
                     )}
                </div>
            )}
        </div>

        {/* --- SYSTEM STATUS (RESPONSIVE DOCK) --- */}
        <div className="lg:col-span-1">
             <SystemStatusHUD />
        </div>
      </div>
    </div>
  );
}
