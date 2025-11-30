import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../services/edgeApi';
import { Bet, UserRole, DrawTime, GameMode } from '../types';
import { formatCurrency, formatDate } from '../constants';
import TicketViewModal from './TicketViewModal';
import WinnerOverlay from './WinnerOverlay';
import AnimatedIconUltra from './ui/AnimatedIconUltra';
import MatrixRain from './ui/MatrixRain';

interface GlobalBetsTableProps {
    onRefresh?: () => void;
    refreshTrigger?: number;
}

export default function GlobalBetsTable({ onRefresh, refreshTrigger }: GlobalBetsTableProps) {
    const user = useAuthStore(s => s.user);
    const fetchUser = useAuthStore(s => s.fetchUser);
    const [bets, setBets] = useState<(Bet & { user_name?: string, user_role?: string, origin?: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBet, setSelectedBet] = useState<Bet | null>(null);

    // WINNER ANIMATION STATE
    const [winnerData, setWinnerData] = useState<any>(null);
    const prevBetsRef = useRef<Map<string, string>>(new Map()); // Track ID -> Status

    // FILTERS
    const [timeFilter, setTimeFilter] = useState<string>('ALL');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'WON' | 'LOST' | 'PENDING'>('ALL');
    const [originFilter, setOriginFilter] = useState<'ALL' | 'Jugador' | 'Vendedor'>('ALL');

    const fetchBets = async () => {
        if (!user) return;
        // Don't set loading true on background refreshes to avoid flickering
        if (bets.length === 0) setLoading(true);
        
        try {
            const res = await api.getGlobalBets({
                role: user.role,
                userId: user.id,
                timeFilter,
                statusFilter
            });
            if (res.data) {
                setBets(res.data.bets as any);
            }
        } catch (e) {
            console.error("Error fetching global bets", e);
        } finally {
            setLoading(false);
        }
    };

    // Auto-refresh every 10 seconds AND when triggered manually by parent
    useEffect(() => {
        fetchBets();
        const interval = setInterval(fetchBets, 10000);
        return () => clearInterval(interval);
    }, [user, timeFilter, statusFilter, refreshTrigger]); 

    // --- REAL-TIME WIN DETECTION ---
    useEffect(() => {
        // Only trigger for Clients (Players) to create the excitement
        if (!user || user.role !== UserRole.Cliente) return;

        bets.forEach(bet => {
            const oldStatus = prevBetsRef.current.get(bet.id);
            
            // Detect transition from PENDING -> WON
            if (bet.status === 'WON' && oldStatus === 'PENDING') {
                
                // Calculate Prize based on Mode (Approximate for UI)
                const multiplier = bet.amount_bigint > 0 ? (bet.mode === GameMode.REVENTADOS ? 200 : 90) : 0;
                const prize = bet.amount_bigint * multiplier;

                // Trigger Intrusive Animation
                setWinnerData({
                    amount: prize,
                    number: bet.numbers,
                    draw: bet.draw_id || 'Sorteo',
                    type: bet.mode === GameMode.REVENTADOS ? 'REVENTADOS' : 'TIEMPOS',
                    newBalance: user.balance_bigint + prize // Projected
                });

                // Refresh User Balance
                fetchUser(true); 
            }
            
            // Update ref
            prevBetsRef.current.set(bet.id, bet.status);
        });
    }, [bets, user]);


    // Client-side Origin Filter (since fetch gets all allowed for role)
    const filteredBets = useMemo(() => {
        if (originFilter === 'ALL') return bets;
        return bets.filter(b => b.origin === originFilter);
    }, [bets, originFilter]);

    // METRICS
    const totalWagered = useMemo(() => filteredBets.reduce((acc, b) => acc + b.amount_bigint, 0), [filteredBets]);
    const totalWon = useMemo(() => filteredBets.filter(b => b.status === 'WON').length, [filteredBets]);
    
    // --- THEME HELPER FOR FILTERS ---
    const getFilterButtonStyle = (isActive: boolean, type: 'TIME' | 'STATUS' | 'ORIGIN', value: string) => {
        if (!isActive) return 'border-transparent text-slate-500 hover:text-white hover:bg-white/5';

        // ACTIVE STATE LOGIC
        const base = "shadow-[0_0_15px_currentColor] border-current bg-opacity-20 z-10 font-black tracking-widest";
        
        if (type === 'TIME') {
            if (value.includes('Mediodía')) return `border-cyber-solar text-cyber-solar bg-orange-900/30 ${base} shadow-neon-solar`;
            if (value.includes('Tarde')) return `border-cyber-vapor text-cyber-vapor bg-purple-900/30 ${base} shadow-neon-vapor`;
            if (value.includes('Noche')) return `border-blue-500 text-blue-400 bg-blue-900/30 ${base} shadow-neon-blue`;
            return `border-white text-white bg-white/10 ${base}`; // All
        }
        
        if (type === 'STATUS') {
            if (value === 'WON') return `border-cyber-success text-cyber-success bg-green-900/30 ${base} shadow-neon-green`;
            if (value === 'PENDING') return `border-cyber-blue text-cyber-blue bg-blue-900/30 ${base} shadow-neon-blue`;
            if (value === 'LOST') return `border-red-500 text-red-400 bg-red-900/30 ${base} shadow-neon-red`;
            return `border-white text-white bg-white/10 ${base}`; // All
        }

        if (type === 'ORIGIN') {
            if (value === 'Jugador') return `border-cyber-neon text-cyber-neon bg-cyan-900/30 ${base} shadow-neon-cyan`;
            if (value === 'Vendedor') return `border-cyber-purple text-cyber-purple bg-purple-900/30 ${base} shadow-neon-purple`;
            return `border-white text-white bg-white/10 ${base}`; // All
        }

        return `border-white text-white bg-white/10 ${base}`;
    };

    if (!user) return null;

    return (
        <div className="relative group w-full font-sans">
            <TicketViewModal isOpen={!!selectedBet} onClose={() => setSelectedBet(null)} bet={selectedBet} />
            <WinnerOverlay isOpen={!!winnerData} onClose={() => setWinnerData(null)} data={winnerData} />

            {/* MAIN CONTAINER - SOLID CORE WITH PHOSPHORESCENT BORDER */}
            <div className="relative bg-[#02040a] border-2 border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl z-10 transition-all duration-700 hover:border-white/20 hover:shadow-[0_0_40px_rgba(255,255,255,0.05)]">
                
                {/* --- INTERNAL MATRIX RAIN --- */}
                <div className="absolute inset-0 opacity-15 pointer-events-none">
                    <MatrixRain 
                        colorHex="#2463eb" 
                        speed={0.5} 
                        density="LOW" 
                        opacity={0.3} 
                    />
                </div>

                {/* Header Background Effects */}
                <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-cyber-blue/5 to-transparent pointer-events-none"></div>
                <div className="absolute -top-20 -right-20 w-96 h-96 bg-cyber-blue/10 blur-[80px] rounded-full pointer-events-none animate-pulse"></div>

                {/* HEADER */}
                <div className="border-b border-white/10 bg-[#05070a]/90 backdrop-blur-xl p-6 md:p-8 relative z-20">
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
                        
                        {/* Title Section */}
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-black border border-white/10 flex items-center justify-center shadow-[0_0_20px_rgba(36,99,235,0.2)] relative overflow-hidden group/icon">
                                <div className="absolute inset-0 bg-cyber-blue/10 animate-pulse"></div>
                                <AnimatedIconUltra profile={{ animation: 'spin3d', theme: 'cyber', speed: 4 }}>
                                    <i className="fas fa-globe text-2xl text-cyber-blue relative z-10"></i>
                                </AnimatedIconUltra>
                            </div>
                            <div>
                                <h3 className="text-2xl font-display font-black text-white uppercase tracking-wider leading-none flex items-center gap-3">
                                    Operaciones <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyber-blue to-cyan-400 drop-shadow-[0_0_5px_rgba(36,99,235,0.8)]">Globales</span>
                                </h3>
                                <div className="flex items-center gap-3 mt-2">
                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyber-blue/10 border border-cyber-blue/30">
                                        <div className="w-1.5 h-1.5 rounded-full bg-cyber-blue animate-pulse shadow-[0_0_5px_cyan]"></div>
                                        <span className="text-[9px] font-mono font-bold text-cyber-blue uppercase tracking-widest">Live Feed</span>
                                    </div>
                                    <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                                        {filteredBets.length} Transacciones
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* FILTERS MATRIX */}
                        <div className="flex flex-wrap gap-3 p-1.5 bg-black/40 border border-white/10 rounded-2xl shadow-inner">
                            
                            {/* Time */}
                            <div className="flex bg-black rounded-xl p-1 gap-1 border border-white/5">
                                {['ALL', 'Mediodía', 'Tarde', 'Noche'].map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setTimeFilter(t)}
                                        className={`px-3 py-2 rounded-lg text-[8px] md:text-[9px] font-bold uppercase transition-all duration-300 border ${getFilterButtonStyle(timeFilter === t, 'TIME', t)}`}
                                    >
                                        {t === 'ALL' ? 'Todo' : t.split(' ')[0]}
                                    </button>
                                ))}
                            </div>

                            {/* Status */}
                            <div className="flex bg-black rounded-xl p-1 gap-1 border border-white/5">
                                {[
                                    { id: 'ALL', label: 'Todo', icon: 'fa-list' },
                                    { id: 'WON', label: 'Ganes', icon: 'fa-trophy' },
                                    { id: 'PENDING', label: 'Activo', icon: 'fa-clock' },
                                    { id: 'LOST', label: 'Baja', icon: 'fa-times' }
                                ].map((opt) => (
                                    <button 
                                        key={opt.id}
                                        onClick={() => setStatusFilter(opt.id as any)} 
                                        className={`px-3 py-2 rounded-lg text-[8px] md:text-[9px] font-bold uppercase transition-all duration-300 border flex items-center gap-2 ${getFilterButtonStyle(statusFilter === opt.id, 'STATUS', opt.id)}`}
                                    >
                                        <i className={`fas ${opt.icon}`}></i>
                                        <span className="hidden sm:inline">{opt.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Origin */}
                            {user.role !== UserRole.Cliente && (
                                <div className="flex bg-black rounded-xl p-1 gap-1 border border-white/5">
                                    {[
                                        { id: 'ALL', label: 'Red' },
                                        { id: 'Jugador', label: 'Jug' },
                                        { id: 'Vendedor', label: 'Vend' }
                                    ].map((opt) => (
                                        <button 
                                            key={opt.id}
                                            onClick={() => setOriginFilter(opt.id as any)} 
                                            className={`px-3 py-2 rounded-lg text-[8px] md:text-[9px] font-bold uppercase transition-all duration-300 border ${getFilterButtonStyle(originFilter === opt.id, 'ORIGIN', opt.id)}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* METRICS HUD */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/5">
                        <div className="bg-black/40 rounded-xl p-3 border border-white/5 flex flex-col items-center justify-center group hover:border-white/10 transition-colors">
                            <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Volumen Total</div>
                            <div className="text-xl font-mono font-black text-white group-hover:text-glow-sm transition-all">{formatCurrency(totalWagered)}</div>
                        </div>
                        <div className="bg-black/40 rounded-xl p-3 border border-white/5 flex flex-col items-center justify-center group hover:border-cyber-success/30 transition-colors">
                            <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Victorias</div>
                            <div className="text-xl font-mono font-black text-cyber-success drop-shadow-[0_0_5px_lime]">{totalWon}</div>
                        </div>
                        <div className="bg-black/40 rounded-xl p-3 border border-white/5 flex flex-col items-center justify-center group hover:border-cyber-blue/30 transition-colors">
                            <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Ratio de Éxito</div>
                            <div className="text-xl font-mono font-black text-cyber-blue drop-shadow-[0_0_5px_blue]">
                                {filteredBets.length > 0 ? ((totalWon / filteredBets.length) * 100).toFixed(1) : 0}%
                            </div>
                        </div>
                        <div className="flex items-center justify-center">
                            <button onClick={fetchBets} className="w-full h-full bg-white/5 border border-white/10 hover:bg-cyber-blue/10 hover:border-cyber-blue hover:text-cyber-blue text-slate-400 rounded-xl transition-all font-bold uppercase text-[9px] tracking-widest flex flex-col items-center justify-center gap-2 group">
                                <i className="fas fa-sync-alt text-lg group-hover:animate-spin"></i>
                                <span>Refrescar</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* TABLE BODY - HOLOGRAPHIC LIST */}
                <div className="relative overflow-x-auto max-h-[600px] custom-scrollbar bg-[#020305] p-2 md:p-4">
                    
                    {/* Header Row (Pseudo Table) */}
                    <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 mb-2 sticky top-0 bg-[#020305] z-30">
                        <div className="col-span-2">Ticket ID / Hora</div>
                        <div className="col-span-3">Usuario & Origen</div>
                        <div className="col-span-1 text-center">Número</div>
                        <div className="col-span-2 text-center">Sorteo</div>
                        <div className="col-span-2 text-right">Inversión</div>
                        <div className="col-span-1 text-center">Estado</div>
                        <div className="col-span-1 text-right">Acción</div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4">
                            <div className="w-16 h-16 border-4 border-cyber-blue border-t-transparent rounded-full animate-spin"></div>
                            <div className="text-cyber-blue font-mono text-xs animate-pulse tracking-[0.3em]">DESCIFRANDO BLOCKCHAIN...</div>
                        </div>
                    ) : filteredBets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-50">
                            <i className="fas fa-terminal text-4xl text-slate-700"></i>
                            <div className="text-slate-500 font-mono text-xs tracking-[0.3em]">SIN REGISTROS ACTIVOS</div>
                        </div>
                    ) : (
                        <div className="space-y-2 relative z-10">
                            {filteredBets.map((bet, idx) => {
                                const isWin = bet.status === 'WON';
                                const isPending = bet.status === 'PENDING';
                                const isLost = bet.status === 'LOST';
                                const isPlayer = bet.origin === 'Jugador';
                                
                                let rowClass = "border-white/5 bg-white/[0.02]";
                                let statusBadge = "bg-slate-800 text-slate-500 border-slate-700";
                                let numberClass = "text-white";
                                let amountClass = "text-slate-400";

                                if (isWin) {
                                    rowClass = "border-cyber-success/50 bg-green-950/10 shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]";
                                    statusBadge = "bg-cyber-success text-black border-cyber-success shadow-[0_0_10px_lime]";
                                    numberClass = "text-cyber-success drop-shadow-[0_0_5px_lime]";
                                    amountClass = "text-white font-black";
                                } else if (isPending) {
                                    rowClass = "border-cyber-blue/30 bg-blue-950/10";
                                    statusBadge = "bg-blue-900/40 text-blue-300 border-blue-500/50 animate-pulse";
                                    numberClass = "text-white";
                                    amountClass = "text-blue-200";
                                } else if (isLost) {
                                    rowClass = "border-white/5 bg-black opacity-60 grayscale";
                                    statusBadge = "bg-red-900/20 text-red-500 border-red-900/50";
                                    numberClass = "text-slate-600";
                                }

                                return (
                                    <div 
                                        key={bet.id}
                                        className={`
                                            relative grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 items-center p-4 rounded-xl border-l-4 transition-all duration-300 hover:scale-[1.01] hover:z-10 hover:shadow-lg group/row
                                            ${rowClass}
                                            ${isWin ? 'border-l-cyber-success' : isPending ? 'border-l-cyber-blue' : 'border-l-slate-800'}
                                        `}
                                        style={{ animationDelay: `${idx * 50}ms` }}
                                    >
                                        {/* Hover Glow */}
                                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover/row:opacity-100 transition-opacity rounded-xl pointer-events-none"></div>

                                        {/* COL 1: ID & TIME */}
                                        <div className="col-span-1 md:col-span-2 flex flex-col">
                                            <div className="text-[10px] font-mono text-slate-500 flex items-center gap-2">
                                                <i className="fas fa-barcode text-xs"></i>
                                                {bet.ticket_code?.split('-')[1] || '---'}
                                            </div>
                                            <div className="text-white font-bold text-xs font-mono">{formatDate(bet.created_at).split(',')[1]}</div>
                                        </div>

                                        {/* COL 2: USER INFO */}
                                        <div className="col-span-1 md:col-span-3 flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border text-xs font-bold ${isPlayer ? 'bg-cyan-950 text-cyan-400 border-cyan-500/30' : 'bg-purple-950 text-purple-400 border-purple-500/30'}`}>
                                                {bet.user_name?.substring(0,2).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-white text-xs font-bold leading-none">{bet.user_name}</div>
                                                <div className={`text-[8px] uppercase tracking-wider mt-1 ${isPlayer ? 'text-cyan-500' : 'text-purple-500'}`}>{bet.origin}</div>
                                            </div>
                                        </div>

                                        {/* COL 3: NUMBER */}
                                        <div className="col-span-1 md:col-span-1 flex justify-between md:justify-center items-center">
                                            <span className="md:hidden text-[9px] text-slate-500 uppercase font-bold">Número</span>
                                            <div className={`text-2xl font-mono font-black ${numberClass}`}>{bet.numbers}</div>
                                        </div>

                                        {/* COL 4: DRAW */}
                                        <div className="col-span-1 md:col-span-2 text-center">
                                            <div className="inline-block px-2 py-1 rounded border border-white/10 bg-black/40 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                {bet.draw_id?.split(' ')[0]}
                                            </div>
                                        </div>

                                        {/* COL 5: AMOUNT */}
                                        <div className="col-span-1 md:col-span-2 flex justify-between md:justify-end items-center">
                                            <span className="md:hidden text-[9px] text-slate-500 uppercase font-bold">Inversión</span>
                                            <div className={`font-mono text-sm font-bold ${amountClass}`}>{formatCurrency(bet.amount_bigint)}</div>
                                        </div>

                                        {/* COL 6: STATUS */}
                                        <div className="col-span-1 md:col-span-1 flex justify-center">
                                            <div className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest border ${statusBadge}`}>
                                                {isWin ? 'GANADOR' : isPending ? 'EN JUEGO' : 'FINALIZADO'}
                                            </div>
                                        </div>

                                        {/* COL 7: ACTIONS */}
                                        <div className="col-span-1 md:col-span-1 text-right">
                                            <button 
                                                onClick={() => setSelectedBet(bet)}
                                                className="w-8 h-8 rounded-full bg-black border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/50 hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-all ml-auto"
                                            >
                                                <i className="fas fa-eye text-xs"></i>
                                            </button>
                                        </div>

                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}