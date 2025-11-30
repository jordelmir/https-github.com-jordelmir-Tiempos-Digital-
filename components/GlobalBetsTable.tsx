
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../services/edgeApi';
import { Bet, UserRole, DrawTime, GameMode } from '../types';
import { formatCurrency, formatDate } from '../constants';
import TicketViewModal from './TicketViewModal';
import WinnerOverlay from './WinnerOverlay';

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
        const base = "shadow-[0_0_15px_currentColor] border-current bg-opacity-20 scale-105 z-10";
        
        if (type === 'TIME') {
            if (value === 'Mediodía') return `border-orange-500 text-orange-400 bg-orange-900/30 ${base} shadow-[0_0_20px_orange]`;
            if (value === 'Tarde') return `border-purple-500 text-purple-400 bg-purple-900/30 ${base} shadow-[0_0_20px_#a855f7]`;
            if (value === 'Noche') return `border-blue-600 text-blue-400 bg-blue-900/30 ${base} shadow-[0_0_20px_#3b82f6]`;
            return `border-white text-white bg-white/10 ${base}`; // All
        }
        
        if (type === 'STATUS') {
            if (value === 'WON') return `border-green-500 text-green-400 bg-green-900/30 ${base} shadow-[0_0_20px_#22c55e]`;
            if (value === 'PENDING') return `border-blue-500 text-blue-400 bg-blue-900/30 ${base} shadow-[0_0_20px_#3b82f6]`;
            if (value === 'LOST') return `border-red-500 text-red-400 bg-red-900/30 ${base} shadow-[0_0_20px_#ef4444]`;
            return `border-white text-white bg-white/10 ${base}`; // All
        }

        if (type === 'ORIGIN') {
            if (value === 'Jugador') return `border-cyan-400 text-cyan-400 bg-cyan-900/30 ${base} shadow-[0_0_20px_cyan]`;
            if (value === 'Vendedor') return `border-purple-500 text-purple-400 bg-purple-900/30 ${base} shadow-[0_0_20px_#a855f7]`;
            return `border-white text-white bg-white/10 ${base}`; // All
        }

        return `border-white text-white bg-white/10 ${base}`;
    };

    if (!user) return null;

    return (
        <div className="relative group animate-in fade-in duration-500 w-full">
            <TicketViewModal isOpen={!!selectedBet} onClose={() => setSelectedBet(null)} bet={selectedBet} />
            <WinnerOverlay isOpen={!!winnerData} onClose={() => setWinnerData(null)} data={winnerData} />

            {/* BACKLIGHT - NEON VAPOR/BLUE MIX */}
            <div className="absolute -inset-1 bg-cyber-blue rounded-[2rem] opacity-20 blur-2xl animate-pulse transition-all duration-1000"></div>
            <div className="absolute -inset-[1px] bg-gradient-to-r from-cyber-blue to-cyber-purple rounded-[2rem] opacity-40 blur-md transition-all duration-700"></div>

            {/* CONTAINER - SOLID CORE */}
            <div className="relative bg-[#050a14] border-2 border-cyber-blue rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(36,99,235,0.1)] z-10">
                
                {/* HEADER */}
                <div className="border-b border-white/10 bg-[#02040a]/90 backdrop-blur-xl p-6">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                        
                        <div>
                            <h3 className="text-xl font-display font-black text-white uppercase tracking-widest flex items-center gap-3 mb-1">
                                <i className="fas fa-globe-americas text-cyber-blue animate-pulse"></i>
                                Panel Global de <span className="text-cyber-neon text-glow">Apuestas</span>
                            </h3>
                            <div className="flex items-center gap-4 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                                <span><i className="fas fa-sync-alt mr-1 animate-spin-slow"></i> Sincronizado</span>
                                <span className="text-cyber-blue">|</span>
                                <span>{filteredBets.length} Registros</span>
                            </div>
                        </div>

                        {/* FILTERS CONTAINER */}
                        <div className="flex flex-wrap gap-4">
                            
                            {/* Time Filter Group */}
                            <div className="relative group/filter">
                                <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl opacity-0 group-hover/filter:opacity-20 blur-md transition-opacity"></div>
                                <div className="relative flex bg-black border border-white/10 rounded-xl p-1 shadow-inner overflow-hidden">
                                    {['ALL', 'Mediodía', 'Tarde', 'Noche'].map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setTimeFilter(t)}
                                            className={`
                                                relative px-4 py-2 rounded-lg text-[9px] font-bold uppercase transition-all duration-300 border
                                                ${getFilterButtonStyle(timeFilter === t, 'TIME', t)}
                                            `}
                                        >
                                            {t === 'ALL' ? 'Todo' : t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Status Filter Group */}
                            <div className="relative group/filter">
                                <div className="absolute -inset-2 bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl opacity-0 group-hover/filter:opacity-20 blur-md transition-opacity"></div>
                                <div className="relative flex bg-black border border-white/10 rounded-xl p-1 shadow-inner overflow-hidden">
                                    {[
                                        { id: 'ALL', label: 'Todo' },
                                        { id: 'WON', label: 'Ganes' },
                                        { id: 'PENDING', label: 'En Juego' },
                                        { id: 'LOST', label: 'Perdidas' }
                                    ].map((opt) => (
                                        <button 
                                            key={opt.id}
                                            onClick={() => setStatusFilter(opt.id as any)} 
                                            className={`
                                                relative px-4 py-2 rounded-lg text-[9px] font-bold uppercase transition-all duration-300 border
                                                ${getFilterButtonStyle(statusFilter === opt.id, 'STATUS', opt.id)}
                                            `}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Origin Filter (Admin/Vendor only) */}
                            {user.role !== UserRole.Cliente && (
                                <div className="relative group/filter">
                                    <div className="absolute -inset-2 bg-gradient-to-r from-cyan-600 to-purple-600 rounded-2xl opacity-0 group-hover/filter:opacity-20 blur-md transition-opacity"></div>
                                    <div className="relative flex bg-black border border-white/10 rounded-xl p-1 shadow-inner overflow-hidden">
                                        {[
                                            { id: 'ALL', label: 'Todo' },
                                            { id: 'Jugador', label: 'Jugador' },
                                            { id: 'Vendedor', label: 'Vendedor' }
                                        ].map((opt) => (
                                            <button 
                                                key={opt.id}
                                                onClick={() => setOriginFilter(opt.id as any)} 
                                                className={`
                                                    relative px-4 py-2 rounded-lg text-[9px] font-bold uppercase transition-all duration-300 border
                                                    ${getFilterButtonStyle(originFilter === opt.id, 'ORIGIN', opt.id)}
                                                `}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* METRICS BAR */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/5">
                        <div>
                            <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Volumen Apostado</div>
                            <div className="text-lg font-mono font-bold text-white">{formatCurrency(totalWagered)}</div>
                        </div>
                        <div>
                            <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Aciertos Confirmados</div>
                            <div className="text-lg font-mono font-bold text-cyber-success text-glow-green">{totalWon}</div>
                        </div>
                        <div>
                            <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Tasa de Conversión</div>
                            <div className="text-lg font-mono font-bold text-cyber-blue">
                                {filteredBets.length > 0 ? ((totalWon / filteredBets.length) * 100).toFixed(1) : 0}%
                            </div>
                        </div>
                        <div className="text-right">
                            <button onClick={fetchBets} className="text-[9px] font-bold text-cyber-neon border border-cyber-neon/30 px-3 py-2 rounded hover:bg-cyber-neon hover:text-black transition-all uppercase tracking-wider shadow-[0_0_10px_rgba(0,240,255,0.1)] hover:shadow-neon-cyan">
                                <i className="fas fa-redo mr-1"></i> Refrescar Datos
                            </button>
                        </div>
                    </div>
                </div>

                {/* TABLE BODY */}
                <div className="relative overflow-x-auto max-h-[500px] custom-scrollbar bg-[#080c14]">
                    <table className="w-full text-left border-collapse relative z-10">
                        <thead className="sticky top-0 bg-[#02040a] z-20 shadow-xl border-b border-white/10">
                            <tr className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">
                                <th className="p-4 pl-6">Hora / Ticket</th>
                                <th className="p-4">Usuario</th>
                                <th className="p-4 text-center">Número</th>
                                <th className="p-4 text-center">Sorteo</th>
                                <th className="p-4 text-right">Inversión</th>
                                <th className="p-4 text-right text-cyber-neon">Premio</th>
                                <th className="p-4 text-center">Estado</th>
                                <th className="p-4 text-right pr-6">Detalle</th>
                            </tr>
                        </thead>
                        <tbody className="font-mono text-xs">
                            {loading ? (
                                <tr><td colSpan={8} className="p-20 text-center text-cyber-blue animate-pulse tracking-widest">CARGANDO REGISTROS...</td></tr>
                            ) : filteredBets.length === 0 ? (
                                <tr><td colSpan={8} className="p-20 text-center text-slate-600 tracking-widest">NO HAY APUESTAS ACTIVAS</td></tr>
                            ) : (
                                filteredBets.map(bet => {
                                    const isWin = bet.status === 'WON';
                                    const isPending = bet.status === 'PENDING';
                                    const isPlayer = bet.origin === 'Jugador';
                                    
                                    // Calc Prize for Display
                                    const multiplier = bet.mode === GameMode.REVENTADOS ? 200 : 90;
                                    const winAmount = isWin ? bet.amount_bigint * multiplier : 0;

                                    return (
                                        <tr key={bet.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                            <td className="p-4 pl-6">
                                                <div className="font-bold text-white">{formatDate(bet.created_at).split(',')[1]}</div>
                                                <div className="text-[9px] text-slate-500 font-mono">{bet.ticket_code}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-8 rounded-full ${isPlayer ? 'bg-cyber-neon shadow-[0_0_10px_cyan]' : 'bg-cyber-purple shadow-[0_0_10px_purple]'}`}></div>
                                                    <div>
                                                        <div className="text-white font-bold text-xs">{bet.user_name}</div>
                                                        <div className={`text-[8px] uppercase tracking-wider ${isPlayer ? 'text-cyber-neon' : 'text-cyber-purple'}`}>
                                                            {bet.origin}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`text-lg font-bold ${isWin ? 'text-cyber-success text-glow-green animate-pulse' : 'text-white'}`}>
                                                    {bet.numbers}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="text-[9px] text-slate-400 uppercase tracking-wider bg-white/5 px-2 py-1 rounded border border-white/10 inline-block">
                                                    {bet.draw_id?.split(' ')[0]}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right font-bold text-white">
                                                {formatCurrency(bet.amount_bigint)}
                                            </td>
                                            <td className="p-4 text-right font-bold">
                                                {isWin ? (
                                                    <span className="text-cyber-neon drop-shadow-[0_0_5px_cyan] text-sm">
                                                        +{formatCurrency(winAmount)}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-700">-</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                {isWin ? (
                                                    <span className="px-3 py-1 bg-green-900/30 text-green-400 border border-green-500/50 rounded text-[9px] font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(34,197,94,0.2)]">
                                                        Ganador
                                                    </span>
                                                ) : isPending ? (
                                                    <span className="px-3 py-1 bg-blue-900/30 text-blue-400 border border-blue-500/50 rounded text-[9px] font-bold uppercase tracking-wider">
                                                        En Juego
                                                    </span>
                                                ) : (
                                                    <span className="px-3 py-1 bg-red-900/10 text-slate-500 border border-slate-700 rounded text-[9px] font-bold uppercase tracking-wider">
                                                        Perdida
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right pr-6">
                                                <button 
                                                    onClick={() => setSelectedBet(bet)}
                                                    className="w-8 h-8 rounded-lg bg-black border border-white/20 text-slate-400 hover:text-white hover:border-cyber-blue hover:shadow-neon-blue flex items-center justify-center transition-all"
                                                >
                                                    <i className="fas fa-eye"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
