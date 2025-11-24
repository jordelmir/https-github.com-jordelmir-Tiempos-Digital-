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
    <div className="p-8 space-y-8">
      {/* Header */}
      <header className="mb-6 flex flex-col md:flex-row justify-between items-end">
        <div>
            <h2 className="text-4xl font-display font-black text-white italic tracking-tighter uppercase mb-2">
            <span className="text-cyber-success text-glow-green">LIBRO</span> FINANCIERO
            </h2>
            <p className="text-cyber-success/60 text-xs font-mono uppercase tracking-[0.3em]">
            Cadena de Transacciones Inmutable
            </p>
        </div>
        <div className="text-right hidden md:block">
            <div className="text-[10px] font-mono text-slate-500 uppercase">Balance Actual</div>
            <div className="text-2xl font-mono font-bold text-cyber-neon text-glow">
                {formatCurrency(chartData[chartData.length - 1].saldoAcumulado)}
            </div>
        </div>
      </header>

      {/* --- EXECUTIVE CASH FLOW CHART (MANDATO v3.1) --- */}
      <div className="bg-cyber-panel/80 border border-cyber-border rounded-xl p-6 shadow-panel-glow relative overflow-hidden group">
        
        {/* Header del Gráfico */}
        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4 relative z-10">
            <div>
                <h3 className="text-lg font-display font-bold text-white uppercase tracking-wider">
                    Análisis de Liquidez 2024
                </h3>
                <p className="text-[10px] font-mono text-slate-400">
                    <span className="text-cyber-success">■ Flujo Neto</span> vs <span className="text-blue-400">● Saldo Acumulado</span>
                </p>
            </div>
            <div className="flex gap-4 text-[10px] font-mono">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-cyber-success/20 border border-cyber-success"></div>
                    <span className="text-slate-400">Superávit</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-cyber-danger/20 border border-cyber-danger"></div>
                    <span className="text-slate-400">Déficit</span>
                </div>
            </div>
        </div>

        {/* Chart Container */}
        <div className="relative w-full h-[350px] select-none">
            {/* Tooltip Overlay */}
            {hoverIndex !== null && (
                <div 
                    className="absolute z-20 bg-cyber-black/95 border border-slate-600 p-3 rounded shadow-xl pointer-events-none text-xs font-mono min-w-[180px]"
                    style={{ 
                        left: `${(hoverIndex / 11) * 90}%`, 
                        top: '10%',
                        transform: 'translateX(-50%)'
                    }}
                >
                    <div className="font-bold text-white mb-2 border-b border-slate-700 pb-1">{chartData[hoverIndex].mes} 2024</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <span className="text-slate-400">Ingresos:</span>
                        <span className="text-right text-cyber-success">{formatCurrency(chartData[hoverIndex].ingresos)}</span>
                        
                        <span className="text-slate-400">Egresos:</span>
                        <span className="text-right text-cyber-danger">{formatCurrency(chartData[hoverIndex].egresos)}</span>
                        
                        <span className="text-slate-200 font-bold">Neto:</span>
                        <span className={`text-right font-bold ${chartData[hoverIndex].flujoNeto >= 0 ? 'text-cyber-success' : 'text-cyber-danger'}`}>
                            {formatCurrency(chartData[hoverIndex].flujoNeto)}
                        </span>
                        
                        <div className="col-span-2 h-px bg-slate-700 my-1"></div>
                        
                        <span className="text-blue-400">Saldo:</span>
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
                    />
                ))}
                
                {/* Zero Line for Bars */}
                <line x1={P} x2={W-P} y1={zeroLineY} y2={zeroLineY} stroke="#475569" strokeWidth="2" />

                {/* BARS (Net Flow) */}
                {chartData.map((d, i) => {
                    const x = getX(i);
                    const height = getBarHeight(d.flujoNeto);
                    const y = getBarY(d.flujoNeto);
                    const isNegative = d.flujoNeto < 0;
                    
                    // Risk Highlight: Red border if consecutive negative months (simple logic: if prev was neg too)
                    const isRisk = isNegative && i > 0 && chartData[i-1].flujoNeto < 0;

                    return (
                        <g key={`bar-${i}`} onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)}>
                            <rect
                                x={x - barWidth / 2}
                                y={y}
                                width={barWidth}
                                height={Math.max(height, 2)} // Min height 2px for visibility
                                fill={isNegative ? '#ff003c' : '#0aff60'}
                                fillOpacity="0.6"
                                stroke={isRisk ? '#8B0000' : (isNegative ? '#ff003c' : '#0aff60')}
                                strokeWidth={isRisk ? 3 : 1}
                                className="transition-all duration-300 hover:fill-opacity-100 cursor-crosshair"
                            />
                            {/* X Axis Label */}
                            <text 
                                x={x} 
                                y={H - 5} 
                                textAnchor="middle" 
                                className={`text-[12px] font-mono fill-slate-500 ${hoverIndex === i ? 'fill-white font-bold' : ''}`}
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
                    stroke="#60a5fa" // Blue-400 equivalent
                    strokeWidth="3" 
                    filter="drop-shadow(0 0 4px rgba(96, 165, 250, 0.5))"
                />

                {/* LINE MARKERS */}
                {chartData.map((d, i) => (
                    <circle
                        key={`dot-${i}`}
                        cx={getX(i)}
                        cy={getLineY(d.saldoAcumulado)}
                        r={hoverIndex === i ? 6 : 4}
                        fill="#0f172a" // bg-slate-900
                        stroke="#60a5fa"
                        strokeWidth="2"
                        className="transition-all duration-200 pointer-events-none"
                    />
                ))}
            </svg>
            
            {/* Axis Labels (Absolute positioned to avoid SVG text complexity) */}
            <div className="absolute left-0 top-0 bottom-8 w-10 flex flex-col justify-between text-[9px] font-mono text-slate-500 py-10 pointer-events-none">
                <span>+{formatCurrency(maxFlow/100)}</span>
                <span>0</span>
                <span>-{formatCurrency(maxFlow/100)}</span>
            </div>
            <div className="absolute right-0 top-0 bottom-8 w-10 flex flex-col justify-between text-[9px] font-mono text-blue-400 py-4 text-right pointer-events-none">
                <span>{formatCurrency(maxBalance/100)}</span>
                <span>{formatCurrency(minBalance/100)}</span>
            </div>
        </div>
      </div>
      {/* --- END CHART --- */}


      {/* Financial Summary Cards (Legacy) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Volumen Neto', val: 'CRC 2,400,000', icon: 'fa-globe', color: 'text-cyber-neon', border: 'border-cyber-neon', glow: 'shadow-neon-cyan' },
          { label: 'Créditos Totales', val: 'CRC 8,500,000', icon: 'fa-arrow-up', color: 'text-cyber-success', border: 'border-cyber-success', glow: 'shadow-neon-green' },
          { label: 'Débitos Totales', val: 'CRC 6,100,000', icon: 'fa-arrow-down', color: 'text-cyber-danger', border: 'border-cyber-danger', glow: 'shadow-neon-red' },
        ].map((card, idx) => (
            <div key={idx} className={`bg-cyber-panel/60 border ${card.border}/30 p-6 rounded-xl backdrop-blur-sm shadow-[0_0_20px_rgba(0,0,0,0.3)] hover:${card.glow} transition-all group`}>
                <div className="flex justify-between items-start">
                    <div>
                        <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-1">{card.label}</div>
                        <div className={`text-2xl font-mono font-bold text-white group-hover:${card.color} transition-colors`}>{card.val}</div>
                    </div>
                    <div className={`w-8 h-8 rounded bg-black/50 flex items-center justify-center ${card.color} border border-white/10`}>
                        <i className={`fas ${card.icon}`}></i>
                    </div>
                </div>
            </div>
        ))}
      </div>

      {/* Ledger Table */}
      <div className="bg-cyber-black/80 border border-cyber-success/20 rounded-xl overflow-hidden shadow-panel-glow relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyber-success/5 blur-3xl pointer-events-none"></div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-cyber-success/10 to-transparent border-b border-cyber-success/20 text-[10px] font-display uppercase tracking-wider text-cyber-success">
                <th className="p-5">ID Transacción</th>
                <th className="p-5">Fecha</th>
                <th className="p-5">Tipo</th>
                <th className="p-5">Referencia</th>
                <th className="p-5 text-right">Monto</th>
                <th className="p-5 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="font-mono text-sm text-slate-300">
               {loading ? (
                    <tr><td colSpan={6} className="p-10 text-center text-cyber-success animate-pulse">SINCRONIZANDO BLOCKCHAIN...</td></tr>
               ) : txs.map(tx => (
                <tr key={tx.id} className="border-b border-slate-800 hover:bg-white/5 transition-colors">
                    <td className="p-5 text-xs text-slate-500">{tx.id.substring(0,8)}...</td>
                    <td className="p-5">{formatDate(tx.created_at)}</td>
                    <td className="p-5">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold border ${
                            tx.type === 'CREDIT' ? 'border-cyber-success text-cyber-success' : 
                            tx.type === 'DEBIT' ? 'border-cyber-danger text-cyber-danger' : 
                            'border-cyber-neon text-cyber-neon'
                        }`}>
                            {tx.type}
                        </span>
                    </td>
                    <td className="p-5 text-xs">{tx.reference_id || '-'}</td>
                    <td className={`p-5 text-right font-bold ${
                        tx.amount_bigint > 0 ? 'text-cyber-success' : 'text-cyber-danger'
                    }`}>
                        {formatCurrency(tx.amount_bigint)}
                    </td>
                    <td className="p-5 text-right text-slate-400">
                        {formatCurrency(tx.balance_after)}
                    </td>
                </tr>
               ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}