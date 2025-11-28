
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

  // Animation States
  const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVING' | 'SUCCESS'>('IDLE');
  const [removeStatus, setRemoveStatus] = useState<'IDLE' | 'REMOVING' | 'SUCCESS'>('IDLE');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [activeDraw]);

  const fetchData = async () => {
    // Only set loading on initial fetch to avoid flickering on periodic refresh
    if (limits.length === 0) setLoading(true);
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

  // IDENTIFY GLOBAL LIMIT OBJECT
  const globalLimitObj = useMemo(() => limits.find(l => l.number === 'ALL'), [limits]);

  // AUTO-FILL INPUT ON SELECTION CHANGE
  useEffect(() => {
      if (isGlobalMode) {
          if (globalLimitObj) setLimitAmount(globalLimitObj.max_amount / 100);
          else setLimitAmount('');
      } else {
          if (selectedNumber) {
              const limit = limits.find(l => l.number === selectedNumber);
              if (limit) setLimitAmount(limit.max_amount / 100);
              else setLimitAmount('');
          }
      }
  }, [isGlobalMode, selectedNumber, globalLimitObj, limits]);

  // MERGE DATA FOR GRID WITH INHERITANCE LOGIC
  const gridData = useMemo(() => {
      const grid = [];
      const globalMax = globalLimitObj ? globalLimitObj.max_amount : Infinity;

      for (let i = 0; i < 100; i++) {
          const numStr = i.toString().padStart(2, '0');
          const limit = limits.find(l => l.number === numStr);
          const stat = stats.find(s => s.number === numStr);
          
          // Inheritance Logic: Specific > Global > Infinity
          const hasSpecific = !!limit;
          const max = hasSpecific ? limit!.max_amount : globalMax;
          
          const sold = stat ? stat.total_sold : 0;
          const percent = max === Infinity ? 0 : (sold / max) * 100;
          
          grid.push({
              number: numStr,
              max,
              sold,
              percent,
              isLimited: max !== Infinity,
              limitSource: hasSpecific ? 'SPECIFIC' : (globalMax !== Infinity ? 'GLOBAL' : 'NONE')
          });
      }
      return grid;
  }, [limits, stats, globalLimitObj]);

  const handleSaveLimit = async () => {
      if (!limitAmount || Number(limitAmount) < 0) return;
      
      setSaveStatus('SAVING');
      
      const targetNumber = isGlobalMode ? 'ALL' : selectedNumber!;
      const newLimitVal = Number(limitAmount) * 100; // Cents

      // --- OPTIMISTIC UPDATE START ---
      // Instantly update UI before server response
      const optimisticLimit: RiskLimit = {
          id: `temp-${Date.now()}`,
          draw_type: activeDraw,
          number: targetNumber,
          max_amount: newLimitVal,
          created_at: new Date().toISOString()
      };

      setLimits(prev => {
          // Remove existing limit for this number/ALL to replace it
          const clean = prev.filter(l => l.number !== targetNumber);
          return [...clean, optimisticLimit];
      });
      // --- OPTIMISTIC UPDATE END ---

      // Simulate slight delay for "Processing" feel
      await new Promise(r => setTimeout(r, 400));

      await api.updateRiskLimit({
          draw: activeDraw,
          number: targetNumber,
          max_amount: newLimitVal
      });
      
      setSaveStatus('SUCCESS');
      
      // Re-fetch to ensure sync with backend (IDs, etc)
      fetchData();

      // Reset animation
      setTimeout(() => setSaveStatus('IDLE'), 2000);
  };

  const handleRemoveLimit = async () => {
      setRemoveStatus('REMOVING');
      
      const targetNumber = isGlobalMode ? 'ALL' : selectedNumber!;

      // --- OPTIMISTIC UPDATE START ---
      // Instantly remove from UI
      setLimits(prev => prev.filter(l => l.number !== targetNumber));
      // --- OPTIMISTIC UPDATE END ---
      
      await new Promise(r => setTimeout(r, 400));

      await api.updateRiskLimit({
          draw: activeDraw,
          number: targetNumber,
          max_amount: -1 // Signal to remove in backend
      });
      
      setRemoveStatus('SUCCESS');
      setLimitAmount(''); // Clear input
      fetchData();

      setTimeout(() => setRemoveStatus('IDLE'), 2000);
  };

  // --- THEMATIC ENGINE V2 ---
  const currentDrawTheme = useMemo(() => {
      if (activeDraw.includes('Mediodía')) return {
          id: 'solar',
          base: 'text-orange-500 border-orange-500',
          glow: 'shadow-[0_0_15px_orange]',
          bg: 'bg-orange-500',
          bgHex: '#f97316',
          hover: 'hover:border-orange-400 hover:shadow-orange-500/50',
          cellActive: 'border-orange-500/60 bg-orange-900/30 text-orange-200 shadow-[inset_0_0_10px_rgba(249,115,22,0.3)]',
          cellIdle: 'border-white/5 text-slate-500 hover:text-orange-400 hover:border-orange-500/50 hover:bg-orange-900/10',
          icon: 'fa-sun'
      };
      if (activeDraw.includes('Tarde')) return {
          id: 'vapor',
          base: 'text-purple-500 border-purple-500',
          glow: 'shadow-[0_0_15px_#a855f7]',
          bg: 'bg-purple-500',
          bgHex: '#a855f7',
          hover: 'hover:border-purple-400 hover:shadow-purple-500/50',
          cellActive: 'border-purple-500/60 bg-purple-900/30 text-purple-200 shadow-[inset_0_0_10px_rgba(168,85,247,0.3)]',
          cellIdle: 'border-white/5 text-slate-500 hover:text-purple-400 hover:border-purple-500/50 hover:bg-purple-900/10',
          icon: 'fa-cloud-sun'
      };
      // Noche (Default)
      return {
          id: 'abyss',
          base: 'text-blue-500 border-blue-500',
          glow: 'shadow-[0_0_15px_#3b82f6]',
          bg: 'bg-blue-500',
          bgHex: '#3b82f6',
          hover: 'hover:border-blue-400 hover:shadow-blue-500/50',
          cellActive: 'border-blue-500/60 bg-blue-900/30 text-blue-200 shadow-[inset_0_0_10px_rgba(59,130,246,0.3)]',
          cellIdle: 'border-white/5 text-slate-500 hover:text-blue-400 hover:border-blue-500/50 hover:bg-blue-900/10',
          icon: 'fa-moon'
      };
  }, [activeDraw]);

  const getCellColor = (percent: number, isLimited: boolean) => {
      const base = "border transition-all duration-300 relative overflow-hidden group font-mono font-bold text-xs";
      
      // 1. DANGER ZONES (Override Theme)
      if (percent >= 100) return `${base} bg-red-950 border-red-500 text-red-100 shadow-[0_0_15px_red] animate-pulse z-10`;
      if (percent >= 80) return `${base} bg-orange-950 border-orange-500 text-orange-200 shadow-[0_0_10px_orange] z-10`;
      if (percent >= 50) return `${base} bg-yellow-950/30 border-yellow-600 text-yellow-200 shadow-[inset_0_0_5px_rgba(250,204,21,0.3)]`;

      // 2. THEMATIC ACTIVE (Sales > 0 but Safe)
      if (percent > 0) return `${base} ${currentDrawTheme.cellActive}`;

      // 3. IDLE / EMPTY (Thematic Ghost)
      return `${base} bg-black/40 ${currentDrawTheme.cellIdle}`;
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
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 relative z-10 border-b border-white/10 pb-6 gap-6">
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

                {/* --- THEMATIC DRAW SELECTOR --- */}
                <div className="grid grid-cols-3 gap-3 w-full xl:w-auto bg-black/40 p-2 rounded-2xl border border-white/5">
                    {Object.values(DrawTime).map((t) => {
                        const isActive = activeDraw === t;
                        // Determine local theme for this specific button
                        let btnTheme = { border: '', text: '', glow: '', bg: '', icon: '' };
                        if (t.includes('Mediodía')) btnTheme = { border: 'border-orange-500', text: 'text-orange-400', glow: 'shadow-[0_0_20px_orange]', bg: 'bg-orange-500', icon: 'fa-sun' };
                        else if (t.includes('Tarde')) btnTheme = { border: 'border-purple-500', text: 'text-purple-400', glow: 'shadow-[0_0_20px_#a855f7]', bg: 'bg-purple-500', icon: 'fa-cloud-sun' };
                        else btnTheme = { border: 'border-blue-500', text: 'text-blue-400', glow: 'shadow-[0_0_20px_#3b82f6]', bg: 'bg-blue-500', icon: 'fa-moon' };

                        return (
                            <button
                                key={t}
                                onClick={() => setActiveDraw(t)}
                                className={`
                                    relative px-6 py-3 rounded-xl text-[10px] font-bold uppercase transition-all duration-500 border-2 overflow-hidden group/btn flex flex-col items-center gap-1
                                    ${isActive 
                                        ? `${btnTheme.border} ${btnTheme.text} bg-black ${btnTheme.glow} scale-105 z-10` 
                                        : 'border-white/5 text-slate-500 hover:border-white/20 hover:text-white bg-black/20'
                                    }
                                `}
                            >
                                {/* Active State Internals */}
                                {isActive && (
                                    <>
                                        <div className={`absolute inset-0 ${btnTheme.bg} opacity-10 animate-pulse`}></div>
                                        <div className={`absolute -inset-full ${btnTheme.bg} opacity-20 blur-xl animate-[spin_4s_linear_infinite]`}></div>
                                    </>
                                )}
                                
                                <i className={`fas ${btnTheme.icon} text-lg mb-1 relative z-10 ${isActive ? 'animate-bounce' : 'opacity-50'}`}></i>
                                <span className="relative z-10 tracking-widest">{t.split(' ')[0]}</span>
                            </button>
                        )
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 relative z-10">
                
                {/* LEFT: CONTROL PANEL - PHOSPHORESCENT */}
                <div className={`xl:col-span-3 bg-black/40 border-2 rounded-2xl p-6 h-fit transition-all duration-500 shadow-lg backdrop-blur-md`} style={{ borderColor: `${themeContext.hex}40` }}>
                    <h4 className="text-xs font-display font-bold text-white uppercase tracking-wider mb-6 border-l-4 pl-3 transition-colors" style={{ borderColor: themeContext.hex }}>
                        Configuración de Límites
                    </h4>

                    {/* --- GLOBAL STATUS CARD (VISUAL FEEDBACK) --- */}
                    <div className={`mb-6 rounded-xl border-2 p-4 transition-all duration-500 relative overflow-hidden group ${globalLimitObj ? 'bg-cyber-purple/10 border-cyber-purple shadow-[inset_0_0_20px_rgba(188,19,254,0.2)]' : 'bg-black/20 border-white/5'}`}>
                        {globalLimitObj && <div className="absolute top-0 left-0 w-1 h-full bg-cyber-purple shadow-[0_0_10px_#bc13fe]"></div>}
                        
                        <div className="flex justify-between items-center relative z-10">
                            <div>
                                <div className="text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-1 font-bold">Límite Global (Todos)</div>
                                <div className={`text-xl font-mono font-black ${globalLimitObj ? 'text-cyber-purple text-glow-sm' : 'text-slate-600'}`}>
                                    {globalLimitObj ? formatCurrency(globalLimitObj.max_amount) : 'ILIMITADO'}
                                </div>
                            </div>
                            <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${globalLimitObj ? 'border-cyber-purple text-cyber-purple shadow-neon-purple scale-110' : 'border-slate-800 text-slate-700'}`}>
                                <i className="fas fa-globe"></i>
                            </div>
                        </div>
                        
                        {globalLimitObj && (
                            <div className="mt-3 pt-3 border-t border-cyber-purple/20 flex gap-2">
                                <button 
                                    onClick={() => { setIsGlobalMode(true); setSelectedNumber(null); }}
                                    className="flex-1 py-1.5 bg-cyber-purple/20 rounded-lg text-[9px] font-bold uppercase text-cyber-purple hover:bg-cyber-purple hover:text-black transition-all border border-cyber-purple/30"
                                >
                                    <i className="fas fa-edit mr-1"></i> Modificar
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="mb-6">
                        <div className="flex flex-col gap-3 mb-6">
                            <button 
                                onClick={() => { setIsGlobalMode(false); setSelectedNumber(null); }}
                                className={`w-full py-3 rounded-lg border-2 text-[10px] font-bold uppercase transition-all relative overflow-hidden group/opt ${
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
                                className={`w-full py-3 rounded-lg border-2 text-[10px] font-bold uppercase transition-all relative overflow-hidden group/opt ${
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
                            <label className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-2 block ml-1">
                                {isGlobalMode ? 'Nuevo Límite Global (CRC)' : 'Tope Máximo (CRC)'}
                            </label>
                            {/* Input Glow */}
                            <div className="absolute -bottom-2 left-0 w-full h-4 bg-white blur-xl opacity-0 group-focus-within/input:opacity-20 transition-opacity"></div>
                            
                            <input 
                                type="number" 
                                value={limitAmount}
                                onChange={e => setLimitAmount(Number(e.target.value))}
                                className={`relative w-full bg-black border-2 rounded-xl py-3 px-4 text-white font-mono focus:outline-none transition-all shadow-inner z-10 text-lg placeholder-slate-700 ${isGlobalMode ? 'border-cyber-purple focus:border-cyber-purple focus:shadow-[0_0_15px_#bc13fe]' : 'border-white/20 focus:border-white'}`}
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        {/* APPLY BUTTON - REACTOR STYLE WITH ANIMATION */}
                        <button 
                            onClick={handleSaveLimit}
                            disabled={(!isGlobalMode && !selectedNumber) || !limitAmount || saveStatus !== 'IDLE'}
                            className={`w-full py-4 rounded-xl font-bold uppercase text-xs relative overflow-hidden group/btn disabled:opacity-50 disabled:cursor-not-allowed border-2 transition-all duration-300 ${
                                saveStatus === 'SUCCESS' 
                                ? 'border-emerald-500 bg-emerald-500 text-black shadow-[0_0_20px_#10b981]' 
                                : isGlobalMode ? 'border-cyber-purple text-cyber-purple hover:bg-cyber-purple hover:text-black' : 'border-white text-black bg-white'
                            }`}
                        >
                            {saveStatus === 'IDLE' && (
                                <>
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-50 -translate-x-full group-hover/btn:animate-[shine_0.5s_ease-in-out]"></div>
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        <i className="fas fa-check-circle"></i> {isGlobalMode ? 'Aplicar a Todos' : 'Aplicar Límite'}
                                    </span>
                                </>
                            )}
                            
                            {saveStatus === 'SAVING' && (
                                <div className="flex items-center justify-center gap-2 text-black/70 relative z-10">
                                    <i className="fas fa-circle-notch fa-spin"></i>
                                    <span>GUARDANDO...</span>
                                </div>
                            )}

                            {saveStatus === 'SUCCESS' && (
                                <div className="flex items-center justify-center gap-2 animate-in zoom-in duration-300 relative z-10">
                                    <i className="fas fa-check-double text-lg animate-bounce"></i>
                                    <span className="font-black tracking-widest">LÍMITE ESTABLECIDO</span>
                                </div>
                            )}
                        </button>
                        
                        {/* DELETE BUTTON - REACTOR STYLE WITH ANIMATION */}
                        <button 
                            onClick={handleRemoveLimit}
                            disabled={(!isGlobalMode && !selectedNumber) || removeStatus !== 'IDLE'}
                            className={`w-full py-4 rounded-xl font-bold uppercase text-xs relative overflow-hidden group/btn disabled:opacity-50 disabled:cursor-not-allowed border-2 transition-all duration-300 ${
                                removeStatus === 'SUCCESS'
                                ? 'border-red-500 bg-red-600 text-white shadow-[0_0_30px_red]'
                                : 'border-red-500/50 text-red-400 hover:border-red-500 hover:text-red-200 hover:shadow-neon-red'
                            }`}
                        >
                            {removeStatus === 'IDLE' && (
                                <>
                                    <div className="absolute inset-0 bg-red-900/0 group-hover/btn:bg-red-900/20 transition-colors"></div>
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        <i className="fas fa-trash-alt"></i> {isGlobalMode ? 'Quitar Límite Global' : 'Eliminar Límite'}
                                    </span>
                                </>
                            )}

                            {removeStatus === 'REMOVING' && (
                                <div className="flex items-center justify-center gap-2 relative z-10">
                                    <i className="fas fa-cog fa-spin text-red-500"></i>
                                    <span className="animate-pulse">ELIMINANDO...</span>
                                </div>
                            )}

                            {removeStatus === 'SUCCESS' && (
                                <div className="flex items-center justify-center gap-2 animate-in zoom-in duration-300 relative z-10">
                                    <i className="fas fa-unlock-alt text-lg animate-[shake_0.5s_ease-in-out]"></i>
                                    <span className="font-black tracking-widest">RESTRICCIÓN ELIMINADA</span>
                                </div>
                            )}
                        </button>
                    </div>

                    {/* Selected Info (Specific Mode) */}
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

                {/* RIGHT: RISK GRID - THEMATICALLY ALIVE (WIDESCREEN TRANSFORM) */}
                <div className="xl:col-span-9 flex flex-col gap-4">
                    <div className={`bg-[#02040a] rounded-2xl border-2 transition-all duration-700 p-4 overflow-hidden shadow-inner relative group/grid flex-1 ${currentDrawTheme.base.split(' ')[1]}`}>
                        
                        {/* Dynamic Background Fog matching Draw */}
                        <div className={`absolute inset-0 ${currentDrawTheme.bg} opacity-5 blur-3xl animate-[pulse_6s_infinite]`}></div>

                        <div className="grid grid-cols-5 sm:grid-cols-10 xl:grid-cols-20 gap-2 h-auto max-h-[500px] overflow-y-auto custom-scrollbar relative z-10">
                            {gridData.map((cell) => (
                                <button
                                    key={cell.number}
                                    onClick={() => { setSelectedNumber(cell.number); setIsGlobalMode(false); }}
                                    className={`
                                        aspect-square rounded-md flex flex-col items-center justify-center relative overflow-hidden group
                                        ${getCellColor(cell.percent, cell.isLimited)}
                                        ${selectedNumber === cell.number ? 'ring-2 ring-white scale-110 z-20 shadow-[0_0_15px_white]' : 'hover:scale-110 hover:z-10'}
                                    `}
                                >
                                    <span className="text-[10px] xl:text-xs relative z-10 drop-shadow-md">{cell.number}</span>
                                    
                                    {/* Limit Indicators */}
                                    {cell.limitSource === 'GLOBAL' && (
                                        <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-cyber-purple shadow-[0_0_5px_#bc13fe] z-20" title="Límite Global"></div>
                                    )}
                                    {cell.limitSource === 'SPECIFIC' && (
                                        <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_5px_white] z-20" title="Límite Específico"></div>
                                    )}

                                    {/* Progress Bar for Limited Cells */}
                                    {cell.isLimited && (
                                        <div className="absolute bottom-0 left-0 w-full h-1 bg-black/60 z-10">
                                            <div 
                                                className={`h-full transition-all duration-700 ${
                                                    cell.percent >= 100 ? 'bg-red-500' : 
                                                    cell.percent >= 80 ? 'bg-orange-500' :
                                                    currentDrawTheme.bg
                                                }`} 
                                                style={{ width: `${Math.min(cell.percent, 100)}%` }}
                                            ></div>
                                        </div>
                                    )}
                                    
                                    {/* Living Glow on Hover */}
                                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity blur-sm"></div>
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    {/* LEGEND - NEON PHOSPHORESCENT LIFE */}
                    <div className="relative mt-2 group/legend">
                        {/* 1. The Neon Source (Backlight/Border Glow) */}
                        <div className="absolute -inset-[2px] bg-gradient-to-r from-green-500 via-yellow-500 to-red-600 rounded-xl opacity-70 blur-md group-hover/legend:opacity-100 group-hover/legend:blur-lg transition-all duration-500 animate-pulse"></div>

                        {/* 2. Light Beams (Coming out) */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 rounded-xl opacity-20 blur-xl"></div>

                        {/* 3. The Solid Container */}
                        <div className="relative bg-[#050a14] rounded-xl p-4 flex justify-center gap-4 md:gap-12 items-center border border-white/10 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] overflow-hidden">

                            {/* Scanline Shine */}
                            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 translate-x-[-150%] animate-[shine_4s_linear_infinite]"></div>

                            {/* Items */}
                            <div className="flex items-center gap-2 md:gap-3 group cursor-help relative z-10">
                                <div className="relative">
                                    <div className={`absolute inset-0 ${currentDrawTheme.bg} blur-md opacity-50 animate-pulse`}></div>
                                    <div className={`w-3 h-3 ${currentDrawTheme.bg} rounded-full border border-white/50`}></div>
                                </div>
                                <span className={`text-[9px] md:text-[10px] font-mono font-bold uppercase tracking-widest ${currentDrawTheme.base.split(' ')[0]}`}>Normal</span>
                            </div>

                            <div className="w-px h-4 bg-white/10"></div>

                            <div className="flex items-center gap-2 md:gap-3 group cursor-help relative z-10">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-yellow-500 blur-md opacity-50 animate-pulse"></div>
                                    <div className="w-3 h-3 bg-yellow-500 shadow-[0_0_10px_orange] rounded-full border border-white/50"></div>
                                </div>
                                <span className="text-[9px] md:text-[10px] font-mono font-bold uppercase tracking-widest text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]">Riesgo Medio</span>
                            </div>

                            <div className="w-px h-4 bg-white/10"></div>

                            <div className="flex items-center gap-2 md:gap-3 group cursor-help relative z-10">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-red-600 blur-md opacity-50 animate-pulse"></div>
                                    <div className="w-3 h-3 bg-red-600 shadow-[0_0_10px_red] rounded-full border border-white/50 animate-ping"></div>
                                    <div className="absolute inset-0 w-3 h-3 bg-red-600 rounded-full"></div>
                                </div>
                                <span className="text-[9px] md:text-[10px] font-mono font-bold uppercase tracking-widest text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]">Saturado</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>
  );
}
