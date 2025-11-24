
import React, { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { UserRole, AppUser, DrawTime, GameMode } from '../types';
import UserCreationForm from './UserCreationForm';
import DataPurgeCard from './DataPurgeCard';
import RechargeModal from './RechargeModal';
import AdminResultControl from './AdminResultControl'; // Import
import { formatCurrency } from '../constants';
import { supabase } from '../lib/supabaseClient';
import { api } from '../services/edgeApi';

export default function Dashboard() {
  const user = useAuthStore(s => s.user);
  const [players, setPlayers] = useState<AppUser[]>([]);
  const [vendors, setVendors] = useState<AppUser[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);

  // Recharge State
  const [rechargeModalOpen, setRechargeModalOpen] = useState(false);
  const [selectedUserForRecharge, setSelectedUserForRecharge] = useState<AppUser | null>(null);

  // Admin God Mode State
  const [adminResultOpen, setAdminResultOpen] = useState(false);
  const [editingMultiplier, setEditingMultiplier] = useState(false);
  const [customMultiplier, setCustomMultiplier] = useState(90);

  // Betting State
  const [selectedDraw, setSelectedDraw] = useState<DrawTime>(DrawTime.NOCHE);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.TIEMPOS);
  const [betNumber, setBetNumber] = useState('');
  const [betAmount, setBetAmount] = useState('');

  // --- THEME ENGINE v4.1 (BIO-LUMINESCENCE + CRYSTAL) ---
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
                hex: '#2463eb', // Azul Black Cristal
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
    
    // Si soy Vendedor, solo veo mis Clientes. Si soy Admin, veo todo.
    const { data: clientsData } = await supabase.from('app_users').select('*').eq('role', 'Cliente').limit(100);
    if (clientsData) setPlayers(clientsData as AppUser[]);

    if (user.role === UserRole.SuperAdmin) {
        const { data: vendorsData } = await supabase.from('app_users').select('*').eq('role', 'Vendedor').limit(100);
        if (vendorsData) setVendors(vendorsData as AppUser[]);
    }
    
    setLoadingLists(false);
  };

  useEffect(() => {
    fetchLists();
  }, [user]);

  const openRecharge = (target: AppUser) => {
      setSelectedUserForRecharge(target);
      setRechargeModalOpen(true);
  };

  const handleUpdateMultiplier = async () => {
      if(!user) return;
      await api.updateGlobalMultiplier({ newValue: customMultiplier, actor_id: user.id });
      setEditingMultiplier(false);
      // In real app, trigger toast
  };

  if (!user) return null;

  return (
    <div className="p-8 space-y-20 relative">
      
      {/* MODALS */}
      <RechargeModal 
        isOpen={rechargeModalOpen}
        targetUser={selectedUserForRecharge}
        onClose={() => setRechargeModalOpen(false)}
        onSuccess={fetchLists}
      />

      <AdminResultControl 
        isOpen={adminResultOpen}
        onClose={() => setAdminResultOpen(false)}
      />

      {/* Multiplier Edit Modal (Mini) */}
      {editingMultiplier && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-cyber-black border border-white/20 p-6 rounded-xl shadow-2xl w-80">
                  <h3 className="text-white font-display font-bold mb-4 uppercase text-sm">Ajuste Manual 90x</h3>
                  <div className="flex items-center gap-4 mb-6">
                      <button onClick={() => setCustomMultiplier(p => Math.max(1, p-1))} className="w-10 h-10 rounded bg-white/10 text-white hover:bg-white/20">-</button>
                      <input 
                        type="number" 
                        value={customMultiplier} 
                        onChange={e => setCustomMultiplier(Number(e.target.value))}
                        className="flex-1 bg-black border border-slate-700 rounded p-2 text-center text-cyber-neon font-mono text-xl font-bold"
                       />
                      <button onClick={() => setCustomMultiplier(p => p+1)} className="w-10 h-10 rounded bg-white/10 text-white hover:bg-white/20">+</button>
                  </div>
                  <div className="flex gap-2">
                      <button onClick={() => setEditingMultiplier(false)} className="flex-1 py-2 rounded text-xs font-bold text-slate-400 border border-slate-700">CANCELAR</button>
                      <button onClick={handleUpdateMultiplier} className="flex-1 py-2 rounded text-xs font-bold bg-cyber-neon text-black">GUARDAR</button>
                  </div>
              </div>
          </div>
      )}

      {/* Header - Floating Tech */}
      <header className="relative z-10 pb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="relative">
                {/* Luz focalizada en el título (Transición Suave) */}
                <div className={`absolute -left-10 -top-10 w-40 h-40 ${theme.glow} blur-[80px] opacity-40 pointer-events-none theme-transition duration-1000`}></div>
                
                <div className="flex items-center gap-3 mb-2 relative z-10">
                    <div className={`w-2 h-2 ${theme.glow} rounded-full animate-ping theme-transition`}></div>
                    <span className="font-mono text-[10px] text-slate-400 tracking-[0.4em] uppercase">Sistema Bio-Digital v3.5</span>
                </div>
                <h2 className="text-6xl font-display font-black text-white italic tracking-tighter uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                    PANEL DE <span className={`text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-500`}>MANDO</span>
                </h2>
            </div>

            <div className="flex items-center gap-6">
                 
                 {/* Admin Command Button */}
                 {user.role === UserRole.SuperAdmin && (
                     <button 
                        onClick={() => setAdminResultOpen(true)}
                        className="bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/30 text-white px-6 py-4 rounded-xl flex flex-col items-center gap-1 group transition-all"
                     >
                        <i className="fas fa-terminal text-cyber-neon group-hover:animate-pulse"></i>
                        <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-400 group-hover:text-white">CMD: CONTROL</span>
                     </button>
                 )}

                 <div className="text-right hidden md:block">
                    <div className="text-[9px] text-slate-500 font-mono uppercase tracking-widest mb-1">Sincronización Cuántica</div>
                    <div className="flex gap-1 justify-end">
                        {[1,2,3,4,5].map(i => (
                            <div key={i} className={`w-1 h-6 bg-slate-900/50 rounded-full overflow-hidden backdrop-blur-sm border border-white/5`}>
                                <div className={`w-full h-full ${theme.glow} animate-[scanline_1.5s_ease-in-out_infinite] theme-transition`} style={{animationDelay: `${i*0.15}s`, opacity: 0.8}}></div>
                            </div>
                        ))}
                    </div>
                 </div>
                 
                 {/* Badge del Sistema */}
                 <div className={`relative group px-8 py-4 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden transition-all duration-700 hover:border-white/20 theme-transition`}>
                    <div className={`absolute inset-0 ${theme.glow} opacity-0 group-hover:opacity-20 transition-opacity duration-700 blur-md theme-transition`}></div>
                    <div className="flex items-center gap-4 relative z-10">
                        <i className={`fas fa-server text-xl ${theme.text} drop-shadow-[0_0_8px_currentColor] animate-pulse theme-transition`}></i>
                        <div>
                            <div className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Núcleo Activo</div>
                            <div className={`font-display font-bold text-white tracking-wider text-lg`}>{theme.label}</div>
                        </div>
                    </div>
                 </div>
            </div>
        </div>
      </header>

      {/* Stats Row - Living Energy Cells */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative z-10">
        <PowerCard 
            label="Fondo de Operaciones" 
            value={formatCurrency(user.balance_bigint)} 
            icon="fa-wallet" 
            theme={theme}
            isMoney={true}
        />
        {/* Editable Multiplier Card for Admins */}
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
        <div className="lg:col-span-2 space-y-20">
            
            {/* THE BETTING REACTOR CORE */}
            <div className="relative group perspective-1000">
                {/* 1. LUZ TRASERA MASIVA (BREATHING) */}
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] ${theme.glow} opacity-20 blur-[100px] rounded-[4rem] animate-breathe theme-transition duration-1000`}></div>
                
                {/* 2. Capa de mezcla */}
                <div className={`absolute inset-0 bg-gradient-to-tr ${selectedDraw === DrawTime.NOCHE ? 'from-blue-900/20' : `from-${theme.name}-500/20`} to-transparent opacity-20 rounded-[3rem] blur-xl theme-transition duration-1000`}></div>

                <div className="relative bg-[#02040a]/60 backdrop-blur-2xl rounded-[3rem] p-1 overflow-hidden border border-white/5 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] theme-transition">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:60px_60px] opacity-30 pointer-events-none"></div>
                    <div className="relative z-10 p-10 md:p-12">
                         {/* Console Header */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-6">
                            <div>
                                <h3 className="text-3xl font-display font-black text-white uppercase tracking-widest flex items-center gap-4 drop-shadow-lg">
                                    <i className={`fas fa-gamepad ${theme.text} animate-pulse theme-transition duration-700`}></i>
                                    Consola de Disparo
                                </h3>
                                <div className="flex items-center gap-2 mt-2">
                                    <div className={`h-0.5 w-10 ${theme.glow} theme-transition duration-700`}></div>
                                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Interfaz Neuronal Lista</span>
                                </div>
                            </div>
                            
                            <div className="bg-black/60 p-1.5 rounded-full flex gap-1 border border-white/10 backdrop-blur-md shadow-lg">
                                <button 
                                    onClick={() => setGameMode(GameMode.TIEMPOS)}
                                    className={`px-8 py-3 rounded-full font-bold text-xs uppercase tracking-widest transition-all duration-300 ${gameMode === GameMode.TIEMPOS ? `bg-slate-800 text-white shadow-[0_0_20px_rgba(255,255,255,0.1)] border border-slate-600` : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                                >
                                    Tiempos
                                </button>
                                <button 
                                    onClick={() => setGameMode(GameMode.REVENTADOS)}
                                    className={`px-8 py-3 rounded-full font-bold text-xs uppercase tracking-widest transition-all duration-300 ${gameMode === GameMode.REVENTADOS ? 'bg-red-900/80 text-white border border-red-500 shadow-[0_0_30px_rgba(255,0,60,0.4)]' : 'text-slate-500 hover:text-red-400 hover:bg-white/5'}`}
                                >
                                    Reventados
                                </button>
                            </div>
                        </div>

                        {/* Time Selectors */}
                        <div className="grid grid-cols-3 gap-6 mb-16">
                            {Object.values(DrawTime).map((time) => {
                                const isSelected = selectedDraw === time;
                                let activeGlow = "";
                                let activeBorder = "border-white/5 bg-white/5";
                                let iconColor = "text-slate-600";
                                let textColor = "text-slate-600";
                                let markerColor = "bg-slate-800";

                                if (isSelected) {
                                    textColor = "text-white";
                                    markerColor = `${theme.glow} shadow-[0_0_10px_white]`;
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
                                } else {
                                     activeBorder = "border-white/5 bg-black/40 hover:border-white/20 hover:bg-white/5";
                                }

                                return (
                                    <button
                                        key={time}
                                        onClick={() => setSelectedDraw(time)}
                                        className={`relative h-32 rounded-2xl border flex flex-col items-center justify-center gap-3 backdrop-blur-md overflow-hidden transition-all duration-500 ease-out group/btn ${isSelected ? activeGlow : activeBorder}`}
                                    >
                                        {isSelected && <div className={`absolute inset-0 ${theme.glow} opacity-10 animate-pulse theme-transition`}></div>}
                                        <i className={`fas ${time.includes('19') ? 'fa-moon' : (time.includes('16') ? 'fa-cloud-sun' : 'fa-sun')} text-3xl transition-all duration-500 group-hover/btn:scale-110 ${iconColor}`}></i>
                                        <span className={`text-xs font-black uppercase tracking-widest transition-colors duration-500 ${textColor}`}>{time.split(' ')[0]}</span>
                                        <div className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${markerColor}`}></div>
                                    </button>
                                )
                            })}
                        </div>
                        
                        {/* Betting Inputs */}
                        <div className="flex flex-col md:flex-row gap-8 items-stretch">
                            <div className="flex-1 relative group/field">
                                <div className={`absolute -inset-0.5 ${theme.glow} rounded-2xl opacity-0 group-focus-within/field:opacity-100 blur-md theme-transition duration-700`}></div>
                                <div className="relative bg-black/90 rounded-2xl border border-slate-800 p-1 h-full shadow-inner">
                                    <div className="h-full rounded-xl bg-gradient-to-b from-slate-900/50 to-black/80 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                                        <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-2">Número Objetivo</label>
                                        <input 
                                            type="number" 
                                            value={betNumber}
                                            onChange={(e) => setBetNumber(e.target.value.slice(0,2))}
                                            className="bg-transparent text-7xl font-mono text-white text-center focus:outline-none placeholder-slate-800 w-full z-10 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all"
                                            placeholder="00"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 relative group/field">
                                <div className={`absolute -inset-0.5 ${theme.glow} rounded-2xl opacity-0 group-focus-within/field:opacity-100 blur-md theme-transition duration-700`}></div>
                                <div className="relative bg-black/90 rounded-2xl border border-slate-800 p-1 h-full shadow-inner">
                                    <div className="h-full rounded-xl bg-gradient-to-b from-slate-900/50 to-black/80 flex flex-col items-center justify-center p-4 relative overflow-hidden">
                                        <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-2">Valor de Inversión</label>
                                        <input 
                                            type="number" 
                                            value={betAmount}
                                            onChange={(e) => setBetAmount(e.target.value)}
                                            className="bg-transparent text-5xl font-mono text-white text-center focus:outline-none placeholder-slate-800 w-full z-10 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all"
                                            placeholder="CRC 0"
                                        />
                                    </div>
                                </div>
                            </div>
                             <button className={`w-full md:w-32 rounded-2xl relative overflow-hidden group/action transition-all duration-300 hover:scale-105`}>
                                <div className={`absolute inset-0 ${theme.glow} animate-pulse theme-transition duration-700`}></div>
                                <div className="absolute inset-0 bg-white/10 group-hover/action:bg-white/20 transition-colors"></div>
                                <div className="relative z-10 h-full flex items-center justify-center">
                                    <i className="fas fa-bolt text-4xl text-black drop-shadow-md group-hover/action:rotate-12 transition-transform duration-300"></i>
                                </div>
                            </button>
                        </div>

                    </div>
                </div>
            </div>

            {/* Lists Section - Seamless Data Streams */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <DataStreamList 
                    title="Jugadores en Red" 
                    icon="fa-users" 
                    users={players} 
                    loading={loadingLists} 
                    theme={theme}
                    type="players"
                    onRechargeClick={openRecharge} 
                />
                
                {user.role === UserRole.SuperAdmin && (
                    <DataStreamList 
                        title="Nodos de Venta" 
                        icon="fa-network-wired" 
                        users={vendors} 
                        loading={loadingLists} 
                        theme={theme}
                        type="vendors"
                        onRechargeClick={openRecharge} 
                    />
                )}
            </div>
        </div>

        {/* Sidebar - Tech Stack */}
        <div className="space-y-12">
            
            {/* Admin/Vendor Create Tool */}
            {(user.role === UserRole.SuperAdmin || user.role === UserRole.Vendedor) && (
                <UserCreationForm theme={theme} onCreated={fetchLists} />
            )}

            {/* System Diagnostics */}
            {user.role === UserRole.SuperAdmin && (
                <>
                <div className="relative p-1 rounded-3xl bg-black/20 backdrop-blur-sm group perspective-1000">
                    <div className={`absolute -inset-4 ${theme.glow} opacity-20 blur-[40px] rounded-full group-hover:opacity-30 theme-transition duration-1000`}></div>
                    <div className="bg-[#030508]/80 backdrop-blur-xl rounded-[1.3rem] p-8 relative overflow-hidden border border-white/5 shadow-2xl">
                         <h4 className="font-display font-bold text-white text-sm uppercase tracking-widest mb-8 flex justify-between items-center border-b border-white/10 pb-4">
                            <span className="flex items-center gap-2">
                                <i className="fas fa-microchip text-slate-500"></i>
                                Integridad del Núcleo
                            </span>
                            <span className="text-green-400 text-xs font-mono animate-pulse">● OPTIMAL</span>
                         </h4>
                         <div className="space-y-6">
                            {[
                                { label: 'LATENCIA BD', val: '12ms', bar: 'w-[95%]' },
                                { label: 'EDGE NODES', val: 'SYNCED', bar: 'w-full' },
                                { label: 'ENCRIPTACIÓN', val: 'AES-256-GCM', bar: 'w-full' },
                            ].map((item, i) => (
                                <div key={i}>
                                    <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-2 uppercase tracking-wider">
                                        <span>{item.label}</span>
                                        <span className={`${theme.text} font-bold text-glow theme-transition duration-700`}>{item.val}</span>
                                    </div>
                                    <div className="h-1.5 bg-black rounded-full overflow-hidden border border-white/5">
                                        <div className={`h-full ${item.bar} ${theme.glow} shadow-[0_0_10px_currentColor] relative overflow-hidden theme-transition duration-700`}>
                                            <div className="absolute inset-0 bg-white/30 animate-[scanline_1s_linear_infinite]"></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                         </div>
                    </div>
                </div>

                <DataPurgeCard theme={theme} />
                </>
            )}
        </div>
      </div>
    </div>
  );
}

// --- POWER CARD COMPONENT ---
const PowerCard = React.memo(({ label, value, icon, theme, sub, isMoney, isWarning, onClick, editable }: any) => {
    let glowColor = theme.glow; 
    let textColor = theme.text;
    let iconColor = theme.text;
    if (isMoney) { glowColor = 'bg-yellow-500'; textColor = 'text-yellow-400'; iconColor = 'text-yellow-500'; }
    if (isWarning) { glowColor = 'bg-red-600'; textColor = 'text-red-500'; iconColor = 'text-red-500'; }

    return (
        <div 
            onClick={onClick}
            className={`relative group h-40 ${onClick ? 'cursor-pointer' : ''}`}
        >
            <div className={`absolute -inset-4 ${glowColor} opacity-20 blur-[60px] rounded-full group-hover:opacity-40 group-hover:blur-[80px] theme-transition duration-1000 animate-breathe`}></div>
            <div className="absolute inset-0 bg-[#030610]/60 backdrop-blur-xl rounded-2xl border border-white/5 shadow-[inset_0_0_40px_rgba(0,0,0,0.5)] overflow-hidden group-hover:border-white/10 transition-colors">
                <div className="absolute right-0 top-0 w-1/2 h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-30 pointer-events-none mask-image-gradient"></div>
                <div className="relative z-10 p-6 h-full flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-[0.2em]">
                            {label} {editable && <i className="fas fa-pen text-[8px] ml-2 text-slate-600"></i>}
                        </p>
                        <div className={`w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center ${iconColor} drop-shadow-[0_0_10px_currentColor] shadow-inner theme-transition duration-700`}>
                            <i className={`fas ${icon}`}></i>
                        </div>
                    </div>
                    <div>
                        <p className={`text-4xl font-display font-black text-white drop-shadow-lg tracking-tighter group-hover:scale-105 transition-transform origin-left`}>
                            {value}
                        </p>
                        {sub && <p className={`text-[9px] font-bold mt-1 tracking-widest ${isWarning ? 'text-red-500 animate-pulse' : 'text-slate-500'}`}>{sub}</p>}
                    </div>
                </div>
            </div>
        </div>
    )
});

// --- UPDATED DATA STREAM LIST (With Recharge Button) ---
const DataStreamList = React.memo(({ title, icon, users, loading, theme, type, onRechargeClick }: any) => {
    return (
        <div className="flex flex-col h-[500px] relative group">
            <div className={`absolute inset-x-10 top-20 bottom-0 ${theme.glow} opacity-5 blur-[50px] pointer-events-none theme-transition duration-1000`}></div>
            
            <div className="flex items-center gap-4 mb-6 pl-2">
                <div className={`p-3 rounded-lg bg-black/60 border border-white/5 shadow-[0_0_15px_rgba(0,0,0,0.5)] backdrop-blur-md`}>
                    <i className={`fas ${icon} text-slate-400`}></i>
                </div>
                <div>
                    <h4 className="font-display font-bold text-white uppercase text-sm tracking-widest">{title}</h4>
                    <div className="h-0.5 w-full bg-gradient-to-r from-slate-700 to-transparent mt-1"></div>
                </div>
                <div className={`ml-auto px-3 py-1 bg-white/5 rounded-full text-[9px] font-mono text-slate-300 border border-white/5 backdrop-blur-sm`}>
                    {users.length} ACTIVOS
                </div>
            </div>

            <div className="flex-1 rounded-2xl overflow-hidden relative bg-black/40 backdrop-blur-sm border border-white/5 shadow-inner">
                <div className="absolute top-0 left-0 w-full h-12 bg-gradient-to-b from-[#02040a] to-transparent z-10 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-[#02040a] to-transparent z-10 pointer-events-none"></div>
                
                <div className="overflow-y-auto h-full custom-scrollbar p-2">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-0">
                            <tr className="text-[9px] font-mono text-slate-500 uppercase border-b border-white/5">
                                <th className="p-4 font-normal">Identidad</th>
                                <th className="p-4 text-right font-normal">{type === 'vendors' ? 'Volumen' : 'Crédito'}</th>
                                <th className="p-4 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="font-mono text-xs">
                            {loading ? (
                                <tr><td colSpan={3} className="p-20 text-center text-slate-600 animate-pulse tracking-widest">ESCANNEANDO RED...</td></tr>
                            ) : users.map((u: any, i: number) => (
                                <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors group/row">
                                    <td className="p-4">
                                        <div className="text-slate-300 font-bold group-hover/row:text-white transition-colors flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${u.balance_bigint > 0 ? 'bg-green-500' : 'bg-red-500'} opacity-50`}></div>
                                            {u.name}
                                        </div>
                                        <div className="text-[9px] text-slate-600 pl-3.5 font-mono tracking-wide">{u.id.substring(0,8)}...</div>
                                    </td>
                                    <td className="p-4 text-right">
                                        {type === 'players' ? (
                                            <div className={`${u.balance_bigint > 0 ? theme.text : 'text-slate-600'} font-bold drop-shadow-[0_0_5px_rgba(0,0,0,0.8)] theme-transition duration-500`}>
                                                {formatCurrency(u.balance_bigint)}
                                            </div>
                                        ) : (
                                            <div className="text-green-400 font-bold text-shadow-sm">{u.recent_sale ? formatCurrency(u.recent_sale.amount) : '---'}</div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <button 
                                            onClick={() => onRechargeClick(u)}
                                            className="w-8 h-8 rounded flex items-center justify-center bg-white/5 hover:bg-cyber-success hover:text-black hover:shadow-neon-green transition-all"
                                            title="Recargar Usuario"
                                        >
                                            <i className="fas fa-bolt text-xs"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
});
