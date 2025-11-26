
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
import GlobalBetsTable from './GlobalBetsTable'; // IMPORT
import { useServerClock } from '../hooks/useServerClock';
import { formatCurrency } from '../constants';
import { supabase } from '../lib/supabaseClient';
import { api } from '../services/edgeApi';

// Internal type for the Staging Queue
interface PendingBet {
    id: string;
    number: string;
    amount: number;
    draw: DrawTime;
    mode: GameMode;
}

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
          
          <div className={`w-12 h-12 rounded-xl bg-black/50 flex items-center justify-center border ${isWarning ? 'border-red-500' : theme.border} shadow-inner group-hover:scale-110 transition-transform duration-300`}>
              <i className={`fas ${icon} text-xl ${isWarning ? 'text-red-500' : theme.text} ${isWarning ? 'animate-pulse' : ''}`}></i>
          </div>
      </div>
  </div>
);

export default function Dashboard() {
  const { user, fetchUser, setUser } = useAuthStore(); 
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
  const [customMultiplier, setCustomMultiplier] = useState(90);
  const [savingMultiplier, setSavingMultiplier] = useState(false);

  // Betting State
  const [selectedDraw, setSelectedDraw] = useState<DrawTime>(DrawTime.NOCHE);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.TIEMPOS);
  const [betNumber, setBetNumber] = useState('');
  const [betAmount, setBetAmount] = useState('');
  
  // QUEUE & EXECUTION STATE
  const [pendingBets, setPendingBets] = useState<PendingBet[]>([]);
  const [executingBatch, setExecutingBatch] = useState(false);

  // --- CLOCK & LOCK LOGIC ---
  const { status: marketStatus, nextDraw } = useServerClock();
  const isMarketClosed = marketStatus === 'CLOSED';

  // Auto-update selected draw based on clock ONLY ON INITIAL LOAD or if user hasn't interacted
  useEffect(() => {
      if (nextDraw) setSelectedDraw(nextDraw);
  }, [nextDraw]);

  // --- THEME ENGINE v5.0 (NARRATIVE COLORS) ---
  const theme = useMemo(() => {
    switch (selectedDraw) {
        case DrawTime.MEDIODIA: 
            // NEON ORANGE / SOLAR FLARE
            return { 
                name: 'solar', 
                hex: '#ff5f00', 
                shadow: 'shadow-neon-solar', 
                glow: 'bg-cyber-solar', 
                text: 'text-cyber-solar', 
                border: 'border-cyber-solar',
                label: 'SOLAR CORE' 
            }; 
        case DrawTime.TARDE: 
            // DEEP IMPERIAL PURPLE / VAPOR
            return { 
                name: 'vapor', 
                hex: '#7c3aed', 
                shadow: 'shadow-neon-vapor', 
                glow: 'bg-cyber-vapor', 
                text: 'text-cyber-vapor', 
                border: 'border-cyber-vapor', 
                label: 'IMPERIAL SYNC' 
            }; 
        case DrawTime.NOCHE: 
            // DEEP BLUE / ABYSS (Darker)
            return { 
                name: 'abyss', 
                hex: '#1e3a8a', 
                shadow: 'shadow-neon-abyss', 
                glow: 'bg-cyber-abyss', 
                text: 'text-blue-400', // Lighter for text readability against dark bg
                border: 'border-blue-900',
                label: 'ABYSS DEPTH' 
            }; 
        default: 
            return { name: 'abyss', hex: '#1e3a8a', shadow: 'shadow-neon-abyss', glow: 'bg-cyber-abyss', text: 'text-blue-400', border: 'border-blue-900', label: 'ABYSS' };
    }
  }, [selectedDraw]);

  const fetchLists = async () => {
    if (!user) return;
    setLoadingLists(true);
    
    if (user.role === UserRole.SuperAdmin || user.role === UserRole.Vendedor) {
        const { data: clientsData } = await supabase.from('app_users').select('*').eq('role', 'Cliente').limit(100);
        if (clientsData) setPlayers(clientsData as AppUser[]);
    }

    if (user.role === UserRole.SuperAdmin) {
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
      if(!user) return;
      setSavingMultiplier(true);
      await new Promise(resolve => setTimeout(resolve, 2000));
      await api.updateGlobalMultiplier({ newValue: customMultiplier, actor_id: user.id });
      setSavingMultiplier(false);
      setEditingMultiplier(false);
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
                  draw_id: bet.draw
               });
               if (!res.error) successCount++;
          }

          if (successCount > 0) {
              const newBalance = user.balance_bigint - totalCost;
              setUser({ ...user, balance_bigint: newBalance });
              setPendingBets([]);
              fetchUser(true);
          } else {
              alert("Error al procesar el lote.");
          }

      } catch (e) {
          alert('FALLO CRÍTICO DE SINCRONIZACIÓN');
      } finally {
          setExecutingBatch(false);
      }
  };

  const queueTotal = pendingBets.reduce((acc, curr) => acc + curr.amount, 0);

  const isReventados = gameMode === GameMode.REVENTADOS;
  
  // BORDER & GLOW LOGIC
  const consoleBorder = useMemo(() => {
      if (isMarketClosed) return 'border-red-900 opacity-50';
      if (isReventados) return 'border-red-600 shadow-[0_0_40px_rgba(220,38,38,0.6),inset_0_0_20px_rgba(220,38,38,0.2)]'; // Intense Red Neon for Reventados
      
      // Standard themes
      switch (selectedDraw) {
          case DrawTime.MEDIODIA: return 'border-cyber-solar shadow-[0_0_40px_rgba(255,95,0,0.4)]';
          case DrawTime.TARDE: return 'border-cyber-vapor shadow-[0_0_40px_rgba(124,58,237,0.4)]'; 
          case DrawTime.NOCHE: return 'border-blue-900 shadow-[0_0_40px_rgba(30,58,138,0.6)]'; // Deep Abyss
          default: return 'border-blue-900 shadow-[0_0_40px_rgba(30,58,138,0.6)]';
      }
  }, [isMarketClosed, isReventados, selectedDraw]);
  
  // SOLID TINT CORE Logic:
  const consoleBgHex = useMemo(() => {
        if (isMarketClosed) return '#0f0202'; // Dead Zone (Dark Red)
        if (isReventados) return '#0f0202'; // Hazard Zone (Solid Dark Red - No Transparency)
        switch (selectedDraw) {
            case DrawTime.MEDIODIA: return '#0c0400'; // Solar Tint (Solid Dark Orange/Black)
            case DrawTime.TARDE: return '#05020c'; // Vapor Tint (Solid Dark Violet/Black - Deep Imperial)
            case DrawTime.NOCHE: return '#02040a'; // Abyss (Standard Dark Blue/Black)
            default: return '#02040a';
        }
  }, [isMarketClosed, isReventados, selectedDraw]);

  if (!user) return null;

  return (
    <div className="p-4 md:p-8 space-y-12 md:space-y-24 relative">
      
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

      <AdminResultControl 
        isOpen={adminResultOpen}
        onClose={() => setAdminResultOpen(false)}
      />

      {/* --- EDIT MULTIPLIER MODAL --- */}
      {editingMultiplier && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
              {/* ... Multiplier Modal Content ... */}
              <div className="relative w-96 perspective-1000">
                  <div className={`absolute -inset-4 bg-cyber-emerald-dark rounded-full blur-3xl opacity-40 animate-breathe transition-all duration-1000 ${savingMultiplier ? 'scale-150 opacity-80 bg-emerald-400' : ''}`}></div>
                  <div className="absolute -inset-1 bg-cyber-emerald rounded-2xl blur-md opacity-60 animate-pulse"></div>

                  <div className="bg-[#02040a] border-2 border-cyber-emerald/50 p-8 rounded-2xl relative z-10 w-full overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.2)]">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
                    {savingMultiplier && <div className="absolute inset-0 bg-emerald-500/20 animate-pulse z-0"></div>}

                    {!savingMultiplier ? (
                        <div className="relative z-10 animate-in zoom-in duration-300">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 mx-auto bg-cyber-emerald/10 rounded-full border border-cyber-emerald flex items-center justify-center shadow-[0_0_20px_#10b981] mb-4 animate-[spin_10s_linear_infinite]">
                                    <i className="fas fa-atom text-3xl text-cyber-emerald"></i>
                                </div>
                                <h3 className="text-white font-display font-black uppercase tracking-[0.2em] text-sm text-glow-sm">Calibración de Núcleo</h3>
                                <p className="text-[9px] font-mono text-cyber-emerald uppercase mt-1">Ajuste de Multiplicador Global</p>
                            </div>

                            <div className="flex items-center justify-center gap-6 mb-8">
                                <button onClick={() => setCustomMultiplier(p => Math.max(1, p-1))} className="w-12 h-12 rounded-xl bg-black border border-cyber-emerald/30 text-cyber-emerald hover:bg-cyber-emerald hover:text-black font-bold text-2xl transition-all shadow-lg flex items-center justify-center active:scale-95">-</button>
                                <div className="w-32 h-20 bg-black border border-cyber-emerald/50 rounded-xl flex flex-col items-center justify-center shadow-[inset_0_0_20px_rgba(16,185,129,0.2)] relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-cyber-emerald/5 animate-pulse"></div>
                                    <input 
                                        type="number" 
                                        value={customMultiplier} 
                                        onChange={e => setCustomMultiplier(Number(e.target.value))}
                                        className="bg-transparent text-center text-cyber-emerald font-mono text-4xl font-bold focus:outline-none w-full relative z-10 drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]"
                                    />
                                    <div className="text-[8px] font-mono text-emerald-700 uppercase tracking-widest mt-[-5px]">FACTOR X</div>
                                </div>
                                <button onClick={() => setCustomMultiplier(p => p+1)} className="w-12 h-12 rounded-xl bg-black border border-cyber-emerald/30 text-cyber-emerald hover:bg-cyber-emerald hover:text-black font-bold text-2xl transition-all shadow-lg flex items-center justify-center active:scale-95">+</button>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => setEditingMultiplier(false)} className="flex-1 py-4 rounded-xl text-[10px] font-bold text-slate-400 border border-slate-800 hover:border-slate-600 hover:text-white uppercase tracking-widest transition-colors">Cancelar</button>
                                <button onClick={handleUpdateMultiplier} className="flex-1 py-4 rounded-xl text-[10px] font-bold bg-cyber-emerald text-black shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:bg-white hover:shadow-[0_0_40px_rgba(16,185,129,0.8)] uppercase tracking-widest transition-all relative overflow-hidden group/btn">
                                    <div className="absolute inset-0 bg-white/30 -translate-x-full group-hover/btn:animate-[shine_0.5s_ease-in-out]"></div>
                                    <span className="relative z-10 flex items-center justify-center gap-2"><i className="fas fa-save"></i> GUARDAR</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="relative z-10 flex flex-col items-center justify-center py-10 animate-in zoom-in duration-500">
                            <div className="relative w-32 h-32 mb-6">
                                <div className="absolute inset-0 rounded-full border-4 border-t-cyber-emerald border-r-transparent border-b-cyber-emerald border-l-transparent animate-[spin_1s_linear_infinite]"></div>
                                <div className="absolute inset-2 rounded-full border-4 border-t-transparent border-r-white border-b-transparent border-l-white animate-[spin_2s_linear_infinite_reverse] opacity-50"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-4xl font-mono font-bold text-white animate-pulse">{customMultiplier}x</span>
                                </div>
                            </div>
                            <h3 className="text-xl font-display font-black text-cyber-emerald uppercase tracking-widest animate-pulse">RECALIBRANDO...</h3>
                            <p className="text-[10px] font-mono text-emerald-400/70 mt-2">SINCRONIZANDO NÚCLEO DE APUESTAS</p>
                        </div>
                    )}
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
                 {/* ADMIN CONTROL CENTER BUTTON - PERMANENT DEEP NEON BLUE BORDER */}
                 {user.role === UserRole.SuperAdmin && (
                     <div className="relative group/btn">
                         {/* Deep Blue Backlight */}
                         <div className="absolute -inset-1 bg-[#1e3a8a] rounded-xl opacity-30 blur-xl animate-pulse transition-all duration-500 group-hover/btn:opacity-60 group-hover/btn:blur-2xl"></div>
                         
                         {/* CONTROL CENTER BUTTON - DEEP BLUE ABYSS PHOSPHORESCENT */}
                         <button 
                            onClick={() => setAdminResultOpen(true)}
                            className="relative overflow-hidden bg-[#050a14] border-2 border-[#1e3a8a] hover:border-[#3b82f6] text-[#3b82f6] px-8 py-3 rounded-xl backdrop-blur-md transition-all shadow-[0_0_20px_rgba(30,58,138,0.5)] hover:shadow-[0_0_40px_rgba(30,58,138,0.8)] group-hover/btn:scale-105"
                         >
                            <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(transparent_50%,rgba(30,58,138,0.1)_50%)] bg-[length:100%_4px] pointer-events-none"></div>
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <i className="fas fa-cube text-xl animate-pulse text-shadow-blue"></i>
                                    <div className="absolute inset-0 border border-[#3b82f6]/50 animate-[spin_3s_linear_infinite]"></div>
                                </div>
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

      {/* --- LIVE RESULTS PANEL --- */}
      <div className="relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <LiveResultsPanel />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10 relative z-10">
        <PowerCard 
            label={user.role === UserRole.Cliente ? "Tu Saldo Disponible" : "Fondo Operativo"}
            value={formatCurrency(user.balance_bigint)} 
            icon="fa-wallet" 
            theme={theme}
            isMoney={true}
        />
        <PowerCard 
            label="Multiplicador Activo" 
            value={gameMode === GameMode.REVENTADOS ? "200x" : `${customMultiplier}x`} 
            icon="fa-crosshairs" 
            theme={theme}
            isWarning={gameMode === GameMode.REVENTADOS}
            onClick={user.role === UserRole.SuperAdmin ? () => setEditingMultiplier(true) : undefined}
            editable={user.role === UserRole.SuperAdmin}
        />
        <CountdownTimer role={user.role} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-24 relative z-10">
        
        <div className="lg:col-span-2 space-y-12 md:space-y-20">
            
            <div className="relative perspective-1000">
                {isMarketClosed && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm rounded-[3rem] border-2 border-red-900/50">
                        <i className="fas fa-lock text-6xl text-red-600 mb-4 drop-shadow-[0_0_20px_red]"></i>
                        <h3 className="text-2xl font-black text-white uppercase tracking-widest">MERCADO CERRADO</h3>
                        <p className="text-red-400 font-mono text-sm mt-2">Espere al próximo ciclo de venta.</p>
                    </div>
                )}

                <div className={`absolute -inset-1 ${isReventados ? 'bg-red-600 animate-pulse' : theme.glow} rounded-[3rem] opacity-30 blur-xl ${isReventados ? '' : 'animate-plasma-pulse'} theme-transition duration-1000`}></div>
                
                {/* CONSOLE CONTAINER: Solid Tint Core */}
                <div 
                    className={`relative rounded-[3rem] p-1 overflow-hidden border ${consoleBorder} transition-all duration-700 z-10`}
                    style={{ backgroundColor: consoleBgHex }} // Using inline style for immediate hex application
                >
                    
                    {isReventados && <ReventadosEffect />}

                    <div className="relative z-10 p-6 md:p-12">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 md:mb-16 gap-6">
                            <div>
                                <h3 className="text-2xl md:text-3xl font-display font-black text-white uppercase tracking-widest flex items-center gap-4 drop-shadow-lg">
                                    <div className={`relative w-12 h-12 flex items-center justify-center rounded-full border border-white/20 bg-black/50 shadow-[0_0_15px_rgba(255,255,255,0.1)]`}>
                                        <div className={`absolute inset-0 rounded-full ${isReventados ? 'bg-red-600' : theme.glow} opacity-30 blur-md animate-pulse theme-transition`}></div>
                                        <i className={`fas fa-gamepad ${isReventados ? 'text-red-500' : theme.text} animate-pulse theme-transition duration-700 relative z-10`}></i>
                                    </div>
                                    Consola de Juego
                                </h3>
                                <div className="flex items-center gap-2 mt-2">
                                    <div className={`h-0.5 w-10 ${isReventados ? 'bg-red-500' : theme.glow} theme-transition duration-700 shadow-[0_0_5px_currentColor]`}></div>
                                    <span className={`text-[10px] font-mono ${isReventados ? 'text-red-400' : 'text-cyber-blue'} uppercase tracking-widest font-bold`}>
                                        {isReventados ? 'PROTOCOLO OVERDRIVE ACTIVO' : 'INTERFAZ NEURONAL LISTA'}
                                    </span>
                                </div>
                            </div>
                            
                            {/* --- MODE TOGGLE CONTAINER (PHOSPHORESCENT BORDER) --- */}
                            <div className={`p-1.5 rounded-full flex gap-2 border-2 backdrop-blur-md shadow-lg self-center md:self-auto relative z-20 transition-all duration-500 group/mode
                                ${isReventados 
                                    ? 'bg-black/90 border-red-500 shadow-[0_0_20px_rgba(220,38,38,0.6)] hover:shadow-[0_0_40px_rgba(220,38,38,0.9)] hover:border-red-400' 
                                    : `bg-black/90 ${theme.border} ${theme.shadow} hover:shadow-[0_0_30px_currentColor]` 
                                }
                            `}>
                                {/* TIEMPOS BUTTON - INDEPENDENT BORDER */}
                                <button 
                                    onClick={() => setGameMode(GameMode.TIEMPOS)}
                                    disabled={isMarketClosed}
                                    className={`relative px-6 md:px-8 py-2 md:py-3 rounded-full font-bold text-xs uppercase tracking-widest transition-all duration-300 border-2 ${
                                        gameMode === GameMode.TIEMPOS 
                                        ? `bg-slate-900/50 text-white ${theme.border} ${theme.shadow}` 
                                        : `border-${theme.border.split('-')[1]}-${theme.border.split('-')[2]} text-slate-500 hover:text-white hover:bg-white/5`
                                    }`}
                                    style={gameMode !== GameMode.TIEMPOS ? { borderColor: 'rgba(255,255,255,0.1)' } : {}}
                                >
                                    Tiempos
                                </button>
                                
                                {/* REVENTADOS BUTTON */}
                                <button 
                                    onClick={() => setGameMode(GameMode.REVENTADOS)}
                                    disabled={isMarketClosed}
                                    className={`relative overflow-hidden px-6 md:px-8 py-2 md:py-3 rounded-full font-bold text-xs uppercase tracking-widest transition-all duration-300 border-2 ${gameMode === GameMode.REVENTADOS ? 'bg-red-900/80 text-white border-red-500 shadow-[0_0_30px_rgba(255,0,60,0.4)]' : 'border-transparent text-slate-500 hover:text-red-400 hover:bg-white/5'}`}
                                >
                                    {gameMode === GameMode.REVENTADOS && <div className="absolute inset-0 bg-red-400 opacity-20 animate-pulse"></div>}
                                    Reventados
                                </button>
                            </div>
                        </div>

                        {/* DRAW SELECTORS - PERMANENT BORDERS */}
                        <div className="grid grid-cols-3 gap-3 md:gap-6 mb-10 md:mb-16">
                            {Object.values(DrawTime).map((time) => {
                                const isSelected = selectedDraw === time;
                                
                                // Determine color based on the draw time itself, NOT the currently selected global theme
                                let borderColor = 'border-blue-900';
                                let textColor = 'text-blue-400';
                                let shadowColor = 'shadow-[0_0_10px_rgba(30,58,138,0.3)]';
                                let activeGlow = '';

                                if (time.includes('Mediodía')) {
                                    borderColor = 'border-cyber-solar';
                                    textColor = 'text-cyber-solar';
                                    shadowColor = 'shadow-[0_0_15px_rgba(255,95,0,0.3)]';
                                    if(isSelected) activeGlow = "bg-cyber-solar/10 shadow-[0_0_40px_rgba(255,95,0,0.6)]";
                                } else if (time.includes('Tarde')) {
                                    borderColor = 'border-cyber-vapor';
                                    textColor = 'text-cyber-vapor';
                                    shadowColor = 'shadow-[0_0_15px_rgba(124,58,237,0.3)]';
                                    if(isSelected) activeGlow = "bg-cyber-vapor/10 shadow-[0_0_40px_rgba(124,58,237,0.6)]";
                                } else {
                                    borderColor = 'border-blue-600';
                                    textColor = 'text-blue-400';
                                    shadowColor = 'shadow-[0_0_15px_rgba(30,58,138,0.4)]';
                                    if(isSelected) activeGlow = "bg-blue-900/20 shadow-[0_0_40px_rgba(30,58,138,0.8)]";
                                }

                                return (
                                    <button
                                        key={time}
                                        onClick={() => setSelectedDraw(time)}
                                        className={`relative h-24 md:h-32 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 md:gap-3 backdrop-blur-md overflow-hidden transition-all duration-500 ease-out group/btn 
                                            ${borderColor} ${textColor} ${shadowColor}
                                            ${isSelected ? activeGlow : 'bg-black/40 hover:bg-white/5'}
                                        `}
                                    >
                                        {isSelected && <div className={`absolute inset-0 ${isReventados ? 'bg-red-500' : 'bg-current'} opacity-10 animate-pulse`}></div>}
                                        <i className={`fas ${time.includes('19') ? 'fa-moon' : (time.includes('16') ? 'fa-cloud-sun' : 'fa-sun')} text-2xl md:text-3xl transition-all duration-500 group-hover/btn:scale-110`}></i>
                                        <span className={`text-[10px] md:text-xs font-black uppercase tracking-widest transition-colors duration-500 ${isSelected ? 'text-white text-glow' : ''}`}>{time.split(' ')[0]}</span>
                                        <div className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${isSelected ? (isReventados ? 'bg-red-500 shadow-[0_0_10px_red]' : `bg-current shadow-[0_0_10px_currentColor]`) : 'bg-slate-800'}`}></div>
                                    </button>
                                )
                            })}
                        </div>
                        
                        <div className="flex flex-col md:flex-row gap-8 items-stretch relative z-20">
                            
                            {/* INPUTS: PERMANENT PHOSPHORESCENT BORDER */}
                            <div className="flex-1 relative group/field">
                                <div className={`absolute -inset-1 ${isReventados ? 'bg-red-500' : theme.glow} rounded-2xl opacity-0 group-focus-within/field:opacity-60 blur-md theme-transition duration-700`}></div>
                                <div className={`relative bg-black/90 rounded-2xl border-2 p-1 h-full overflow-hidden transition-all duration-300 
                                    ${isReventados 
                                        ? 'border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.4)] group-focus-within/field:shadow-[0_0_30px_red]' 
                                        : `${theme.border} ${theme.shadow.replace('40px', '15px')} group-focus-within/field:shadow-${theme.shadow.split(' ')[0]}`
                                    }`}
                                >
                                    <div className="h-full rounded-xl bg-gradient-to-b from-slate-900/50 to-black/80 flex flex-col items-center justify-center p-4 relative">
                                        <label className={`text-[10px] font-mono font-bold ${isReventados ? 'text-red-400' : 'text-cyber-blue'} uppercase tracking-wider mb-2`}>Número Objetivo</label>
                                        <input 
                                            id="betNumberInput"
                                            type="number" 
                                            value={betNumber}
                                            onChange={(e) => setBetNumber(e.target.value.slice(0,2))}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddToQueue()}
                                            disabled={isMarketClosed}
                                            className={`bg-transparent text-6xl md:text-7xl font-mono ${isReventados ? 'text-red-500 drop-shadow-[0_0_10px_red]' : 'text-white'} text-center focus:outline-none placeholder-slate-800 w-full z-10 transition-all disabled:opacity-50`}
                                            placeholder="00"
                                        />
                                        <div className="absolute inset-0 pointer-events-none opacity-0 group-focus-within/field:opacity-30 transition-opacity">
                                             <div className={`w-full h-1 ${isReventados ? 'bg-red-500' : theme.glow} animate-[scanline_2s_linear_infinite]`}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 relative group/field">
                                <div className={`absolute -inset-1 ${isReventados ? 'bg-red-500' : theme.glow} rounded-2xl opacity-0 group-focus-within/field:opacity-60 blur-md theme-transition duration-700`}></div>
                                <div className={`relative bg-black/90 rounded-2xl border-2 p-1 h-full overflow-hidden transition-all duration-300 
                                    ${isReventados 
                                        ? 'border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.4)] group-focus-within/field:shadow-[0_0_30px_red]' 
                                        : `${theme.border} ${theme.shadow.replace('40px', '15px')} group-focus-within/field:shadow-${theme.shadow.split(' ')[0]}`
                                    }`}
                                >
                                    <div className="h-full rounded-xl bg-gradient-to-b from-slate-900/50 to-black/80 flex flex-col items-center justify-center p-4 relative">
                                        <label className={`text-[10px] font-mono font-bold ${isReventados ? 'text-red-400' : 'text-cyber-blue'} uppercase tracking-wider mb-2`}>Valor de Inversión (CRC)</label>
                                        <input 
                                            type="number" 
                                            value={betAmount}
                                            onChange={(e) => setBetAmount(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddToQueue()}
                                            disabled={isMarketClosed}
                                            className={`bg-transparent text-4xl md:text-5xl font-mono ${isReventados ? 'text-red-500 drop-shadow-[0_0_10px_red]' : 'text-white'} text-center focus:outline-none placeholder-slate-800 w-full z-10 transition-all disabled:opacity-50`}
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
                                <div className={`absolute inset-2 ${isReventados ? 'bg-red-600' : 'bg-cyber-success'} rounded-xl opacity-20 blur-xl animate-pulse group-hover/action:opacity-60 transition-opacity`}></div>
                                <div className={`absolute inset-0 rounded-2xl border-2 border-dashed ${isReventados ? 'border-red-500/40' : 'border-cyber-success/40'} animate-[spin_10s_linear_infinite] group-hover/action:border-opacity-80 group-hover/action:animate-[spin_2s_linear_infinite]`}></div>
                                <div className="relative z-10 h-full flex flex-col items-center justify-center gap-1">
                                    <i className={`fas ${isReventados ? 'fa-bomb' : 'fa-bolt'} text-4xl ${isReventados ? 'text-red-500 drop-shadow-[0_0_15px_red]' : 'text-cyber-success drop-shadow-[0_0_15px_#0aff60]'} group-hover/action:scale-110 transition-transform duration-200`}></i>
                                    <span className={`text-[9px] font-bold ${isReventados ? 'text-red-500 text-shadow-red' : 'text-cyber-success text-shadow-green'} uppercase tracking-widest mt-1 group-hover/action:text-white transition-colors`}>Cargar</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {pendingBets.length > 0 && (
                <div className="animate-in slide-in-from-top-4 fade-in duration-500 relative">
                    <div className="absolute -inset-1 bg-cyber-success rounded-2xl opacity-20 blur-lg animate-pulse"></div>

                    <div className="bg-cyber-panel/80 border border-cyber-success rounded-2xl p-6 shadow-[0_0_40px_rgba(10,255,96,0.15)] relative overflow-hidden backdrop-blur-md z-10">
                        <div className="absolute top-0 left-0 w-full h-1 bg-cyber-success/50 shadow-neon-green animate-[scanline_2s_linear_infinite]"></div>
                        
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-display font-black text-white uppercase tracking-widest flex items-center gap-3">
                                <i className="fas fa-satellite-dish text-cyber-success animate-pulse"></i>
                                Buffer de Transmisión
                                <span className="text-[10px] bg-cyber-success text-black px-2 py-0.5 rounded ml-2 font-mono shadow-[0_0_10px_#0aff60]">
                                    {pendingBets.length} PENDIENTES
                                </span>
                            </h3>
                            <button onClick={handleClearQueue} className="text-xs text-red-400 hover:text-red-300 uppercase font-bold tracking-wider">
                                <i className="fas fa-trash-alt mr-1"></i> Limpiar
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
                            {pendingBets.map((bet) => (
                                <div key={bet.id} className={`bg-black/60 border ${bet.mode === GameMode.REVENTADOS ? 'border-red-900' : 'border-white/10'} rounded-lg p-3 flex justify-between items-center group hover:border-cyber-success/50 transition-colors relative overflow-hidden`}>
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${bet.mode === GameMode.REVENTADOS ? 'bg-red-500' : 'bg-cyber-success/50'}`}></div>
                                    <div>
                                        <div className={`text-2xl font-mono font-bold ${bet.mode === GameMode.REVENTADOS ? 'text-red-500' : 'text-white'} text-glow-sm`}>{bet.number}</div>
                                        <div className="text-[9px] text-slate-400 uppercase tracking-wider">
                                            {bet.draw.split(' ')[0]} 
                                            {bet.mode === GameMode.REVENTADOS && <span className="text-red-500 ml-1 font-bold">200x</span>}
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

                        <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-t border-white/10 pt-6">
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
                    </div>
                </div>
            )}
            
            {/* --- GLOBAL BETS TABLE (FOR ALL ROLES) --- */}
            <div className="space-y-12 relative z-0">
                <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                <GlobalBetsTable />
            </div>

            {(user.role === UserRole.SuperAdmin || user.role === UserRole.Vendedor) && (
                <div className="space-y-12 relative z-0">
                     <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

                     <div className="grid grid-cols-1 xl:grid-cols-1 gap-24 items-start">
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

                     {user.role === UserRole.SuperAdmin && (
                         <div className="mt-12 pt-12 border-t border-white/5 flex justify-center opacity-80 hover:opacity-100 transition-opacity">
                             <div className="max-w-xl w-full">
                                <DataPurgeCard theme={theme} />
                             </div>
                         </div>
                     )}
                </div>
            )}
        </div>

        <div className="lg:col-span-1 space-y-8">
             <div className="relative">
                <div className="absolute -inset-1 bg-cyber-blue rounded-2xl opacity-10 blur-lg animate-pulse"></div>
                <div className="relative bg-cyber-panel/40 border border-white/5 rounded-2xl p-6 backdrop-blur-md z-10">
                    <h4 className="font-display font-bold text-slate-400 uppercase text-xs tracking-widest mb-4">Estado del Sistema</h4>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500">Conexión WebSocket</span>
                            <span className="text-cyber-success font-mono font-bold text-shadow-green">ESTABLE</span>
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
        </div>
      </div>
    </div>
  );
}
