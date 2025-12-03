
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { LedgerTransaction, UserRole } from '../types';
import { formatCurrency, formatDate, ROUTES } from '../constants';
import { useAuthStore } from '../store/useAuthStore';
import { Navigate } from 'react-router-dom';

// --- DATA PROCESSOR ---
const processLedgerData = (txs: LedgerTransaction[]) => {
    // 1. Sort by Date Ascending
    const sorted = [...txs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    // 2. Aggregate by Month-Year to show full historical trend
    const periodMap = new Map<string, { ingresos: number, egresos: number, balance: number, order: number }>();
    
    // Seed with initial balance from first tx or 0
    let runningBalance = sorted.length > 0 ? sorted[0].balance_before : 0;

    sorted.forEach(tx => {
        const d = new Date(tx.created_at);
        // Key: "Jan 24"
        const dateKey = d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
        const sortKey = d.getFullYear() * 100 + d.getMonth(); // 202401
        
        if (!periodMap.has(dateKey)) {
            periodMap.set(dateKey, { ingresos: 0, egresos: 0, balance: runningBalance, order: sortKey });
        }
        
        const entry = periodMap.get(dateKey)!;
        if (tx.amount_bigint > 0) entry.ingresos += tx.amount_bigint;
        else entry.egresos += Math.abs(tx.amount_bigint);
        
        runningBalance = tx.balance_after;
        entry.balance = runningBalance; // End of period balance
    });

    // Convert Map to Array & Sort by Time
    const chartData = Array.from(periodMap.entries())
        .map(([key, val]) => ({
            mes: key,
            order: val.order,
            ingresos: val.ingresos,
            egresos: val.egresos,
            flujoNeto: val.ingresos - val.egresos,
            saldoAcumulado: val.balance
        }))
        .sort((a, b) => a.order - b.order);

    return chartData; // Return full history (scrollable/scaled if needed)
};

export default function LedgerView() {
  const { user } = useAuthStore();
  const [txs, setTxs] = useState<LedgerTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // --- ACCESS CONTROL GUARD ---
  if (!user || user.role !== UserRole.SuperAdmin) {
      return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  useEffect(() => {
    async function fetchLedger() {
      // Fetch extensive history for chart
      const { data, error } = await supabase
        .from('ledger_transactions')
        .select('*')
        .order('created_at', { ascending: false }) // Get recent first from DB
        .limit(500); // Increased limit for year history
      
      if (data) setTxs(data as unknown as LedgerTransaction[]);
      setLoading(false);
    }
    fetchLedger();
  }, []);

  const chartData = useMemo(() => processLedgerData(txs), [txs]);

  // --- CHART CALCULATIONS ---
  const { maxFlow, minFlow, maxBalance, minBalance } = useMemo(() => {
    if (chartData.length === 0) return { maxFlow: 100000, minFlow: 0, maxBalance: 100000, minBalance: 0 };
    const flows = chartData.map(d => Math.abs(d.flujoNeto));
    const balances = chartData.map(d => d.saldoAcumulado);
    return {
        maxFlow: Math.max(...flows, 100000) * 1.2, 
        minFlow: 0,
        maxBalance: Math.max(...balances, 100000) * 1.1,
        minBalance: Math.min(...balances, 0) * 0.9
    };
  }, [chartData]);

  // SVG Chart Config
  const H = 300; 
  const W = 1000; 
  const P = 40; 
  const barWidth = 30;
  const zeroLineY = H / 2; 

  const getBarHeight = (val: number) => (Math.abs(val) / maxFlow) * (H / 2 - P);
  const getBarY = (val: number) => val >= 0 ? zeroLineY - getBarHeight(val) : zeroLineY;
  
  const getLineY = (val: number) => {
    const range = maxBalance - minBalance;
    const normalized = (val - minBalance) / (range || 1); 
    return H - P - (normalized * (H - 2 * P));
  };

  const getX = (index: number) => {
      const availableWidth = W - 2 * P;
      const count = chartData.length;
      const step = count > 1 ? availableWidth / (count - 1) : availableWidth / 2;
      return P + index * step;
  };

  const linePath = chartData.map((d, i) => 
    `${i === 0 ? 'M' : 'L'} ${getX(i) + (chartData.length > 1 ? 0 : barWidth/2)} ${getLineY(d.saldoAcumulado)}`
  ).join(' ');


  return (
    <div className="p-8 space-y-12 relative animate-in fade-in duration-500">
      
      {/* Header - LIVING PHOSPHORESCENT */}
      <header className="flex flex-col md:flex-row justify-between items-end border-b-2 border-cyber-emerald relative pb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
        <div className="absolute bottom-0 left-0 w-1/3 h-0.5 bg-cyber-emerald shadow-[0_0_20px_#10b981] animate-[pulse_3s_infinite]"></div>
        <div>
            <h2 className="text-4xl font-display font-black text-white italic tracking-tighter uppercase mb-2 drop-shadow-lg flex items-center gap-3">
                <i className="fas fa-book-journal-whills text-cyber-emerald animate-pulse drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]"></i>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-green-300 to-cyan-500 text-glow-green" style={{ textShadow: '0 0 30px rgba(16,185,129,0.6)' }}>LIBRO FINANCIERO</span>
            </h2>
            <p className="text-cyber-emerald/80 text-xs font-mono uppercase tracking-[0.3em] font-bold pl-1 flex items-center gap-2">
                <span className="w-2 h-2 bg-cyber-emerald rounded-full animate-ping"></span> Cadena de Transacciones Inmutable
            </p>
        </div>
        <div className="text-right hidden md:block bg-[#050a14] p-4 rounded-xl border-2 border-cyber-emerald shadow-[0_0_20px_rgba(16,185,129,0.3)] group hover:scale-105 transition-transform cursor-default">
            <div className="text-[9px] font-mono text-cyber-emerald uppercase font-bold tracking-widest mb-1 group-hover:text-white transition-colors">Balance del Núcleo</div>
            <div className="text-2xl font-mono font-bold text-white text-glow-green group-hover:text-cyber-emerald transition-colors">
                {chartData.length > 0 ? formatCurrency(chartData[chartData.length - 1].saldoAcumulado) : 'CRC 0'}
            </div>
        </div>
      </header>

      {/* --- EXECUTIVE CASH FLOW CHART --- */}
      <div className="relative group h-[400px] md:h-[500px]">
        {/* Volumetric Glow Container */}
        <div className="absolute -inset-1 bg-gradient-to-br from-cyber-emerald via-green-600 to-cyan-700 rounded-[2.5rem] opacity-30 blur-2xl animate-pulse transition-all duration-1000 group-hover:opacity-50 group-hover:blur-3xl"></div>
        
        <div className="relative bg-[#050a14] border-2 border-cyber-emerald rounded-3xl p-8 shadow-[0_0_60px_rgba(16,185,129,0.2)] overflow-hidden z-10 h-full flex flex-col backdrop-blur-xl">
            {/* Background Grid Texture */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.05)_1px,transparent_1px)] bg-[length:40px_40px] pointer-events-none"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#050a14_90%)] pointer-events-none"></div>

            <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-4 relative z-10 flex-shrink-0">
                <div>
                    <h3 className="text-lg font-display font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <i className="fas fa-chart-line text-cyber-emerald drop-shadow-[0_0_10px_currentColor]"></i> Análisis de Liquidez <span className="text-xs text-slate-500 font-mono bg-white/5 px-2 rounded border border-white/10">2024-LIVE</span>
                    </h3>
                    <p className="text-[10px] font-mono text-slate-400 mt-1">
                        <span className="text-cyber-success font-bold drop-shadow-[0_0_5px_lime]">■ Flujo Neto</span> vs <span className="text-cyan-400 font-bold drop-shadow-[0_0_5px_cyan]">● Saldo Acumulado</span>
                    </p>
                </div>
                <div className="flex gap-4 text-[10px] font-mono">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-cyber-emerald/50 bg-cyber-emerald/10 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                        <div className="w-2 h-2 bg-cyber-emerald rounded-full shadow-[0_0_10px_lime] animate-pulse"></div>
                        <span className="text-cyber-emerald font-bold">Superávit</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-red-500/50 bg-red-900/20 shadow-[0_0_10px_rgba(255,0,60,0.2)]">
                        <div className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_10px_red] animate-pulse"></div>
                        <span className="text-red-500 font-bold">Déficit</span>
                    </div>
                </div>
            </div>

            <div className="relative w-full flex-1 select-none z-10">
                {hoverIndex !== null && chartData[hoverIndex] && (
                    <div 
                        className="absolute z-30 bg-[#0a0a0f] border-2 border-cyber-emerald p-4 rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.4)] pointer-events-none text-xs font-mono min-w-[220px] animate-in fade-in zoom-in-95 duration-200 backdrop-blur-md"
                        style={{ 
                            left: '50%', 
                            top: '0px',
                            transform: 'translateX(-50%)'
                        }}
                    >
                        <div className="font-bold text-white mb-2 border-b border-cyber-emerald/30 pb-2 text-center uppercase tracking-[0.2em]">{chartData[hoverIndex].mes}</div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            <span className="text-slate-400 uppercase text-[9px]">Ingresos</span>
                            <span className="text-right text-cyber-success font-bold drop-shadow-[0_0_5px_lime]">{formatCurrency(chartData[hoverIndex].ingresos)}</span>
                            
                            <span className="text-slate-400 uppercase text-[9px]">Egresos</span>
                            <span className="text-right text-cyber-danger font-bold drop-shadow-[0_0_5px_red]">{formatCurrency(chartData[hoverIndex].egresos)}</span>
                            
                            <div className="col-span-2 h-px bg-white/10 my-1"></div>

                            <span className="text-white font-black uppercase text-[9px]">Neto</span>
                            <span className={`text-right font-black text-sm ${chartData[hoverIndex].flujoNeto >= 0 ? 'text-cyber-success drop-shadow-[0_0_10px_lime]' : 'text-cyber-danger drop-shadow-[0_0_10px_red]'}`}>
                                {formatCurrency(chartData[hoverIndex].flujoNeto)}
                            </span>
                            
                            <span className="text-cyan-400 font-bold uppercase text-[9px]">Acumulado</span>
                            <span className="text-right text-cyan-400 font-bold drop-shadow-[0_0_10px_cyan]">{formatCurrency(chartData[hoverIndex].saldoAcumulado)}</span>
                        </div>
                    </div>
                )}

                <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
                    <defs>
                        {/* Neon Gradients */}
                        <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0aff60" stopOpacity="1" />
                            <stop offset="100%" stopColor="#059669" stopOpacity="0.4" />
                        </linearGradient>
                        <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ff003c" stopOpacity="1" />
                            <stop offset="100%" stopColor="#991b1b" stopOpacity="0.4" />
                        </linearGradient>
                        
                        {/* Glow Filters */}
                        <filter id="glowBarGreen" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                            <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.04  0 0 0 0 1  0 0 0 0 0.38  0 0 0 1 0" result="coloredBlur"/>
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                        <filter id="glowBarRed" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                            <feColorMatrix in="blur" type="matrix" values="0 0 0 0 1  0 0 0 0 0  0 0 0 0 0.24  0 0 0 1 0" result="coloredBlur"/>
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                        <filter id="glowLine" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                            <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0  0 0 0 0 0.94  0 0 0 0 1  0 0 0 1 0" result="coloredBlur"/>
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
                        <line key={tick} x1={P} x2={W-P} y1={P + tick * (H - 2*P)} y2={P + tick * (H - 2*P)} stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
                    ))}
                    <line x1={P} x2={W-P} y1={zeroLineY} y2={zeroLineY} stroke="#94a3b8" strokeWidth="1" opacity="0.3" />

                    {chartData.map((d, i) => {
                        const x = getX(i);
                        const height = getBarHeight(d.flujoNeto);
                        const y = getBarY(d.flujoNeto);
                        const isNegative = d.flujoNeto < 0;
                        const isHovered = hoverIndex === i;
                        
                        return (
                            <g key={`bar-${i}`} onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)}>
                                <rect 
                                    x={x - barWidth / 2} 
                                    y={y} 
                                    width={barWidth} 
                                    height={Math.max(height, 2)} 
                                    fill={isNegative ? 'url(#gradExpense)' : 'url(#gradIncome)'} 
                                    filter={isNegative ? 'url(#glowBarRed)' : 'url(#glowBarGreen)'}
                                    opacity={isHovered ? 1 : 0.8}
                                    className="transition-all duration-300 cursor-crosshair" 
                                />
                                <text 
                                    x={x} 
                                    y={H - 5} 
                                    textAnchor="middle" 
                                    className={`text-[10px] font-mono fill-slate-500 transition-all ${isHovered ? 'fill-white font-bold tracking-widest' : ''}`}
                                    style={{ textShadow: isHovered ? '0 0 10px white' : 'none' }}
                                >
                                    {d.mes}
                                </text>
                            </g>
                        );
                    })}

                    <path d={linePath} fill="none" stroke="#00f0ff" strokeWidth="3" filter="url(#glowLine)" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_15px_rgba(0,240,255,0.8)]" />

                    {chartData.map((d, i) => (
                        <circle key={`dot-${i}`} cx={getX(i)} cy={getLineY(d.saldoAcumulado)} r={hoverIndex === i ? 6 : 3} fill="#0f172a" stroke="#00f0ff" strokeWidth="2" className={`transition-all duration-200 pointer-events-none ${hoverIndex === i ? 'drop-shadow-[0_0_10px_cyan] scale-150' : ''}`} />
                    ))}
                </svg>
                
                <div className="absolute left-0 top-0 bottom-8 w-10 flex flex-col justify-between text-[8px] font-mono text-slate-500 py-10 pointer-events-none select-none text-right pr-2 border-r border-white/10 bg-[#050a14]/80">
                    <span className="text-cyber-success font-bold">+{formatCurrency(maxFlow/100).replace('CRC','')}</span>
                    <span className="text-white">0</span>
                    <span className="text-red-500 font-bold">-{formatCurrency(maxFlow/100).replace('CRC','')}</span>
                </div>
                <div className="absolute right-0 top-0 bottom-8 w-10 flex flex-col justify-between text-[8px] font-mono text-cyan-500 py-4 text-left pl-2 border-l border-white/10 bg-[#050a14]/80">
                    <span className="font-bold">{formatCurrency(maxBalance/100).replace('CRC','')}</span>
                    <span className="font-bold">{formatCurrency(minBalance/100).replace('CRC','')}</span>
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { label: 'Balance en Bóveda', val: chartData.length > 0 ? formatCurrency(chartData[chartData.length-1].saldoAcumulado) : 'CRC 0', icon: 'fa-globe', color: 'text-cyber-neon', border: 'border-cyber-neon', glow: 'shadow-neon-cyan' },
          { label: 'Ingresos Históricos', val: formatCurrency(chartData.reduce((acc, d) => acc + d.ingresos, 0)), icon: 'fa-arrow-up', color: 'text-cyber-success', border: 'border-cyber-success', glow: 'shadow-neon-green' },
          { label: 'Egresos Históricos', val: formatCurrency(chartData.reduce((acc, d) => acc + d.egresos, 0)), icon: 'fa-arrow-down', color: 'text-cyber-danger', border: 'border-cyber-danger', glow: 'shadow-neon-red' },
        ].map((card, idx) => (
            <div key={idx} className={`relative group bg-[#050a14] border-2 ${card.border} p-6 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.5)] hover:${card.glow} transition-all duration-500 hover:-translate-y-1 overflow-hidden`}>
                <div className={`absolute -inset-0.5 ${card.border.replace('border-', 'bg-')} rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500`}></div>
                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <div className="text-[10px] font-mono text-slate-400 uppercase tracking-[0.2em] mb-2 font-bold group-hover:text-white transition-colors">{card.label}</div>
                        <div className={`text-2xl font-mono font-bold text-white group-hover:${card.color} transition-colors group-hover:text-glow`}>{card.val}</div>
                    </div>
                    <div className={`w-12 h-12 rounded-xl bg-black flex items-center justify-center ${card.color} border-2 ${card.border} shadow-inner group-hover:scale-110 transition-transform duration-300 group-hover:rotate-6`}>
                        <i className={`fas ${card.icon} text-lg drop-shadow-[0_0_5px_currentColor]`}></i>
                    </div>
                </div>
            </div>
        ))}
      </div>

      <div className="relative group min-h-[400px]">
        <div className="absolute -inset-1 bg-cyber-blue rounded-2xl opacity-10 blur-xl animate-pulse group-hover:opacity-30 transition-all duration-1000"></div>
        <div className="relative bg-[#050a14] border-2 border-cyber-blue shadow-neon-blue rounded-2xl overflow-hidden backdrop-blur-xl z-10">
            <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
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
                <tbody className="font-mono text-xs text-slate-300">
                {loading ? (
                        <tr><td colSpan={6} className="p-20 text-center text-cyber-blue animate-pulse tracking-widest text-shadow-blue">SINCRONIZANDO BLOCKCHAIN...</td></tr>
                ) : (
                    txs.map(tx => (
                    <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group/row">
                        <td className="p-6 font-bold text-white/50 group-hover/row:text-white transition-colors">
                            {tx.id.substring(0,12)}...
                        </td>
                        <td className="p-6">
                            <div className="font-bold text-white">{formatDate(tx.created_at).split(',')[0]}</div>
                            <div className="text-[9px] text-slate-500">{formatDate(tx.created_at).split(',')[1]}</div>
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
                            <span className="font-mono text-cyber-blue group-hover/row:text-white transition-colors group-hover/row:text-glow-blue">{tx.reference_id || '-'}</span>
                        </td>
                        <td className={`p-6 text-right font-bold text-sm ${
                            tx.amount_bigint > 0 ? 'text-cyber-success drop-shadow-[0_0_8px_rgba(10,255,96,0.8)]' : 'text-cyber-danger drop-shadow-[0_0_8px_rgba(255,0,60,0.8)]'
                        }`}>
                            {formatCurrency(tx.amount_bigint)}
                        </td>
                        <td className="p-6 text-right">
                            <span className="text-slate-400 font-bold group-hover/row:text-white transition-colors">{formatCurrency(tx.balance_after)}</span>
                        </td>
                    </tr>
                    ))
                )}
                </tbody>
            </table>
            </div>
            <div className="bg-[#02040a] p-3 border-t border-white/5 flex justify-between items-center text-[9px] font-mono text-slate-600 uppercase tracking-widest sticky bottom-0 z-20">
                <div>Hash Seguro: SHA-256</div>
                <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_lime]"></div> Ledger Sincronizado</div>
            </div>
        </div>
      </div>
    </div>
  );
}
