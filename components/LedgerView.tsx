
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { LedgerTransaction, UserRole } from '../types';
import { formatCurrency, formatDate, ROUTES } from '../constants';
import { useAuthStore } from '../store/useAuthStore';
import { Navigate } from 'react-router-dom';
import AnimatedIconUltra from './ui/AnimatedIconUltra';

// --- TYPES ---
type Timeframe = 'WEEK' | 'MONTH' | 'ALL';

interface ChartPoint {
    label: string;
    ingresos: number;
    egresos: number;
    flujoNeto: number;
    saldoAcumulado: number;
    timestamp: number;
}

// --- DATA PROCESSOR ENGINE ---
const processDataByTimeframe = (txs: LedgerTransaction[], timeframe: Timeframe): ChartPoint[] => {
    if (txs.length === 0) return [];

    const sorted = [...txs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    // Determine Cutoff
    let cutoff = new Date(0); 
    const now = new Date();
    
    if (timeframe === 'WEEK') {
        cutoff = new Date();
        cutoff.setDate(now.getDate() - 7);
    } else if (timeframe === 'MONTH') {
        cutoff = new Date();
        cutoff.setMonth(now.getMonth(), 1); 
    }

    // Filter
    const filtered = sorted.filter(t => new Date(t.created_at) >= cutoff);
    
    const groups = new Map<string, ChartPoint>();
    let runningBalance = filtered.length > 0 ? filtered[0].balance_before : 0;

    filtered.forEach(tx => {
        const d = new Date(tx.created_at);
        let key = '';
        let sortTime = 0;

        if (timeframe === 'ALL') {
            // UPDATED: Show ONLY Month Name (e.g., "ENE", "FEB")
            key = d.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase().replace('.', '');
            sortTime = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
        } else {
            key = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
            sortTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        }

        if (!groups.has(key)) {
            groups.set(key, { 
                label: key, 
                ingresos: 0, 
                egresos: 0, 
                flujoNeto: 0, 
                saldoAcumulado: runningBalance,
                timestamp: sortTime 
            });
        }

        const entry = groups.get(key)!;
        if (tx.amount_bigint > 0) entry.ingresos += tx.amount_bigint;
        else entry.egresos += Math.abs(tx.amount_bigint);
        
        entry.flujoNeto = entry.ingresos - entry.egresos;
        runningBalance = tx.balance_after;
        entry.saldoAcumulado = runningBalance;
    });

    return Array.from(groups.values()).sort((a, b) => a.timestamp - b.timestamp);
};

const calculateSummary = (txs: LedgerTransaction[], days: number) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    const filtered = txs.filter(t => new Date(t.created_at) >= cutoff);
    const ingresos = filtered.reduce((acc, t) => acc + (t.amount_bigint > 0 ? t.amount_bigint : 0), 0);
    const egresos = filtered.reduce((acc, t) => acc + (t.amount_bigint < 0 ? Math.abs(t.amount_bigint) : 0), 0);
    
    return { ingresos, egresos, net: ingresos - egresos };
};

export default function LedgerView() {
  const { user } = useAuthStore();
  const [txs, setTxs] = useState<LedgerTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [activeTimeframe, setActiveTimeframe] = useState<Timeframe>('ALL');

  if (!user || user.role !== UserRole.SuperAdmin) {
      return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  useEffect(() => {
    async function fetchLedger() {
      const { data } = await supabase
        .from('ledger_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000); 
      
      if (data) setTxs(data as unknown as LedgerTransaction[]);
      setLoading(false);
    }
    fetchLedger();
  }, []);

  const chartData = useMemo(() => processDataByTimeframe(txs, activeTimeframe), [txs, activeTimeframe]);
  const statsWeek = useMemo(() => calculateSummary(txs, 7), [txs]);
  const statsMonth = useMemo(() => calculateSummary(txs, 30), [txs]);
  const statsAll = useMemo(() => calculateSummary(txs, 3650), [txs]);

  // Chart Scales
  const { maxFlow, minBalance, maxBalance } = useMemo(() => {
    if (chartData.length === 0) return { maxFlow: 100000, minBalance: 0, maxBalance: 100000 };
    const flows = chartData.map(d => Math.max(d.ingresos, d.egresos));
    const balances = chartData.map(d => d.saldoAcumulado);
    return {
        maxFlow: Math.max(...flows, 100000) * 1.1,
        maxBalance: Math.max(...balances, 100000) * 1.1,
        minBalance: Math.min(...balances, 0) * 1.1
    };
  }, [chartData]);

  const H = 350; 
  const W = 1200; 
  const P = 60; 
  const barW = chartData.length > 20 ? 15 : 30;
  
  const getLineY = (val: number) => {
      const range = maxBalance - minBalance;
      const normalized = (val - minBalance) / (range || 1);
      return H - P - (normalized * (H - 2 * P));
  };
  
  const getBarH = (val: number) => (val / maxFlow) * (H / 2 - P);
  const getX = (i: number) => {
      const availW = W - 2 * P;
      const step = chartData.length > 1 ? availW / (chartData.length - 1) : availW / 2;
      return P + i * step;
  };

  const linePath = chartData.map((d, i) => 
    `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getLineY(d.saldoAcumulado)}`
  ).join(' ');

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
  };

  return (
    <div className="p-4 md:p-12 space-y-12 md:space-y-16 relative animate-in fade-in duration-700 pb-32">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-[#02040a] to-[#02040a] z-0"></div>

      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-cyber-emerald/30 relative pb-8 z-10 gap-6">
        <div className="absolute bottom-0 left-0 w-1/3 h-[2px] bg-cyber-emerald shadow-[0_0_20px_#10b981] animate-[pulse_3s_infinite]"></div>
        <div className="relative">
            <h2 className="text-4xl md:text-5xl font-display font-black italic tracking-tighter uppercase mb-2 flex items-center gap-4">
                <AnimatedIconUltra profile={{ animation: 'spin3d', theme: 'cyber', speed: 4 }}>
                    <i className="fas fa-book-journal-whills text-cyber-emerald drop-shadow-[0_0_10px_#10b981]"></i>
                </AnimatedIconUltra>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-green-300 to-cyan-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.6)]">
                    LIBRO MAYOR
                </span>
            </h2>
            <p className="text-emerald-400/80 text-xs font-mono uppercase tracking-[0.4em] font-bold pl-1 flex items-center gap-3 drop-shadow-sm">
                <span className="w-2 h-2 bg-cyber-emerald rounded-full animate-ping shadow-[0_0_10px_#10b981]"></span> Ledger Cuántico Inmutable
            </p>
        </div>
        
        <div className="text-right w-full md:w-auto bg-[#050a14]/80 backdrop-blur-md p-4 md:p-6 rounded-2xl border-2 border-cyber-emerald shadow-[0_0_40px_rgba(16,185,129,0.2)] group hover:scale-105 transition-transform duration-500 cursor-default">
            <div className="text-[10px] font-mono text-emerald-400 uppercase font-bold tracking-widest mb-1 group-hover:text-emerald-200 transition-colors flex items-center justify-between md:justify-end gap-2 drop-shadow-sm">
                <span><i className="fas fa-wallet"></i> Bóveda Central</span>
            </div>
            <div className="text-2xl md:text-3xl font-mono font-black text-emerald-300 drop-shadow-[0_0_15px_rgba(52,211,153,0.8)] group-hover:text-emerald-100 transition-colors text-right">
                {chartData.length > 0 ? formatCurrency(chartData[chartData.length - 1].saldoAcumulado) : 'CRC 0'}
            </div>
        </div>
      </header>

      {/* --- COMPARATIVE TIME DECK --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 relative z-10">
          {[
              { id: 'WEEK', label: 'Esta Semana', stats: statsWeek, icon: 'fa-calendar-week', color: 'text-cyber-neon', border: 'border-cyber-neon', bg: 'bg-cyan-950/30', glow: 'drop-shadow-[0_0_8px_cyan]' },
              { id: 'MONTH', label: 'Este Mes', stats: statsMonth, icon: 'fa-calendar-alt', color: 'text-cyber-purple', border: 'border-cyber-purple', bg: 'bg-purple-950/30', glow: 'drop-shadow-[0_0_8px_purple]' },
              { id: 'ALL', label: 'Histórico Global', stats: statsAll, icon: 'fa-globe', color: 'text-cyber-emerald', border: 'border-cyber-emerald', bg: 'bg-emerald-950/30', glow: 'drop-shadow-[0_0_8px_lime]' }
          ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTimeframe(item.id as Timeframe)}
                className={`
                    relative group overflow-hidden rounded-[1.5rem] md:rounded-[2rem] border-2 p-4 md:p-6 text-left transition-all duration-500
                    ${activeTimeframe === item.id ? `${item.border} ${item.bg} shadow-[0_0_50px_rgba(0,0,0,0.5)] md:scale-105 z-20` : 'border-white/10 bg-[#050a14] hover:border-white/30 hover:bg-white/5'}
                `}
              >
                  {activeTimeframe === item.id && (
                      <div className={`absolute -inset-1 ${item.border.replace('border-','bg-')} opacity-20 blur-xl animate-pulse`}></div>
                  )}
                  
                  <div className="relative z-10">
                      <div className="flex justify-between items-start mb-4">
                          <div className={`text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] ${item.color} ${item.glow} flex items-center gap-2`}>
                              <i className={`fas ${item.icon}`}></i> {item.label}
                          </div>
                          {activeTimeframe === item.id && <div className={`w-2 h-2 rounded-full ${item.color.replace('text-','bg-')} shadow-[0_0_10px_currentColor]`}></div>}
                      </div>
                      
                      <div className="space-y-1">
                          <div className="flex justify-between items-end">
                              <span className="text-[8px] md:text-[9px] text-emerald-600/70 uppercase font-bold tracking-widest">Neto</span>
                              <span className={`text-lg md:text-xl font-mono font-black ${item.stats.net >= 0 ? 'text-emerald-100 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'text-red-500 drop-shadow-[0_0_10px_red]'}`}>
                                  {item.stats.net >= 0 ? '+' : ''}{formatCurrency(item.stats.net)}
                              </span>
                          </div>
                          <div className="h-px bg-emerald-500/20 w-full my-2"></div>
                          <div className="flex justify-between text-[8px] md:text-[9px] font-mono">
                              <span className="text-emerald-600/80 font-bold">IN: <span className="text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]">{formatCurrency(item.stats.ingresos)}</span></span>
                              <span className="text-red-900/80 font-bold">OUT: <span className="text-red-400 drop-shadow-[0_0_5px_rgba(248,113,113,0.5)]">{formatCurrency(item.stats.egresos)}</span></span>
                          </div>
                      </div>
                  </div>
              </button>
          ))}
      </div>

      {/* --- THE QUANTUM CHART --- */}
      <div className="relative group h-[400px] md:h-[500px] z-10">
        <div className="absolute -inset-1 bg-gradient-to-br from-cyber-emerald via-green-800 to-cyan-900 rounded-[3rem] opacity-30 blur-3xl animate-[pulse_4s_ease-in-out_infinite] transition-all duration-1000 group-hover:opacity-50 group-hover:blur-[60px]"></div>
        
        <div className="relative bg-[#050a14] border-2 border-cyber-emerald rounded-[2rem] md:rounded-[2.5rem] p-4 md:p-8 shadow-2xl overflow-hidden z-10 h-full flex flex-col backdrop-blur-2xl">
            
            <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[length:40px_40px] pointer-events-none"></div>
            <div className="absolute top-0 left-0 w-full h-[2px] bg-cyber-emerald shadow-[0_0_20px_#10b981] animate-[scanline_6s_linear_infinite] opacity-50"></div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 relative z-10 gap-4">
                <h3 className="text-lg md:text-xl font-display font-bold text-white uppercase tracking-wider flex items-center gap-3 drop-shadow-md">
                    <i className="fas fa-chart-area text-cyber-emerald drop-shadow-[0_0_8px_#10b981]"></i> 
                    Flujo <span className="text-cyber-emerald text-glow-green">Cuántico</span>
                </h3>
                
                <div className="flex gap-4 text-[8px] md:text-[10px] font-mono font-bold bg-black/40 p-2 rounded-xl border border-emerald-500/20 overflow-x-auto w-full md:w-auto text-emerald-400">
                    <div className="flex items-center gap-2 px-2 whitespace-nowrap">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_5px_cyan]"></span> <span className="drop-shadow-[0_0_5px_rgba(0,240,255,0.5)]">Saldo</span>
                    </div>
                    <div className="flex items-center gap-2 px-2 border-l border-emerald-500/20 whitespace-nowrap">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_lime]"></span> <span className="drop-shadow-[0_0_5px_lime]">Ingreso</span>
                    </div>
                    <div className="flex items-center gap-2 px-2 border-l border-emerald-500/20 whitespace-nowrap">
                        <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_red]"></span> <span className="drop-shadow-[0_0_5px_red]">Egreso</span>
                    </div>
                </div>
            </div>

            <div className="relative w-full flex-1 select-none z-10">
                {/* TOOLTIP */}
                {hoverIndex !== null && chartData[hoverIndex] && (
                    <div 
                        className="absolute z-50 bg-[#020202]/95 border border-cyber-emerald p-3 md:p-4 rounded-xl shadow-[0_0_40px_rgba(16,185,129,0.4)] pointer-events-none text-xs font-mono min-w-[180px] md:min-w-[200px] animate-in fade-in zoom-in-95 duration-100"
                        style={{ 
                            left: '50%', 
                            top: '10px',
                            transform: 'translateX(-50%)'
                        }}
                    >
                        <div className="font-black text-emerald-300 mb-3 border-b border-cyber-emerald/30 pb-2 text-center uppercase tracking-[0.2em] drop-shadow-[0_0_5px_rgba(16,185,129,0.8)]">
                            {chartData[hoverIndex].label}
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-emerald-500 font-bold">IN</span>
                                <span className="font-bold text-white drop-shadow-[0_0_5px_white]">{formatCurrency(chartData[hoverIndex].ingresos)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-red-500 font-bold">OUT</span>
                                <span className="font-bold text-white drop-shadow-[0_0_5px_white]">{formatCurrency(chartData[hoverIndex].egresos)}</span>
                            </div>
                            <div className="h-px bg-emerald-500/30 my-1"></div>
                            <div className="flex justify-between text-sm">
                                <span className="text-cyan-400 font-bold uppercase tracking-widest text-[10px]">Saldo</span>
                                <span className="font-black text-cyan-400 drop-shadow-[0_0_10px_cyan]">{formatCurrency(chartData[hoverIndex].saldoAcumulado)}</span>
                            </div>
                        </div>
                    </div>
                )}

                <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
                    <defs>
                        <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.1" />
                        </linearGradient>
                        <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.1" />
                        </linearGradient>
                        <filter id="neonBlur" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>

                    {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
                        <line key={tick} x1={P} x2={W-P} y1={P + tick * (H - 2*P)} y2={P + tick * (H - 2*P)} stroke="#064e3b" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
                    ))}

                    {chartData.map((d, i) => {
                        const x = getX(i);
                        const isHovered = hoverIndex === i;
                        const barH_In = getBarH(d.ingresos);
                        const barH_Out = getBarH(d.egresos);
                        
                        return (
                            <g key={`group-${i}`} onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)} className="cursor-crosshair transition-all duration-300">
                                <rect x={x - barW} y={0} width={barW * 2} height={H} fill="transparent" />
                                <rect x={x - barW/2} y={H - P - barH_In} width={barW} height={barH_In} fill="url(#gradIncome)" className={`transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-60'}`} />
                                <rect x={x - barW/2 + (barW > 10 ? 4 : 0)} y={H - P - barH_Out} width={barW > 10 ? barW - 8 : barW} height={barH_Out} fill="url(#gradExpense)" className={`transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-60'}`} />
                                
                                {/* Persistent Label - PHOSPHORESCENT */}
                                <text 
                                    x={x} 
                                    y={H - 10} 
                                    textAnchor="middle" 
                                    className={`font-mono uppercase transition-all duration-300 ${isHovered ? 'fill-emerald-300 font-bold text-[10px]' : 'fill-emerald-600/70 font-medium text-[8px]'}`}
                                    style={{ letterSpacing: '0.05em', filter: isHovered ? 'drop-shadow(0 0 5px #34d399)' : 'none' }}
                                >
                                    {d.label}
                                </text>
                            </g>
                        );
                    })}

                    <path d={linePath} fill="none" stroke="#00f0ff" strokeWidth="3" filter="url(#neonBlur)" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_10px_cyan]" />
                    
                    {chartData.map((d, i) => (
                        <circle key={`dot-${i}`} cx={getX(i)} cy={getLineY(d.saldoAcumulado)} r={hoverIndex === i ? 6 : 0} fill="#000" stroke="#00f0ff" strokeWidth="2" className="transition-all duration-200" />
                    ))}
                </svg>
            </div>
        </div>
      </div>

      {/* --- IMMUTABLE LOG TABLE & MOBILE CARDS --- */}
      <div className="relative group min-h-[400px]">
        <div className="absolute -inset-1 bg-cyber-blue rounded-2xl opacity-10 blur-xl animate-pulse group-hover:opacity-30 transition-all duration-1000"></div>
        <div className="relative bg-[#050a14] border-2 border-cyber-blue shadow-neon-blue rounded-2xl overflow-hidden backdrop-blur-xl z-10">
            
            {/* 1. DESKTOP VIEW: FULL TABLE */}
            <div className="hidden md:block overflow-x-auto max-h-[600px] custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#02040a] z-20 shadow-xl">
                    <tr className="border-b-2 border-cyber-blue/40 text-[10px] font-display uppercase tracking-[0.2em] text-cyber-blue drop-shadow-[0_0_5px_#2463eb]">
                        <th className="p-6">ID Transacción</th>
                        <th className="p-6">Fecha & Hora</th>
                        <th className="p-6 text-center">Tipo de Evento</th>
                        <th className="p-6">Referencia</th>
                        <th className="p-6 text-right">Monto</th>
                        <th className="p-6 text-right">Saldo Resultante</th>
                    </tr>
                    </thead>
                    <tbody className="font-mono text-xs">
                    {loading ? (
                            <tr><td colSpan={6} className="p-20 text-center text-cyber-neon animate-pulse tracking-widest text-shadow-blue">SINCRONIZANDO BLOCKCHAIN...</td></tr>
                    ) : (
                        txs.map(tx => (
                        <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group/row relative">
                            <td className="absolute left-0 top-0 bottom-0 w-1 bg-cyber-neon opacity-0 group-hover/row:opacity-100 transition-opacity"></td>
                            <td className="p-6">
                                <div 
                                    onClick={() => copyToClipboard(tx.id)}
                                    className="relative group/id flex items-center gap-3 cursor-pointer"
                                    title="Copiar Hash de Transacción"
                                >
                                    <div className="w-10 h-8 bg-black/50 border border-cyber-blue/30 rounded flex items-center justify-center relative overflow-hidden group-hover/id:border-cyber-neon transition-colors shadow-[0_0_10px_rgba(0,240,255,0.1)]">
                                        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(0,240,255,0.05)_2px,rgba(0,240,255,0.05)_4px)]"></div>
                                        <i className="fas fa-fingerprint text-cyber-blue group-hover/id:text-cyber-neon transition-colors"></i>
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-xs text-cyber-neon tracking-widest drop-shadow-[0_0_5px_cyan]">
                                                {tx.id ? tx.id.substring(0, 8) : 'UNK'}
                                            </span>
                                            <i className="fas fa-copy text-[10px] text-cyber-blue/50 opacity-0 group-hover/id:opacity-100 transition-opacity"></i>
                                        </div>
                                        <span className="text-[9px] font-mono text-cyber-blue/60 tracking-widest uppercase">
                                            SHA • {tx.id ? tx.id.slice(-6) : '----'}
                                        </span>
                                    </div>
                                </div>
                            </td>
                            <td className="p-6">
                                <div className="font-bold text-emerald-200 drop-shadow-[0_0_2px_rgba(16,185,129,0.5)]">{formatDate(tx.created_at).split(',')[0]}</div>
                                <div className="text-[9px] text-emerald-600/70">{formatDate(tx.created_at).split(',')[1]}</div>
                            </td>
                            <td className="p-6 text-center">
                                <span className={`inline-block px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border-2 shadow-[0_0_15px_rgba(0,0,0,0)] transition-all ${
                                    tx.type === 'CREDIT' ? 'border-cyber-success text-cyber-success bg-green-900/10 shadow-[0_0_15px_rgba(10,255,96,0.2)]' : 
                                    tx.type === 'DEBIT' ? 'border-cyber-danger text-cyber-danger bg-red-900/10 shadow-[0_0_15px_rgba(255,0,60,0.2)]' : 
                                    'border-cyber-neon text-cyber-neon bg-cyan-900/10 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                                }`}>
                                    {tx.type}
                                </span>
                            </td>
                            <td className="p-6">
                                <span className="font-mono text-cyan-300 drop-shadow-[0_0_5px_cyan] group-hover/row:text-white transition-colors">{tx.reference_id || '-'}</span>
                            </td>
                            <td className={`p-6 text-right font-bold text-sm ${
                                tx.amount_bigint > 0 ? 'text-cyber-success drop-shadow-[0_0_8px_rgba(10,255,96,0.8)]' : 'text-cyber-danger drop-shadow-[0_0_8px_rgba(255,0,60,0.8)]'
                            }`}>
                                {formatCurrency(tx.amount_bigint)}
                            </td>
                            <td className="p-6 text-right">
                                <span className="text-cyan-600 font-bold group-hover/row:text-cyan-200 transition-colors">{formatCurrency(tx.balance_after)}</span>
                            </td>
                        </tr>
                        ))
                    )}
                    </tbody>
                </table>
            </div>

            {/* 2. MOBILE VIEW: TACTICAL CARDS (Small Screens) */}
            <div className="md:hidden p-4 space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
                {loading ? (
                    <div className="text-center text-cyber-blue animate-pulse tracking-widest py-8">SINCRONIZANDO BLOCKCHAIN...</div>
                ) : (
                    txs.map(tx => (
                        <div key={tx.id} className="bg-[#080c14] border border-white/10 rounded-xl p-4 relative overflow-hidden group">
                            {/* Card Glow Border Left */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${tx.amount_bigint > 0 ? 'bg-cyber-success' : 'bg-cyber-danger'}`}></div>
                            
                            <div className="flex justify-between items-start mb-3 pl-2">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-mono text-emerald-600/70 uppercase tracking-wider">{formatDate(tx.created_at).split(',')[0]}</span>
                                    <span className="text-xs font-bold text-emerald-200 drop-shadow-[0_0_3px_rgba(16,185,129,0.3)]">{formatDate(tx.created_at).split(',')[1]}</span>
                                </div>
                                <div className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-wider border ${
                                    tx.type === 'CREDIT' ? 'border-cyber-success text-cyber-success bg-green-900/20' : 
                                    'border-cyber-danger text-cyber-danger bg-red-900/20'
                                }`}>
                                    {tx.type}
                                </div>
                            </div>

                            <div className="bg-black/40 rounded-lg p-2 mb-3 border border-white/5 flex items-center justify-between pl-3">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <i className="fas fa-fingerprint text-cyber-blue text-xs"></i>
                                    <span className="font-mono text-[10px] text-cyber-neon truncate drop-shadow-[0_0_5px_cyan]">{tx.id}</span>
                                </div>
                                <button onClick={() => copyToClipboard(tx.id)} className="text-slate-500 hover:text-white p-2">
                                    <i className="fas fa-copy text-xs"></i>
                                </button>
                            </div>

                            <div className="flex justify-between items-end pl-2">
                                <div>
                                    <div className="text-[8px] text-cyan-700 uppercase tracking-widest font-bold">Saldo Resultante</div>
                                    <div className="text-xs font-mono text-cyan-500">{formatCurrency(tx.balance_after)}</div>
                                </div>
                                <div className={`text-lg font-mono font-black ${
                                    tx.amount_bigint > 0 ? 'text-cyber-success drop-shadow-[0_0_5px_rgba(10,255,96,0.8)]' : 'text-cyber-danger drop-shadow-[0_0_5px_rgba(255,0,60,0.8)]'
                                }`}>
                                    {tx.amount_bigint > 0 ? '+' : ''}{formatCurrency(tx.amount_bigint)}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer */}
            <div className="bg-[#02040a] p-3 border-t border-white/5 flex justify-between items-center text-[8px] md:text-[9px] font-mono text-emerald-800 uppercase tracking-widest sticky bottom-0 z-20">
                <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold">SHA-256:</span>
                    <span className="text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]">VERIFICADO</span>
                </div>
                <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_lime]"></div> <span className="hidden md:inline text-emerald-500 font-bold">Ledger Sincronizado</span><span className="md:hidden text-emerald-500">Sync</span></div>
            </div>
        </div>
      </div>
    </div>
  );
}
