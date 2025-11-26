
import React, { useEffect, useState } from 'react';
import { DrawTime, DrawResult, UserRole } from '../types';

interface WinningNumberCardProps {
    drawTime: DrawTime;
    result?: DrawResult;
    role: UserRole;
    onEdit?: () => void;
}

export default function WinningNumberCard({ drawTime, result, role, onEdit }: WinningNumberCardProps) {
    const [prevNumber, setPrevNumber] = useState<string>('--');
    const [displayNumber, setDisplayNumber] = useState<string>('--');
    const [isSpinning, setIsSpinning] = useState(false);

    // THEME ENGINE
    const getTheme = () => {
        if (drawTime.includes('Mediodía')) return {
            name: 'solar',
            borderColor: 'border-cyber-solar', // For ball
            shadow: 'shadow-[0_0_30px_#ff5f00,inset_0_0_15px_rgba(255,95,0,0.5)]', // For ball
            textColor: 'text-cyber-solar',
            bgHex: '#0c0400',
            ballBg: 'bg-[#1a0500]',
            icon: 'fa-sun',
            label: 'MEDIODÍA',
            // Card Container Theme
            cardBorder: 'border-cyber-solar',
            cardShadow: 'shadow-[0_0_20px_rgba(255,95,0,0.3)]'
        };
        if (drawTime.includes('Tarde')) return {
            name: 'vapor',
            borderColor: 'border-cyber-vapor',
            shadow: 'shadow-[0_0_30px_#7c3aed,inset_0_0_15px_rgba(124,58,237,0.5)]',
            textColor: 'text-cyber-vapor',
            bgHex: '#05020c',
            ballBg: 'bg-[#0a021a]',
            icon: 'fa-cloud-sun',
            label: 'TARDE',
            // Card Container Theme
            cardBorder: 'border-cyber-vapor',
            cardShadow: 'shadow-[0_0_20px_rgba(124,58,237,0.3)]'
        };
        return {
            name: 'abyss',
            borderColor: 'border-blue-600',
            shadow: 'shadow-[0_0_30px_#2563eb,inset_0_0_15px_rgba(37,99,235,0.5)]',
            textColor: 'text-blue-400',
            bgHex: '#02040a',
            ballBg: 'bg-[#02041a]',
            icon: 'fa-moon',
            label: 'NOCHE',
            // Card Container Theme
            cardBorder: 'border-blue-600',
            cardShadow: 'shadow-[0_0_20px_rgba(37,99,235,0.3)]'
        };
    };

    const theme = getTheme();

    // SLOT MACHINE LOGIC
    useEffect(() => {
        if (result?.winningNumber && result.winningNumber !== prevNumber) {
            setIsSpinning(true);
            setPrevNumber(result.winningNumber);
            
            let steps = 0;
            const maxSteps = 20;
            const interval = setInterval(() => {
                steps++;
                setDisplayNumber(Math.floor(Math.random() * 100).toString().padStart(2, '0'));
                if (steps >= maxSteps) {
                    clearInterval(interval);
                    setDisplayNumber(result.winningNumber);
                    setIsSpinning(false);
                }
            }, 50);
        } else if (!result) {
            setDisplayNumber('--');
        } else {
            setDisplayNumber(result.winningNumber);
        }
    }, [result?.winningNumber]);

    const canEdit = role === UserRole.SuperAdmin || role === UserRole.Vendedor;
    const isReventado = result?.isReventado;

    return (
        <div className={`relative group overflow-hidden rounded-3xl border-2 transition-all duration-500 hover:scale-[1.02] h-80 flex flex-col ${theme.cardBorder} ${theme.cardShadow}`}
             style={{ backgroundColor: theme.bgHex }}
        >
            {/* Card Backlight (Subtle) */}
            <div className={`absolute -inset-1 ${theme.textColor.replace('text-', 'bg-')} opacity-5 blur-xl animate-pulse`}></div>

            {/* Header */}
            <div className="relative z-10 p-4 flex justify-between items-center border-b border-white/5 bg-black/20">
                <div className="flex items-center gap-2">
                    <i className={`fas ${theme.icon} ${theme.textColor} text-sm`}></i>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{theme.label}</span>
                </div>
                <div className={`text-[8px] font-mono px-2 py-0.5 rounded border ${result?.status === 'CLOSED' ? 'border-green-900 text-green-500 bg-green-900/20' : 'border-slate-800 text-slate-600'}`}>
                    {result?.status === 'CLOSED' ? 'OFICIAL' : 'ESPERANDO'}
                </div>
            </div>

            {/* --- NEON SPHERES ARENA --- */}
            <div className="relative z-10 flex-1 flex items-center justify-center overflow-hidden p-4">
                
                {isReventado ? (
                    // --- PLANETARY SYSTEM (REVENTADOS) ---
                    <div className="relative w-64 h-64 flex items-center justify-center">
                        
                        {/* 1. THE SUN (CORE): BIG RED BALL */}
                        <div className="relative z-10 w-28 h-28 rounded-full bg-[#1a0000] border-4 border-red-600 shadow-[0_0_50px_#ff0000,inset_0_0_20px_rgba(255,0,0,0.5)] flex items-center justify-center animate-pulse">
                            {/* Texture */}
                            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,100,100,0.2),transparent)]"></div>
                            <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,#ff0000_5px,#ff0000_10px)] rounded-full"></div>
                            
                            <div className="flex flex-col items-center">
                                <span className="font-mono font-black text-2xl text-red-500 drop-shadow-[0_0_10px_#ff0000]">
                                    {result.reventadoNumber || 'R'}
                                </span>
                                <span className="text-[8px] font-black text-red-400 uppercase tracking-widest bg-red-950/80 px-1 rounded">REV</span>
                            </div>
                        </div>

                        {/* 2. ORBITAL TRACK (Visual) */}
                        <div className="absolute w-40 h-40 rounded-full border border-dashed border-white/10 animate-[spin_20s_linear_infinite]"></div>

                        {/* 3. THE PLANET (SATELITE): WINNING NUMBER */}
                        <div className="absolute w-40 h-40 animate-[spin_6s_linear_infinite]">
                            {/* Planet Container (positioned on the ring) */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14">
                                {/* Counter-rotate to keep number upright */}
                                <div className="w-full h-full animate-[spin_6s_linear_infinite_reverse]">
                                    
                                    <div className={`w-full h-full rounded-full ${theme.ballBg} border-2 ${theme.borderColor} ${theme.shadow} flex items-center justify-center relative`}>
                                        {/* Planet Shine */}
                                        <div className="absolute top-1 left-2 w-3 h-2 bg-white opacity-20 blur-sm rounded-full"></div>
                                        
                                        <span className={`font-mono font-bold text-lg text-white drop-shadow-md ${isSpinning ? 'blur-[1px]' : ''}`}>
                                            {displayNumber}
                                        </span>
                                    </div>

                                </div>
                            </div>
                        </div>

                    </div>
                ) : (
                    // --- STANDARD SYSTEM (SINGLE STAR) ---
                    <div className={`
                        relative rounded-full flex items-center justify-center border-4 transition-all duration-700
                        ${theme.borderColor} ${theme.shadow} ${theme.ballBg}
                        w-36 h-36
                    `}>
                        {/* Internal Atmosphere */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
                        
                        {/* Surface Shine */}
                        <div className="absolute top-4 left-6 w-8 h-5 bg-white opacity-10 blur-md rounded-full"></div>

                        <span className={`font-mono font-black tracking-tighter text-white text-5xl drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] ${isSpinning ? 'blur-sm scale-110' : 'scale-100'} transition-all duration-100`}>
                            {displayNumber}
                        </span>
                    </div>
                )}

            </div>

            {/* Admin Controls */}
            {canEdit && (
                <button 
                    onClick={onEdit}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 p-2 rounded-full border border-white/20 hover:bg-white/10 hover:border-white text-white z-20"
                >
                    <i className="fas fa-cog text-xs"></i>
                </button>
            )}
        </div>
    );
}
