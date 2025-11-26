
import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../services/edgeApi';
import { Bet, UserRole, DrawTime } from '../types';
import { formatCurrency, formatDate } from '../constants';
import TicketViewModal from './TicketViewModal';

interface GlobalBetsTableProps {
    onRefresh?: () => void;
}

export default function GlobalBetsTable({ onRefresh }: GlobalBetsTableProps) {
    const user = useAuthStore(s => s.user);
    const [bets, setBets] = useState<(Bet & { user_name?: string, user_role?: string, origin?: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBet, setSelectedBet] = useState<Bet | null>(null);

    // FILTERS
    const [timeFilter, setTimeFilter] = useState<string>('ALL');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'WON' | 'LOST' | 'PENDING'>('ALL');
    const [originFilter, setOriginFilter] = useState<'ALL' | 'Jugador' | 'Vendedor'>('ALL');

    const fetchBets = async () => {
        if (!user) return;
        setLoading(true);
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

    // Auto-refresh every 10 seconds
    useEffect(() => {
        fetchBets();
        const interval = setInterval(fetchBets, 10000);
        return () => clearInterval(interval);
    }, [user, timeFilter, statusFilter]); // Re-fetch on filter change

    // Client-side Origin Filter (since fetch gets all allowed for role)
    const filteredBets = useMemo(() => {
        if (originFilter === 'ALL') return bets;
        return bets.filter(b => b.origin === originFilter);
    }, [bets, originFilter]);

    // METRICS
    const totalWagered = useMemo(() => filteredBets.reduce((acc, b) => acc + b.amount_bigint, 0), [filteredBets]);
    const totalWon = useMemo(() => filteredBets.filter(b => b.status === 'WON').length, [filteredBets]);
    
    if (!user) return null;

    return (
        <div className="relative group animate-in fade-in duration-500 w-full">
            <TicketViewModal isOpen={!!selectedBet} onClose={() => setSelectedBet(null)} bet={selectedBet} />

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

                        {/* FILTERS */}
                        <div className="flex flex-wrap gap-2">
                            
                            {/* Time Filter */}
                            <div className="flex bg-black border border-white/10 rounded-lg p-1">
                                {['ALL', 'Mediodía', 'Tarde', 'Noche'].map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setTimeFilter(t)}
                                        className={`px-3 py-1.5 rounded text-[9px] font-bold uppercase transition-all ${
                                            timeFilter === t 
                                            ? 'bg-cyber-blue text-white shadow-[0_0_10px_#2463eb]' 
                                            : 'text-slate-500 hover:text-white'
                                        }`}
                                    >
                                        {t === 'ALL' ? 'Todo' : t}
                                    </button>
                                ))}
                            </div>

                            {/* Status Filter */}
                            <div className="flex bg-black border border-white/10 rounded-lg p-1">
                                <button onClick={() => setStatusFilter('ALL')} className={`px-3 py-1.5 rounded text-[9px] font-bold uppercase transition-all ${statusFilter === 'ALL' ? 'bg-white/20 text-white' : 'text-slate-500 hover:text-white'}`}>Todo</button>
                                <button onClick={() => setStatusFilter('WON')} className={`px-3 py-1.5 rounded text-[9px] font-bold uppercase transition-all ${statusFilter === 'WON' ? 'bg-green-600 text-white' : 'text-slate-500 hover:text-green-400'}`}>Ganes</button>
                                <button onClick={() => setStatusFilter('PENDING')} className={`px-3 py-1.5 rounded text-[9px] font-bold uppercase transition-all ${statusFilter === 'PENDING' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-blue-400'}`}>En Juego</button>
                            </div>

                            {/* Origin Filter (Admin/Vendor only) */}
                            {user.role !== UserRole.Cliente && (
                                <div className="flex bg-black border border-white/10 rounded-lg p-1">
                                    <button onClick={() => setOriginFilter('ALL')} className={`px-3 py-1.5 rounded text-[9px] font-bold uppercase transition-all ${originFilter === 'ALL' ? 'bg-white/20 text-white' : 'text-slate-500 hover:text-white'}`}>Todo</button>
                                    <button onClick={() => setOriginFilter('Jugador')} className={`px-3 py-1.5 rounded text-[9px] font-bold uppercase transition-all ${originFilter === 'Jugador' ? 'bg-cyber-neon/20 text-cyber-neon border border-cyber-neon/50' : 'text-slate-500 hover:text-cyber-neon'}`}>Jugador</button>
                                    <button onClick={() => setOriginFilter('Vendedor')} className={`px-3 py-1.5 rounded text-[9px] font-bold uppercase transition-all ${originFilter === 'Vendedor' ? 'bg-cyber-purple/20 text-cyber-purple border border-cyber-purple/50' : 'text-slate-500 hover:text-cyber-purple'}`}>Vendedor</button>
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
                            <button onClick={fetchBets} className="text-[9px] font-bold text-cyber-neon border border-cyber-neon/30 px-3 py-2 rounded hover:bg-cyber-neon hover:text-black transition-all uppercase tracking-wider">
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
                                <th className="p-4 text-center">Estado</th>
                                <th className="p-4 text-right pr-6">Detalle</th>
                            </tr>
                        </thead>
                        <tbody className="font-mono text-xs">
                            {loading ? (
                                <tr><td colSpan={7} className="p-20 text-center text-cyber-blue animate-pulse tracking-widest">CARGANDO REGISTROS...</td></tr>
                            ) : filteredBets.length === 0 ? (
                                <tr><td colSpan={7} className="p-20 text-center text-slate-600 tracking-widest">NO HAY APUESTAS ACTIVAS</td></tr>
                            ) : (
                                filteredBets.map(bet => {
                                    const isWin = bet.status === 'WON';
                                    const isPending = bet.status === 'PENDING';
                                    const isPlayer = bet.origin === 'Jugador';
                                    
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
