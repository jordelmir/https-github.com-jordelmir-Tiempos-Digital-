
import React, { useState, useEffect, useMemo } from 'react';
import { DrawTime } from '../types';
import { api } from '../services/edgeApi';
import { useAuthStore } from '../store/useAuthStore';

interface AdminResultControlProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminResultControl({ isOpen, onClose }: AdminResultControlProps) {
  const user = useAuthStore(s => s.user);
  
  // State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDraw, setSelectedDraw] = useState<DrawTime>(DrawTime.NOCHE);
  const [winningNumber, setWinningNumber] = useState('');
  const [isReventado, setIsReventado] = useState(false);
  const [reventadoNumber, setReventadoNumber] = useState('');
  
  // Animation States
  const [inputAnim, setInputAnim] = useState(false);
  const [revInputAnim, setRevInputAnim] = useState(false);
  
  // Execution Logic
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [charging, setCharging] = useState(false);
  const [progress, setProgress] = useState(0);

  // Computed: Is this historical?
  const isHistorical = date !== new Date().toISOString().split('T')[0];

  // --- DYNAMIC THEME ENGINE (Solid Tint Core) ---
  const theme = useMemo(() => {
      // 1. PRIORITY: REVENTADOS (Hazard Mode)
      if (isReventado) return {
          name: 'hazard',
          color: 'text-red-500',
          border: 'border-red-500',
          bgHex: '#0f0202', // Solid Blood Red
          shadow: 'shadow-neon-red',
          glow: 'bg-red-600',
          iconColor: 'text-red-500',
          inputColor: 'text-red-500 drop-shadow-[0_0_15px_rgba(255,0,0,1)]'
      };
      
      // 2. PRIORITY: HISTORICAL (Emerald Mode)
      if (isHistorical) return {
          name: 'history',
          color: 'text-cyber-emerald',
          border: 'border-cyber-emerald',
          bgHex: '#020a05', // Solid Dark Emerald
          shadow: 'shadow-neon-emerald',
          glow: 'bg-cyber-emerald',
          iconColor: 'text-cyber-emerald',
          inputColor: 'text-cyber-emerald drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]'
      };

      // 3. PRIORITY: LIVE SCHEDULES
      switch (selectedDraw) {
          case DrawTime.MEDIODIA: return {
              name: 'solar',
              color: 'text-cyber-solar', // Neon Orange
              border: 'border-cyber-solar',
              bgHex: '#0c0400', // Solid Dark Orange
              shadow: 'shadow-neon-solar',
              glow: 'bg-cyber-solar',
              iconColor: 'text-cyber-solar',
              inputColor: 'text-cyber-solar drop-shadow-[0_0_15px_rgba(255,95,0,0.8)]'
          };
          case DrawTime.TARDE: return {
              name: 'vapor',
              color: 'text-cyber-vapor', // Deep Imperial Purple
              border: 'border-cyber-vapor',
              bgHex: '#05020c', // Solid Dark Violet
              shadow: 'shadow-neon-vapor',
              glow: 'bg-cyber-vapor',
              iconColor: 'text-cyber-vapor',
              inputColor: 'text-cyber-vapor drop-shadow-[0_0_15px_rgba(124,58,237,0.8)]'
          };
          case DrawTime.NOCHE: 
          default: return {
              name: 'abyss',
              color: 'text-blue-400', // Lighter Blue for text
              border: 'border-blue-600',
              bgHex: '#02040a', // Solid Dark Blue
              shadow: 'shadow-neon-abyss',
              glow: 'bg-cyber-blue',
              iconColor: 'text-cyber-blue',
              inputColor: 'text-cyber-blue drop-shadow-[0_0_15px_rgba(36,99,235,0.8)]'
          };
      }
  }, [isReventado, isHistorical, selectedDraw]);

  // Efecto de sacudida al activar reventados
  const [shake, setShake] = useState(false);
  useEffect(() => {
      if (isReventado) {
          setShake(true);
          const t = setTimeout(() => setShake(false), 500);
          return () => clearTimeout(t);
      }
  }, [isReventado]);

  // --- HOLD-TO-INJECT LOGIC ---
  const resetInternalState = () => {
      setCharging(false);
      setProgress(0);
      setLoading(false);
      setSuccess(false);
      setProcessedCount(0);
  };

  useEffect(() => {
      resetInternalState();
  }, [isOpen]);

  const handleInteractionStart = () => {
      if (!winningNumber || loading || success) return;
      if (isReventado && !reventadoNumber) return;
      setCharging(true);
  };

  const handleInteractionEnd = () => {
      if (progress < 100 && !success) {
          setCharging(false);
          setProgress(0);
      }
  };

  useEffect(() => {
      let interval: any;
      if (charging && !loading && !success) {
          interval = setInterval(() => {
              setProgress(prev => {
                  if (prev >= 100) {
                      clearInterval(interval);
                      return 100;
                  }
                  return prev + 4; // Speed of charge
              });
          }, 30);
      } else {
          clearInterval(interval);
          if (!success && !loading) setProgress(0);
      }
      return () => clearInterval(interval);
  }, [charging, loading, success]);

  // Trigger Submit when progress hits 100
  useEffect(() => {
      if (progress === 100 && !loading && !success) {
          handleSubmit();
      }
  }, [progress]);


  const handleSubmit = async () => {
    setLoading(true);

    try {
        const res = await api.publishDrawResult({
            date,
            drawTime: selectedDraw,
            winningNumber,
            isReventado,
            reventadoNumber: isReventado ? reventadoNumber : undefined,
            actor_id: user!.id
        });

        if (res.error) {
            alert(res.error);
            setLoading(false); // Unblock on error
            setCharging(false);
            setProgress(0);
        } else {
            setProcessedCount(res.data?.processed || 0);
            setSuccess(true);
            // KEEP LOADING TRUE VISUALLY UNTIL RESET
            
            setTimeout(() => {
                resetInternalState();
                setWinningNumber('');
                setReventadoNumber('');
                onClose(); // Or keep open? Usually close on success
            }, 3000);
        }
    } catch (e) {
        alert("Error de conexión al Núcleo.");
        setLoading(false);
        setCharging(false);
        setProgress(0);
    }
  };

  // --- INPUT HANDLERS WITH FX ---
  const handleWinningChange = (val: string) => {
      const clean = val.replace(/[^0-9]/g, '');
      setWinningNumber(clean);
      // Trigger Animation
      setInputAnim(true);
      setTimeout(() => setInputAnim(false), 200);
  };

  const handleReventadoChange = (val: string) => {
      const clean = val.replace(/[^0-9]/g, '');
      setReventadoNumber(clean);
      // Trigger Animation
      setRevInputAnim(true);
      setTimeout(() => setRevInputAnim(false), 200);
  };

  const getDrawIcon = (draw: DrawTime) => {
      if (draw.includes('Mediodía')) return 'fa-sun';
      if (draw.includes('Tarde')) return 'fa-cloud-sun';
      return 'fa-moon';
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in zoom-in duration-300">
        
        {/* Container */}
        <div className="relative w-full max-w-4xl mx-4">
            
            {/* Time Machine Backlight */}
            <div className={`absolute -inset-2 ${theme.glow} rounded-3xl opacity-20 blur-2xl animate-pulse transition-colors duration-700`}></div>

            <div 
                className={`border ${theme.border} ${theme.shadow} rounded-3xl w-full relative shadow-2xl overflow-hidden z-10 flex flex-col md:flex-row min-h-[500px] transition-all duration-700`}
                style={{ backgroundColor: theme.bgHex }}
            >
                
                {/* Left Side: Info Panel */}
                <div className="bg-black/20 p-8 md:w-1/3 border-b md:border-b-0 md:border-r border-white/10 relative overflow-hidden flex flex-col justify-between">
                    <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-${theme.color.replace('text-', '')} to-transparent opacity-50`}></div>
                    
                    <div>
                        <h2 className="text-2xl font-display font-black text-white uppercase tracking-tighter mb-1 leading-none">
                            Control <br/> <span className={`${theme.color} transition-colors duration-500`}>{isHistorical ? 'Histórico' : 'En Vivo'}</span>
                        </h2>
                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-8">Estación de Inyección</p>

                        <div className="space-y-6">
                            <div className={`bg-white/5 p-4 rounded-xl border ${theme.border}/30 transition-colors duration-500`}>
                                <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Modo Operativo</div>
                                <div className={`font-mono font-bold text-sm flex items-center gap-2 ${theme.color}`}>
                                    <i className={`fas ${isHistorical ? 'fa-clock' : 'fa-satellite-dish'} ${!isHistorical && 'animate-pulse'}`}></i>
                                    {isHistorical ? 'RE-ESCRITURA' : 'TRANSMISIÓN REAL'}
                                </div>
                            </div>

                            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Impacto en Ledger</div>
                                <div className="font-mono font-bold text-white text-xs">LIQUIDACIÓN AUTOMÁTICA</div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto pt-6">
                        <label className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-2 block">Fecha Objetivo</label>
                        <input 
                            type="date" 
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className={`w-full bg-black border ${theme.border} rounded-xl p-3 text-white font-mono text-sm focus:outline-none shadow-inner transition-colors duration-500`}
                        />
                    </div>
                </div>

                {/* Right Side: Controls */}
                <div className="p-8 md:w-2/3 relative flex flex-col transition-colors duration-700" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
                    <button onClick={onClose} className="absolute top-4 right-4 text-slate-600 hover:text-white transition-colors"><i className="fas fa-times text-lg"></i></button>

                    {/* 1. Draw Selector (Visual Cards) */}
                    <div className="mb-8">
                        <label className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-3 block">Seleccionar Sorteo</label>
                        <div className="grid grid-cols-3 gap-4">
                            {Object.values(DrawTime).map((t) => {
                                const isActive = selectedDraw === t;
                                
                                // Local determination for button colors to match the selected Draw logic regardless of current global theme
                                let activeClass = '';
                                if (t.includes('Mediodía')) activeClass = 'border-cyber-solar text-cyber-solar bg-cyber-solar/10 shadow-neon-solar';
                                else if (t.includes('Tarde')) activeClass = 'border-cyber-vapor text-cyber-vapor bg-cyber-vapor/10 shadow-neon-vapor';
                                else activeClass = 'border-blue-600 text-blue-400 bg-blue-900/20 shadow-neon-abyss';

                                return (
                                    <button
                                        key={t}
                                        onClick={() => setSelectedDraw(t)}
                                        className={`relative py-4 rounded-xl border transition-all duration-300 flex flex-col items-center gap-2 overflow-hidden group ${isActive ? activeClass : 'border-white/10 text-slate-500 hover:bg-white/5'}`}
                                    >
                                        {isActive && <div className={`absolute inset-0 opacity-10 animate-pulse bg-current`}></div>}
                                        <i className={`fas ${getDrawIcon(t)} text-xl ${isActive ? 'animate-bounce' : ''}`}></i>
                                        <span className="text-[10px] font-black uppercase tracking-wider">{t.split(' ')[0]}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* 2. Main Number Reactor */}
                    <div className="flex gap-6 items-stretch mb-8">
                        
                        {/* WINNING NUMBER INPUT - QUANTUM ANIMATION */}
                        <div className="flex-1 relative group/reactor">
                            {/* Outer Glow Ring */}
                            <div className={`absolute -inset-1 ${theme.glow} rounded-2xl opacity-10 blur-xl transition-colors duration-500 group-focus-within/reactor:opacity-40 group-focus-within/reactor:scale-105`}></div>
                            
                            <div className={`bg-black/40 border-2 ${theme.border} rounded-2xl p-6 flex flex-col items-center relative z-10 h-full justify-center transition-all duration-300 shadow-inner group-focus-within/reactor:bg-black/60`}>
                                <label className="text-[10px] font-mono font-bold text-white uppercase tracking-[0.3em] mb-2 opacity-50">Número Ganador</label>
                                
                                <div className="relative">
                                    {/* Quantum Particles Effect on Input */}
                                    {inputAnim && (
                                        <div className={`absolute inset-0 ${theme.glow} blur-md opacity-50 animate-ping`}></div>
                                    )}
                                    
                                    <input 
                                        type="text" 
                                        maxLength={2}
                                        value={winningNumber}
                                        onChange={e => handleWinningChange(e.target.value)}
                                        className={`bg-transparent text-8xl font-mono font-black text-center focus:outline-none w-full placeholder-white/5 transition-all duration-100 ${theme.inputColor} ${inputAnim ? 'scale-110' : 'scale-100'}`}
                                        placeholder="--"
                                        autoFocus
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Reventados Toggle Column - HAZARD UPGRADE */}
                        <div className={`w-32 flex flex-col justify-center rounded-2xl p-4 gap-4 transition-all duration-500 relative overflow-hidden border-2 ${isReventado ? 'bg-red-950/30 border-red-500 shadow-[0_0_30px_rgba(255,0,0,0.4)]' : 'bg-slate-900/20 border-white/10'} ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
                            
                            {/* Hazard Stripes Background */}
                            {isReventado && (
                                <div className="absolute inset-0 opacity-20 animate-[scroll_2s_linear_infinite]" style={{backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 10px, #ff0000 10px, #ff0000 20px)', backgroundSize: '200% 200%'}}></div>
                            )}

                            <div className="text-center relative z-10">
                                <div className={`text-[9px] font-bold uppercase tracking-widest mb-2 ${isReventado ? 'text-red-500 animate-pulse' : 'text-slate-500'}`}>
                                    {isReventado ? '⚠️ ALTO RIESGO' : 'Reventados'}
                                </div>
                                
                                {/* Mechanical Switch */}
                                <button 
                                    onClick={() => setIsReventado(!isReventado)}
                                    className={`w-14 h-8 rounded bg-black border-2 relative transition-all mx-auto ${isReventado ? 'border-red-500 shadow-[0_0_10px_red]' : 'border-slate-600'}`}
                                >
                                    <div className={`absolute top-1 bottom-1 w-5 h-5 rounded transition-all duration-300 ${isReventado ? 'left-7 bg-red-500 shadow-[0_0_5px_red]' : 'left-1 bg-slate-600'}`}></div>
                                </button>
                            </div>
                            
                            {/* RED BALL INPUT - PLASMA INSTABILITY */}
                            <div className={`transition-all duration-500 relative z-10 ${isReventado ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                                <label className="text-[7px] font-mono text-red-400 uppercase tracking-widest text-center block mb-1">Bola Roja</label>
                                <div className="relative">
                                    {revInputAnim && (
                                        <div className="absolute inset-0 bg-white opacity-50 blur-md animate-ping"></div>
                                    )}
                                    <input 
                                        type="text"
                                        maxLength={2}
                                        value={reventadoNumber}
                                        onChange={e => handleReventadoChange(e.target.value)}
                                        className={`w-full bg-black border-2 border-red-500 rounded-lg py-3 text-center text-2xl text-red-500 font-mono font-bold focus:outline-none shadow-neon-red placeholder-red-900/50 transition-transform duration-100 ${revInputAnim ? 'translate-x-1 scale-110' : ''}`}
                                        placeholder="--"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SUPER ACTIVATION BUTTON - HOLD TO INJECT */}
                    <button 
                        onMouseDown={handleInteractionStart}
                        onMouseUp={handleInteractionEnd}
                        onMouseLeave={handleInteractionEnd}
                        onTouchStart={handleInteractionStart}
                        onTouchEnd={handleInteractionEnd}
                        disabled={loading || !winningNumber || (isReventado && !reventadoNumber) || success}
                        className={`
                            w-full py-6 rounded-xl font-display font-black uppercase tracking-[0.2em] transition-all relative overflow-hidden group mt-auto select-none border-2
                            ${success 
                                ? 'bg-black border-green-500 text-green-500 shadow-[0_0_50px_lime]' 
                                : isReventado 
                                    ? 'bg-red-900/20 border-red-600 text-red-500 hover:shadow-neon-red hover:text-white' 
                                    : `${theme.color.replace('text-', 'border-')} text-white hover:shadow-${theme.shadow}`
                            }
                            ${charging ? (isReventado ? 'animate-[shake_0.2s_ease-in-out_infinite]' : 'animate-pulse') : ''}
                            disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                    >
                        {/* PROGRESS FILL (CHARGING) */}
                        <div 
                            className={`absolute top-0 left-0 h-full transition-all ease-linear duration-75 ${isReventado ? 'bg-red-600' : theme.color.replace('text-', 'bg-')}`}
                            style={{ width: `${progress}%`, opacity: charging ? 0.8 : 0 }}
                        ></div>

                        {/* SCANLINES & GLITCH (REVENTADOS ONLY) */}
                        {isReventado && !success && (
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.5)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] opacity-20 pointer-events-none"></div>
                        )}

                        {/* CONTENT LAYER */}
                        <div className="relative z-10 flex items-center justify-center gap-3 mix-blend-normal">
                            
                            {/* LOADING STATE */}
                            {loading ? (
                                <>
                                    <i className="fas fa-circle-notch fa-spin"></i>
                                    <span>INICIANDO SECUENCIA...</span>
                                </>
                            ) : success ? (
                                /* QUANTUM LOCK SUCCESS STATE */
                                <div className="flex items-center gap-4 animate-in zoom-in duration-300">
                                    <div className="relative">
                                        <i className="fas fa-lock text-2xl"></i>
                                        <div className="absolute -inset-2 border-2 border-green-500 rounded-full animate-ping"></div>
                                    </div>
                                    <div className="flex flex-col items-start leading-none">
                                        <span className="text-lg">RESULTADO FIJADO</span>
                                        <span className="text-[10px] opacity-70 font-mono tracking-widest">{processedCount} PAGOS EJECUTADOS</span>
                                    </div>
                                </div>
                            ) : (
                                /* IDLE / CHARGING STATE */
                                <>
                                    {charging ? (
                                        <span className={`${isReventado ? 'text-white font-black text-xl drop-shadow-[0_0_10px_black]' : 'text-black font-bold'}`}>
                                            {progress < 100 ? (isReventado ? 'ARMANDO DETONADOR...' : 'CARGANDO ENLACE...') : 'EJECUTANDO...'}
                                        </span>
                                    ) : (
                                        <>
                                            {isReventado ? <i className="fas fa-radiation fa-spin-slow text-xl"></i> : <i className="fas fa-fingerprint text-xl"></i>}
                                            <span>
                                                {isReventado ? 'MANTENER PARA DETONAR' : 'MANTENER PARA PUBLICAR'}
                                            </span>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                        
                        {/* Electric Arcs (Reventados Hover) */}
                        {isReventado && !charging && !success && (
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none">
                                <div className="absolute top-0 left-1/4 w-1 h-full bg-white blur-sm animate-pulse"></div>
                                <div className="absolute top-0 right-1/4 w-1 h-full bg-white blur-sm animate-pulse delay-75"></div>
                            </div>
                        )}
                    </button>

                </div>
            </div>
            <style>{`
                @keyframes shake {
                    0% { transform: translate(1px, 1px) rotate(0deg); }
                    10% { transform: translate(-1px, -2px) rotate(-1deg); }
                    20% { transform: translate(-3px, 0px) rotate(1deg); }
                    30% { transform: translate(3px, 2px) rotate(0deg); }
                    40% { transform: translate(1px, -1px) rotate(1deg); }
                    50% { transform: translate(-1px, 2px) rotate(-1deg); }
                    60% { transform: translate(-3px, 1px) rotate(0deg); }
                    70% { transform: translate(3px, 1px) rotate(-1deg); }
                    80% { transform: translate(-1px, -1px) rotate(1deg); }
                    90% { transform: translate(1px, 2px) rotate(0deg); }
                    100% { transform: translate(1px, -2px) rotate(-1deg); }
                }
                @keyframes scroll {
                    0% { background-position: 0 0; }
                    100% { background-position: 50px 50px; }
                }
            `}</style>
        </div>
    </div>
  );
}
