
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../services/edgeApi';
import { WeeklyDataStats } from '../types';

export default function DataPurgeCard({ theme }: { theme?: { name: string, shadow: string } }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'TOTAL' | 'WEEKLY'>('WEEKLY');
  const user = useAuthStore(s => s.user);

  // WEEKLY MODE STATE
  const [year, setYear] = useState(new Date().getFullYear());
  const [weeklyStats, setWeeklyStats] = useState<WeeklyDataStats[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<WeeklyDataStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // ANIMATION STATE
  const [success, setSuccess] = useState(false);
  const [recoveredInfo, setRecoveredInfo] = useState('');

  const PHRASE_TOTAL = 'CONFIRMAR PURGA TOTAL';
  const getPhraseWeekly = (week: number) => `ELIMINAR SEMANA ${week}`;

  useEffect(() => {
      if (open && mode === 'WEEKLY') {
          fetchWeeklyStats();
      }
  }, [open, mode, year]);

  // Reset states when closing
  useEffect(() => {
      if (!open) {
          setSuccess(false);
          setConfirm('');
          setRecoveredInfo('');
      }
  }, [open]);

  const fetchWeeklyStats = async () => {
      setLoadingStats(true);
      try {
          const res = await api.getWeeklyDataStats({ year });
          if (res.data) setWeeklyStats(res.data.stats);
      } catch (e) {
          console.error(e);
      } finally {
          setLoadingStats(false);
      }
  };

  async function runPurge() {
    if (!user) return;
    setLoading(true);
    
    try {
        let resultMsg = '';
        if (mode === 'TOTAL') {
            const res = await api.purgeSystem({ confirm_phrase: confirm, actor_id: user.id });
            if (res.error) {
                alert(res.error);
                setLoading(false);
                return;
            }
            resultMsg = 'RESETEO DE FÁBRICA COMPLETADO';
        } else {
            if (!selectedWeek) return;
            const res = await api.purgeWeeklyData({
                year: selectedWeek.year,
                weekNumber: selectedWeek.weekNumber,
                confirmation: confirm,
                actor_id: user.id
            });
            if (res.error) {
                alert(res.error);
                setLoading(false);
                return;
            }
            resultMsg = `SEMANA ${selectedWeek.weekNumber} DEPURADA`;
            setRecoveredInfo(selectedWeek.sizeEstimate);
        }

        // TRIGGER ANIMATION SEQUENCE
        setSuccess(true);
        setLoading(false);

        // Auto Close after animation
        setTimeout(() => {
            setOpen(false);
            if (mode === 'WEEKLY') fetchWeeklyStats();
            setSelectedWeek(null);
        }, 3500);

    } catch (e) {
        alert("ERROR CRÍTICO");
        setLoading(false);
    }
  }

  // HEATMAP COLOR LOGIC
  const getHeatColor = (count: number) => {
      if (count === 0) return 'bg-[#0f172a] border-white/5 text-slate-700'; // Dead / Empty
      if (count < 100) return 'bg-cyan-900/20 border-cyan-800 text-cyan-600';
      if (count < 1000) return 'bg-cyan-700/30 border-cyan-500 text-cyan-400 shadow-[0_0_5px_cyan]';
      return 'bg-emerald-600/40 border-emerald-400 text-emerald-200 shadow-[0_0_10px_#10b981] animate-pulse'; // Hot / Full
  };

  return (
    <>
      <div className="relative group h-full">
          {/* Danger Backlight */}
          <div className="absolute -inset-2 bg-red-900/30 rounded-[2rem] blur-2xl animate-[pulse_6s_ease-in-out_infinite]"></div>
          
          <div className="relative h-full bg-cyber-black border-2 border-red-900/50 rounded-2xl p-6 shadow-2xl overflow-hidden hover:border-red-500/50 transition-all duration-300 z-10 flex flex-col justify-between">
            
            {/* Warning Stripes */}
            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{backgroundImage: 'repeating-linear-gradient(45deg, #ff0000 0, #ff0000 2px, transparent 0, transparent 20px)'}}></div>
            
            <div className="relative z-10">
                <h3 className="font-display font-bold text-red-500 text-lg flex items-center gap-3 mb-2 uppercase tracking-wider text-shadow-red">
                    <i className="fas fa-trash-alt"></i> Mantenimiento de Datos
                </h3>
                <p className="text-xs font-mono text-red-300/70 mb-6 leading-relaxed">
                    Gestión de almacenamiento y depuración de registros antiguos. <br/>
                    <span className="text-red-500 font-bold">Optimiza el rendimiento del núcleo.</span>
                </p>
            </div>
                
            <button 
                onClick={() => setOpen(true)} 
                className="w-full relative group/btn overflow-visible rounded-lg mt-auto"
            >
                <div className="absolute -inset-1 bg-red-600 rounded-lg blur opacity-0 group-hover/btn:opacity-40 transition-opacity duration-300 animate-pulse"></div>
                <div className="relative z-10 py-3 border border-red-600 bg-red-950/30 group-hover/btn:bg-red-600 rounded-lg transition-colors">
                    <span className="flex items-center justify-center gap-2 font-display font-bold uppercase tracking-[0.2em] text-red-500 group-hover/btn:text-black transition-colors">
                            <i className="fas fa-tools"></i> Abrir Consola
                    </span>
                </div>
            </button>
          </div>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="relative w-full max-w-5xl h-[85vh] flex flex-col perspective-1000">
             
             {/* Background Grid */}
             <div className="absolute inset-0 bg-[linear-gradient(rgba(255,0,60,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,0,60,0.05)_1px,transparent_1px)] bg-[length:40px_40px] pointer-events-none"></div>

             <div className="bg-[#050a14] border-2 border-red-900 rounded-3xl w-full h-full p-8 shadow-[0_0_100px_rgba(255,0,0,0.1)] relative overflow-hidden z-10 flex flex-col">
                
                {/* --- SUCCESS ANIMATION OVERLAY --- */}
                {success && (
                    <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center animate-in fade-in duration-300">
                        {/* EXPLOSION RING */}
                        <div className="absolute w-[150%] h-[150%] rounded-full border-[20px] border-emerald-500/20 animate-[ping_1.5s_ease-out_infinite]"></div>
                        <div className="absolute w-full h-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.2),transparent_70%)] animate-pulse"></div>
                        
                        {/* CENTER ICON TRANSFORMATION */}
                        <div className="relative z-10 text-center animate-in zoom-in duration-500 delay-100">
                            <div className="w-40 h-40 mx-auto bg-[#022c22] rounded-full border-4 border-emerald-500 shadow-[0_0_100px_#10b981] flex items-center justify-center mb-8 relative overflow-hidden">
                                {/* Scanline inside circle */}
                                <div className="absolute top-0 w-full h-2 bg-emerald-400/50 shadow-[0_0_20px_#10b981] animate-[scanline_1s_linear_infinite]"></div>
                                <i className="fas fa-check text-7xl text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,1)]"></i>
                            </div>
                            
                            <h2 className="text-5xl font-display font-black text-white uppercase tracking-tighter mb-2 drop-shadow-[0_0_20px_rgba(16,185,129,0.8)]">
                                SYSTEM <span className="text-emerald-500">CLEAN</span>
                            </h2>
                            <div className="text-emerald-400/70 font-mono text-sm tracking-[0.5em] uppercase font-bold animate-pulse">
                                Optimization Complete
                            </div>
                            
                            {recoveredInfo && (
                                <div className="mt-8 inline-block bg-emerald-900/30 border border-emerald-500/50 px-6 py-2 rounded-full text-emerald-300 font-mono text-xs">
                                    <i className="fas fa-hdd mr-2"></i> ESPACIO RECUPERADO: {recoveredInfo}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-6 shrink-0 relative z-10">
                    <div>
                        <h2 className="text-3xl font-display font-black text-white uppercase tracking-tighter flex items-center gap-4">
                            <i className="fas fa-server text-red-500 animate-pulse"></i>
                            Estación de <span className="text-red-500">Purga</span>
                        </h2>
                        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mt-1">
                            Sistema de liberación de espacio cronológico
                        </p>
                    </div>
                    <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                        <i className="fas fa-times text-2xl"></i>
                    </button>
                </div>

                {/* Mode Selector */}
                <div className="flex gap-4 mb-8 shrink-0 relative z-10">
                    <button 
                        onClick={() => setMode('WEEKLY')}
                        className={`flex-1 py-4 rounded-xl border-2 font-bold uppercase tracking-widest transition-all ${mode === 'WEEKLY' ? 'bg-red-900/20 border-red-500 text-white shadow-[0_0_20px_rgba(255,0,0,0.2)]' : 'border-white/10 text-slate-500 hover:bg-white/5'}`}
                    >
                        <i className="fas fa-calendar-week mr-2"></i> Limpieza Selectiva (Semanal)
                    </button>
                    <button 
                        onClick={() => setMode('TOTAL')}
                        className={`flex-1 py-4 rounded-xl border-2 font-bold uppercase tracking-widest transition-all ${mode === 'TOTAL' ? 'bg-red-600 text-black border-red-500 shadow-neon-red' : 'border-white/10 text-slate-500 hover:bg-red-900/10 hover:text-red-400'}`}
                    >
                        <i className="fas fa-radiation mr-2"></i> Purga Total (Emergencia)
                    </button>
                </div>

                {/* --- WEEKLY VIEW CONTENT --- */}
                {mode === 'WEEKLY' && (
                    <div className="flex-1 flex flex-col min-h-0 relative z-10">
                        {/* Year Selector */}
                        <div className="flex justify-between items-center mb-4 shrink-0">
                            <h4 className="text-sm font-display font-bold text-white uppercase tracking-wider">Mapa de Calor: {year}</h4>
                            <div className="flex bg-black border border-white/10 rounded-lg p-1">
                                <button onClick={() => setYear(y => y-1)} className="px-3 py-1 hover:bg-white/10 rounded text-slate-400"><i className="fas fa-chevron-left"></i></button>
                                <span className="px-4 py-1 font-mono font-bold text-white">{year}</span>
                                <button onClick={() => setYear(y => y+1)} className="px-3 py-1 hover:bg-white/10 rounded text-slate-400"><i className="fas fa-chevron-right"></i></button>
                            </div>
                        </div>

                        {/* THE GRID */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/40 rounded-xl border border-white/5 p-4 relative">
                            {loadingStats ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-red-500 animate-pulse">
                                    <i className="fas fa-circle-notch fa-spin text-4xl mb-4"></i>
                                    <span className="font-mono tracking-widest">ESCANEANDO BASE DE DATOS...</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-13 gap-3">
                                    {weeklyStats.map((stat) => (
                                        <button
                                            key={stat.weekNumber}
                                            onClick={() => setSelectedWeek(stat)}
                                            className={`aspect-square rounded-md border flex flex-col items-center justify-center relative group overflow-hidden transition-all duration-300 hover:scale-110 hover:z-20 ${
                                                selectedWeek?.weekNumber === stat.weekNumber 
                                                ? 'bg-red-600 border-white text-white shadow-[0_0_20px_red] scale-110 z-20' 
                                                : getHeatColor(stat.recordCount)
                                            }`}
                                        >
                                            <span className="text-[10px] font-mono font-bold z-10">W{stat.weekNumber}</span>
                                            {stat.recordCount > 0 && (
                                                <div className="text-[8px] opacity-70 z-10">{stat.sizeEstimate}</div>
                                            )}
                                            {/* Hover Glow */}
                                            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Selection Details Panel */}
                        <div className={`mt-6 p-6 rounded-2xl border-2 transition-all duration-500 shrink-0 ${selectedWeek ? 'bg-red-950/20 border-red-500 shadow-[0_0_30px_rgba(255,0,0,0.15)] translate-y-0 opacity-100' : 'bg-black border-white/5 translate-y-4 opacity-50 pointer-events-none'}`}>
                            {selectedWeek ? (
                                <div className="flex flex-col md:flex-row gap-8 items-center">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-display font-black text-white uppercase tracking-wider mb-2">
                                            Semana {selectedWeek.weekNumber}, {selectedWeek.year}
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4 text-xs font-mono text-slate-400">
                                            <div>Rango: <span className="text-white">{selectedWeek.startDate} / {selectedWeek.endDate}</span></div>
                                            <div>Registros: <span className="text-red-400 font-bold">{selectedWeek.recordCount.toLocaleString()}</span></div>
                                            <div>Impacto: <span className="text-red-400 font-bold">{selectedWeek.sizeEstimate}</span></div>
                                            <div>Estado: <span className="text-green-500">RESPALDADO</span></div>
                                        </div>
                                    </div>

                                    <div className="w-full md:w-auto flex flex-col gap-2">
                                        <label className="text-[9px] font-bold text-red-500 uppercase tracking-widest block text-center mb-1">
                                            Escribe: "{getPhraseWeekly(selectedWeek.weekNumber)}"
                                        </label>
                                        <div className="flex gap-2">
                                            <input 
                                                value={confirm}
                                                onChange={e => setConfirm(e.target.value.toUpperCase())}
                                                className="bg-black border border-red-500/50 rounded-lg px-4 py-2 text-white font-mono text-center uppercase focus:outline-none focus:border-red-500"
                                                placeholder="CONFIRMACIÓN"
                                            />
                                            <button 
                                                onClick={runPurge}
                                                disabled={loading || confirm !== getPhraseWeekly(selectedWeek.weekNumber)}
                                                className="px-6 py-2 bg-red-600 hover:bg-white hover:text-red-600 text-black font-bold uppercase rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-neon-red flex items-center justify-center min-w-[60px]"
                                            >
                                                {loading ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-trash"></i>}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-slate-600 font-mono text-xs uppercase tracking-widest py-4">
                                    Selecciona un bloque temporal para analizar
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- TOTAL PURGE VIEW (LEGACY) --- */}
                {mode === 'TOTAL' && (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-in zoom-in duration-300 relative z-10">
                        <div className="w-32 h-32 rounded-full border-4 border-red-600 flex items-center justify-center bg-red-950/50 shadow-[0_0_60px_red] mb-8 animate-pulse">
                            <i className="fas fa-radiation text-6xl text-red-500"></i>
                        </div>
                        <h3 className="text-3xl font-display font-black text-red-500 uppercase tracking-widest mb-4">Zona Muerta Global</h3>
                        <p className="text-white max-w-md mb-8 font-mono text-sm leading-relaxed">
                            Estás a punto de eliminar <span className="text-red-500 font-bold">TODOS</span> los registros transaccionales del sistema. 
                            Esta acción restaurará la base de datos a su estado inicial (Factory Reset).
                            Las cuentas de usuario y saldos se mantendrán.
                        </p>
                        
                        <div className="w-full max-w-md bg-black border-2 border-red-500/30 p-6 rounded-2xl relative group/input">
                            <label className="block text-[9px] font-bold text-red-500 uppercase tracking-widest mb-2 text-center">
                                Frase de Seguridad: "{PHRASE_TOTAL}"
                            </label>
                            <input 
                                value={confirm}
                                onChange={e => setConfirm(e.target.value.toUpperCase())}
                                className="w-full bg-transparent border-b-2 border-slate-700 focus:border-red-500 text-center text-xl font-mono text-white py-2 focus:outline-none transition-colors mb-6"
                                placeholder="ESCRIBIR AQUÍ"
                            />
                            <button 
                                onClick={runPurge}
                                disabled={loading || confirm !== PHRASE_TOTAL}
                                className="w-full py-4 bg-red-600 hover:bg-white hover:text-red-600 text-black font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-neon-red disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'DETONANDO...' : 'EJECUTAR PURGA TOTAL'}
                            </button>
                        </div>
                    </div>
                )}

             </div>
          </div>
        </div>
      )}
    </>
  );
}
