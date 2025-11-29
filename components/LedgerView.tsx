
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
      <header className="flex flex-col md:flex-row justify-between items-end border-b-2 border-cyber-emerald relative pb-6 shadow-[0_10px_20px_rgba(16,185,129,0.1)]">
        <div className="absolute bottom-0 left-0 w-1/3 h-0.5 bg-cyber-emerald shadow-[0_0_20px_#10b981] animate-[pulse_3s_infinite]"></div>
        <div>
            <h2 className="text-4xl font-display font-black text-white italic tracking-tighter uppercase mb-2 drop-shadow-lg flex items-center gap-3">
                <i className="fas fa-book-journal-whills text-cyber-emerald animate-pulse drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]"></i>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 text-glow-green">LIBRO</span> FINANCIERO
            </h2>
            <p className="text-cyber-emerald/80 text-xs font-mono uppercase tracking-[0.3em] font-bold pl-1">
                Cadena de Transacciones Inmutable
            </p>
        </div>
        <div className="text-right hidden md:block bg-[#050a14] p-4 rounded-xl border-2 border-cyber-blue shadow-neon-blue">
            <div className="text-[9px] font-mono text-cyber-blue uppercase font-bold tracking-widest mb-1">Balance Actual del Núcleo</div>
            <div className="text-2xl font-mono font-bold text-white text-glow">
                {chartData.length > 0 ? formatCurrency(chartData[chartData.length - 1].saldoAcumulado) : 'CRC 0'}
            </div>
        </div>
      </header>

      {/* --- EXECUTIVE CASH FLOW CHART --- */}
      <div className="relative group h-[400px] md:h-[500px]">
        <div className="absolute -inset-1 bg-cyber-emerald rounded-[2rem] opacity-20 blur-2xl animate-pulse transition-opacity duration-1000 group-hover:opacity-30"></div>
        
        <div className="relative bg-[#050a14] border-2 border-cyber-emerald/50 rounded-3xl p-8 shadow-[0_0_50px_rgba(16,185,129,0.15)] overflow-hidden z-10 h-full flex flex-col">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[length:30px_30px] pointer-events-none"></div>

            <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-4 relative z-10 flex-shrink-0">
                <div>
                    <h3 className="text-lg font-display font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <i className="fas fa-chart-line text-cyber-emerald"></i> Análisis de Liquidez (2024-Presente)
                    </h3>
                    <p className="text-[10px] font-mono text-slate-400 mt-1">
                        <span className="text-cyber-success font-bold">■ Flujo Neto</span> vs <span className="text-blue-400 font-bold">● Saldo Acumulado</span>
                    </p>
                </div>
                <div className="flex gap-4 text-[10px] font-mono">
                    <div className="flex items-center gap-2 px-3 py-1 rounded border-2 border-cyber-success bg-cyber-success/10 shadow-[0_0_10px_rgba(10,255,96,0.2)]">
                        <div className="w-2 h-2 bg-cyber-success rounded-full shadow-[0_0_5px_lime]"></div>
                        <span className="text-cyber-success font-bold">Superávit</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 rounded border-2 border-cyber-danger bg-cyber-danger/10 shadow-[0_0_10px_rgba(255,0,60,0.2)]">
                        <div className="w-2 h-2 bg-cyber-danger rounded-full shadow-[0_0_5px_red]"></div>
                        <span className="text-cyber-danger font-bold">Déficit</span>
                    </div>
                </div>
            </div>

            <div className="relative w-full flex-1 select-none z-10">
                {hoverIndex !== null && chartData[hoverIndex] && (
                    <div 
                        className="absolute z-30 bg-[#0a0a0f] border-2 border-cyber-emerald p-4 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.8)] pointer-events-none text-xs font-mono min-w-[220px] animate-in fade-in zoom-in-95 duration-200"
                        style={{ 
                            left: '50%', 
                            top: '0px',
                            transform: 'translateX(-50%)'
                        }}
                    >
                        <div className="font-bold text-white mb-2 border-b border-slate-700 pb-2 text-center uppercase tracking-[0.2em]">{chartData[hoverIndex].mes}</div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            <span className="text-slate-400 uppercase text-[9px]">Ingresos</span>
                            <span className="text-right text-cyber-success font-bold">{formatCurrency(chartData[hoverIndex].ingresos)}</span>
                            
                            <span className="text-slate-400 uppercase text-[9px]">Egresos</span>
                            <span className="text-right text-cyber-danger font-bold">{formatCurrency(chartData[hoverIndex].egresos)}</span>
                            
                            <div className="col-span-2 h-px bg-white/10 my-1"></div>

                            <span className="text-white font-black uppercase text-[9px]">Neto</span>
                            <span className={`text-right font-black text-sm ${chartData[hoverIndex].flujoNeto >= 0 ? 'text-cyber-success drop-shadow-[0_0_5px_lime]' : 'text-cyber-danger drop-shadow-[0_0_5px_red]'}`}>
                                {formatCurrency(chartData[hoverIndex].flujoNeto)}
                            </span>
                            
                            <span className="text-blue-400 font-bold uppercase text-[9px]">Acumulado</span>
                            <span className="text-right text-blue-400 font-bold">{formatCurrency(chartData[hoverIndex].saldoAcumulado)}</span>
                        </div>
                    </div>
                )}

                <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
                    {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
                        <line key={tick} x1={P} x2={W-P} y1={P + tick * (H - 2*P)} y2={P + tick * (H - 2*P)} stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
                    ))}
                    <line x1={P} x2={W-P} y1={zeroLineY} y2={zeroLineY} stroke="#475569" strokeWidth="1" />

                    {chartData.map((d, i) => {
                        const x = getX(i);
                        const height = getBarHeight(d.flujoNeto);
                        const y = getBarY(d.flujoNeto);
                        const isNegative = d.flujoNeto < 0;
                        return (
                            <g key={`bar-${i}`} onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)}>
                                <rect x={x - barWidth / 2} y={y} width={barWidth} height={Math.max(height, 2)} fill={isNegative ? '#ff003c' : '#0aff60'} fillOpacity={hoverIndex === i ? "1" : "0.5"} className="transition-all duration-300 cursor-crosshair" />
                                <text x={x} y={H - 5} textAnchor="middle" className={`text-[10px] font-mono fill-slate-500 ${hoverIndex === i ? 'fill-white font-bold' : ''}`}>{d.mes}</text>
                            </g>
                        );
                    })}

                    <path d={linePath} fill="none" stroke="#60a5fa" strokeWidth="3" filter="drop-shadow(0 0 5px rgba(96, 165, 250, 0.6))" strokeLinecap="round" strokeLinejoin="round" />

                    {chartData.map((d, i) => (
                        <circle key={`dot-${i}`} cx={getX(i)} cy={getLineY(d.saldoAcumulado)} r={hoverIndex === i ? 6 : 3} fill="#0f172a" stroke="#60a5fa" strokeWidth="2" className="transition-all duration-200 pointer-events-none" />
                    ))}
                </svg>
                
                <div className="absolute left-0 top-0 bottom-8 w-10 flex flex-col justify-between text-[9px] font-mono text-slate-600 py-10 pointer-events-none select-none">
                    <span>+{formatCurrency(maxFlow/100)}</span><span>0</span><span>-{formatCurrency(maxFlow/100)}</span>
                </div>
                <div className="absolute right-0 top-0 bottom-8 w-10 flex flex-col justify-between text-[9px] font-mono text-blue-500 py-4 text-right pointer-events-none select-none">
                    <span>{formatCurrency(maxBalance/100)}</span><span>{formatCurrency(minBalance/100)}</span>
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
            <div key={idx} className={`relative group bg-[#050a14] border-2 ${card.border} p-6 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0)] hover:${card.glow} transition-all duration-500 hover:-translate-y-1`}>
                <div className={`absolute -inset-0.5 ${card.border.replace('border-', 'bg-')} rounded-2xl opacity-0 group-hover:opacity-10 blur-md transition-opacity`}></div>
                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <div className="text-[10px] font-mono text-slate-400 uppercase tracking-[0.2em] mb-2 font-bold">{card.label}</div>
                        <div className={`text-2xl font-mono font-bold text-white group-hover:${card.color} transition-colors group-hover:text-glow`}>{card.val}</div>
                    </div>
                    <div className={`w-12 h-12 rounded-xl bg-black flex items-center justify-center ${card.color} border-2 ${card.border} shadow-inner group-hover:scale-110 transition-transform duration-300`}>
                        <i className={`fas ${card.icon} text-lg`}></i>
                    </div>
                </div>
            </div>
        ))}
      </div>

      <div className="relative group min-h-[400px]">
        <div className="absolute -inset-1 bg-cyber-blue rounded-2xl opacity-10 blur-xl animate-pulse"></div>
        <div className="relative bg-[#050a14] border-2 border-cyber-blue shadow-neon-blue rounded-2xl overflow-hidden backdrop-blur-xl z-10">
            <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
            <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[#02040a] z-20 shadow-xl">
                <tr className="border-b-2 border-cyber-blue/20 text-[10px] font-display uppercase tracking-[0.2em] text-cyber-blue">
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
                        <tr><td colSpan={6} className="p-20 text-center text-cyber-blue animate-pulse tracking-widest">SINCRONIZANDO BLOCKCHAIN...</td></tr>
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
                            <span className="font-mono text-cyber-blue group-hover/row:text-white transition-colors">{tx.reference_id || '-'}</span>
                        </td>
                        <td className={`p-6 text-right font-bold text-sm ${
                            tx.amount_bigint > 0 ? 'text-cyber-success drop-shadow-[0_0_8px_rgba(10,255,96,0.5)]' : 'text-cyber-danger drop-shadow-[0_0_8px_rgba(255,0,60,0.5)]'
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
                <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div> Ledger Sincronizado</div>
            </div>
        </div>
      </div>
    </div>
  );
}
