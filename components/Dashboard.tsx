
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
      className={`relative group bg-cyber-panel/40 border border-white/10 p-6 rounded-2xl backdrop-blur-md overflow-hidden transition-all duration-300 ${onClick ? 'cursor-pointer hover:border-white/30 hover:bg-white/5' : ''}`}
  >
      <div className={`absolute -inset-1 ${theme.glow} rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500`}></div>
      
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
          
          <div className={`w-12 h-12 rounded-xl bg-black/50 flex items-center justify-center border border-white/10 shadow-inner group-hover:scale-110 transition-transform duration-300`}>
              <i className={`fas ${icon} text-xl ${isWarning ? 'text-red-500' : theme.text} ${isWarning ? 'animate-pulse' : ''}`}></i>
          </div>
      </div>
  </div>
);

export default function Dashboard() {
  const { user, fetchUser, setUser } = useAuthStore(); // Added setUser for optimistic updates
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

  // Betting State
  const [selectedDraw, setSelectedDraw] = useState<DrawTime>(DrawTime.NOCHE);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.TIEMPOS);
  const [betNumber, setBetNumber] = useState('');
  const [betAmount, setBetAmount] = useState('');
  
  // QUEUE & EXECUTION STATE
  const [pendingBets, setPendingBets] = useState<PendingBet[]>([]);
  const [executingBatch, setExecutingBatch] = useState(false);

  // --- THEME ENGINE v4.1 ---
  const theme = useMemo(() => {
    switch (selectedDraw) {
        case DrawTime.MEDIODIA: 
            return { 
                name: 'neon', 
                hex: '#00f0ff', 
                shadow: 'shadow-neon-cyan', 
                glow: 'bg-cyber-neon', 
                text: 'text-cyber-neon', 
                border: 'border-cyber-neon',
                label: 'CYAN CORE' 
            }; 
        case DrawTime.TARDE: 
            return { 
                name: 'purple', 
                hex: '#bc13fe', 
                shadow: 'shadow-neon-purple', 
                glow: 'bg-cyber-purple', 
                text: 'text-cyber-purple', 
                border: 'border-cyber-purple', 
                label: 'VIOLET REACTOR' 
            }; 
        case DrawTime.NOCHE: 
            return { 
                name: 'blue', 
                hex: '#2463eb', 
                shadow: 'shadow-neon-blue', 
                glow: 'bg-cyber-blue', 
                text: 'text-cyber-blue', 
                border: 'border-cyber-blue',
                label: 'COBALT CRYSTAL' 
            }; 
        default: 
            return { name: 'neon', hex: '#00f0ff', shadow: 'shadow-neon-cyan', glow: 'bg-cyber-neon', text: 'text-cyber-neon', border: 'border-cyber-neon', label: 'CYAN CORE' };
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

  // OPTIMISTIC UPDATE FOR NEW USERS
  const handleUserCreated = (newUser: AppUser) => {
      // Immediate UI update without waiting for refetch
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
      await api.updateGlobalMultiplier({ newValue: customMultiplier, actor_id: user.id });
      setEditingMultiplier(false);
  };

  // --- LOGICA DE COLA (STAGING) ---
  const handleAddToQueue = () => {
      if (!betNumber || !betAmount || Number(betAmount) <= 0) return;
      
      const rawAmount = Number(betAmount);
      const systemAmount = rawAmount * 100; // Units to Cents

      const newBet: PendingBet = {
          id: `draft-${Date.now()}-${Math.random()}`,
          number: betNumber,
          amount: systemAmount,
          draw: selectedDraw,
          mode: gameMode
      };

      setPendingBets(prev => [newBet, ...prev]);
      
      // STICKY STAKE: Limpiamos número, mantenemos monto para ametralladora
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

  // --- EJECUCIÓN DEL LOTE ---
  const handleExecuteBatch = async () => {
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
              // OPTIMISTIC UI UPDATE
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

  // STYLE MODIFIERS FOR REVENTADOS MODE
  const isReventados = gameMode === GameMode.REVENTADOS;
  const consoleBorder = isReventados ? 'border-red-600 shadow-[0_0_30px_rgba(220,38,38,0.4)]' : 'border-white/10 shadow-2xl';
  const consoleBg = isReventados ? 'bg-[#0f0000]/90' : 'bg-[#02040a]/80';

  if (!user) return null;

  return (
    <div className="p-4 md:p-8 space-y-12 md:space-y-24 relative">
      
      {/* MODALS */}
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

      {/* Multiplier Edit Modal */}
      {editingMultiplier && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
              <div className="relative">
                  {/* GLOW */}
                  <div className="absolute -inset-1 bg-cyber-neon rounded-xl blur-xl opacity-30 animate-pulse"></div>
                  
                  <div className="bg-cyber-black border border-white/20 p-6 rounded-xl relative z-10 w-80">
                    <h3 className="text-white font-display font-bold mb-4 uppercase text-sm tracking-wider">Ajuste Manual 90x</h3>
                    <div className="flex items-center gap-4 mb-6">
                        <button onClick={() => setCustomMultiplier(p => Math.max(1, p-1))} className="w-10 h-10 rounded bg-white/10 text-white hover:bg-white/20 font-bold text-xl">-</button>
                        <input 
                            type="number" 
                            value={customMultiplier} 
                            onChange={e => setCustomMultiplier(Number(e.target.value))}
                            className="flex-1 bg-black border border-slate-700 rounded p-2 text-center text-cyber-neon font-mono text-xl font-bold focus:border-cyber-neon outline-none"
                        />
                        <button onClick={() => setCustomMultiplier(p => p+1)} className="w-10 h-10 rounded bg-white/10 text-white hover:bg-white/20 font-bold text-xl">+</button>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setEditingMultiplier(false)} className="flex-1 py-2 rounded text-xs font-bold text-slate-400 border border-slate-700 hover:text-white">CANCELAR</button>
                        <button onClick={handleUpdateMultiplier} className="flex-1 py-2 rounded text-xs font-bold bg-cyber-neon text-black shadow-neon-cyan hover:bg-white">GUARDAR</button>
                    </div>
                  </div>
              </div>
          </div>
      )}

      {/* Header - Floating Tech */}
      <header className="relative z-10 pb-4 md:pb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="relative">
                <div className={`absolute -left-10 -top-10 w-40 h-40 ${theme.glow} blur-[80px] opacity-30 pointer-events-none theme-transition duration-1000`}></div>
                
                <div className="flex items-center gap-3 mb-2 relative z-10">
                    <div className={`w-2 h-2 ${theme.glow} rounded-full animate-ping theme-transition shadow-[0_0_10px_currentColor]`}></div>
                    <span className="font-mono text-[10px] text-cyber-blue tracking-[0.4em] uppercase font-bold text-glow-sm">Sistema Bio-Digital v3.5</span>
                </div>
                <h2 className="text-4xl md:text-6xl font-display font-black text-white italic tracking-tighter uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                    PANEL DE <span className={`text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-500`}>MANDO</span>
                </h2>
            </div>

            <div className="flex items-center gap-6">
                 
                 {/* PRO CMD BUTTON - HOLOGRAPHIC */}
                 {user.role === UserRole.SuperAdmin && (
                     <div className="relative group/btn">
                         {/* Holographic Projector Base */}
                         <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-cyber-neon blur-md"></div>
                         
                         {/* Main Button */}
                         <button 
                            onClick={() => setAdminResultOpen(true)}
                            className="relative overflow-hidden bg-black/40 border border-cyber-neon/30 hover:border-cyber-neon text-cyber-neon px-8 py-3 rounded-lg backdrop-blur-md transition-all group-hover/btn:shadow-[0_0_30px_rgba(0,240,255,0.2)] group-hover/btn:bg-cyber-neon/10"
                         >
                            {/* Scanline inside button */}
                            <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(transparent_50%,rgba(0,240,255,0.1)_50%)] bg-[length:100%_4px] pointer-events-none"></div>
                            
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <i className="fas fa-cube text-xl animate-pulse"></i>
                                    <div className="absolute inset-0 border border-cyber-neon/50 animate-[spin_3s_linear_infinite]"></div>
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-white">Centro de Control</span>
                                    <span className="text-[8px] font-mono text-cyber-neon opacity-70">RESULTADOS & TIEMPO</span>
                                </div>
                            </div>
                         </button>
                     </div>
                 )}

                 <div className="text-right hidden md:block">
                    <div className="text-[9px] text-cyber-purple font-mono uppercase tracking-widest mb-1 font-bold">Sincronización Cuántica</div>
                    <div className="flex gap-1 justify-end">
                        {[1,2,3,4,5].map(i => (
                            <div key={i} className={`w-1 h-6 bg-slate-900/50 rounded-full overflow-hidden backdrop-blur-sm border border-white/10`}>
                                <div className={`w-full h-full ${theme.glow} animate-[scanline_1.5s_ease-in-out_infinite] theme-transition shadow-[0_0_5px_currentColor]`} style={{animationDelay: `${i*0.15}s`, opacity: 0.8}}></div>
                            </div>
                        ))}
                    </div>
                 </div>
            </div>
        </div>
      </header>

      {/* Stats Row */}
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
        <PowerCard 
            label="Cronómetro de Cierre" 
            value={selectedDraw.split(' ')[1].replace(/[()]/g, '')}
            sub="ESTADO: CRÍTICO"
            icon="fa-clock" 
            theme={theme}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 relative z-10">
        
        {/* Main Operational Area */}
        <div className="lg:col-span-2 space-y-12 md:space-y-20">
            
            {/* --- BETTING REACTOR CORE (Renamed Consola de Juego) --- */}
            <div className="relative perspective-1000">
                {/* PLASMA REACTOR BACKLIGHT */}
                <div className={`absolute -inset-1 ${isReventados ? 'bg-red-600 animate-pulse' : theme.glow} rounded-[3rem] opacity-30 blur-xl ${isReventados ? '' : 'animate-plasma-pulse'} theme-transition duration-1000`}></div>
                <div className={`absolute -inset-3 ${isReventados ? 'bg-orange-500' : theme.glow} rounded-[3rem] opacity-10 blur-2xl animate-pulse theme-transition duration-1000 delay-75`}></div>
                
                {/* Main Card */}
                <div className={`relative ${consoleBg} backdrop-blur-xl rounded-[3rem] p-1 overflow-hidden border ${consoleBorder} transition-all duration-700 z-10`}>
                    
                    {/* --- REVENTADOS EFFECT MOUNT POINT --- */}
                    {isReventados && <ReventadosEffect />}

                    <div className="relative z-10 p-6 md:p-12">
                         {/* Console Header */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 md:mb-16 gap-6">
                            <div>
                                <h3 className="text-2xl md:text-3xl font-display font-black text-white uppercase tracking-widest flex items-center gap-4 drop-shadow-lg">
                                    {/* ICON GLOW */}
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
                            
                            <div className="bg-black/60 p-1.5 rounded-full flex gap-1 border border-white/10 backdrop-blur-md shadow-lg self-center md:self-auto relative z-20">
                                <button 
                                    onClick={() => setGameMode(GameMode.TIEMPOS)}
                                    className={`px-6 md:px-8 py-2 md:py-3 rounded-full font-bold text-xs uppercase tracking-widest transition-all duration-300 ${gameMode === GameMode.TIEMPOS ? `bg-slate-800 text-white shadow-[0_0_20px_rgba(255,255,255,0.1)] border border-slate-600` : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                                >
                                    Tiempos
                                </button>
                                <button 
                                    onClick={() => setGameMode(GameMode.REVENTADOS)}
                                    className={`relative overflow-hidden px-6 md:px-8 py-2 md:py-3 rounded-full font-bold text-xs uppercase tracking-widest transition-all duration-300 ${gameMode === GameMode.REVENTADOS ? 'bg-red-900/80 text-white border border-red-500 shadow-[0_0_30px_rgba(255,0,60,0.4)]' : 'text-slate-500 hover:text-red-400 hover:bg-white/5'}`}
                                >
                                    {/* Subtle flash on button when active */}
                                    {gameMode === GameMode.REVENTADOS && <div className="absolute inset-0 bg-red-400 opacity-20 animate-pulse"></div>}
                                    Reventados
                                </button>
                            </div>
                        </div>

                        {/* Time Selectors */}
                        <div className="grid grid-cols-3 gap-3 md:gap-6 mb-10 md:mb-16">
                            {Object.values(DrawTime).map((time) => {
                                const isSelected = selectedDraw === time;
                                let activeGlow = "";
                                let activeBorder = "border-white/5 bg-white/5";
                                let iconColor = "text-slate-600";
                                let textColor = "text-slate-500";
                                let markerColor = "bg-slate-800";

                                if (isSelected) {
                                    textColor = "text-white text-glow";
                                    markerColor = `${isReventados ? 'bg-red-500 shadow-[0_0_10px_red]' : `${theme.glow} shadow-[0_0_10px_white]`}`;
                                    
                                    if (isReventados) {
                                        // Red Override
                                        activeGlow = "shadow-[0_0_40px_rgba(220,38,38,0.4),inset_0_0_20px_rgba(220,38,38,0.1)] bg-red-900/40 border-red-500/80";
                                        iconColor = "text-red-500 drop-shadow-[0_0_10px_red]";
                                    } else {
                                        // Normal Modes
                                        if (time.includes('Mediodía')) {
                                            activeGlow = "shadow-[0_0_40px_rgba(6,182,212,0.4),inset_0_0_20px_rgba(6,182,212,0.1)] bg-cyan-900/20 border-cyan-400/50";
                                            iconColor = "text-cyan-400 drop-shadow-[0_0_10px_currentColor]";
                                        } else if (time.includes('Tarde')) {
                                            activeGlow = "shadow-[0_0_40px_rgba(168,85,247,0.4),inset_0_0_20px_rgba(168,85,247,0.1)] bg-purple-900/20 border-purple-400/50";
                                            iconColor = "text-purple-400 drop-shadow-[0_0_10px_currentColor]";
                                        } else {
                                            activeGlow = "shadow-[0_0_40px_rgba(36,99,235,0.5),inset_0_0_20px_rgba(36,99,235,0.2)] bg-blue-900/30 border-blue-500/50";
                                            iconColor = "text-cyber-blue drop-shadow-[0_0_15px_rgba(36,99,235,0.8)]";
                                        }
                                    }
                                } else {
                                     activeBorder = "border-white/5 bg-black/40 hover:border-white/20 hover:bg-white/5";
                                }

                                return (
                                    <button
                                        key={time}
                                        onClick={() => setSelectedDraw(time)}
                                        className={`relative h-24 md:h-32 rounded-2xl border flex flex-col items-center justify-center gap-2 md:gap-3 backdrop-blur-md overflow-hidden transition-all duration-500 ease-out group/btn ${isSelected ? activeGlow : activeBorder}`}
                                    >
                                        {isSelected && <div className={`absolute inset-0 ${isReventados ? 'bg-red-500' : theme.glow} opacity-10 animate-pulse theme-transition`}></div>}
                                        <i className={`fas ${time.includes('19') ? 'fa-moon' : (time.includes('16') ? 'fa-cloud-sun' : 'fa-sun')} text-2xl md:text-3xl transition-all duration-500 group-hover/btn:scale-110 ${iconColor}`}></i>
                                        <span className={`text-[10px] md:text-xs font-black uppercase tracking-widest transition-colors duration-500 ${textColor}`}>{time.split(' ')[0]}</span>
                                        <div className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${markerColor}`}></div>
                                    </button>
                                )
                            })}
                        </div>
                        
                        {/* Betting Inputs & REACTOR BUTTON */}
                        <div className="flex flex-col md:flex-row gap-8 items-stretch relative z-20">
                            
                            {/* NUMBER INPUT - PLASMA */}
                            <div className="flex-1 relative group/field">
                                <div className={`absolute -inset-1 ${isReventados ? 'bg-red-500' : theme.glow} rounded-2xl opacity-0 group-focus-within/field:opacity-60 blur-md theme-transition duration-700`}></div>
                                <div className="relative bg-black/90 rounded-2xl border border-slate-800 p-1 h-full shadow-inner overflow-hidden">
                                    <div className="h-full rounded-xl bg-gradient-to-b from-slate-900/50 to-black/80 flex flex-col items-center justify-center p-4 relative">
                                        <label className={`text-[10px] font-mono font-bold ${isReventados ? 'text-red-400' : 'text-cyber-blue'} uppercase tracking-wider mb-2`}>Número Objetivo</label>
                                        <input 
                                            id="betNumberInput"
                                            type="number" 
                                            value={betNumber}
                                            onChange={(e) => setBetNumber(e.target.value.slice(0,2))}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddToQueue()}
                                            className={`bg-transparent text-6xl md:text-7xl font-mono ${isReventados ? 'text-red-500 drop-shadow-[0_0_10px_red]' : 'text-white'} text-center focus:outline-none placeholder-slate-800 w-full z-10 transition-all`}
                                            placeholder="00"
                                        />
                                        {/* Scanline */}
                                        <div className="absolute inset-0 pointer-events-none opacity-0 group-focus-within/field:opacity-30 transition-opacity">
                                             <div className={`w-full h-1 ${isReventados ? 'bg-red-500' : theme.glow} animate-[scanline_2s_linear_infinite]`}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* AMOUNT INPUT - PLASMA */}
                            <div className="flex-1 relative group/field">
                                <div className={`absolute -inset-1 ${isReventados ? 'bg-red-500' : theme.glow} rounded-2xl opacity-0 group-focus-within/field:opacity-60 blur-md theme-transition duration-700`}></div>
                                <div className="relative bg-black/90 rounded-2xl border border-slate-800 p-1 h-full shadow-inner overflow-hidden">
                                    <div className="h-full rounded-xl bg-gradient-to-b from-slate-900/50 to-black/80 flex flex-col items-center justify-center p-4 relative">
                                        <label className={`text-[10px] font-mono font-bold ${isReventados ? 'text-red-400' : 'text-cyber-blue'} uppercase tracking-wider mb-2`}>Valor de Inversión (CRC)</label>
                                        <input 
                                            type="number" 
                                            value={betAmount}
                                            onChange={(e) => setBetAmount(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddToQueue()}
                                            className={`bg-transparent text-4xl md:text-5xl font-mono ${isReventados ? 'text-red-500 drop-shadow-[0_0_10px_red]' : 'text-white'} text-center focus:outline-none placeholder-slate-800 w-full z-10 transition-all`}
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* LOAD BUTTON - REACTOR STYLE */}
                            <button 
                                onClick={handleAddToQueue}
                                disabled={!betNumber || !betAmount}
                                className={`w-full md:w-36 py-6 md:py-0 rounded-2xl relative overflow-visible group/action transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed`}
                             >
                                <div className={`absolute inset-2 ${isReventados ? 'bg-red-600' : 'bg-cyber-success'} rounded-xl opacity-20 blur-xl animate-pulse group-hover/action:opacity-60 transition-opacity`}></div>
                                <div className={`absolute inset-0 rounded-2xl border-2 border-dashed ${isReventados ? 'border-red-500/40' : 'border-cyber-success/40'} animate-[spin_10s_linear_infinite] group-hover/action:border-opacity-80 group-hover/action:animate-[spin_2s_linear_infinite]`}></div>
                                <div className={`absolute inset-2 rounded-xl border border-dotted ${isReventados ? 'border-red-500/50' : 'border-cyber-success/50'} animate-[spin_5s_linear_infinite_reverse]`}></div>
                                <div className={`absolute inset-0 bg-black/40 backdrop-blur-sm rounded-2xl border ${isReventados ? 'border-red-500/50 group-hover/action:bg-red-900/20' : 'border-cyber-success/50 group-hover/action:bg-cyber-success/10'} transition-colors`}></div>
                                <div className="relative z-10 h-full flex flex-col items-center justify-center gap-1">
                                    <div className="relative">
                                        <i className={`fas ${isReventados ? 'fa-bomb' : 'fa-bolt'} text-4xl ${isReventados ? 'text-red-500 drop-shadow-[0_0_15px_red]' : 'text-cyber-success drop-shadow-[0_0_15px_#0aff60]'} group-hover/action:scale-110 transition-transform duration-200`}></i>
                                        <i className={`fas ${isReventados ? 'fa-bomb' : 'fa-bolt'} text-4xl text-white absolute top-0 left-0 opacity-50 blur-[2px] animate-pulse`}></i>
                                    </div>
                                    <span className={`text-[9px] font-bold ${isReventados ? 'text-red-500 text-shadow-red' : 'text-cyber-success text-shadow-green'} uppercase tracking-widest mt-1 group-hover/action:text-white transition-colors`}>Cargar</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- QUEUE STAGING AREA --- */}
            {pendingBets.length > 0 && (
                <div className="animate-in slide-in-from-top-4 fade-in duration-500 relative">
                    {/* Backlight */}
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

                             {/* CONFIRM BUTTON - PLASMA STYLE */}
                             <button 
                                onClick={handleExecuteBatch}
                                disabled={executingBatch}
                                className="w-full md:w-auto px-12 py-4 rounded-xl font-display font-black uppercase tracking-[0.2em] relative overflow-hidden group/btn shadow-neon-green transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed border border-cyber-success"
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
            
            {/* --- MANAGEMENT SECTION (User Management Panel) --- */}
            {(user.role === UserRole.SuperAdmin || user.role === UserRole.Vendedor) && (
                <div className="space-y-12 relative z-0">
                     {/* VISUAL SEPARATOR */}
                     <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

                     {/* FORMS GRID - INCREASED GAP FOR ISOLATION */}
                     <div className="grid grid-cols-1 xl:grid-cols-2 gap-20 items-start">
                         
                         {/* BIOMETRIC PROVISIONING */}
                         <div className="relative z-20">
                             <UserCreationForm onCreated={handleUserCreated} theme={theme} />
                         </div>
                         
                         {/* SYSTEM PURGE (ISOLATED) */}
                         <div className="relative z-10 xl:mt-8">
                             {user.role === UserRole.SuperAdmin && <DataPurgeCard theme={theme} />}
                         </div>
                     </div>

                     {/* THE NEW USER MANAGEMENT PANEL */}
                     <UserManagementPanel 
                        players={players}
                        vendors={vendors}
                        onRecharge={openRecharge}
                        onWithdraw={openWithdraw}
                        onRefresh={fetchLists}
                     />
                </div>
            )}
        </div>

        {/* Sidebar / Info Panel */}
        <div className="lg:col-span-1 space-y-8">
             {/* PersonalBetsPanel REMOVED PER REQUEST */}
             
             {/* Info Widget */}
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
