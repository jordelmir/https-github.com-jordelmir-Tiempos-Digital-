
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { LedgerTransaction } from '../types';
import { formatCurrency, formatDate } from '../constants';

// --- MOCK DATA GENERATOR FOR CHART ---
const generateCashFlowData = () => {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  let currentBalance = 1000000; // Base inicial (en centavos, CRC 10,000.00)
  
  return months.map((month, index) => {
    // Simulando estacionalidad y eventos aleatorios
    const isGoodMonth = Math.random() > 0.3;
    const ingresos = Math.floor(Math.random() * 500000) + 300000; // 300k - 800k
    const egresos = isGoodMonth 
        ? Math.floor(Math.random() * 300000) + 100000  // Gastos normales
        : Math.floor(Math.random() * 600000) + 300000; // Gastos altos (riesgo)

    const flujoNeto = ingresos - egresos;
    currentBalance += flujoNeto;

    return {
      mes: month,
      ingresos,
      egresos,
      flujoNeto,
      saldoAcumulado: currentBalance
    };
  });
};

export default function LedgerView() {
  const [txs, setTxs] = useState<LedgerTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartData] = useState(generateCashFlowData());
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    async function fetchLedger() {
      const { data, error } = await supabase
        .from('ledger_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (data) setTxs(data as unknown as LedgerTransaction[]);
      setLoading(false);
    }
    fetchLedger();
  }, []);

  // --- CHART CALCULATIONS ---
  const { maxFlow, minFlow, maxBalance, minBalance } = useMemo(() => {
    const flows = chartData.map(d => Math.abs(d.flujoNeto));
    const balances = chartData.map(d => d.saldoAcumulado);
    return {
        maxFlow: Math.max(...flows) * 1.2, // Padding visual
        minFlow: 0,
        maxBalance: Math.max(...balances) * 1.1,
        minBalance: Math.min(...balances) * 0.9
    };
  }, [chartData]);

  // Dimensiones del gráfico SVG
  const H = 300; // Altura
  const W = 1000; // Ancho virtual (responsive via viewBox)
  const P = 40; // Padding
  const barWidth = 40;
  const zeroLineY = H / 2; // Línea cero para barras (centrada aprox, ajustaremos)

  // Escalas
  // Para barras: El centro es zeroLineY. Hacia arriba es positivo, abajo negativo.
  // Escala normalizada para flujos:
  const getBarHeight = (val: number) => (Math.abs(val) / maxFlow) * (H / 2 - P);
  const getBarY = (val: number) => val >= 0 ? zeroLineY - getBarHeight(val) : zeroLineY;
  
  // Para línea (Balance): Eje secundario, usa todo el alto
  const getLineY = (val: number) => {
    const range = maxBalance - minBalance;
    const normalized = (val - minBalance) / range;
    return H - P - (normalized * (H - 2 * P));
  };

  const getX = (index: number) => P + index * ((W - 2 * P) / (chartData.length - 1));

  // Generar path de la línea
  const linePath = chartData.map((d, i) => 
    `${i === 0 ? 'M' : 'L'} ${getX(i) + (chartData.length > 12 ? 0 : barWidth/2)} ${getLineY(d.saldoAcumulado)}`
  ).join(' ');


  return (
    <div className="p-8 space-y-12 relative animate-in fade-in duration-500">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-end border-b-2 border-cyber-emerald/30 pb-6 relative">
        <div className="absolute bottom-0 left-0 w-1/3 h-0.5 bg-cyber-emerald shadow-[0_0_15px_#10b981]"></div>
        <div>
            <h2 className="text-4xl font-display font-black text-white italic tracking-tighter uppercase mb-2 drop-shadow-lg flex items-center gap-3">
                <i className="fas fa-book-journal-whills text-cyber-emerald animate-pulse"></i>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 text-glow-green">LIBRO</span> FINANCIERO
            </h2>
            <p className="text-cyber-emerald/80 text-xs font-mono uppercase tracking-[0.3em] font-bold pl-1">
                Cadena de Transacciones Inmutable
            </p>
        </div>
        <div className="text-right hidden md:block bg-[#050a14] p-4 rounded-xl border-2 border-cyber-blue shadow-neon-blue">
            <div className="text-[9px] font-mono text-cyber-blue uppercase font-bold tracking-widest mb-1">Balance Actual del Núcleo</div>
            <div className="text-2xl font-mono font-bold text-white text-glow">
                {formatCurrency(chartData[chartData.length - 1].saldoAcumulado)}
            </div>
        </div>
      </header>

      {/* --- EXECUTIVE CASH FLOW CHART --- */}
      <div className="relative group">
        {/* Living Backlight */}
        <div className="absolute -inset-1 bg-cyber-emerald rounded-[2rem] opacity-20 blur-2xl animate-pulse transition-opacity duration-1000 group-hover:opacity-30"></div>
        
        {/* SOLID CORE CONTAINER */}
        <div className="relative bg-[#050a14] border-2 border-cyber-emerald/50 rounded-3xl p-8 shadow-[0_0_50px_rgba(16,185,129,0.15)] overflow-hidden z-10">
            
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[length:30px_30px] pointer-events-none"></div>

            {/* Header del Gráfico */}
            <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4 relative z-10">
                <div>
                    <h3 className="text-lg font-display font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <i className="fas fa-chart-line text-cyber-emerald"></i> Análisis de Liquidez 2024
                    </h3>
                    <p className="text-[10px] font-mono text-slate-400 mt-1">
                        <span className="text-cyber-success font-bold">■ Flujo Neto</span> vs <span className="text-blue-400 font-bold">● Saldo Acumulado</span>
                    </p>
                </div>
                <div className="flex gap-4 text-[10px] font-mono">
                    <div className="flex items-center gap-2 px-3 py-1 rounded border border-cyber-success/30 bg-cyber-success/10">
                        <div className="w-2 h-2 bg-cyber-success rounded-full shadow-[0_0_5px_lime]"></div>
                        <span className="text-cyber-success font-bold">Superávit</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 rounded border border-cyber-danger/30 bg-cyber-danger/10">
                        <div className="w-2 h-2 bg-cyber-danger rounded-full shadow-[0_0_5px_red]"></div>
                        <span className="text-cyber-danger font-bold">Déficit</span>
                    </div>
                </div>
            </div>

            {/* Chart Container */}
            <div className="relative w-full h-[350px] select-none z-10">
                {/* Tooltip Overlay - CENTERED TOP */}
                {hoverIndex !== null && (
                    <div 
                        className="absolute z-30 bg-[#0a0a0f] border-2 border-cyber-emerald p-4 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.8)] pointer-events-none text-xs font-mono min-w-[220px] animate-in fade-in zoom-in-95 duration-200"
                        style={{ 
                            left: '50%', 
                            top: '-10px',
                            transform: 'translateX(-50%)'
                        }}
                    >
                        <div className="font-bold text-white mb-2 border-b border-slate-700 pb-2 text-center uppercase tracking-[0.2em]">{chartData[hoverIndex].mes} 2024</div>
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

                {/* SVG Chart */}
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full overflow-visible">
                    {/* Grid Lines (Background) */}
                    {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
                        <line 
                            key={tick} 
                            x1={P} x2={W-P} 
                            y1={P + tick * (H - 2*P)} y2={P + tick * (H - 2*P)} 
                            stroke="#1e293b" 
                            strokeWidth="1" 
                            strokeDasharray="4 4"
                            opacity="0.3"
                        />
                    ))}
                    
                    {/* Zero Line for Bars */}
                    <line x1={P} x2={W-P} y1={zeroLineY} y2={zeroLineY} stroke="#475569" strokeWidth="1" />

                    {/* BARS (Net Flow) */}
                    {chartData.map((d, i) => {
                        const x = getX(i);
                        const height = getBarHeight(d.flujoNeto);
                        const y = getBarY(d.flujoNeto);
                        const isNegative = d.flujoNeto < 0;
                        
                        // Risk Highlight
                        const isRisk = isNegative && i > 0 && chartData[i-1].flujoNeto < 0;

                        return (
                            <g key={`bar-${i}`} onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)}>
                                <rect
                                    x={x - barWidth / 2}
                                    y={y}
                                    width={barWidth}
                                    height={Math.max(height, 2)} 
                                    fill={isNegative ? '#ff003c' : '#0aff60'}
                                    fillOpacity={hoverIndex === i ? "1" : "0.5"}
                                    stroke={isRisk ? '#8B0000' : (isNegative ? '#ff003c' : '#0aff60')}
                                    strokeWidth={isRisk ? 2 : 0}
                                    className="transition-all duration-300 cursor-crosshair"
                                    filter={hoverIndex === i ? `drop-shadow(0 0 8px ${isNegative ? 'red' : '#0aff60'})` : ''}
                                />
                                {/* X Axis Label */}
                                <text 
                                    x={x} 
                                    y={H - 5} 
                                    textAnchor="middle" 
                                    className={`text-[10px] font-mono fill-slate-500 ${hoverIndex === i ? 'fill-white font-bold' : ''}`}
                                >
                                    {d.mes}
                                </text>
                            </g>
                        );
                    })}

                    {/* LINE (Accumulated Balance) */}
                    <path 
                        d={linePath} 
                        fill="none" 
                        stroke="#60a5fa" // Blue-400
                        strokeWidth="3" 
                        filter="drop-shadow(0 0 5px rgba(96, 165, 250, 0.6))"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* LINE MARKERS */}
                    {chartData.map((d, i) => (
                        <circle
                            key={`dot-${i}`}
                            cx={getX(i)}
                            cy={getLineY(d.saldoAcumulado)}
                            r={hoverIndex === i ? 6 : 3}
                            fill="#0f172a" 
                            stroke="#60a5fa"
                            strokeWidth="2"
                            className="transition-all duration-200 pointer-events-none"
                        />
                    ))}
                </svg>
                
                {/* Axis Labels */}
                <div className="absolute left-0 top-0 bottom-8 w-10 flex flex-col justify-between text-[9px] font-mono text-slate-600 py-10 pointer-events-none select-none">
                    <span>+{formatCurrency(maxFlow/100)}</span>
                    <span>0</span>
                    <span>-{formatCurrency(maxFlow/100)}</span>
                </div>
                <div className="absolute right-0 top-0 bottom-8 w-10 flex flex-col justify-between text-[9px] font-mono text-blue-500 py-4 text-right pointer-events-none select-none">
                    <span>{formatCurrency(maxBalance/100)}</span>
                    <span>{formatCurrency(minBalance/100)}</span>
                </div>
            </div>
        </div>
      </div>
      {/* --- END CHART --- */}


      {/* Financial Summary Cards - SOLID PHOSPHORESCENT */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { label: 'Volumen Neto', val: 'CRC 2,400,000', icon: 'fa-globe', color: 'text-cyber-neon', border: 'border-cyber-neon', glow: 'shadow-neon-cyan' },
          { label: 'Créditos Totales', val: 'CRC 8,500,000', icon: 'fa-arrow-up', color: 'text-cyber-success', border: 'border-cyber-success', glow: 'shadow-neon-green' },
          { label: 'Débitos Totales', val: 'CRC 6,100,000', icon: 'fa-arrow-down', color: 'text-cyber-danger', border: 'border-cyber-danger', glow: 'shadow-neon-red' },
        ].map((card, idx) => (
            <div key={idx} className={`relative group bg-[#050a14] border-2 ${card.border} p-6 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0)] hover:${card.glow} transition-all duration-500 hover:-translate-y-1`}>
                {/* Card Inner Glow */}
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

      {/* Ledger Table - SOLID CORE */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-cyber-blue rounded-2xl opacity-10 blur-xl animate-pulse"></div>
        
        <div className="relative bg-[#050a14] border-2 border-cyber-blue/30 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl z-10">
            
            <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                <tr className="bg-[#02040a] border-b-2 border-cyber-blue/20 text-[10px] font-display uppercase tracking-[0.2em] text-cyber-blue">
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
            
            {/* Footer */}
            <div className="bg-[#02040a] p-3 border-t border-white/5 flex justify-between items-center text-[9px] font-mono text-slate-600 uppercase tracking-widest">
                <div>Hash Seguro: SHA-256</div>
                <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div> Ledger Sincronizado</div>
            </div>
        </div>
      </div>
    </div>
  );
}
