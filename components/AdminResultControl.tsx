import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { DrawTime } from '../types';
import { api } from '../services/edgeApi';
import { useAuthStore } from '../store/useAuthStore';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import AnimatedIconUltra from './ui/AnimatedIconUltra';
import MatrixRain from './ui/MatrixRain';

interface AdminResultControlProps {
  isOpen: boolean;
  onClose: () => void;
  onPublishSuccess?: (data: any) => void;
  initialDraw?: DrawTime | null;
}

export default function AdminResultControl({ isOpen, onClose, onPublishSuccess, initialDraw }: AdminResultControlProps) {
  useBodyScrollLock(isOpen); 

  const user = useAuthStore(s => s.user);
  
  // State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDraw, setSelectedDraw] = useState<DrawTime>(DrawTime.NOCHE);
  
  // Input Logic (Virtual Keypad)
  const [activeField, setActiveField] = useState<'WINNER' | 'REVENTADO'>('WINNER');
  const [winningNumber, setWinningNumber] = useState('');
  const [reventadoNumber, setReventadoNumber] = useState('');
  const [isReventado, setIsReventado] = useState(false);
  
  // Execution Logic
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [charging, setCharging] = useState(false);
  const [progress, setProgress] = useState(0);

  const isHistorical = date !== new Date().toISOString().split('T')[0];

  // --- THEME ENGINE ---
  const theme = useMemo(() => {
      if (isReventado) return {
          name: 'hazard',
          color: 'text-red-500',
          border: 'border-red-500',
          bgHex: '#0a0202', 
          matrixHex: '#ff003c', 
          shadow: 'shadow-[0_0_30px_rgba(255,0,60,0.4)]',
          glow: 'bg-red-600',
          panelBg: 'bg-red-950/20'
      };
      
      switch (selectedDraw) {
          case DrawTime.MEDIODIA: return {
              name: 'solar',
              color: 'text-cyber-solar',
              border: 'border-cyber-solar',
              bgHex: '#080300', 
              matrixHex: '#ff5f00', 
              shadow: 'shadow-[0_0_30px_rgba(255,95,0,0.4)]',
              glow: 'bg-cyber-solar',
              panelBg: 'bg-orange-950/20'
          };
          case DrawTime.TARDE: return {
              name: 'vapor',
              color: 'text-cyber-vapor',
              border: 'border-cyber-vapor',
              bgHex: '#030108', 
              matrixHex: '#7c3aed', 
              shadow: 'shadow-[0_0_30px_rgba(124,58,237,0.4)]',
              glow: 'bg-cyber-vapor',
              panelBg: 'bg-purple-950/20'
          };
          case DrawTime.NOCHE: 
          default: return {
              name: 'abyss',
              color: 'text-blue-400',
              border: 'border-blue-600',
              bgHex: '#010205', 
              matrixHex: '#2563eb', 
              shadow: 'shadow-[0_0_30px_rgba(37,99,235,0.4)]',
              glow: 'bg-cyber-blue',
              panelBg: 'bg-blue-950/20'
          };
      }
  }, [isReventado, selectedDraw]);

  useEffect(() => {
      if (isOpen) {
          setCharging(false);
          setProgress(0);
          setLoading(false);
          setSuccess(false);
          setProcessedCount(0);
          if (initialDraw) setSelectedDraw(initialDraw);
      }
  }, [isOpen, initialDraw]);

  // --- VIRTUAL KEYPAD LOGIC ---
  const handleNumPress = (num: string) => {
      // Haptic Feedback
      if (navigator.vibrate) navigator.vibrate(10);

      if (activeField === 'WINNER') {
          if (winningNumber.length < 2) setWinningNumber(prev => prev + num);
      } else {
          if (reventadoNumber.length < 2) setReventadoNumber(prev => prev + num);
      }
  };

  const handleBackspace = () => {
      if (navigator.vibrate) navigator.vibrate(15);
      if (activeField === 'WINNER') {
          setWinningNumber(prev => prev.slice(0, -1));
      } else {
          setReventadoNumber(prev => prev.slice(0, -1));
      }
  };

  const handleClear = () => {
      if (navigator.vibrate) navigator.vibrate(20);
      if (activeField === 'WINNER') setWinningNumber('');
      else setReventadoNumber('');
  };

  // --- EXECUTION LOGIC ---
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
                  return prev + 5; // Faster charge
              });
          }, 20);
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
                setWinningNumber('');
                setReventadoNumber('');
                onClose(); 
            }, 2500);
        }
    } catch (e) {
        alert("Error de conexión.");
        setLoading(false);
        setCharging(false);
        setProgress(0);
    }
  };

  const getDrawIcon = (draw: DrawTime) => {
      if (draw.includes('Mediodía')) return 'fa-sun';
      if (draw.includes('Tarde')) return 'fa-cloud-sun';
      return 'fa-moon';
  };

  if (!isOpen || !user) return null;

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#000000] animate-in fade-in duration-300">
        
        {/* --- STABLE BACKGROUND LAYER (NO FLICKER) --- */}
        <div className="absolute inset-0 z-0">
            {/* Dark Gradient Base */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] to-black"></div>
            {/* Memoized Matrix Rain */}
            <div className="absolute inset-0 opacity-20 mix-blend-screen pointer-events-none">
                <MatrixRain colorHex={theme.matrixHex} speed={isReventado ? 2 : 0.8} density="MEDIUM" />
            </div>
            {/* Vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)]"></div>
        </div>

        {/* --- MAIN CHASSIS (FIXED DIMENSIONS FOR STABILITY) --- */}
        <div className={`relative z-10 w-full h-full md:h-[800px] md:w-[1000px] bg-[#020202] md:rounded-[2rem] md:border-2 ${theme.border} flex flex-col md:flex-row overflow-hidden shadow-2xl transition-colors duration-700`}>
            
            {/* LEFT PANEL: STATUS & CONFIG (35%) */}
            <div className="w-full md:w-[35%] bg-black/60 backdrop-blur-md border-b md:border-b-0 md:border-r border-white/10 p-6 flex flex-col relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-full h-1 ${theme.glow} shadow-[0_0_20px_currentColor]`}></div>
                
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${theme.border} ${theme.color} shadow-[0_0_15px_currentColor]`}>
                            <i className="fas fa-satellite-dish text-xl animate-pulse"></i>
                        </div>
                        <div>
                            <h2 className="text-xl font-display font-black text-white uppercase tracking-widest leading-none">
                                Estación <span className={theme.color}>Live</span>
                            </h2>
                            <p className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.2em] font-bold">Protocolo de Inyección</p>
                        </div>
                    </div>
                    <div className="h-px w-full bg-white/10 my-4"></div>
                    
                    {/* Date Config */}
                    <div className="bg-white/5 rounded-xl p-3 border border-white/5 mb-4">
                        <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Fecha de Operación</label>
                        <input 
                            type="date" 
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="bg-transparent text-white font-mono text-sm w-full focus:outline-none"
                        />
                    </div>

                    {/* Draw Selection */}
                    <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-2">Sorteo Objetivo</label>
                    <div className="space-y-2">
                        {Object.values(DrawTime).map((t) => (
                            <button
                                key={t}
                                onClick={() => setSelectedDraw(t)}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${
                                    selectedDraw === t 
                                    ? `${theme.border} ${theme.panelBg} text-white shadow-inner` 
                                    : 'border-white/5 bg-black/40 text-slate-500 hover:bg-white/5'
                                }`}
                            >
                                <i className={`fas ${getDrawIcon(t)} ${selectedDraw === t ? theme.color : ''}`}></i>
                                <span className="text-xs font-bold uppercase tracking-wider">{t.split(' ')[0]}</span>
                                {selectedDraw === t && <div className={`ml-auto w-2 h-2 rounded-full ${theme.glow} animate-pulse`}></div>}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Close Button (Mobile Only Top Right) */}
                <button onClick={onClose} className="md:hidden absolute top-4 right-4 text-slate-500 hover:text-white"><i className="fas fa-times text-xl"></i></button>
            </div>

            {/* RIGHT PANEL: TACTICAL INTERFACE (65%) */}
            <div className="flex-1 relative flex flex-col bg-[#050508]">
                
                {/* Close Button (Desktop) */}
                <button onClick={onClose} className="hidden md:block absolute top-6 right-6 text-slate-600 hover:text-white transition-colors z-20"><i className="fas fa-times text-xl"></i></button>

                <div className="flex-1 p-4 md:p-10 flex flex-col justify-center max-w-md mx-auto w-full h-full relative z-10">
                    
                    {/* --- DIGITAL DISPLAYS --- */}
                    <div className="flex gap-4 mb-8">
                        {/* Winner Display */}
                        <div 
                            onClick={() => setActiveField('WINNER')}
                            className={`flex-1 relative h-32 bg-black rounded-2xl border-2 overflow-hidden cursor-pointer transition-all duration-300 ${activeField === 'WINNER' ? theme.border + ' ' + theme.shadow : 'border-white/10 opacity-60'}`}
                        >
                            <div className="absolute top-2 left-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Número Ganador</div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className={`font-mono text-6xl md:text-7xl font-black tracking-tighter ${winningNumber ? theme.color : 'text-slate-800'}`}>
                                    {winningNumber || '--'}
                                </span>
                            </div>
                            {/* Blinking Cursor Indicator */}
                            {activeField === 'WINNER' && <div className={`absolute bottom-2 right-3 w-2 h-2 rounded-full ${theme.glow} animate-pulse`}></div>}
                        </div>

                        {/* Reventados Toggle/Display */}
                        <div 
                            onClick={() => {
                                if(!isReventado) setIsReventado(true);
                                setActiveField('REVENTADO');
                            }}
                            className={`w-28 relative h-32 bg-black rounded-2xl border-2 overflow-hidden cursor-pointer transition-all duration-300 flex flex-col ${isReventado ? 'border-red-500 shadow-[0_0_20px_red]' : 'border-white/10'}`}
                        >
                            <div className="absolute top-2 left-0 w-full text-center text-[8px] font-bold text-slate-500 uppercase tracking-widest">Reventados</div>
                            
                            {isReventado ? (
                                <div className="flex-1 flex items-center justify-center relative">
                                    <span className={`font-mono text-4xl font-black text-red-500 drop-shadow-[0_0_10px_red]`}>
                                        {reventadoNumber || '--'}
                                    </span>
                                    {activeField === 'REVENTADO' && <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></div>}
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="flex flex-col items-center gap-1 opacity-40">
                                        <i className="fas fa-power-off text-2xl text-slate-500"></i>
                                        <span className="text-[8px] font-bold uppercase">OFF</span>
                                    </div>
                                </div>
                            )}

                            {/* Toggle Switch Visual */}
                            <div className={`h-8 w-full border-t border-white/10 flex items-center justify-center ${isReventado ? 'bg-red-900/40' : 'bg-white/5'}`}>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setIsReventado(!isReventado); if(isReventado) setActiveField('WINNER'); }}
                                    className={`text-[9px] font-bold uppercase tracking-wider ${isReventado ? 'text-red-400' : 'text-slate-500'}`}
                                >
                                    {isReventado ? 'DESACTIVAR' : 'ACTIVAR'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* --- TACTILE NUMPAD (THE CORE SOLUTION) --- */}
                    <div className="grid grid-cols-3 gap-3 mb-8 select-none">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                            <button
                                key={num}
                                onClick={() => handleNumPress(num.toString())}
                                className="h-16 rounded-xl bg-[#0f0f12] border border-white/5 hover:border-white/20 hover:bg-white/10 active:bg-white/20 active:scale-95 transition-all flex items-center justify-center text-2xl font-mono font-bold text-white shadow-lg"
                            >
                                {num}
                            </button>
                        ))}
                        
                        <button 
                            onClick={handleClear}
                            className="h-16 rounded-xl bg-red-900/20 border border-red-900/50 hover:bg-red-900/40 text-red-500 font-bold uppercase text-xs tracking-wider flex items-center justify-center active:scale-95 transition-all"
                        >
                            C
                        </button>
                        
                        <button
                            onClick={() => handleNumPress('0')}
                            className="h-16 rounded-xl bg-[#0f0f12] border border-white/5 hover:border-white/20 hover:bg-white/10 active:bg-white/20 active:scale-95 transition-all flex items-center justify-center text-2xl font-mono font-bold text-white shadow-lg"
                        >
                            0
                        </button>

                        <button 
                            onClick={handleBackspace}
                            className="h-16 rounded-xl bg-[#0f0f12] border border-white/5 hover:border-white/20 hover:bg-white/10 active:bg-white/20 active:scale-95 transition-all flex items-center justify-center text-slate-400 hover:text-white"
                        >
                            <i className="fas fa-backspace"></i>
                        </button>
                    </div>

                    {/* --- EXECUTION SLIDER --- */}
                    <div className="relative h-16 w-full rounded-2xl bg-black border-2 border-white/10 overflow-hidden select-none touch-none shadow-2xl">
                        {/* Background Stripes */}
                        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.03)_10px,rgba(255,255,255,0.03)_20px)]"></div>
                        
                        {/* Progress Fill */}
                        <div 
                            className={`absolute top-0 left-0 h-full transition-all ease-linear duration-75 ${theme.bgHex.replace('02','30')}`} 
                            style={{ width: `${progress}%`, backgroundColor: isReventado ? '#7f1d1d' : theme.name === 'solar' ? '#7c2d12' : theme.name === 'vapor' ? '#581c87' : '#1e3a8a' }}
                        ></div>

                        {/* Interactive Button */}
                        <button
                            onMouseDown={handleInteractionStart}
                            onMouseUp={handleInteractionEnd}
                            onMouseLeave={handleInteractionEnd}
                            onTouchStart={handleInteractionStart}
                            onTouchEnd={handleInteractionEnd}
                            disabled={loading || !winningNumber || (isReventado && !reventadoNumber) || success}
                            className={`absolute inset-0 w-full h-full flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {loading ? (
                                <div className="flex items-center gap-3 text-white animate-pulse">
                                    <i className="fas fa-satellite-dish animate-spin"></i>
                                    <span className="font-display font-bold uppercase tracking-widest text-sm">Transmitiendo...</span>
                                </div>
                            ) : success ? (
                                <div className="flex items-center gap-3 text-green-500 animate-in zoom-in">
                                    <i className="fas fa-check-circle text-xl"></i>
                                    <span className="font-display font-black uppercase tracking-widest text-sm">Confirmado</span>
                                </div>
                            ) : (
                                <>
                                    <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${theme.border} ${theme.color} ${charging ? 'animate-ping' : ''}`}>
                                        <i className={`fas ${isReventado ? 'fa-radiation' : 'fa-fingerprint'}`}></i>
                                    </div>
                                    <span className={`font-display font-black uppercase tracking-[0.2em] text-sm ${charging ? 'text-white' : 'text-slate-400'}`}>
                                        {charging ? 'MANTENER...' : 'MANTENER PARA PUBLICAR'}
                                    </span>
                                </>
                            )}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    </div>,
    document.body
  );
}