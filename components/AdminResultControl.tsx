
import React, { useState, useEffect, useMemo } from 'react';
import { DrawTime } from '../types';
import { api } from '../services/edgeApi';
import { useAuthStore } from '../store/useAuthStore';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface AdminResultControlProps {
  isOpen: boolean;
  onClose: () => void;
  onPublishSuccess?: (data: any) => void;
}

export default function AdminResultControl({ isOpen, onClose, onPublishSuccess }: AdminResultControlProps) {
  useBodyScrollLock(isOpen); // LOCK SCROLL WHEN OPEN

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

  const isHistorical = date !== new Date().toISOString().split('T')[0];

  const theme = useMemo(() => {
      // 1. PRIORITY: REVENTADOS (Hazard Mode)
      if (isReventado) return {
          name: 'hazard',
          color: 'text-red-500',
          border: 'border-red-500',
          bgHex: '#0f0202',
          shadow: 'shadow-neon-red',
          glow: 'bg-red-600',
          iconColor: 'text-red-500',
          inputColor: 'text-red-500 drop-shadow-[0_0_15px_rgba(255,0,0,1)]',
          scrollThumb: '#ef4444'
      };
      
      // 2. PRIORITY: HISTORICAL (Emerald Mode)
      if (isHistorical) return {
          name: 'history',
          color: 'text-cyber-emerald',
          border: 'border-cyber-emerald',
          bgHex: '#020a05',
          shadow: 'shadow-neon-emerald',
          glow: 'bg-cyber-emerald',
          iconColor: 'text-cyber-emerald',
          inputColor: 'text-cyber-emerald drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]',
          scrollThumb: '#10b981'
      };

      // 3. PRIORITY: LIVE SCHEDULES
      switch (selectedDraw) {
          case DrawTime.MEDIODIA: return {
              name: 'solar',
              color: 'text-cyber-solar',
              border: 'border-cyber-solar',
              bgHex: '#0c0400',
              shadow: 'shadow-neon-solar',
              glow: 'bg-cyber-solar',
              iconColor: 'text-cyber-solar',
              inputColor: 'text-cyber-solar drop-shadow-[0_0_15px_rgba(255,95,0,0.8)]',
              scrollThumb: '#f97316'
          };
          case DrawTime.TARDE: return {
              name: 'vapor',
              color: 'text-cyber-vapor',
              border: 'border-cyber-vapor',
              bgHex: '#05020c',
              shadow: 'shadow-neon-vapor',
              glow: 'bg-cyber-vapor',
              iconColor: 'text-cyber-vapor',
              inputColor: 'text-cyber-vapor drop-shadow-[0_0_15px_rgba(124,58,237,0.8)]',
              scrollThumb: '#a855f7'
          };
          case DrawTime.NOCHE: 
          default: return {
              name: 'abyss',
              color: 'text-blue-400',
              border: 'border-blue-600',
              bgHex: '#02040a',
              shadow: 'shadow-neon-abyss',
              glow: 'bg-cyber-blue',
              iconColor: 'text-cyber-blue',
              inputColor: 'text-cyber-blue drop-shadow-[0_0_15px_rgba(36,99,235,0.8)]',
              scrollThumb: '#3b82f6'
          };
      }
  }, [isReventado, isHistorical, selectedDraw]);

  const [shake, setShake] = useState(false);
  useEffect(() => {
      if (isReventado) {
          setShake(true);
          const t = setTimeout(() => setShake(false), 500);
          return () => clearTimeout(t);
      }
  }, [isReventado]);

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
                  return prev + 4;
              });
          }, 30);
      } else {
          clearInterval(interval);
          if (!success && !loading) setProgress(0);
      }
      return () => clearInterval(interval);
  }, [charging, loading, success]);

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
            setLoading(false);
            setCharging(false);
            setProgress(0);
        } else {
            setProcessedCount(res.data?.processed || 0);
            setSuccess(true);
            
            if (onPublishSuccess) {
                onPublishSuccess({
                    draw: selectedDraw.split(' ')[0],
                    number: winningNumber,
                    reventado: isReventado
                });
            }

            setTimeout(() => {
                resetInternalState();
                setWinningNumber('');
                setReventadoNumber('');
                onClose(); 
            }, 3000);
        }
    } catch (e) {
        alert("Error de conexión al Núcleo.");
        setLoading(false);
        setCharging(false);
        setProgress(0);
    }
  };

  const handleWinningChange = (val: string) => {
      const clean = val.replace(/[^0-9]/g, '');
      setWinningNumber(clean);
      setInputAnim(true);
      setTimeout(() => setInputAnim(false), 200);
  };

  const handleReventadoChange = (val: string) => {
      const clean = val.replace(/[^0-9]/g, '');
      setReventadoNumber(clean);
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
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/95 sm:bg-black/90 backdrop-blur-xl animate-in fade-in zoom-in duration-300">
        <style>{`
            .custom-scrollbar::-webkit-scrollbar { width: 4px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); }
            .custom-scrollbar::-webkit-scrollbar-thumb { background-color: ${theme.scrollThumb}; border-radius: 3px; }
        `}</style>

        {/* CONTAINER: Full screen on mobile (inset-0), Max-width container on Desktop */}
        <div className="relative w-full h-full sm:h-auto sm:max-w-4xl sm:max-h-[90vh] flex flex-col sm:mx-4">
            
            <div className={`absolute -inset-2 ${theme.glow} rounded-3xl opacity-20 blur-2xl animate-pulse transition-colors duration-700 hidden sm:block`}></div>

            <div 
                className={`border-0 sm:border ${theme.border} ${theme.shadow} sm:rounded-3xl w-full h-full sm:h-auto relative shadow-2xl overflow-hidden z-10 flex flex-col md:flex-row transition-all duration-700`}
                style={{ backgroundColor: theme.bgHex }}
            >
                
                {/* --- LEFT SIDE: CONFIG & DATE --- */}
                {/* Mobile: Top Bar | Desktop: Left Sidebar */}
                <div id="admin-control-panel-left" className="bg-black/20 p-4 md:p-8 md:w-1/3 border-b md:border-b-0 md:border-r border-white/10 relative flex flex-row md:flex-col justify-between items-center md:items-stretch shrink-0">
                    <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-${theme.color.replace('text-', '')} to-transparent opacity-50`}></div>
                    
                    <div className="flex-1 md:flex-none">
                        <h2 className="text-lg md:text-2xl font-display font-black text-white uppercase tracking-tighter leading-none flex items-center gap-2">
                            <i className="fas fa-satellite-dish md:hidden text-xs"></i>
                            Control <span className={`${theme.color} transition-colors duration-500`}>{isHistorical ? 'Histórico' : 'En Vivo'}</span>
                        </h2>
                        <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest hidden md:block mt-1">Estación de Inyección</p>
                    </div>

                    <div className="md:mt-auto md:pt-6 w-32 md:w-full">
                        <label className="text-[8px] md:text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1 md:mb-2 block">Fecha Objetivo</label>
                        <input 
                            type="date" 
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className={`w-full bg-black border ${theme.border} rounded-lg md:rounded-xl p-1.5 md:p-3 text-white font-mono text-xs md:text-sm focus:outline-none shadow-inner transition-colors duration-500 text-center`}
                        />
                    </div>
                    
                    {/* Mobile Close Button (Top Right of Left Panel) */}
                    <button onClick={onClose} className="md:hidden ml-4 text-slate-400 hover:text-white bg-white/5 p-2 rounded-full h-8 w-8 flex items-center justify-center">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* --- RIGHT SIDE: INPUTS & ACTIONS --- */}
                <div id="admin-control-panel-right" className="p-4 md:p-8 md:w-2/3 relative flex flex-col transition-colors duration-700 flex-1 overflow-y-auto custom-scrollbar" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
                    {/* Desktop Close Button */}
                    <button onClick={onClose} className="absolute top-4 right-4 text-slate-600 hover:text-white transition-colors z-20 hidden md:block"><i className="fas fa-times text-lg"></i></button>

                    {/* DRAW SELECTOR */}
                    <div className="mb-4 md:mb-8">
                        <label className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-2 md:mb-3 block">Seleccionar Sorteo</label>
                        <div className="grid grid-cols-3 gap-2 md:gap-4">
                            {Object.values(DrawTime).map((t) => {
                                const isActive = selectedDraw === t;
                                let activeClass = '';
                                if (t.includes('Mediodía')) activeClass = 'border-cyber-solar text-cyber-solar bg-cyber-solar/10 shadow-neon-solar';
                                else if (t.includes('Tarde')) activeClass = 'border-cyber-vapor text-cyber-vapor bg-cyber-vapor/10 shadow-neon-vapor';
                                else activeClass = 'border-blue-600 text-blue-400 bg-blue-900/20 shadow-neon-abyss';

                                return (
                                    <button
                                        key={t}
                                        onClick={() => setSelectedDraw(t)}
                                        className={`relative py-2 md:py-4 rounded-lg md:rounded-xl border transition-all duration-300 flex flex-col items-center gap-1 md:gap-2 overflow-hidden group ${isActive ? activeClass : 'border-white/10 text-slate-500 hover:bg-white/5'}`}
                                    >
                                        {isActive && <div className={`absolute inset-0 opacity-10 animate-pulse bg-current`}></div>}
                                        <i className={`fas ${getDrawIcon(t)} text-sm md:text-xl ${isActive ? 'animate-bounce' : ''}`}></i>
                                        <span className="text-[8px] md:text-[10px] font-black uppercase tracking-wider">{t.split(' ')[0]}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* REACTOR CORE (INPUTS) */}
                    <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch mb-6 md:mb-8 flex-1 justify-center">
                        {/* MAIN NUMBER */}
                        <div className="flex-1 relative group/reactor min-h-[140px] md:min-h-[auto]">
                            <div className={`absolute -inset-1 ${theme.glow} rounded-2xl opacity-10 blur-xl transition-colors duration-500 group-focus-within/reactor:opacity-40 group-focus-within/reactor:scale-105`}></div>
                            
                            <div className={`bg-black/40 border-2 ${theme.border} rounded-2xl p-4 md:p-6 flex flex-col items-center relative z-10 h-full justify-center transition-all duration-300 shadow-inner group-focus-within/reactor:bg-black/60`}>
                                <label className="text-[9px] md:text-[10px] font-mono font-bold text-white uppercase tracking-[0.3em] mb-1 md:mb-2 opacity-50">Número Ganador</label>
                                
                                <div className="relative w-full">
                                    {inputAnim && <div className={`absolute inset-0 ${theme.glow} blur-md opacity-50 animate-ping`}></div>}
                                    
                                    <input 
                                        type="tel" 
                                        maxLength={2}
                                        value={winningNumber}
                                        onChange={e => handleWinningChange(e.target.value)}
                                        className={`bg-transparent text-7xl md:text-8xl font-mono font-black text-center focus:outline-none w-full placeholder-white/5 transition-all duration-100 ${theme.inputColor} ${inputAnim ? 'scale-110' : 'scale-100'}`}
                                        placeholder="--"
                                        autoFocus
                                    />
                                </div>
                            </div>
                        </div>

                        {/* REVENTADOS TOGGLE */}
                        <div className={`w-full md:w-32 flex flex-row md:flex-col justify-between md:justify-center items-center rounded-2xl p-3 md:p-4 gap-3 md:gap-4 transition-all duration-500 relative overflow-hidden border-2 ${isReventado ? 'bg-red-950/30 border-red-500 shadow-[0_0_30px_rgba(255,0,0,0.4)]' : 'bg-slate-900/20 border-white/10'} ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
                            {isReventado && <div className="absolute inset-0 opacity-20 animate-[scroll_2s_linear_infinite]" style={{backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 10px, #ff0000 10px, #ff0000 20px)', backgroundSize: '200% 200%'}}></div>}

                            <div className="text-left md:text-center relative z-10 flex-1 md:flex-none">
                                <div className={`text-[9px] font-bold uppercase tracking-widest mb-1 md:mb-2 ${isReventado ? 'text-red-500 animate-pulse' : 'text-slate-500'}`}>
                                    {isReventado ? '⚠️ ALTO RIESGO' : 'Reventados'}
                                </div>
                                <button onClick={() => setIsReventado(!isReventado)} className={`w-12 h-6 md:w-14 md:h-8 rounded-full bg-black border-2 relative transition-all md:mx-auto ${isReventado ? 'border-red-500 shadow-[0_0_10px_red]' : 'border-slate-600'}`}>
                                    <div className={`absolute top-0.5 bottom-0.5 w-4 h-4 md:w-5 md:h-5 rounded-full transition-all duration-300 ${isReventado ? 'left-6 md:left-7 bg-red-500 shadow-[0_0_5px_red]' : 'left-1 bg-slate-600'}`}></div>
                                </button>
                            </div>
                            
                            <div className={`transition-all duration-500 relative z-10 w-24 md:w-full ${isReventado ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                                <label className="text-[7px] font-mono text-red-400 uppercase tracking-widest text-center block mb-1">Bola Roja</label>
                                <div className="relative">
                                    {revInputAnim && <div className="absolute inset-0 bg-white opacity-50 blur-md animate-ping"></div>}
                                    <input type="tel" maxLength={2} value={reventadoNumber} onChange={e => handleReventadoChange(e.target.value)} className={`w-full bg-black border-2 border-red-500 rounded-lg py-2 md:py-3 text-center text-xl md:text-2xl text-red-500 font-mono font-bold focus:outline-none shadow-neon-red placeholder-red-900/50 transition-transform duration-100 ${revInputAnim ? 'translate-x-1 scale-110' : ''}`} placeholder="--" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ACTION BUTTON */}
                    <div className="mt-auto pb-4 md:pb-0">
                        <button 
                            onMouseDown={handleInteractionStart}
                            onMouseUp={handleInteractionEnd}
                            onMouseLeave={handleInteractionEnd}
                            onTouchStart={handleInteractionStart}
                            onTouchEnd={handleInteractionEnd}
                            disabled={loading || !winningNumber || (isReventado && !reventadoNumber) || success}
                            className={`
                                w-full py-4 md:py-6 rounded-xl font-display font-black uppercase tracking-[0.2em] transition-all relative overflow-hidden group select-none border-2 text-sm md:text-base
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
                            <div className={`absolute top-0 left-0 h-full transition-all ease-linear duration-75 ${isReventado ? 'bg-red-600' : theme.color.replace('text-', 'bg-')}`} style={{ width: `${progress}%`, opacity: charging ? 0.8 : 0 }}></div>
                            {isReventado && !success && <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.5)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] opacity-20 pointer-events-none"></div>}

                            <div className="relative z-10 flex items-center justify-center gap-2 md:gap-3 mix-blend-normal">
                                {loading ? (
                                    <>
                                        <i className="fas fa-circle-notch fa-spin"></i>
                                        <span>INICIANDO...</span>
                                    </>
                                ) : success ? (
                                    <div className="flex items-center gap-4 animate-in zoom-in duration-300">
                                        <div className="relative"><i className="fas fa-lock text-xl md:text-2xl"></i><div className="absolute -inset-2 border-2 border-green-500 rounded-full animate-ping"></div></div>
                                        <div className="flex flex-col items-start leading-none"><span className="text-base md:text-lg">RESULTADO FIJADO</span><span className="text-[8px] md:text-[10px] opacity-70 font-mono tracking-widest">{processedCount} PAGOS</span></div>
                                    </div>
                                ) : (
                                    <>
                                        {charging ? <span className={`${isReventado ? 'text-white font-black text-lg md:text-xl drop-shadow-[0_0_10px_black]' : 'text-black font-bold'}`}>{progress < 100 ? (isReventado ? 'ARMANDO...' : 'CARGANDO...') : 'EJECUTANDO...'}</span> : <><i className={`fas ${isReventado ? 'fa-radiation fa-spin-slow' : 'fa-fingerprint'} text-lg md:text-xl`}></i><span>{isReventado ? 'DETONAR' : 'PUBLICAR'}</span></>}
                                    </>
                                )}
                            </div>
                        </button>
                    </div>

                </div>
            </div>
        </div>
    </div>
  );
}
