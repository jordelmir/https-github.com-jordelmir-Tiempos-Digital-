
import React, { useState } from 'react';
import { useLiveResults } from '../hooks/useLiveResults';
import { DrawTime, UserRole } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import WinningNumberCard from './WinningNumberCard';
import AdminResultControl from './AdminResultControl'; 

export default function LiveResultsPanel() {
    const { user } = useAuthStore();
    const { getResultByDraw, loading, isOffline } = useLiveResults();
    const [editOpen, setEditOpen] = useState(false);

    return (
        <div className="relative w-full group">
            <AdminResultControl isOpen={editOpen} onClose={() => setEditOpen(false)} />

            {/* --- EMERALD CORE BACKLIGHT (Luz Viva Trasera) --- */}
            {/* Capa 1: Brillo Difuso Amplio */}
            <div className="absolute -inset-1 bg-cyber-emerald rounded-[2.5rem] opacity-30 blur-2xl animate-pulse transition-all duration-1000 group-hover:opacity-50 group-hover:blur-3xl"></div>
            {/* Capa 2: Borde de Energía Concentrada */}
            <div className="absolute -inset-[2px] bg-emerald-400 rounded-[2.5rem] opacity-40 blur-md animate-pulse delay-75"></div>

            {/* MAIN CONTAINER (Solid Core) */}
            <div className="relative w-full bg-[#050a14] border border-cyber-emerald/40 rounded-3xl p-6 md:p-8 overflow-hidden shadow-[0_0_50px_rgba(16,185,129,0.1)] z-10">
                
                {/* Background Matrix Scanline (Emerald Tint) */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_50%,transparent_50%)] bg-[length:100%_4px] pointer-events-none opacity-30"></div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 relative z-10">
                    <div>
                        <h2 className="text-2xl font-display font-black text-white uppercase tracking-widest flex items-center gap-3 drop-shadow-lg">
                            <i className="fas fa-broadcast-tower text-cyber-emerald animate-pulse drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]"></i>
                            Resultados <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-200 to-emerald-500">En Vivo</span>
                        </h2>
                        <div className="flex items-center gap-2 mt-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-red-500 animate-bounce' : 'bg-cyber-emerald shadow-[0_0_5px_#10b981] animate-ping'}`}></div>
                            <span className="text-[9px] font-mono text-emerald-500/70 uppercase tracking-widest font-bold">
                                {isOffline ? 'ENLACE PERDIDO' : 'SEÑAL SATELITAL SEGURA'}
                            </span>
                        </div>
                    </div>
                    
                    {/* Role Badge - PHOSPHORESCENT BORDER UPDATE */}
                    <div className={`px-6 py-2 rounded-lg border-2 text-[10px] font-bold uppercase tracking-[0.2em] backdrop-blur-md transition-all duration-500 ${
                        user?.role === UserRole.Cliente 
                        ? 'border-cyber-blue text-cyber-blue bg-blue-900/10 shadow-[0_0_15px_#2463eb]' 
                        : user?.role === UserRole.Vendedor 
                        ? 'border-cyber-purple text-cyber-purple bg-purple-900/10 shadow-[0_0_15px_#bc13fe]' 
                        : 'border-cyber-emerald text-cyber-emerald bg-emerald-900/10 shadow-[0_0_15px_#10b981]'
                    }`}>
                        <i className="fas fa-eye mr-2 opacity-70"></i>
                        VISTA: {user?.role}
                    </div>
                </div>

                {loading ? (
                    <div className="h-40 flex flex-col items-center justify-center text-emerald-500/50 font-mono animate-pulse gap-4">
                        <i className="fas fa-circle-notch fa-spin text-3xl"></i>
                        <span className="tracking-widest text-xs">SINTONIZANDO FRECUENCIA...</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                        <WinningNumberCard 
                            drawTime={DrawTime.MEDIODIA} 
                            result={getResultByDraw(DrawTime.MEDIODIA)} 
                            role={user?.role || UserRole.Cliente}
                            onEdit={() => setEditOpen(true)}
                        />
                        <WinningNumberCard 
                            drawTime={DrawTime.TARDE} 
                            result={getResultByDraw(DrawTime.TARDE)} 
                            role={user?.role || UserRole.Cliente}
                            onEdit={() => setEditOpen(true)}
                        />
                        <WinningNumberCard 
                            drawTime={DrawTime.NOCHE} 
                            result={getResultByDraw(DrawTime.NOCHE)} 
                            role={user?.role || UserRole.Cliente}
                            onEdit={() => setEditOpen(true)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
