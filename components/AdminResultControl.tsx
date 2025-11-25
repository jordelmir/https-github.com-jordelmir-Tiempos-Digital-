
import React, { useState } from 'react';
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
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);

  // Computed: Is this historical?
  const isHistorical = date !== new Date().toISOString().split('T')[0];
  // THEME SWITCH: Uses Emerald for History, Neon for Live
  const activeTheme = isHistorical ? 'text-cyber-emerald border-cyber-emerald/50' : 'text-cyber-neon border-cyber-neon/50';
  const glowColor = isHistorical ? 'bg-cyber-emerald' : 'bg-cyber-neon';

  if (!isOpen || !user) return null;

  const handleSubmit = async () => {
    if (!winningNumber) return;
    setLoading(true);

    try {
        const res = await api.publishDrawResult({
            date,
            drawTime: selectedDraw,
            winningNumber,
            isReventado,
            reventadoNumber: isReventado ? reventadoNumber : undefined,
            actor_id: user.id
        });

        if (res.error) {
            alert(res.error);
        } else {
            setProcessedCount(res.data?.processed || 0);
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                setWinningNumber('');
                setProcessedCount(0);
                onClose();
            }, 2500);
        }
    } catch (e) {
        alert("Error de conexión al Núcleo.");
    } finally {
        setLoading(false);
    }
  };

  const getDrawIcon = (draw: DrawTime) => {
      if (draw.includes('Mediodía')) return 'fa-sun';
      if (draw.includes('Tarde')) return 'fa-cloud-sun';
      return 'fa-moon';
  };

  const getDrawColor = (draw: DrawTime) => {
      if (draw.includes('Mediodía')) return 'text-cyber-neon border-cyber-neon shadow-neon-cyan';
      if (draw.includes('Tarde')) return 'text-cyber-purple border-cyber-purple shadow-neon-purple';
      return 'text-cyber-blue border-cyber-blue shadow-neon-blue';
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in zoom-in duration-300">
        
        {/* Container */}
        <div className="relative w-full max-w-4xl mx-4">
            
            {/* Time Machine Backlight */}
            <div className={`absolute -inset-2 ${glowColor} rounded-3xl opacity-20 blur-2xl animate-pulse transition-colors duration-700`}></div>

            <div className="bg-[#050a14] border border-white/10 rounded-3xl w-full relative shadow-2xl overflow-hidden z-10 flex flex-col md:flex-row min-h-[500px]">
                
                {/* Left Side: Info Panel */}
                <div className="bg-black/40 p-8 md:w-1/3 border-b md:border-b-0 md:border-r border-white/10 relative overflow-hidden flex flex-col justify-between">
                    <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-${isHistorical ? 'cyber-emerald' : 'cyber-neon'} to-transparent opacity-50`}></div>
                    
                    <div>
                        <h2 className="text-2xl font-display font-black text-white uppercase tracking-tighter mb-1 leading-none">
                            Control <br/> <span className={isHistorical ? 'text-cyber-emerald' : 'text-cyber-neon'}>{isHistorical ? 'Histórico' : 'En Vivo'}</span>
                        </h2>
                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-8">Estación de Inyección</p>

                        <div className="space-y-6">
                            <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Modo Operativo</div>
                                <div className={`font-mono font-bold text-sm flex items-center gap-2 ${isHistorical ? 'text-cyber-emerald' : 'text-cyber-neon'}`}>
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
                            className={`w-full bg-black border ${activeTheme} rounded-xl p-3 text-white font-mono text-sm focus:outline-none shadow-inner`}
                        />
                    </div>
                </div>

                {/* Right Side: Controls */}
                <div className="p-8 md:w-2/3 bg-[#0a0a0f] relative flex flex-col">
                    <button onClick={onClose} className="absolute top-4 right-4 text-slate-600 hover:text-white transition-colors"><i className="fas fa-times text-lg"></i></button>

                    {/* 1. Draw Selector (Visual Cards) */}
                    <div className="mb-8">
                        <label className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-3 block">Seleccionar Sorteo</label>
                        <div className="grid grid-cols-3 gap-4">
                            {Object.values(DrawTime).map((t) => {
                                const isActive = selectedDraw === t;
                                return (
                                    <button
                                        key={t}
                                        onClick={() => setSelectedDraw(t)}
                                        className={`relative py-4 rounded-xl border transition-all duration-300 flex flex-col items-center gap-2 overflow-hidden group ${isActive ? getDrawColor(t) + ' bg-white/5' : 'border-white/10 text-slate-500 hover:bg-white/5'}`}
                                    >
                                        {isActive && <div className={`absolute inset-0 opacity-10 ${t.includes('Noche') ? 'bg-blue-600' : t.includes('Tarde') ? 'bg-purple-600' : 'bg-cyan-400'} animate-pulse`}></div>}
                                        <i className={`fas ${getDrawIcon(t)} text-xl ${isActive ? 'animate-bounce' : ''}`}></i>
                                        <span className="text-[10px] font-black uppercase tracking-wider">{t.split(' ')[0]}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* 2. Main Number Reactor */}
                    <div className="flex gap-6 items-stretch mb-8">
                        <div className="flex-1 relative">
                            <div className={`absolute -inset-1 ${glowColor} rounded-2xl opacity-10 blur-xl`}></div>
                            <div className="bg-black/80 border border-white/10 rounded-2xl p-6 flex flex-col items-center relative z-10 h-full justify-center">
                                <label className="text-[10px] font-mono font-bold text-white uppercase tracking-[0.3em] mb-2 opacity-50">Número Ganador</label>
                                <input 
                                    type="text" 
                                    maxLength={2}
                                    value={winningNumber}
                                    onChange={e => setWinningNumber(e.target.value.replace(/[^0-9]/g, ''))}
                                    className={`bg-transparent text-7xl font-mono font-bold text-center focus:outline-none w-full placeholder-white/10 ${isHistorical ? 'text-cyber-emerald drop-shadow-[0_0_10px_#10b981]' : 'text-cyber-neon drop-shadow-[0_0_10px_cyan]'}`}
                                    placeholder="00"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Reventados Toggle Column */}
                        <div className="w-32 flex flex-col justify-center bg-red-950/10 border border-red-900/30 rounded-2xl p-4 gap-4">
                            <div className="text-center">
                                <div className="text-[9px] font-bold text-red-500 uppercase tracking-widest mb-2">Reventados</div>
                                <button 
                                    onClick={() => setIsReventado(!isReventado)}
                                    className={`w-12 h-6 rounded-full relative transition-colors mx-auto ${isReventado ? 'bg-red-600 shadow-neon-red' : 'bg-slate-800'}`}
                                >
                                    <div className={`absolute top-1 bottom-1 w-4 h-4 bg-white rounded-full transition-all ${isReventado ? 'left-7' : 'left-1'}`}></div>
                                </button>
                            </div>
                            
                            <div className={`transition-all duration-300 ${isReventado ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                                <input 
                                    type="text"
                                    maxLength={2}
                                    value={reventadoNumber}
                                    onChange={e => setReventadoNumber(e.target.value.replace(/[^0-9]/g, ''))}
                                    className="w-full bg-black border border-red-500 rounded-lg py-3 text-center text-2xl text-red-500 font-mono font-bold focus:outline-none shadow-neon-red"
                                    placeholder="--"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Submit */}
                    <button 
                        onClick={handleSubmit}
                        disabled={loading || !winningNumber}
                        className={`w-full py-5 rounded-xl font-display font-black uppercase tracking-[0.2em] transition-all relative overflow-hidden group mt-auto ${success ? 'bg-green-500 text-black' : isHistorical ? 'bg-cyber-emerald text-black hover:bg-white' : 'bg-cyber-neon text-black hover:bg-white'}`}
                    >
                        {loading ? (
                            <div className="flex items-center justify-center gap-3">
                                <i className="fas fa-circle-notch fa-spin"></i>
                                <span>LIQUIDANDO APUESTAS...</span>
                            </div>
                        ) : success ? (
                            <div className="flex items-center justify-center gap-3 animate-in zoom-in">
                                <i className="fas fa-check-circle"></i>
                                <span>RESULTADO PUBLICADO ({processedCount} Pagos)</span>
                            </div>
                        ) : (
                            <span>EJECUTAR RESULTADO</span>
                        )}
                    </button>

                </div>
            </div>
        </div>
    </div>
  );
}
