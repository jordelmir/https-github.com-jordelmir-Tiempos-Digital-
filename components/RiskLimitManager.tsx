import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../services/edgeApi';
import { DrawTime, RiskLimit, RiskLimitStats } from '../types';
import { formatCurrency } from '../constants';

// --- TYPES & INTERFACES ---
type ViewMode = 'SATURATION' | 'VOLUME' | 'VELOCITY';

interface GridCell {
    number: string;
    percent: number;
    amount: number;
    limit: number;
    velocity: number; // 0-100 scale of sales/minute
    ticketCount: number;
    isShielded: boolean;
    isManual: boolean; // True if it has a specific limit overriding global
    trend: number[]; // Array for sparkline
}

// --- MICRO-COMPONENTS ---

// 1. SPARKLINE SVG (Gráfico de línea minimalista)
const Sparkline = ({ data, color }: { data: number[], color: string }) => {
    const max = Math.max(...data, 10);
    const min = Math.min(...data);
    const range = max - min || 1;
    const width = 100;
    const height = 30;
    
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((d - min) / range) * height;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
            <polyline points={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
            <circle cx={(data.length-1) / (data.length-1) * width} cy={height - ((data[data.length-1] - min) / range) * height} r="3" fill={color} className="animate-pulse" />
        </svg>
    );
};

// 2. RADAR CHART (Distribución)
const DistributionBar = ({ player, vendor, color }: { player: number, vendor: number, color: string }) => {
    const total = player + vendor || 1;
    const pPerc = (player / total) * 100;
    
    return (
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
            <div className={`h-full ${color}`} style={{ width: `${pPerc}%` }}></div>
            <div className="h-full bg-slate-600" style={{ width: `${100 - pPerc}%` }}></div>
        </div>
    );
};

export default function RiskLimitManager() {
  // --- STATE ---
  const [activeDraw, setActiveDraw] = useState<DrawTime>(DrawTime.NOCHE);
  const [viewMode, setViewMode] = useState<ViewMode>('SATURATION');
  
  const [limits, setLimits] = useState<RiskLimit[]>([]);
  const [stats, setStats] = useState<RiskLimitStats[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selection Logic
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [hoveredNumber, setHoveredNumber] = useState<string | null>(null);
  
  // Input State
  const [manualInputValue, setManualInputValue] = useState<string>('');
  const [globalInputValue, setGlobalInputValue] = useState<string>('');
  
  // --- PROTOCOLO DE ANCLAJE LOCAL (Client-Truth persistence) ---
  // Stores the user's latest global setting to override server lag/polling.
  const [localGlobalAnchor, setLocalGlobalAnchor] = useState<{ val: number, timestamp: number } | null>(null);

  // System Controls
  const [isBlindajeActive, setIsBlindajeActive] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVING' | 'SUCCESS'>('IDLE');
  
  // Prevent flicker during optimistic updates
  const pendingWrites = useRef<Set<string>>(new Set());

  // --- HELPER: Normalize Limit Value ---
  // Converts DB specific values (like -1 for Infinity) to workable numbers
  const normalizeLimit = (val: number | undefined) => {
      if (val === undefined || val === -1 || val >= 999999999) return Infinity;
      return val;
  };

  // --- DERIVED GLOBAL LIMIT (The Core Fix Logic) ---
  // 1. Get from Server State
  const serverGlobalLimitRaw = limits.find(l => l.number === 'ALL')?.max_amount;
  const serverGlobalLimit = normalizeLimit(serverGlobalLimitRaw);
  
  // 2. Compute Effective Global Limit (Priority: Local Anchor > Server)
  const effectiveGlobalLimit = useMemo(() => {
      // If we have a local change less than 20 seconds old, use it (Client Truth)
      if (localGlobalAnchor && (Date.now() - localGlobalAnchor.timestamp < 20000)) {
          return localGlobalAnchor.val;
      }
      return serverGlobalLimit;
  }, [serverGlobalLimit, localGlobalAnchor]);

  // Update Input when Global Limit Changes (only if not editing)
  useEffect(() => {
      if (effectiveGlobalLimit !== Infinity && effectiveGlobalLimit !== 0) {
          setGlobalInputValue((effectiveGlobalLimit / 100).toString());
      } else {
          setGlobalInputValue('');
      }
  }, [effectiveGlobalLimit]);

  // --- MOCK DATA ENGINE (High Fidelity Simulation) ---
  const gridData: GridCell[] = useMemo(() => {
      return Array.from({ length: 100 }, (_, i) => {
          const numStr = i.toString().padStart(2, '0');
          const specificLimitObj = limits.find(l => l.number === numStr);
          const stat = stats.find(s => s.number === numStr);
          
          // Determine effective limit for this cell
          // If specific limit exists, use it. Otherwise inherit global.
          const isManual = !!specificLimitObj;
          const rawLimit = isManual ? specificLimitObj.max_amount : effectiveGlobalLimit;
          const activeLimit = normalizeLimit(rawLimit);
          
          const amountSold = stat ? stat.total_sold : 0; 
          
          // Calculate Saturation Percentage
          let percent = 0;
          if (activeLimit === 0) percent = 100; // Locked
          else if (activeLimit === Infinity) percent = 0; // Unlimited
          else percent = Math.min((amountSold / activeLimit) * 100, 100);
          
          // Advanced metrics simulation
          const velocity = Math.random() * 100;
          const trend = Array.from({ length: 10 }, () => Math.random() * amountSold);

          return {
              number: numStr,
              percent,
              amount: amountSold,
              limit: activeLimit,
              velocity,
              ticketCount: Math.floor(amountSold / 500),
              isShielded: activeLimit === 0 || (isBlindajeActive && percent >= 95),
              isManual,
              trend
          };
      });
  }, [limits, stats, isBlindajeActive, effectiveGlobalLimit]);

  // --- DATA FETCHING ---
  const fetchData = async () => {
    if (limits.length === 0) setLoading(true);
    try {
        const [limitsRes, statsRes] = await Promise.all([
            api.getRiskLimits({ draw: activeDraw }),
            api.getRiskStats({ draw: activeDraw })
        ]);
        
        if (limitsRes.data) {
            setLimits(prevLimits => {
                // Merge pending writes to prevent UI flicker/rollback
                if (pendingWrites.current.size > 0) {
                    let merged = [...limitsRes.data!.limits];
                    pendingWrites.current.forEach(lockedKey => {
                        const local = prevLimits.find(l => l.number === lockedKey);
                        if (local) {
                            // Remove server version, keep local version
                            merged = merged.filter(l => l.number !== lockedKey);
                            merged.push(local);
                        }
                    });
                    return merged;
                }
                return limitsRes.data!.limits;
            });
        }
        if (statsRes.data) setStats(statsRes.data.stats);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [activeDraw]);

  // --- ACTIONS ---
  
  // 1. SELECTION TOGGLE (Fix for "Stuck" numbers)
  const handleCellClick = (numStr: string) => {
      if (selectedNumber === numStr) {
          // Deselect if already selected
          setSelectedNumber(null);
          setManualInputValue('');
      } else {
          // Select new number
          setSelectedNumber(numStr);
          const cell = gridData.find(c => c.number === numStr);
          // Set input to current manual limit if exists
          if (cell?.isManual && cell.limit !== Infinity) {
              setManualInputValue((cell.limit / 100).toString());
          } else {
              setManualInputValue('');
          }
      }
  };

  // 2. SAVE LIMIT (Universal)
  const saveLimit = async (targetNumber: string, amount: number) => {
      setSaveStatus('SAVING');
      pendingWrites.current.add(targetNumber);
      
      // Update Local Anchor if Global (Key fix for persistence)
      if (targetNumber === 'ALL') {
          setLocalGlobalAnchor({
              val: amount === -1 ? Infinity : amount, 
              timestamp: Date.now()
          });
      }

      // Optimistic Update for UI
      const newLimit = { 
          id: `temp-${Date.now()}`, 
          draw_type: activeDraw, 
          number: targetNumber, 
          max_amount: amount, 
          created_at: new Date().toISOString() 
      };
      
      setLimits(prev => {
          const filtered = prev.filter(l => l.number !== targetNumber);
          return [...filtered, newLimit];
      });

      // API Call
      // Removed forced fetchData here to allow Anchor to hold truth
      await new Promise(r => setTimeout(r, 600)); // Artificial network feel
      await api.updateRiskLimit({ draw: activeDraw, number: targetNumber, max_amount: amount });
      
      setSaveStatus('SUCCESS');
      setTimeout(() => {
          setSaveStatus('IDLE');
          pendingWrites.current.delete(targetNumber);
      }, 1500);
  };

  // 3. HANDLERS
  const handleSaveSelected = () => {
      if (!selectedNumber) return;
      if (!manualInputValue) {
          return;
      }
      const val = Number(manualInputValue) * 100; // Cents
      saveLimit(selectedNumber, val);
  };

  const handleResetSelected = () => {
      if (!selectedNumber) return;
      setLimits(prev => prev.filter(l => l.number !== selectedNumber));
      api.updateRiskLimit({ draw: activeDraw, number: selectedNumber, max_amount: -2 }); 
      setManualInputValue('');
  };

  const handleSaveGlobal = () => {
      if (!globalInputValue) return;
      const val = Number(globalInputValue) * 100; // Cents
      saveLimit('ALL', val);
  };

  const handleSetGlobalUnlimited = () => {
      saveLimit('ALL', -1);
      setGlobalInputValue('');
  };

  // --- THEME ---
  const theme = useMemo(() => {
      if (activeDraw.includes('Mediodía')) return { 
          hex: '#ff5f00', name: 'solar', gradient: 'from-orange-500 to-red-600', 
          border: 'border-cyber-solar', text: 'text-cyber-solar', bg: 'bg-cyber-solar' 
      };
      if (activeDraw.includes('Tarde')) return { 
          hex: '#7c3aed', name: 'vapor', gradient: 'from-purple-500 to-indigo-600', 
          border: 'border-cyber-vapor', text: 'text-cyber-vapor', bg: 'bg-cyber-vapor' 
      };
      return { 
          hex: '#2563eb', name: 'abyss', gradient: 'from-blue-500 to-cyan-500', 
          border: 'border-blue-500', text: 'text-blue-400', bg: 'bg-blue-500' 
      };
  }, [activeDraw]);

  // --- HELPERS ---
  const activeCell = gridData.find(c => c.number === (hoveredNumber || selectedNumber)) || null;
  const totalExposure = gridData.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="w-full relative group font-sans">
        {/* ATMOSPHERE */}
        <div className={`absolute -inset-2 opacity-20 blur-3xl bg-gradient-to-r ${theme.gradient} animate-pulse pointer-events-none`}></div>

        <div className="relative bg-[#02040a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col xl:flex-row min-h-[700px]">
            
            {/* ====================================================================================
                LEFT PANEL: THE MATRIX (60%)
               ==================================================================================== */}
            <div className="xl:w-3/5 flex flex-col border-r border-white/5 relative">
                
                {/* 1. HUD HEADER */}
                <div className="p-6 border-b border-white/5 bg-[#05070a]/50 backdrop-blur-sm z-20">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <i className={`fas fa-shield-alt ${theme.text}`}></i>
                                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Sistema de Defensa Financiera</span>
                            </div>
                            <h2 className="text-3xl font-display font-black text-white uppercase tracking-tighter flex items-center gap-3 text-shadow-lg">
                                Matriz de <span className={`text-transparent bg-clip-text bg-gradient-to-r ${theme.gradient}`}>Riesgo</span>
                            </h2>
                        </div>
                        
                        <div className="text-right">
                            <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Límite Global Actual</div>
                            <div className={`text-xl font-mono font-bold ${effectiveGlobalLimit === Infinity ? 'text-cyber-neon' : 'text-white'} drop-shadow-md transition-all duration-500`}>
                                {effectiveGlobalLimit === Infinity ? (
                                    <span className="flex items-center justify-end gap-2 animate-pulse"><i className="fas fa-infinity"></i> ILIMITADO</span>
                                ) : formatCurrency(effectiveGlobalLimit)}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 mt-1 flex items-center justify-end gap-1">
                                Exp. Total: {formatCurrency(totalExposure)}
                            </div>
                        </div>
                    </div>

                    {/* CONTROLS BRIDGE */}
                    <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                        
                        {/* Draw Tabs */}
                        <div className="flex gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
                            {Object.values(DrawTime).map(d => (
                                <button
                                    key={d}
                                    onClick={() => setActiveDraw(d)}
                                    className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all duration-300 ${
                                        activeDraw === d 
                                        ? `bg-white/10 text-white shadow-inner border border-white/10` 
                                        : 'text-slate-500 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    {d.split(' ')[0]}
                                </button>
                            ))}
                        </div>

                        {/* View Mode X-RAY */}
                        <div className="flex gap-2">
                            <span className="text-[9px] font-bold text-slate-600 uppercase self-center mr-2">VISTA DE RAYOS-X:</span>
                            {[
                                { id: 'SATURATION', label: '% Satura', icon: 'fa-chart-pie' },
                                { id: 'VOLUME', label: '$$ Volumen', icon: 'fa-coins' },
                                { id: 'VELOCITY', label: 'Velocidad', icon: 'fa-tachometer-alt' }
                            ].map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => setViewMode(m.id as ViewMode)}
                                    className={`px-3 py-1.5 rounded border text-[9px] font-bold uppercase flex items-center gap-2 transition-all ${
                                        viewMode === m.id 
                                        ? `${theme.border} ${theme.text} bg-white/5 shadow-[0_0_10px_rgba(0,0,0,0.5)]` 
                                        : 'border-slate-800 text-slate-600 hover:border-slate-600'
                                    }`}
                                >
                                    <i className={`fas ${m.icon}`}></i> {m.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 2. THE GRID */}
                <div className="flex-1 p-6 relative bg-[#020305]">
                    {loading && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
                            <i className={`fas fa-circle-notch fa-spin text-4xl ${theme.text} mb-4`}></i>
                            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Escaneando Vectores de Apuesta...</span>
                        </div>
                    )}
                    
                    <div className="grid grid-cols-10 gap-1 h-full w-full">
                        {gridData.map((cell) => {
                            // DYNAMIC VISUAL ENGINE
                            const isSelected = cell.number === selectedNumber;
                            const isHighRisk = cell.percent >= 90;
                            const isMedRisk = cell.percent >= 70;
                            
                            let bgStyle = { backgroundColor: '#0a0c10' };
                            if (viewMode === 'SATURATION') {
                                if (cell.percent > 0) {
                                    const opacity = Math.max(0.1, cell.percent / 100);
                                    bgStyle = { backgroundColor: isHighRisk ? `rgba(220, 38, 38, ${opacity})` : isMedRisk ? `rgba(234, 179, 8, ${opacity})` : `rgba(37, 99, 235, ${opacity})` };
                                }
                            }

                            return (
                                <button
                                    key={cell.number}
                                    onMouseEnter={() => setHoveredNumber(cell.number)}
                                    onMouseLeave={() => setHoveredNumber(null)}
                                    onClick={() => handleCellClick(cell.number)}
                                    className={`
                                        relative rounded-sm border transition-all duration-150 flex flex-col items-center justify-center overflow-hidden group
                                        ${isSelected ? 'border-white z-10 scale-110 shadow-[0_0_15px_rgba(255,255,255,0.5)]' : 'border-white/5 hover:border-white/30'}
                                    `}
                                    style={bgStyle}
                                >
                                    <span className={`text-[10px] font-mono font-bold z-10 ${isSelected ? 'text-white' : cell.percent > 0 ? 'text-white' : 'text-slate-700'}`}>
                                        {cell.number}
                                    </span>

                                    {/* MICRO-DATA OVERLAYS */}
                                    {viewMode === 'VOLUME' && cell.amount > 0 && (
                                        <span className="text-[7px] text-emerald-400 font-mono z-10">
                                            {(cell.amount / 100000).toFixed(1)}k
                                        </span>
                                    )}
                                    {viewMode === 'VELOCITY' && cell.velocity > 20 && (
                                        <div className="absolute inset-0 flex items-center justify-center opacity-30">
                                            <i className="fas fa-arrow-up text-white animate-bounce text-[8px]"></i>
                                        </div>
                                    )}

                                    {/* Risk Bar (Bottom) */}
                                    <div className="absolute bottom-0 left-0 w-full h-1 bg-black/50">
                                        <div 
                                            className={`h-full transition-all duration-500 ${isHighRisk ? 'bg-red-500' : isMedRisk ? 'bg-yellow-500' : theme.bg}`} 
                                            style={{ width: `${cell.percent}%` }}
                                        ></div>
                                    </div>

                                    {/* Manual Override Indicator */}
                                    {cell.isManual && (
                                        <div className="absolute top-0 right-0 p-0.5">
                                            <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_5px_white]"></div>
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* 3. ALARM TICKER */}
                <div className="h-8 bg-[#0f0505] border-t border-red-900/30 flex items-center overflow-hidden relative">
                    <div className="bg-red-900/20 px-3 h-full flex items-center text-[9px] font-bold text-red-500 uppercase tracking-widest z-10 border-r border-red-900/30">
                        <i className="fas fa-exclamation-triangle mr-2 animate-pulse"></i> LIVE FEED
                    </div>
                    <div className="flex-1 whitespace-nowrap animate-scroll-ticker flex items-center text-[9px] font-mono text-red-400/80">
                        <span className="mx-4">SISTEMA ACTIVO: MONITORIZANDO {gridData.length} VECTORES</span>
                        <span className="mx-4">|</span>
                        <span className="mx-4">LÍMITE GLOBAL: {effectiveGlobalLimit === Infinity ? 'ILIMITADO' : formatCurrency(effectiveGlobalLimit)}</span>
                        <span className="mx-4">|</span>
                        <span className="mx-4">SINCRONIZACIÓN: ESTABLE</span>
                    </div>
                </div>
            </div>

            {/* ====================================================================================
                RIGHT PANEL: DUAL MODE (Global vs Inspector)
               ==================================================================================== */}
            <div className="xl:w-2/5 bg-[#05070a] flex flex-col relative overflow-hidden transition-all duration-500">
                
                {/* Background Grid */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[length:30px_30px] pointer-events-none"></div>

                {selectedNumber ? (
                    // --- MODE A: NUMBER INSPECTOR (Specific) ---
                    <div className="flex-1 flex flex-col p-8 relative z-10 animate-in slide-in-from-right-4 duration-300">
                        
                        {/* A. NUMBER IDENTITY HEADER */}
                        <div className="flex justify-between items-start mb-8 relative">
                            <button 
                                onClick={() => setSelectedNumber(null)}
                                className="absolute -top-4 -right-4 text-slate-500 hover:text-white p-2 transition-colors"
                            >
                                <i className="fas fa-times text-lg"></i>
                            </button>
                            <div className={`absolute -inset-4 ${theme.bg} opacity-10 blur-2xl rounded-full`}></div>
                            <div>
                                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-mono mb-1">Análisis Táctico</div>
                                <div className="text-7xl font-mono font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                                    {selectedNumber}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className={`text-5xl font-mono font-bold ${activeCell?.percent && activeCell.percent >= 90 ? 'text-red-500 drop-shadow-[0_0_10px_red]' : 'text-white'}`}>
                                    {activeCell?.percent.toFixed(0)}<span className="text-2xl opacity-50">%</span>
                                </div>
                                <div className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Saturación</div>
                            </div>
                        </div>

                        {/* B. MAIN METRICS */}
                        {activeCell && (
                            <>
                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                                        <div className="text-[9px] text-slate-400 uppercase mb-2">Volumen Financiero</div>
                                        <div className="text-xl font-mono font-bold text-white">{formatCurrency(activeCell.amount)}</div>
                                        <div className="w-full bg-black h-1 mt-2 rounded-full overflow-hidden">
                                            <div className={`h-full ${theme.bg}`} style={{ width: `${activeCell.percent}%` }}></div>
                                        </div>
                                    </div>
                                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                                        <div className="text-[9px] text-slate-400 uppercase mb-2">Límite Vigente</div>
                                        <div className="text-xl font-mono font-bold text-slate-300">
                                            {activeCell.limit === Infinity ? 'ILIMITADO' : formatCurrency(activeCell.limit)}
                                        </div>
                                        <div className="text-[8px] text-slate-500 mt-2 flex items-center gap-1">
                                            <i className={`fas fa-lock ${activeCell.isManual ? 'text-cyan-400' : 'text-slate-600'}`}></i>
                                            {activeCell.isManual ? 'MANUAL' : 'GLOBAL DEFAULT'}
                                        </div>
                                    </div>
                                </div>

                                {/* D. CONTROL DECK */}
                                <div className="mt-auto pt-6 border-t border-white/10">
                                    <label className="text-[9px] text-slate-500 uppercase font-bold mb-3 block ml-1">Override Local (Individual)</label>
                                    
                                    <div className="flex gap-2 mb-4">
                                        <div className="relative flex-1">
                                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500 text-xs">CRC</div>
                                            <input 
                                                type="number"
                                                value={manualInputValue}
                                                onChange={e => setManualInputValue(e.target.value)}
                                                className="bg-black border border-slate-700 rounded-xl px-4 py-3 pl-10 text-white font-mono text-lg w-full focus:border-white focus:outline-none transition-colors"
                                                placeholder="Definir Límite Único"
                                            />
                                        </div>
                                        <button 
                                            onClick={handleSaveSelected}
                                            disabled={saveStatus !== 'IDLE'}
                                            className={`px-6 rounded-xl font-bold uppercase transition-all shadow-lg ${
                                                saveStatus === 'SUCCESS' ? 'bg-green-500 text-black' : 'bg-white text-black hover:scale-105'
                                            }`}
                                        >
                                            {saveStatus === 'SAVING' ? <i className="fas fa-circle-notch fa-spin"></i> : saveStatus === 'SUCCESS' ? <i className="fas fa-check"></i> : <i className="fas fa-save"></i>}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => { setManualInputValue('0'); }} className="py-3 bg-red-950/30 border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2 group/btn">
                                            <i className="fas fa-ban group-hover/btn:animate-ping"></i> 0.00 (Bloqueo)
                                        </button>
                                        <button onClick={handleResetSelected} className="py-3 bg-cyan-950/30 border border-cyan-500/50 text-cyan-500 hover:bg-cyan-500 hover:text-white rounded-xl text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2">
                                            <i className="fas fa-undo"></i> Heredar Global
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                    </div>
                ) : (
                    // --- MODE B: GLOBAL CONTROL CENTER (Default) ---
                    <div className="flex-1 flex flex-col relative z-10 animate-in fade-in duration-500 bg-[#05070a]">
                        
                        {/* 1. REACTOR HEADER */}
                        <div className="p-8 border-b border-white/5 bg-black/20">
                            <h2 className="text-2xl font-display font-black text-white uppercase tracking-widest flex items-center gap-3">
                                <i className="fas fa-atom text-cyber-blue animate-spin-slow"></i>
                                Control de <span className="text-cyber-blue text-glow">Núcleo</span>
                            </h2>
                            <p className="text-[10px] font-mono text-slate-500 uppercase mt-2">
                                Configuración Maestra de Límites Globales
                            </p>
                        </div>

                        {/* 2. THE VISUALIZER (Reactor Core) */}
                        <div className="flex-1 flex flex-col items-center justify-center relative p-8">
                            
                            {/* Energy Rings */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border border-white/5"></div>
                            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 rounded-full border-2 border-dashed ${effectiveGlobalLimit === Infinity ? 'border-cyber-neon animate-[spin_10s_linear_infinite]' : 'border-red-500 animate-pulse'} opacity-30`}></div>

                            {/* CORE STATUS DISPLAY */}
                            <div className="text-center z-10">
                                <div className={`text-[10px] font-bold uppercase tracking-[0.3em] mb-2 ${effectiveGlobalLimit === Infinity ? 'text-cyber-neon' : 'text-red-500'}`}>
                                    {effectiveGlobalLimit === Infinity ? 'MODO: FLUJO LIBRE' : 'MODO: CONTENCIÓN'}
                                </div>
                                <div className={`text-5xl font-mono font-black ${effectiveGlobalLimit === Infinity ? 'text-white' : 'text-red-500 drop-shadow-[0_0_15px_red]'}`}>
                                    {effectiveGlobalLimit === Infinity ? (
                                        <i className="fas fa-infinity text-6xl"></i>
                                    ) : (
                                        formatCurrency(effectiveGlobalLimit).replace('CRC', '').trim()
                                    )}
                                </div>
                                <div className="text-[9px] text-slate-500 font-mono mt-2 uppercase tracking-widest">
                                    CRC / Vector
                                </div>
                            </div>
                        </div>

                        {/* 3. CONTROL DECK (Bottom) */}
                        <div className="p-8 border-t border-white/10 bg-[#080a10]">
                            
                            {/* Mode Selector Switch - UPGRADED THEMATIC TOGGLE */}
                            <div className="relative bg-black border border-white/10 rounded-2xl p-1.5 flex mb-6 shadow-inner overflow-hidden h-14">
                                {/* PISTON BACKGROUND INDICATOR */}
                                <div 
                                    className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-xl transition-all duration-500 ease-out z-0 
                                    ${effectiveGlobalLimit === Infinity 
                                        ? 'translate-x-0 bg-cyber-neon/10 border border-cyber-neon/30 shadow-[0_0_20px_rgba(0,240,255,0.1)]' 
                                        : 'translate-x-[100%] bg-red-900/30 border border-red-500/30 shadow-[0_0_20px_rgba(255,0,0,0.1)] left-[6px]'
                                    }`}
                                ></div>

                                {/* UNLIMITED BUTTON */}
                                <button 
                                    onClick={handleSetGlobalUnlimited}
                                    className={`relative flex-1 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all duration-500 z-10 group
                                    ${effectiveGlobalLimit === Infinity ? 'text-cyber-neon' : 'text-slate-500 hover:text-white'}`}
                                >
                                    {effectiveGlobalLimit === Infinity && (
                                        <div className="absolute inset-0 bg-cyber-neon opacity-5 blur-md animate-pulse"></div>
                                    )}
                                    <i className={`fas fa-infinity text-lg ${effectiveGlobalLimit === Infinity ? 'animate-spin-slow drop-shadow-[0_0_5px_cyan]' : ''}`}></i>
                                    <span>Ilimitado</span>
                                </button>

                                {/* RESTRICTED BUTTON */}
                                <button 
                                    onClick={() => { if(effectiveGlobalLimit === Infinity) setGlobalInputValue('50000'); }}
                                    className={`relative flex-1 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all duration-500 z-10 overflow-hidden group
                                    ${effectiveGlobalLimit !== Infinity ? 'text-red-500' : 'text-slate-500 hover:text-white'}`}
                                >
                                    {effectiveGlobalLimit !== Infinity && (
                                        <>
                                            <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,#ff0000_5px,#ff0000_10px)] opacity-10 animate-[pulse_2s_infinite]"></div>
                                            <div className="absolute inset-0 bg-red-500 opacity-5 blur-md"></div>
                                        </>
                                    )}
                                    <i className={`fas fa-lock text-lg ${effectiveGlobalLimit !== Infinity ? 'drop-shadow-[0_0_5px_red]' : ''}`}></i>
                                    <span>Restringido</span>
                                </button>
                            </div>

                            {/* Manual Input Area */}
                            <div className={`transition-all duration-500 overflow-hidden ${effectiveGlobalLimit !== Infinity || globalInputValue ? 'max-h-40 opacity-100' : 'max-h-0 opacity-50'}`}>
                                <div className="flex gap-2">
                                    <div className="relative flex-1 group/input">
                                        <div className="absolute -inset-0.5 bg-red-500/30 rounded-xl blur opacity-0 group-focus-within/input:opacity-100 transition-opacity"></div>
                                        <input 
                                            type="number"
                                            value={globalInputValue}
                                            onChange={e => setGlobalInputValue(e.target.value)}
                                            className="relative w-full bg-black border border-red-900/50 rounded-xl px-4 py-4 text-center text-white font-mono text-xl focus:border-red-500 focus:outline-none transition-colors"
                                            placeholder="DEFINIR LÍMITE..."
                                        />
                                    </div>
                                    <button 
                                        onClick={handleSaveGlobal}
                                        disabled={saveStatus !== 'IDLE' || !globalInputValue}
                                        className="w-20 bg-red-600 hover:bg-white hover:text-red-600 text-black font-bold rounded-xl flex items-center justify-center text-xl transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {saveStatus === 'SAVING' ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-check"></i>}
                                    </button>
                                </div>
                                <p className="text-[8px] text-red-400/50 text-center mt-2 font-mono uppercase">
                                    * Este valor sobrescribirá todos los límites no manuales.
                                </p>
                            </div>

                        </div>

                    </div>
                )}

                {/* --- BLINDAJE MASTER SWITCH (Fixed Bottom) --- */}
                <div className="p-4 border-t border-white/10 bg-[#02040a] relative z-20">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-[9px] font-bold text-slate-500 uppercase">Protocolo de Emergencia</div>
                            <div className="text-xs text-white font-mono">Blindaje Automático</div>
                        </div>
                        <button 
                            onClick={() => setIsBlindajeActive(!isBlindajeActive)}
                            className={`relative w-16 h-8 rounded-full transition-colors duration-300 ${isBlindajeActive ? 'bg-red-600 shadow-[0_0_15px_red]' : 'bg-slate-800'}`}
                        >
                            <div className={`absolute top-1 bottom-1 w-6 h-6 bg-white rounded-full transition-transform duration-300 shadow-md flex items-center justify-center ${isBlindajeActive ? 'translate-x-9' : 'translate-x-1'}`}>
                                {isBlindajeActive && <i className="fas fa-lock text-[8px] text-red-600"></i>}
                            </div>
                        </button>
                    </div>
                </div>

            </div>

        </div>
    </div>
  );
}