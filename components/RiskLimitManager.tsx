
import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/edgeApi';
import { DrawTime, RiskLimit, RiskLimitStats } from '../types';
import { formatCurrency } from '../constants';

export default function RiskLimitManager() {
  const [activeDraw, setActiveDraw] = useState<DrawTime>(DrawTime.NOCHE);
  const [limits, setLimits] = useState<RiskLimit[]>([]);
  const [stats, setStats] = useState<RiskLimitStats[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selection
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [limitAmount, setLimitAmount] = useState<number | ''>('');
  const [isGlobalMode, setIsGlobalMode] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [activeDraw]);

  const fetchData = async () => {
    setLoading(true);
    try {
        const [limitsRes, statsRes] = await Promise.all([
            api.getRiskLimits({ draw: activeDraw }),
            api.getRiskStats({ draw: activeDraw })
        ]);
        
        if (limitsRes.data) setLimits(limitsRes.data.limits);
        if (statsRes.data) setStats(statsRes.data.stats);
    } catch (e) {
        console.error("Risk Manager Error", e);
    } finally {
        setLoading(false);
    }
  };

  // MERGE DATA FOR GRID
  const gridData = useMemo(() => {
      const grid = [];
      for (let i = 0; i < 100; i++) {
          const numStr = i.toString().padStart(2, '0');
          const limit = limits.find(l => l.number === numStr);
          const stat = stats.find(s => s.number === numStr);
          
          const max = limit ? limit.max_amount : Infinity;
          const sold = stat ? stat.total_sold : 0;
          const percent = max === Infinity ? 0 : (sold / max) * 100;
          
          grid.push({
              number: numStr,
              max,
              sold,
              percent,
              isLimited: max !== Infinity
          });
      }
      return grid;
  }, [limits, stats]);

  const handleSaveLimit = async () => {
      if (!limitAmount || Number(limitAmount) < 0) return;
      
      await api.updateRiskLimit({
          draw: activeDraw,
          number: isGlobalMode ? 'ALL' : selectedNumber!,
          max_amount: Number(limitAmount) * 100 // Cents
      });
      
      alert(isGlobalMode ? "Límite Global Actualizado" : `Límite para ${selectedNumber} actualizado`);
      setLimitAmount('');
      fetchData();
  };

  const handleRemoveLimit = async () => {
      await api.updateRiskLimit({
          draw: activeDraw,
          number: isGlobalMode ? 'ALL' : selectedNumber!,
          max_amount: -1 // Signal to remove
      });
      alert("Límite eliminado (Venta Libre)");
      fetchData();
  };

  const getCellColor = (percent: number, isLimited: boolean) => {
      // Base Phosphorescent Style
      const base = "border-2 shadow-sm transition-all duration-300 relative overflow-hidden group";
      
      if (!isLimited && percent > 0) return `${base} border-blue-500/50 text-blue-300 bg-blue-900/20 shadow-[0_0_10px_rgba(36,99,235,0.2)] hover:border-blue-400 hover:shadow-[0_0_20px_#2463eb]`;
      if (!isLimited) return `${base} border-white/10 text-slate-600 bg-black/40 hover:border-white/30 hover:text-white`;
      
      if (percent >= 100) return `${base} bg-red-600 border-red-500 text-white shadow-[0_0_20px_red] animate-pulse font-black`;
      if (percent >= 80) return `${base} bg-orange-600/80 border-orange-500 text-white shadow-[0_0_15px_orange]`;
      if (percent >= 50) return `${base} bg-yellow-600/50 border-yellow-500 text-yellow-200`;
      return `${base} bg-green-900/40 border-green-500/50 text-green-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]`;
  };

  // DYNAMIC THEME FOR CONTEXT
  const themeContext = useMemo(() => {
      if (isGlobalMode) return { color: 'cyber-purple', hex: '#bc13fe', shadow: 'shadow-neon-purple' };
      if (selectedNumber) return { color: 'cyber-emerald', hex: '#10b981', shadow: 'shadow-neon-emerald' };
      return { color: 'cyber-blue', hex: '#2463eb', shadow: 'shadow-neon-blue' };
  }, [isGlobalMode, selectedNumber]);

  return (
    <div className="relative group perspective-1000">
        
        {/* --- LIVING BACKLIGHT --- */}
        <div 
            className="absolute -inset-1 rounded-[2rem] opacity-20 blur-2xl animate-[pulse_4s_ease-in-out_infinite] transition-all duration-1000"
            style={{ backgroundColor: themeContext.hex }}
        ></div>
        
        {/* Main Container - SOLID CORE */}
        <div className={`relative bg-[#050a14] border-2 rounded-3xl p-8 overflow-hidden z-10 transition-all duration-500`}
             style={{ borderColor: themeContext.hex, boxShadow: `0 0 30px ${themeContext.hex}33` }}
        >
            {/* HOLOGRAPHIC SCANLINE */}
            <div className="absolute top-0 left-0 w-full h-1 bg-white opacity-10 blur-sm animate-[scanline_4s_linear_infinite] pointer-events-none z-20"></div>
            
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:30px_30px] pointer-events-none"></div>

            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 relative z-10 border-b border-white/10 pb-6">
                <div>
                    <h3 className="text-xl font-display font-black text-white uppercase tracking-widest flex items-center gap-4 drop-shadow-lg">
                        {/* LIVING ICON */}
                        <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-all relative overflow-hidden group/icon ${themeContext.shadow}`} style={{ borderColor: themeContext.hex }}>
                            <div className="absolute inset-0 bg-white opacity-0 group-hover/icon:opacity-20 transition-opacity"></div>
                            <div className={`absolute inset-0 ${themeContext.shadow.replace('shadow-', 'bg-')} opacity-20 blur-md animate-pulse`}></div>
                            <i className="fas fa-shield-alt text-2xl relative z-10 animate-[pulse_3s_infinite]" style={{ color: themeContext.hex }}></i>
                        </div>
                        <div>
                            <span>Gestión de Riesgo <span className="text-glow-sm transition-colors" style={{ color: themeContext.hex }}>Bancario</span></span>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`w-2 h-2 rounded-full animate-ping`} style={{ backgroundColor: themeContext.hex }}></span>
                                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                                    Monitoreo Activo v4.0
                                </p>
                            </div>
                        </div>
                    </h3>
                </div>

                {/* DRAW TABS - GLOWING */}
                <div className="flex bg-black/60 p-1.5 rounded-xl border-2 border-white/10 mt-4 md:mt-0 shadow-lg">
                    {Object.values(DrawTime).map((t) => (
                        <button
                            key={t}
                            onClick={() => setActiveDraw(t)}
                            className={`relative px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all border-2 overflow-hidden group/tab ${
                                activeDraw === t 
                                ? 'bg-white text-black border-white shadow-[0_0_15px_white]' 
                                : 'bg-transparent text-slate-500 border-transparent hover:text-white'
                            }`}
                        >
                            {activeDraw === t && <div className="absolute inset-0 bg-white blur-md opacity-50 animate-pulse"></div>}
                            <span className="relative z-10">{t.split(' ')[0]}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
                
                {/* LEFT: CONTROL PANEL - PHOSPHORESCENT */}
                <div className={`bg-black/40 border-2 rounded-2xl p-6 h-fit transition-all duration-500 shadow-lg backdrop-blur-md`} style={{ borderColor: `${themeContext.hex}40` }}>
                    <h4 className="text-xs font-display font-bold text-white uppercase tracking-wider mb-6 border-l-4 pl-3 transition-colors" style={{ borderColor: themeContext.hex }}>
                        Configuración de Límites
                    </h4>

                    <div className="mb-6">
                        <div className="flex items-center gap-3 mb-6">
                            <button 
                                onClick={() => { setIsGlobalMode(false); setSelectedNumber(null); }}
                                className={`flex-1 py-3 rounded-lg border-2 text-[10px] font-bold uppercase transition-all relative overflow-hidden group/opt ${
                                    !isGlobalMode 
                                    ? 'bg-cyber-emerald/20 border-cyber-emerald text-cyber-emerald shadow-neon-emerald' 
                                    : 'border-white/10 text-slate-500 hover:border-white/30 hover:text-white'
                                }`}
                            >
                                {!isGlobalMode && <div className="absolute inset-0 bg-cyber-emerald opacity-20 blur-md animate-pulse"></div>}
                                <span className="relative z-10 flex items-center justify-center gap-2"><i className="fas fa-crosshairs"></i> Por Número</span>
                            </button>
                            <button 
                                onClick={() => { setIsGlobalMode(true); setSelectedNumber(null); }}
                                className={`flex-1 py-3 rounded-lg border-2 text-[10px] font-bold uppercase transition-all relative overflow-hidden group/opt ${
                                    isGlobalMode 
                                    ? 'bg-cyber-purple/20 border-cyber-purple text-cyber-purple shadow-neon-purple' 
                                    : 'border-white/10 text-slate-500 hover:border-white/30 hover:text-white'
                                }`}
                            >
                                {isGlobalMode && <div className="absolute inset-0 bg-cyber-purple opacity-20 blur-md animate-pulse"></div>}
                                <span className="relative z-10 flex items-center justify-center gap-2"><i className="fas fa-globe"></i> Global (Todos)</span>
                            </button>
                        </div>

                        {!isGlobalMode && (
                            <div className="mb-6 relative group/num perspective-500">
                                <label className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-2 block ml-1">Número Seleccionado</label>
                                <div className={`text-5xl font-mono font-black text-white bg-black border-2 rounded-xl py-6 text-center transition-all shadow-inner relative overflow-hidden ${selectedNumber ? 'border-cyber-emerald shadow-[inset_0_0_30px_rgba(16,185,129,0.3)]' : 'border-white/10'}`}>
                                    {selectedNumber && <div className="absolute inset-0 bg-cyber-emerald/10 animate-pulse"></div>}
                                    <span className="relative z-10 text-glow">{selectedNumber || '--'}</span>
                                </div>
                            </div>
                        )}

                        <div className="relative group/input">
                            <label className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-2 block ml-1">Tope Máximo (CRC)</label>
                            {/* Input Glow */}
                            <div className="absolute -bottom-2 left-0 w-full h-4 bg-white blur-xl opacity-0 group-focus-within/input:opacity-20 transition-opacity"></div>
                            
                            <input 
                                type="number" 
                                value={limitAmount}
                                onChange={e => setLimitAmount(Number(e.target.value))}
                                className="relative w-full bg-black border-2 border-white/20 rounded-xl py-3 px-4 text-white font-mono focus:border-white focus:outline-none transition-all shadow-inner z-10 text-lg placeholder-slate-700"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        {/* APPLY BUTTON - REACTOR STYLE */}
                        <button 
                            onClick={handleSaveLimit}
                            disabled={(!isGlobalMode && !selectedNumber) || !limitAmount}
                            className="w-full py-4 rounded-xl font-bold uppercase text-xs relative overflow-hidden group/btn disabled:opacity-50 disabled:cursor-not-allowed border-2 border-white text-black transition-all"
                        >
                            <div className="absolute inset-0 bg-white group-hover/btn:bg-slate-200 transition-colors"></div>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-50 -translate-x-full group-hover/btn:animate-[shine_0.5s_ease-in-out]"></div>
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                <i className="fas fa-check-circle"></i> Aplicar Límite
                            </span>
                        </button>
                        
                        {/* DELETE BUTTON - REACTOR STYLE */}
                        <button 
                            onClick={handleRemoveLimit}
                            disabled={(!isGlobalMode && !selectedNumber)}
                            className="w-full py-4 rounded-xl font-bold uppercase text-xs relative overflow-hidden group/btn disabled:opacity-50 disabled:cursor-not-allowed border-2 border-red-500/50 text-red-400 hover:border-red-500 hover:text-red-200 hover:shadow-neon-red transition-all"
                        >
                            <div className="absolute inset-0 bg-red-900/0 group-hover/btn:bg-red-900/20 transition-colors"></div>
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                <i className="fas fa-trash-alt"></i> Eliminar Límite
                            </span>
                        </button>
                    </div>

                    {/* Selected Info */}
                    {selectedNumber && !isGlobalMode && (
                        <div className="mt-6 pt-6 border-t border-white/10">
                            <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <i className="fas fa-info-circle"></i> Estado Actual ({selectedNumber})
                            </div>
                            <div className="flex justify-between text-xs font-mono mb-1">
                                <span className="text-slate-400">Vendido:</span>
                                <span className="text-white font-bold">{formatCurrency(gridData[parseInt(selectedNumber)].sold)}</span>
                            </div>
                            <div className="flex justify-between text-xs font-mono">
                                <span className="text-slate-400">Límite:</span>
                                <span className="text-cyber-emerald font-bold drop-shadow-[0_0_5px_rgba(16,185,129,0.8)]">
                                    {gridData[parseInt(selectedNumber)].isLimited ? formatCurrency(gridData[parseInt(selectedNumber)].max) : 'ILIMITADO'}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT: RISK GRID - LIQUID CELLS */}
                <div className="lg:col-span-2 bg-[#02040a] rounded-2xl border-2 border-white/10 p-2 overflow-hidden shadow-inner relative group/grid">
                    {/* Inner Grid Glow */}
                    <div className="absolute inset-0 bg-cyber-blue/5 blur-xl group-hover/grid:bg-cyber-blue/10 transition-colors"></div>

                    <div className="grid grid-cols-10 gap-1.5 h-[400px] overflow-y-auto custom-scrollbar p-2 relative z-10">
                        {gridData.map((cell) => (
                            <button
                                key={cell.number}
                                onClick={() => { setSelectedNumber(cell.number); setIsGlobalMode(false); }}
                                className={`
                                    aspect-square rounded-lg flex flex-col items-center justify-center relative overflow-hidden group
                                    ${getCellColor(cell.percent, cell.isLimited)}
                                    ${selectedNumber === cell.number ? 'ring-2 ring-white scale-110 z-20 shadow-[0_0_20px_white]' : 'hover:scale-110 hover:z-10'}
                                `}
                            >
                                <span className="text-xs font-black relative z-10 drop-shadow-md">{cell.number}</span>
                                {cell.isLimited && (
                                    <div className="absolute bottom-1 w-[80%] h-1.5 bg-black/60 rounded-full overflow-hidden z-10 border border-white/10">
                                        <div 
                                            className={`h-full transition-all duration-700 ${
                                                cell.percent >= 100 ? 'bg-white animate-pulse' : 
                                                cell.percent >= 80 ? 'bg-orange-500' :
                                                'bg-cyber-emerald'
                                            }`} 
                                            style={{ width: `${Math.min(cell.percent, 100)}%` }}
                                        ></div>
                                    </div>
                                )}
                                {/* Cell Shine on Hover */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </button>
                        ))}
                    </div>
                    
                    {/* Legend */}
                    <div className="flex justify-center gap-6 p-4 text-[9px] font-mono uppercase tracking-wider text-slate-500 border-t border-white/5 bg-black/20 backdrop-blur-sm relative z-10">
                        <div className="flex items-center gap-2 group cursor-help">
                            <div className="w-2 h-2 bg-green-500 shadow-[0_0_5px_lime] rounded-full group-hover:animate-ping"></div> Seguro
                        </div>
                        <div className="flex items-center gap-2 group cursor-help">
                            <div className="w-2 h-2 bg-yellow-500 shadow-[0_0_5px_orange] rounded-full group-hover:animate-ping"></div> Riesgo Medio
                        </div>
                        <div className="flex items-center gap-2 group cursor-help">
                            <div className="w-2 h-2 bg-red-600 shadow-[0_0_5px_red] rounded-full animate-pulse"></div> Saturado
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>
  );
}
