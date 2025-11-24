
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
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                onClose();
            }, 2000);
        }
    } catch (e) {
        alert("Error de conexión al Núcleo.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in zoom-in duration-300">
        
        {/* Container */}
        <div className="bg-[#050a14] border border-white/10 rounded-2xl w-full max-w-2xl relative shadow-[0_0_100px_rgba(36,99,235,0.2)] overflow-hidden group">
            
            {/* Holographic Top Border */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyber-blue to-transparent animate-[scanline_3s_ease-in-out_infinite]"></div>

            {/* Header */}
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-black/40">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-cyber-blue/10 rounded-lg border border-cyber-blue/30 flex items-center justify-center shadow-neon-blue">
                        <i className="fas fa-history text-2xl text-cyber-blue"></i>
                    </div>
                    <div>
                        <h2 className="text-xl font-display font-black text-white uppercase tracking-widest">
                            Inyección de Resultados
                        </h2>
                        <p className="text-[10px] font-mono text-cyber-blue uppercase tracking-[0.2em]">Acceso de Nivel: SuperAdmin</p>
                    </div>
                </div>
                <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                    <i className="fas fa-times text-xl"></i>
                </button>
            </div>

            <div className="p-8 space-y-8">
                
                {/* 1. Time Machine Selector */}
                <div className="bg-white/5 rounded-xl p-6 border border-white/5 relative overflow-hidden group/time">
                    <div className="absolute inset-0 bg-cyber-blue/5 opacity-0 group-hover/time:opacity-100 transition-opacity pointer-events-none"></div>
                    <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-4">
                        <i className="fas fa-calendar-alt mr-2"></i> Selector Temporal (Pasado/Presente)
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <input 
                            type="date" 
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="bg-black border border-slate-700 rounded-lg p-3 text-white font-mono uppercase focus:border-cyber-blue focus:shadow-neon-blue outline-none"
                        />
                        <select 
                            value={selectedDraw}
                            onChange={e => setSelectedDraw(e.target.value as DrawTime)}
                            className="bg-black border border-slate-700 rounded-lg p-3 text-white font-mono uppercase focus:border-cyber-blue focus:shadow-neon-blue outline-none appearance-none"
                        >
                            {Object.values(DrawTime).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>

                {/* 2. Winning Number Core */}
                <div className="flex flex-col md:flex-row gap-8">
                    
                    {/* Main Number */}
                    <div className="flex-1">
                        <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-2">
                             Número Ganador (00-99)
                        </label>
                        <div className="relative">
                            <input 
                                type="text" 
                                maxLength={2}
                                value={winningNumber}
                                onChange={e => setWinningNumber(e.target.value.replace(/[^0-9]/g, ''))}
                                className="w-full bg-black border-2 border-white/10 rounded-xl py-4 text-center text-5xl font-mono text-white focus:border-cyber-blue focus:shadow-[0_0_30px_rgba(36,99,235,0.3)] outline-none transition-all placeholder-slate-800"
                                placeholder="--"
                            />
                            <div className="absolute inset-0 rounded-xl border border-white/5 pointer-events-none"></div>
                        </div>
                    </div>

                    {/* Reventados Module */}
                    <div className="flex-1 bg-red-950/10 border border-red-900/30 rounded-xl p-4 relative overflow-hidden">
                        
                        <div className="flex justify-between items-center mb-4">
                            <label className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-widest flex items-center gap-2">
                                <i className="fas fa-bomb"></i> Protocolo Reventados
                            </label>
                            
                            {/* Cyber Switch */}
                            <button 
                                onClick={() => setIsReventado(!isReventado)}
                                className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${isReventado ? 'bg-red-600 shadow-neon-red' : 'bg-slate-800'}`}
                            >
                                <div className={`absolute top-1 bottom-1 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 ${isReventado ? 'left-7' : 'left-1'}`}></div>
                            </button>
                        </div>

                        {/* Collapsible Input */}
                        <div className={`transition-all duration-500 overflow-hidden ${isReventado ? 'max-h-32 opacity-100' : 'max-h-0 opacity-50'}`}>
                             <input 
                                type="text" 
                                maxLength={2}
                                value={reventadoNumber}
                                onChange={e => setReventadoNumber(e.target.value.replace(/[^0-9]/g, ''))}
                                className="w-full bg-black border border-red-800 rounded-lg py-3 text-center text-3xl font-mono text-red-500 focus:border-red-500 focus:shadow-neon-red outline-none placeholder-red-900/50"
                                placeholder="--"
                            />
                            <p className="text-[9px] text-red-400/60 mt-2 text-center font-mono">
                                * Se aplicará multiplicador 200x
                            </p>
                        </div>
                        
                        {!isReventado && (
                            <div className="text-center text-slate-500 text-xs font-mono py-4">
                                MÓDULO INACTIVO
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-4 border-t border-white/5">
                     <button 
                        onClick={handleSubmit}
                        disabled={loading || !winningNumber || (isReventado && !reventadoNumber)}
                        className={`
                            w-full py-5 rounded-xl font-display font-black uppercase tracking-[0.2em] text-sm relative overflow-hidden group
                            ${success ? 'bg-cyber-success text-black' : 'bg-white/5 text-white border border-white/10 hover:bg-cyber-blue hover:text-black hover:border-cyber-blue hover:shadow-neon-blue'}
                            transition-all duration-300
                        `}
                     >
                        {/* Inner status */}
                        <div className="relative z-10 flex items-center justify-center gap-3">
                            {loading ? <i className="fas fa-circle-notch fa-spin"></i> : 
                             success ? <i className="fas fa-check-circle"></i> : 
                             <i className="fas fa-upload"></i>}
                             
                            <span>
                                {loading ? 'ESCRIBIENDO EN LEDGER...' : 
                                 success ? 'RESULTADO PUBLICADO' : 
                                 'EJECUTAR INYECCIÓN'}
                            </span>
                        </div>
                     </button>
                </div>

            </div>
        </div>
    </div>
  );
}
