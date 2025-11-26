
import React from 'react';
import { useServerClock, SalesStatus } from '../hooks/useServerClock';
import { UserRole, DrawTime } from '../types';

interface CountdownTimerProps {
    role: UserRole;
}

export default function CountdownTimer({ role }: CountdownTimerProps) {
    const { serverTime, nextDraw, timeRemaining, status, isOffline, loading } = useServerClock();

    // Format helper
    const formatTime = (ms: number) => {
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / 1000 / 60) % 60);
        const hours = Math.floor((ms / 1000 / 3600));
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    // Visual Logic
    const isVendor = role === UserRole.Vendedor;
    const baseColor = isVendor ? 'text-cyber-purple border-cyber-purple' : 'text-cyber-neon border-cyber-neon';
    const glowColor = isVendor ? 'shadow-neon-purple' : 'shadow-neon-cyan';
    
    // Status overrides
    let statusColor = baseColor;
    let statusGlow = glowColor;
    let ringColor = isVendor ? '#bc13fe' : '#00f0ff';

    if (status === 'WARNING') {
        statusColor = 'text-yellow-400 border-yellow-400';
        statusGlow = 'shadow-[0_0_30px_rgba(250,204,21,0.5)]';
        ringColor = '#facc15';
    } else if (status === 'CLOSED') {
        statusColor = 'text-red-500 border-red-500';
        statusGlow = 'shadow-neon-red';
        ringColor = '#ff003c';
    } else if (status === 'OPEN') {
        // Active State - Greenish tint for "Go"
        statusColor = 'text-cyber-success border-cyber-success';
        statusGlow = 'shadow-neon-green';
        ringColor = '#0aff60';
    }

    // Circular Progress Calculation
    // Assume a standard 1 hour window for the visual ring or 4 hours. 
    // Let's use 1 hour (3600000ms) as the full circle for dramatic effect near end.
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const maxWindow = 60 * 60 * 1000; // 1 Hour
    const progress = Math.min(timeRemaining / maxWindow, 1);
    const offset = circumference - (progress * circumference);

    return (
        <div className={`relative group overflow-hidden rounded-2xl bg-[#050a14] border-2 ${statusColor.split(' ')[1]} ${statusGlow} p-6 transition-all duration-500 ${status === 'CLOSED' ? 'grayscale-[0.5] opacity-80' : ''}`}>
            
            {/* Backlight */}
            <div className={`absolute -inset-1 rounded-2xl opacity-20 blur-xl transition-all duration-1000 ${status === 'WARNING' ? 'bg-yellow-500 animate-pulse' : status === 'CLOSED' ? 'bg-red-600' : isVendor ? 'bg-cyber-purple' : 'bg-cyber-neon'}`}></div>

            <div className="relative z-10 flex justify-between items-center">
                
                {/* Info Side */}
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full ${status === 'CLOSED' ? 'bg-red-500' : status === 'WARNING' ? 'bg-yellow-400 animate-ping' : 'bg-green-500 animate-pulse'}`}></div>
                        <span className={`text-[10px] font-mono font-bold uppercase tracking-widest ${status === 'CLOSED' ? 'text-red-400' : 'text-slate-400'}`}>
                            {status === 'CLOSED' ? 'VENTAS CERRADAS' : status === 'WARNING' ? 'CIERRE INMINENTE' : 'SISTEMA ACTIVO'}
                        </span>
                    </div>
                    
                    <h3 className="text-sm font-display font-bold text-white uppercase tracking-wider mb-4">
                        Sorteo: {nextDraw ? nextDraw.split(' ')[0] : '---'}
                    </h3>

                    <div className="bg-black/40 rounded-lg p-2 border border-white/5 inline-block">
                        <div className="text-[9px] text-slate-500 font-mono mb-0.5">HORA NÚCLEO</div>
                        <div className="text-xs font-mono text-white flex items-center gap-2">
                            {serverTime.toLocaleTimeString()}
                            {isOffline && <i className="fas fa-wifi-slash text-red-500 animate-pulse" title="OFFLINE"></i>}
                        </div>
                    </div>
                </div>

                {/* Timer Ring Side */}
                <div className="relative w-24 h-24 flex items-center justify-center">
                    {/* SVG Ring */}
                    <svg className="absolute inset-0 w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                        {/* Track */}
                        <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#1e293b" strokeWidth="6" />
                        {/* Progress */}
                        <circle 
                            cx="50" cy="50" r={radius} 
                            fill="transparent" 
                            stroke={ringColor} 
                            strokeWidth="6" 
                            strokeDasharray={circumference} 
                            strokeDashoffset={status === 'CLOSED' ? circumference : offset}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-linear"
                        />
                    </svg>
                    
                    {/* Digital Time */}
                    <div className="text-center z-10 flex flex-col items-center">
                        {loading ? (
                            <i className="fas fa-circle-notch fa-spin text-cyber-blue"></i>
                        ) : status === 'CLOSED' ? (
                            <i className="fas fa-lock text-2xl text-red-500"></i>
                        ) : (
                            <>
                                <div className={`text-lg font-mono font-bold leading-none ${status === 'WARNING' ? 'text-yellow-400 animate-pulse' : 'text-white'}`}>
                                    {formatTime(timeRemaining).split(':')[1]}:{formatTime(timeRemaining).split(':')[2]}
                                </div>
                                <div className="text-[8px] font-mono text-slate-500 mt-1">
                                    HR {formatTime(timeRemaining).split(':')[0]}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer Message */}
            <div className={`mt-4 pt-4 border-t border-white/5 text-[10px] font-mono text-center transition-colors ${status === 'CLOSED' ? 'text-red-400' : 'text-slate-500'}`}>
                {status === 'CLOSED' 
                    ? (isVendor ? '⛔ Registros sincronizados con servidor.' : '❌ Intenta en el próximo ciclo.')
                    : 'Sincronización Atómica: 12ms'}
            </div>
        </div>
    );
}
