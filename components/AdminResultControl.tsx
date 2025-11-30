import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DrawTime } from '../types';
import { api } from '../services/edgeApi';
import { useAuthStore } from '../store/useAuthStore';
import AnimatedIconUltra from './ui/AnimatedIconUltra';
import MatrixRain from './ui/MatrixRain';

interface AdminResultControlProps {
  onClose?: () => void;
  onPublishSuccess?: (data: any) => void;
  initialDraw?: DrawTime | null;
}

export default function AdminResultControl({ onClose, onPublishSuccess, initialDraw }: AdminResultControlProps) {
  const user = useAuthStore(s => s.user);
  
  // Data State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDraw, setSelectedDraw] = useState<DrawTime>(DrawTime.NOCHE);
  
  // Inputs
  const [winningNumber, setWinningNumber] = useState('');
  const [reventadoNumber, setReventadoNumber] = useState('');
  const [isReventado, setIsReventado] = useState(false);
  
  // Hold Logic
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const holdIntervalRef = useRef<any>(null);
  
  // Execution Logic
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);

  // Initialize
  useEffect(() => {
      if (initialDraw) setSelectedDraw(initialDraw);
  }, [initialDraw]);

  // --- THEME ENGINE (MATCHING GAME CONSOLE) ---
  const theme = useMemo(() => {
      if (isReventado) return {
          name: 'hazard',
          border: 'border-red-600',
          text: 'text-red-500',
          bg: 'bg-[#0f0202]',
          accent: 'bg-red-600',
          shadow: 'shadow-[0_0_40px_rgba(220,38,38,0.6)]',
          matrixHex: '#ff003c',
          glow: 'bg-red-600',
          scanline: 'from-red-500/50',
          inputBorder: 'border-red-900',
          activeDraw: 'bg-red-900/40 text-white border-red-500 shadow-neon-red'
      };

      switch (selectedDraw) {
          case DrawTime.MEDIODIA: return {
              name: 'solar',
              border: 'border-cyber-solar',
              text: 'text-cyber-solar',
              bg: 'bg-[#0c0400]',
              accent: 'bg-cyber-solar',
              shadow: 'shadow-[0_0_40px_rgba(255,95,0,0.4)]',
              matrixHex: '#ff5f00',
              glow: 'bg-cyber-solar',
              scanline: 'from-orange-500/50',
              inputBorder: 'border-cyber-solar',
              activeDraw: 'bg-cyber-solar/20 text-white border-cyber-solar shadow-neon-solar'
          };
          case DrawTime.TARDE: return {
              name: 'vapor',
              border: 'border-cyber-vapor',
              text: 'text-cyber-vapor',
              bg: 'bg-[#05020c]',
              accent: 'bg-cyber-vapor',
              shadow: 'shadow-[0_0_40px_rgba(124,58,237,0.4)]',
              matrixHex: '#7c3aed',
              glow: 'bg-cyber-vapor',
              scanline: 'from-purple-500/50',
              inputBorder: 'border-cyber-vapor',
              activeDraw: 'bg-cyber-vapor/20 text-white border-cyber-vapor shadow-neon-vapor'
          };
          case DrawTime.NOCHE: 
          default: return {
              name: 'abyss',
              border: 'border-blue-600',
              text: 'text-blue-400',
              bg: 'bg-[#02040a]',
              accent: 'bg-blue-600',
              shadow: 'shadow-[0_0_40px_rgba(30,58,138,0.6)]',
              matrixHex: '#3b82f6',
              glow: 'bg-cyber-blue',
              scanline: 'from-blue-500/50',
              inputBorder: 'border-blue-900',
              activeDraw: 'bg-blue-900/40 text-white border-blue-600 shadow-neon-blue'
          };
      }
  }, [isReventado, selectedDraw]);

  // --- HOLD HANDLERS ---
  const startHold = () => {
      if (loading || success || !winningNumber || (isReventado && !reventadoNumber)) return;
      setIsHolding(true);
      
      let progress = 0;
      holdIntervalRef.current = setInterval(() => {
          progress += 5; 
          setHoldProgress(progress);
          
          if (progress >= 100) {
              clearInterval(holdIntervalRef.current);
              handleSubmit();
          }
      }, 30);
  };

  const endHold = () => {
      if (success || loading) return;
      setIsHolding(false);
      setHoldProgress(0);
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setHoldProgress(100);

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
            setHoldProgress(0);
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
            // Auto close after 2 seconds (No animation needed for admin)
            setTimeout(() => {
                if(onClose) onClose();
            }, 2000);
        }
    } catch (e) {
        alert("Error de conexión al Núcleo.");
        setLoading(false);
        setHoldProgress(0);
    }
  };

  if (!user) return null;

  return (
    <div className={`relative w-full rounded-[3rem] p-1 overflow-hidden border-2 transition-all duration-700 z-10 mb-12 group/panel select-none ${theme.border} ${theme.shadow}`} style={{ backgroundColor: theme.bg }}>
        
        {/* --- BACKGROUND FX --- */}
        <div className={`absolute -inset-1 ${theme.glow} rounded-[3rem] opacity-20 blur-xl animate-pulse transition-all duration-1000`}></div>
        <div className="absolute inset-0 opacity-20 pointer-events-none z-0 mix-blend-screen">
            <MatrixRain colorHex={theme.matrixHex} speed={isReventado ? 3 : 1} density="MEDIUM" />
        </div>

        {/* --- MAIN INTERFACE --- */}
        <div className="relative z-10 p-6 md:p-12">
            
            {/* HEADER - RESPONSIVE FIX */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                <div className="w-full">
                    <div className="flex items-center gap-3 sm:gap-4 mb-2">
                        {/* ICON */}
                        <div className={`relative w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 flex items-center justify-center rounded-full border border-white/20 bg-black/50 shadow-[0_0_15px_rgba(255,255,255,0.1)]`}>
                            <div className={`absolute inset-0 rounded-full ${theme.glow} opacity-30 blur-md animate-pulse`}></div>
                            <AnimatedIconUltra profile={{ animation: isReventado ? 'pulse' : 'spin3d', theme: isReventado ? 'neon' : 'cyber' }}>
                                <i className={`fas ${isReventado ? 'fa-biohazard' : 'fa-satellite-dish'} ${theme.text} text-sm sm:text-base relative z-10`}></i>
                            </AnimatedIconUltra>
                        </div>
                        
                        {/* TITLE - ADAPTIVE TEXT */}
                        <h3 className="text-lg sm:text-2xl md:text-3xl font-display font-black text-white uppercase tracking-widest drop-shadow-lg leading-tight break-words">
                            Gestión <span className={`block sm:inline ${theme.text}`}>Resultados</span>
                        </h3>
                    </div>
                    
                    {/* SUBTITLE */}
                    <div className="text-[8px] sm:text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em] pl-14 sm:pl-16">
                        Consola de Inyección Maestra
                    </div>
                </div>

                {onClose && (
                    <button onClick={onClose} className="absolute top-4 right-4 md:static md:top-auto md:right-auto bg-white/5 hover:bg-white/10 border border-white/10 rounded-full w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-white transition-colors z-20">
                        <i className="fas fa-times"></i>
                    </button>
                )}
            </div>

            {success ? (
                // --- SUCCESS STATE (TECHNICAL / ADMIN) ---
                <div className="h-[400px] flex flex-col items-center justify-center animate-in zoom-in duration-300">
                    <div className={`w-32 h-32 rounded-full border-4 ${theme.border} flex items-center justify-center bg-black/50 shadow-[0_0_50px_${theme.matrixHex}] mb-6 relative overflow-hidden`}>
                        <div className={`absolute inset-0 ${theme.accent} opacity-20 animate-ping`}></div>
                        <i className={`fas fa-check text-6xl ${theme.text} drop-shadow-[0_0_10px_currentColor]`}></i>
                    </div>
                    <h3 className="text-3xl font-display font-black text-white uppercase tracking-widest">
                        RESULTADO <span className={theme.text}>INYECTADO</span>
                    </h3>
                    <div className="mt-4 flex flex-col items-center gap-2">
                        <div className="bg-black/60 border border-white/10 rounded px-4 py-2 text-xs font-mono text-slate-400">
                            HASH: {Date.now().toString(16).toUpperCase()}-SHA256
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                            Cerrando consola de forma segura...
                        </div>
                    </div>
                </div>
            ) : (
                // --- INPUT STATE ---
                <>
                    {/* DRAW SELECTOR (Consola Style) */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-6 mb-8 md:mb-10">
                        {Object.values(DrawTime).map((time) => {
                            const isSelected = selectedDraw === time;
                            const label = time.split(' ')[0];
                            let icon = 'fa-sun';
                            if (label === 'Tarde') icon = 'fa-cloud-sun';
                            if (label === 'Noche') icon = 'fa-moon';

                            return (
                                <button
                                    key={time}
                                    onClick={() => setSelectedDraw(time)}
                                    className={`relative h-16 sm:h-20 md:h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 sm:gap-2 backdrop-blur-md overflow-hidden transition-all duration-300 group
                                        ${isSelected ? theme.activeDraw : 'border-white/10 bg-black/40 text-slate-500 hover:bg-white/5'}
                                    `}
                                >
                                    <i className={`fas ${icon} text-lg sm:text-xl md:text-2xl ${isSelected ? 'animate-bounce' : ''}`}></i>
                                    <span className="text-[8px] sm:text-[9px] md:text-[10px] font-black uppercase tracking-widest">{label}</span>
                                </button>
                            )
                        })}
                    </div>

                    {/* INPUTS (Huge / Centered) */}
                    <div className="flex flex-col md:flex-row gap-4 md:gap-8 items-stretch mb-8 md:mb-10">
                        
                        {/* WINNING NUMBER */}
                        <div className="flex-1 relative group/field">
                            <div className={`relative bg-black/90 rounded-3xl border-2 p-1 h-32 sm:h-40 md:h-48 overflow-hidden transition-colors duration-300 ${theme.border} shadow-lg`}>
                                <div className="h-full rounded-[1.3rem] bg-gradient-to-b from-slate-900/50 to-black/80 flex flex-col items-center justify-center p-4 relative">
                                    <label className={`text-[9px] sm:text-[10px] font-mono font-bold ${theme.text} uppercase tracking-wider mb-1 sm:mb-2`}>Número Ganador</label>
                                    <input 
                                        type="tel" 
                                        maxLength={2}
                                        value={winningNumber}
                                        onChange={(e) => setWinningNumber(e.target.value.replace(/[^0-9]/g, ''))}
                                        className={`bg-transparent text-6xl sm:text-7xl md:text-8xl font-mono font-black ${theme.text} drop-shadow-[0_0_20px_currentColor] text-center focus:outline-none w-full z-10 transition-all placeholder-white/5`}
                                        placeholder="--"
                                        autoFocus
                                    />
                                </div>
                            </div>
                        </div>

                        {/* REVENTADO TOGGLE & INPUT */}
                        <div className="flex-1 flex flex-col gap-4">
                            {/* Toggle Switch */}
                            <div className="flex bg-black/60 p-1 rounded-2xl border border-white/10 h-12 sm:h-14">
                                <button 
                                    onClick={() => { setIsReventado(false); setReventadoNumber(''); }}
                                    className={`flex-1 rounded-xl text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all ${!isReventado ? 'bg-white/10 text-white shadow-inner border border-white/10' : 'text-slate-500 hover:text-white'}`}
                                >
                                    Normal
                                </button>
                                <button 
                                    onClick={() => { setIsReventado(true); }}
                                    className={`flex-1 rounded-xl text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${isReventado ? 'bg-red-900/50 text-red-500 border border-red-500/50 shadow-inner' : 'text-slate-500 hover:text-red-400'}`}
                                >
                                    <i className="fas fa-radiation"></i> Reventado
                                </button>
                            </div>

                            {/* Input Area */}
                            <div className={`flex-1 relative bg-black/90 rounded-3xl border-2 p-1 overflow-hidden transition-all duration-300 ${isReventado ? 'border-red-500 shadow-neon-red' : 'border-white/10 opacity-50'}`}>
                                <div className="h-full rounded-[1.3rem] flex flex-col items-center justify-center p-4 relative min-h-[120px]">
                                    <label className={`text-[9px] sm:text-[10px] font-mono font-bold ${isReventado ? 'text-red-500' : 'text-slate-500'} uppercase tracking-wider mb-1 sm:mb-2`}>
                                        {isReventado ? 'BOLITA ROJA' : 'SIN RIESGO'}
                                    </label>
                                    <input 
                                        type="tel" 
                                        maxLength={2}
                                        disabled={!isReventado}
                                        value={reventadoNumber}
                                        onChange={(e) => setReventadoNumber(e.target.value.replace(/[^0-9]/g, ''))}
                                        className={`bg-transparent text-4xl sm:text-5xl md:text-6xl font-mono font-black ${isReventado ? 'text-red-500 drop-shadow-[0_0_15px_red]' : 'text-slate-700'} text-center focus:outline-none w-full z-10 transition-all placeholder-white/5`}
                                        placeholder="--"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* HOLD TO PUBLISH BUTTON */}
                    <div className="relative h-16 sm:h-20 md:h-24 w-full rounded-2xl bg-black border-2 border-white/10 overflow-hidden group/launch select-none shadow-2xl">
                        {/* Fill Animation */}
                        <div 
                            className={`absolute top-0 left-0 h-full ${theme.accent} transition-all duration-75 ease-linear opacity-100`}
                            style={{ width: `${holdProgress}%` }}
                        ></div>
                        
                        <button
                            onMouseDown={startHold}
                            onMouseUp={endHold}
                            onMouseLeave={endHold}
                            onTouchStart={startHold}
                            onTouchEnd={endHold}
                            disabled={loading || !winningNumber || (isReventado && !reventadoNumber)}
                            className="absolute inset-0 flex items-center justify-center gap-4 w-full h-full disabled:opacity-50 disabled:cursor-not-allowed z-10"
                        >
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 ${theme.border} flex items-center justify-center bg-black/50 ${isHolding ? 'scale-110' : ''} transition-transform shadow-lg`}>
                                <i className={`fas ${isReventado ? 'fa-biohazard' : 'fa-fingerprint'} ${theme.text} text-lg sm:text-xl`}></i>
                            </div>
                            <div className="flex flex-col items-start mix-blend-difference text-white">
                                <span className="text-xs sm:text-sm md:text-lg font-black uppercase tracking-[0.2em]">
                                    {isHolding ? 'MANTÉN PRESIONADO...' : 'PUBLICAR RESULTADO'}
                                </span>
                                <span className="text-[7px] sm:text-[9px] font-mono text-slate-300 uppercase">
                                    {isReventado ? 'CONFIRMAR RIESGO ACTIVO' : 'CONFIRMACIÓN SEGURA'}
                                </span>
                            </div>
                        </button>
                    </div>
                </>
            )}
        </div>
    </div>
  );
}