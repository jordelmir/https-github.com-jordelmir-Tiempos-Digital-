import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../services/edgeApi';
import { WeeklyDataStats, PurgeTarget } from '../types';
import { formatCurrency } from '../constants';
import AnimatedIconUltra from './ui/AnimatedIconUltra';
import MatrixRain from './ui/MatrixRain';

export default function DataPurgeCard({ theme: parentTheme }: { theme?: any }) {
    const { user } = useAuthStore();
    const [weeklyStats, setWeeklyStats] = useState<WeeklyDataStats[]>([]);
    const [selectedWeek, setSelectedWeek] = useState<WeeklyDataStats | null>(null);
    const [loading, setLoading] = useState(true);
    
    // Purge Flow State
    const [purgeType, setPurgeType] = useState<PurgeTarget | null>(null);
    const [confirmation, setConfirmation] = useState('');
    const [isExecuting, setIsExecuting] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    // --- THEME ENGINE: STABLE VS NUCLEAR ---
    const isNuclear = purgeType === 'DEEP_CLEAN';
    
    const ui = useMemo(() => {
        if (isNuclear) return {
            border: 'border-red-500',
            shadow: 'shadow-[0_0_50px_rgba(239,68,68,0.4),inset_0_0_20px_rgba(239,68,68,0.2)]',
            text: 'text-red-500',
            textGlow: 'drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]',
            bg: 'bg-red-950/30',
            accent: 'bg-red-500',
            scanline: 'from-red-500/20',
            barBase: 'bg-red-900/40',
            barActive: 'bg-red-500 shadow-[0_0_20px_#ef4444]',
            icon: 'fa-radiation',
            matrixColor: '#ef4444'
        };
        return {
            border: 'border-cyan-500',
            shadow: 'shadow-[0_0_40px_rgba(6,182,212,0.3),inset_0_0_10px_rgba(6,182,212,0.1)]',
            text: 'text-cyan-400',
            textGlow: 'drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]',
            bg: 'bg-cyan-950/10',
            accent: 'bg-cyan-400',
            scanline: 'from-cyan-400/10',
            barBase: 'bg-slate-800/60',
            barActive: 'bg-cyan-400 shadow-[0_0_20px_#22d3ee]',
            icon: 'fa-server',
            matrixColor: '#06b6d4'
        };
    }, [isNuclear]);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const year = new Date().getFullYear();
            const res = await api.getWeeklyDataStats({ year });
            if (res.data) {
                setWeeklyStats(res.data.stats);
                if (res.data.stats.length > 0) {
                    setSelectedWeek(res.data.stats[res.data.stats.length - 1]);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handlePurge = async () => {
        if (!selectedWeek || !purgeType || !user) return;
        
        setIsExecuting(true);
        try {
            await new Promise(r => setTimeout(r, 2000));
            
            const result = await api.maintenance.executePurge({
                target: purgeType,
                days: 7, 
                actor_id: user.id
            });

            if (result.error) {
                throw new Error(result.error);
            } else {
                setSuccessMsg(isNuclear ? 'PURGA NUCLEAR COMPLETADA' : 'OPTIMIZACIÓN EXITOSA');
                setTimeout(() => {
                    setSuccessMsg('');
                    setPurgeType(null);
                    setConfirmation('');
                    fetchStats(); 
                }, 3000);
            }
        } catch (e: any) {
            alert(e.message || "Error Crítico");
        } finally {
            setIsExecuting(false);
        }
    };

    const maxRecords = Math.max(...weeklyStats.map(s => s.recordCount), 1000);

    const getPurgePhrase = () => {
        if (purgeType === 'DEEP_CLEAN') return 'PURGA TOTAL SISTEMA';
        if (purgeType === 'AUDIT') return 'ARCHIVAR LOGS';
        return 'CONFIRMAR LIMPIEZA';
    };

    return (
        <div className="relative w-full group min-h-[550px] font-sans">
            
            {/* --- OUTER PHOSPHORESCENT GLOW --- */}
            <div className={`absolute -inset-[2px] rounded-[2.5rem] opacity-40 blur-xl animate-pulse transition-all duration-1000 ${isNuclear ? 'bg-red-600' : 'bg-cyan-500'}`}></div>
            <div className={`absolute -inset-[1px] rounded-[2.5rem] opacity-20 blur-md transition-all duration-500 ${isNuclear ? 'bg-red-500' : 'bg-blue-500'}`}></div>

            {/* --- MAIN CHASSIS --- */}
            <div className={`relative bg-[#02040a] border-[3px] ${ui.border} rounded-[2.5rem] overflow-hidden ${ui.shadow} flex flex-col h-full transition-all duration-700 z-10 backdrop-blur-xl`}>
                
                {/* --- INTERNAL MATRIX RAIN --- */}
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <MatrixRain 
                        colorHex={ui.matrixColor} 
                        speed={isNuclear ? 2 : 0.5} 
                        density={isNuclear ? 'HIGH' : 'LOW'} 
                        opacity={0.3} 
                    />
                </div>

                {/* Background Grid & Scanline */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[length:40px_40px] pointer-events-none opacity-20"></div>
                <div className={`absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b ${ui.scanline} to-transparent opacity-20 animate-[scan_4s_linear_infinite] pointer-events-none`}></div>

                {/* --- HEADER: COMMAND CONSOLE (ADAPTIVE FLEX) --- */}
                <div className={`relative p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:justify-between z-10 border-b border-white/5 transition-colors duration-500 gap-6 sm:gap-0 ${isNuclear ? 'bg-red-950/20' : 'bg-cyan-950/10'}`}>
                    
                    {/* Living Status Line */}
                    <div className={`absolute bottom-0 left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-${isNuclear ? 'red-500' : 'cyan-500'} to-transparent opacity-50 shadow-[0_0_15px_currentColor]`}></div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left w-full">
                        {/* Icon Container */}
                        <div className={`w-16 h-16 sm:w-14 sm:h-14 rounded-2xl bg-black border-2 ${ui.border} flex items-center justify-center relative group/icon overflow-hidden shadow-inner shrink-0`}>
                            <div className={`absolute inset-0 ${ui.accent} opacity-10 blur-md animate-pulse`}></div>
                            <AnimatedIconUltra profile={{ animation: isNuclear ? 'pulse' : 'spin3d', theme: isNuclear ? 'neon' : 'futuristic', speed: isNuclear ? 0.5 : 3 }}>
                                <i className={`fas ${ui.icon} text-2xl ${ui.text} drop-shadow-[0_0_10px_currentColor]`}></i>
                            </AnimatedIconUltra>
                        </div>
                        
                        {/* Title Block - Adaptive width */}
                        <div className="flex-1 min-w-0">
                            <h3 className={`text-xl sm:text-2xl font-display font-black text-white uppercase tracking-widest drop-shadow-md break-words leading-tight`}>
                                Mantenimiento <span className={`${ui.text} ${ui.textGlow}`}>Core</span>
                            </h3>
                            <div className={`text-[9px] sm:text-[10px] font-mono uppercase tracking-[0.15em] mt-1 text-slate-400 break-words leading-relaxed`}>
                                Gestión de Ciclo de Vida de Datos
                            </div>
                            
                            {/* Status Badge - Mobile centered, Desktop left */}
                            <div className="mt-3 flex justify-center sm:justify-start">
                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-black/40 backdrop-blur-md ${isNuclear ? 'border-red-500/50' : 'border-cyan-500/30'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${isNuclear ? 'bg-red-500 animate-ping' : 'bg-green-500 animate-pulse'}`}></div>
                                    <span className={`text-[8px] font-mono font-bold uppercase tracking-widest ${isNuclear ? 'text-red-400' : 'text-slate-400'}`}>
                                        {isNuclear ? '⚠ EMERGENCIA' : 'SISTEMA NOMINAL'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Refresh Button - Absolute on mobile top-right, static on desktop */}
                    <button 
                        onClick={fetchStats} 
                        className={`absolute top-4 right-4 sm:static w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 hover:border-white/30 transition-all group/refresh shrink-0 ${loading ? 'animate-spin' : ''}`}
                        title="Rescan Sectors"
                    >
                        <i className={`fas fa-sync-alt ${ui.text} opacity-70 group-hover/refresh:opacity-100`}></i>
                    </button>
                </div>

                <div className="flex flex-col lg:flex-row h-full relative z-10">
                    
                    {/* --- LEFT: HOLOGRAPHIC DATA VISUALIZER --- */}
                    <div className="lg:w-3/5 p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-white/5 relative">
                        <div className="flex flex-wrap justify-between items-end mb-8 gap-4">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                <i className="fas fa-chart-bar"></i> Línea de Tiempo (8 Semanas)
                            </label>
                            <div className={`text-[10px] font-mono font-bold px-3 py-1 rounded bg-black border whitespace-nowrap ${isNuclear ? 'border-red-500/30 text-red-400' : 'border-cyan-500/30 text-cyan-400'}`}>
                                {weeklyStats.length} BLOQUES MEM.
                            </div>
                        </div>

                        {/* CHART AREA */}
                        <div className="h-64 flex items-end gap-2 sm:gap-3 md:gap-4 relative px-2 mb-4">
                            {/* Horizontal Grid Lines */}
                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 z-0">
                                <div className="border-t border-dashed border-slate-500 w-full"></div>
                                <div className="border-t border-dashed border-slate-500 w-full"></div>
                                <div className="border-t border-dashed border-slate-500 w-full"></div>
                            </div>

                            {loading ? (
                                <div className={`w-full h-full flex items-center justify-center ${ui.text} font-mono animate-pulse tracking-widest text-xs`}>
                                    ESCANEO DE SECTORES...
                                </div>
                            ) : weeklyStats.length === 0 ? (
                                <div className="w-full h-full flex items-center justify-center text-slate-600 font-mono text-xs uppercase">
                                    Sin Datos Históricos
                                </div>
                            ) : (
                                weeklyStats.slice(-8).map((week, idx) => {
                                    const isSelected = selectedWeek?.weekNumber === week.weekNumber;
                                    const heightPct = Math.max((week.recordCount / maxRecords) * 100, 10);
                                    
                                    return (
                                        <div 
                                            key={week.weekNumber} 
                                            onClick={() => { setSelectedWeek(week); setPurgeType(null); }}
                                            className="flex-1 flex flex-col items-center justify-end h-full group/bar cursor-pointer relative z-10"
                                        >
                                            {/* Data Tooltip */}
                                            <div className={`absolute -top-8 opacity-0 group-hover/bar:opacity-100 transition-all duration-200 text-[9px] font-mono font-bold bg-black border ${ui.border} ${ui.text} px-2 py-1 rounded whitespace-nowrap z-20 shadow-[0_0_10px_rgba(0,0,0,0.8)] pointer-events-none transform translate-y-2 group-hover/bar:translate-y-0 hidden sm:block`}>
                                                {week.recordCount.toLocaleString()} REGS
                                            </div>
                                            
                                            {/* The Bar */}
                                            <div 
                                                className={`w-full rounded-t-sm transition-all duration-300 relative overflow-hidden backdrop-blur-sm border-x border-t border-white/10 ${isSelected ? ui.barActive : ui.barBase} ${!isSelected && 'hover:opacity-80'}`}
                                                style={{ height: `${heightPct}%` }}
                                            >
                                                {/* Scan Effect inside Bar */}
                                                <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(255,255,255,0.1)_50%,transparent_100%)] bg-[length:100%_200%] animate-[scan_3s_linear_infinite] opacity-30"></div>
                                                {isSelected && <div className="absolute top-0 left-0 w-full h-[2px] bg-white shadow-[0_0_10px_white]"></div>}
                                            </div>
                                            
                                            {/* Label */}
                                            <div className={`mt-3 text-[8px] font-mono font-bold uppercase tracking-wider transition-colors ${isSelected ? ui.text : 'text-slate-600'}`}>
                                                SEM {week.weekNumber}
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>

                        {/* Selected Info Panel - Stack vertically on mobile */}
                        <div className={`mt-6 bg-black/40 border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center relative overflow-hidden transition-all duration-500 gap-4 sm:gap-0 ${selectedWeek ? 'opacity-100' : 'opacity-50 grayscale'}`}>
                            {selectedWeek ? (
                                <>
                                    <div className="relative z-10 w-full sm:w-auto">
                                        <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-1">Bloque Seleccionado</div>
                                        <div className="text-white font-display font-bold text-lg tracking-wide">Semana {selectedWeek.weekNumber} <span className="text-slate-500 text-sm">/ {selectedWeek.year}</span></div>
                                        <div className="text-[9px] text-slate-400 font-mono mt-1 break-words">
                                            Rango: {new Date(selectedWeek.startDate).toLocaleDateString()} — {new Date(selectedWeek.endDate).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="text-left sm:text-right relative z-10 w-full sm:w-auto border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0">
                                        <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-1">Volumen Estimado</div>
                                        <div className={`font-mono font-black text-2xl ${ui.text} ${ui.textGlow}`}>
                                            {selectedWeek.sizeEstimate}
                                        </div>
                                    </div>
                                    {/* Background Decor */}
                                    <div className={`absolute -right-4 -bottom-8 text-[100px] opacity-5 ${ui.text} rotate-12 pointer-events-none`}>
                                        <i className="fas fa-database"></i>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center w-full text-slate-600 font-mono text-xs uppercase tracking-widest py-2">
                                    Seleccione un bloque de datos para analizar
                                </div>
                            )}
                        </div>
                    </div>

                    {/* --- RIGHT: OPERATIONS CONSOLE --- */}
                    <div className={`lg:w-2/5 p-6 sm:p-8 relative transition-colors duration-700 ${isNuclear ? 'bg-red-950/10' : 'bg-transparent'}`}>
                        
                        {/* Overlay: Execution State */}
                        {isExecuting && (
                            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
                                <div className={`w-24 h-24 rounded-full border-4 ${ui.border} flex items-center justify-center text-4xl ${ui.text} shadow-[0_0_50px_currentColor] animate-spin mb-6`}>
                                    <i className="fas fa-radiation"></i>
                                </div>
                                <div className={`${ui.text} font-display font-black text-xl uppercase tracking-[0.3em] animate-pulse text-center px-4`}>
                                    {isNuclear ? 'Ejecutando Purga...' : 'Procesando...'}
                                </div>
                                <div className="mt-4 w-48 h-1 bg-gray-800 rounded-full overflow-hidden">
                                    <div className={`h-full ${ui.accent} animate-[loading_1.5s_ease-in-out_infinite]`}></div>
                                </div>
                            </div>
                        )}

                        {successMsg && (
                            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md animate-in zoom-in duration-300 p-4 text-center">
                                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-[0_0_50px_lime] mb-6 animate-bounce">
                                    <i className="fas fa-check text-4xl text-black"></i>
                                </div>
                                <h4 className="text-green-500 font-black font-display uppercase tracking-widest px-2 leading-relaxed">{successMsg}</h4>
                            </div>
                        )}

                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <i className="fas fa-terminal"></i> Terminal de Comandos
                        </h4>

                        {!selectedWeek ? (
                            <div className="h-48 sm:h-64 flex items-center justify-center border border-dashed border-white/10 rounded-xl bg-white/5">
                                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest animate-pulse">Esperando Objetivo...</span>
                            </div>
                        ) : !purgeType ? (
                            <div className="grid grid-cols-1 gap-4">
                                {/* Button: Clean Bets */}
                                <button 
                                    onClick={() => setPurgeType('BETS')}
                                    className="group relative overflow-hidden rounded-xl border border-blue-500/30 bg-blue-950/20 p-5 text-left transition-all hover:border-blue-400 hover:bg-blue-900/30 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:-translate-y-1"
                                >
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/50 group-hover:scale-110 transition-transform">
                                            <i className="fas fa-ticket-alt"></i>
                                        </div>
                                        <div>
                                            <div className="font-bold text-white text-sm uppercase tracking-wider group-hover:text-blue-300">Limpiar Apuestas</div>
                                            <div className="text-[9px] text-slate-400 mt-1">Elimina tickets de la semana seleccionada.</div>
                                        </div>
                                    </div>
                                </button>

                                {/* Button: Clean Logs */}
                                <button 
                                    onClick={() => setPurgeType('AUDIT')}
                                    className="group relative overflow-hidden rounded-xl border border-purple-500/30 bg-purple-950/20 p-5 text-left transition-all hover:border-purple-400 hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:-translate-y-1"
                                >
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 border border-purple-500/50 group-hover:scale-110 transition-transform">
                                            <i className="fas fa-clipboard-list"></i>
                                        </div>
                                        <div>
                                            <div className="font-bold text-white text-sm uppercase tracking-wider group-hover:text-purple-300">Archivar Logs</div>
                                            <div className="text-[9px] text-slate-400 mt-1">Comprime y archiva auditoría antigua.</div>
                                        </div>
                                    </div>
                                </button>

                                {/* Button: DEEP CLEAN (Nuclear) */}
                                <button 
                                    onClick={() => setPurgeType('DEEP_CLEAN')}
                                    className="group relative overflow-hidden rounded-xl border border-red-600/50 bg-red-950/30 p-5 text-left transition-all hover:border-red-500 hover:shadow-[0_0_30px_rgba(220,38,38,0.4)] hover:-translate-y-1 mt-4"
                                >
                                    <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,0,0,0.05)_10px,rgba(255,0,0,0.05)_20px)] animate-[shine_20s_linear_infinite]"></div>
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center text-red-500 border border-red-500/50 group-hover:scale-110 transition-transform animate-pulse">
                                            <i className="fas fa-biohazard"></i>
                                        </div>
                                        <div>
                                            <div className="font-black text-red-500 text-sm uppercase tracking-widest drop-shadow-[0_0_5px_rgba(255,0,0,0.8)]">Limpieza Profunda</div>
                                            <div className="text-[9px] text-red-300 mt-1 font-bold">⚠ ELIMINACIÓN TOTAL DEL PERIODO</div>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        ) : (
                            <div className="animate-in slide-in-from-right-8 duration-300">
                                <button onClick={() => { setPurgeType(null); setConfirmation(''); }} className="text-[10px] font-bold text-slate-500 hover:text-white mb-4 flex items-center gap-2 uppercase tracking-wider transition-colors">
                                    <i className="fas fa-arrow-left"></i> Cancelar Operación
                                </button>
                                
                                <div className={`border-l-2 pl-4 py-2 mb-6 ${ui.border}`}>
                                    <div className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Protocolo Iniciado</div>
                                    <div className={`text-lg font-black uppercase ${ui.text} ${ui.textGlow} mt-1`}>
                                        {purgeType === 'DEEP_CLEAN' ? 'PURGA NUCLEAR' : purgeType === 'BETS' ? 'LIMPIEZA DE APUESTAS' : 'ARCHIVADO DE LOGS'}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider block mb-2">Frase de Confirmación</label>
                                        <div className="relative">
                                            <input 
                                                type="text" 
                                                value={confirmation}
                                                onChange={e => setConfirmation(e.target.value.toUpperCase())}
                                                className={`w-full bg-black border-2 rounded-lg p-3 text-center font-mono text-sm tracking-widest uppercase transition-all focus:outline-none ${confirmation === getPurgePhrase() ? `${ui.border} ${ui.text} ${ui.shadow}` : 'border-slate-800 text-slate-400 focus:border-slate-600'}`}
                                                placeholder={getPurgePhrase()}
                                                autoFocus
                                            />
                                            {confirmation === getPurgePhrase() && (
                                                <div className={`absolute right-3 top-1/2 -translate-y-1/2 ${ui.text}`}>
                                                    <i className="fas fa-check-circle"></i>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <button 
                                        onClick={handlePurge}
                                        disabled={confirmation !== getPurgePhrase()}
                                        className={`w-full py-4 rounded-lg font-black uppercase tracking-[0.2em] text-xs transition-all duration-300 relative overflow-hidden group/btn ${confirmation === getPurgePhrase() ? `${ui.accent} text-black hover:scale-[1.02] shadow-[0_0_30px_currentColor]` : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                                    >
                                        <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover/btn:animate-[shine_0.5s_ease-in-out]"></div>
                                        <span className="relative z-10 flex items-center justify-center gap-2">
                                            <i className={`fas ${isNuclear ? 'fa-radiation' : 'fa-trash-alt'} ${confirmation === getPurgePhrase() ? 'animate-pulse' : ''}`}></i>
                                            EJECUTAR
                                        </span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}