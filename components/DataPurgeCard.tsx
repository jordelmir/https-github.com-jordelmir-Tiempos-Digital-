
import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../services/edgeApi';
import { WeeklyDataStats, PurgeTarget } from '../types';
import AnimatedIconUltra from './ui/AnimatedIconUltra';

export default function DataPurgeCard({ theme: parentTheme }: { theme?: any }) {
    const { user } = useAuthStore();
    const [weeklyStats, setWeeklyStats] = useState<WeeklyDataStats[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Purge Flow State
    const [purgeType, setPurgeType] = useState<PurgeTarget | null>(null);
    const [confirmation, setConfirmation] = useState('');
    const [isExecuting, setIsExecuting] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    const isNuclear = purgeType === 'DEEP_CLEAN';
    const PHRASE = 'CONFIRMAR PURGA TOTAL';

    useEffect(() => {
        // Mock fetch stats
        setTimeout(() => setLoading(false), 1000);
    }, []);

    const handlePurge = async () => {
        if (!purgeType || !user) return;
        
        setIsExecuting(true);
        try {
            await new Promise(r => setTimeout(r, 2000));
            
            // v3.1 Logic: Use specialized system purge for DEEP_CLEAN
            if (purgeType === 'DEEP_CLEAN') {
                const res = await api.purgeSystem({
                    confirm_phrase: confirmation,
                    actor_id: user.id
                });
                
                if (!res.data?.ok && res.error) {
                    throw new Error(res.error || res.message);
                }
                setSuccessMsg('PURGA PROGRAMADA (MULTISIG)');
            } else {
                // Legacy / Standard maintenance purge
                await api.maintenance.executePurge({
                    target: purgeType,
                    days: 7, 
                    actor_id: user.id
                });
                setSuccessMsg('OPTIMIZACIÓN EXITOSA');
            }

            setTimeout(() => {
                setSuccessMsg('');
                setPurgeType(null);
                setConfirmation('');
            }, 3000);
        } catch (e: any) {
            alert(e.message || "Error Crítico");
        } finally {
            setIsExecuting(false);
        }
    };

    const getPurgePhrase = () => {
        if (purgeType === 'DEEP_CLEAN') return PHRASE;
        if (purgeType === 'AUDIT') return 'ARCHIVAR LOGS';
        return 'CONFIRMAR LIMPIEZA';
    };

    return (
        <div className="relative w-full group min-h-[300px] font-sans">
            <div className={`absolute -inset-[2px] rounded-[2.5rem] opacity-40 blur-xl animate-pulse transition-all duration-1000 ${isNuclear ? 'bg-red-600' : 'bg-cyan-500'}`}></div>
            
            <div className={`relative bg-[#02040a] border-[3px] ${isNuclear ? 'border-red-500' : 'border-cyan-500'} rounded-[2.5rem] overflow-hidden flex flex-col h-full transition-all duration-700 z-10 backdrop-blur-xl`}>
                
                {/* Header */}
                <div className={`p-6 border-b border-white/5 flex items-center justify-between ${isNuclear ? 'bg-red-950/20' : 'bg-cyan-950/10'}`}>
                    <h3 className={`text-xl font-display font-black text-white uppercase tracking-widest`}>
                        {isNuclear ? 'Protocolo Omega' : 'Mantenimiento de Datos'}
                    </h3>
                    <div className={`w-3 h-3 rounded-full ${isNuclear ? 'bg-red-500 animate-ping' : 'bg-green-500'}`}></div>
                </div>

                <div className="p-8 flex flex-col justify-center items-center flex-1">
                    {isExecuting ? (
                        <div className="text-center">
                            <div className="text-4xl animate-spin mb-4"><i className="fas fa-radiation text-white"></i></div>
                            <h2 className="text-white font-black uppercase tracking-widest text-xl">Ejecutando Secuencia...</h2>
                        </div>
                    ) : successMsg ? (
                        <div className="text-center animate-in zoom-in">
                            <i className="fas fa-check-circle text-5xl text-green-500 mb-4"></i>
                            <h2 className="text-white font-black uppercase tracking-widest">{successMsg}</h2>
                        </div>
                    ) : !purgeType ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                            <button onClick={() => setPurgeType('BETS')} className="p-6 border border-cyan-500/30 rounded-xl hover:bg-cyan-500/10 transition-all text-cyan-400 font-bold uppercase tracking-wider">
                                <i className="fas fa-broom mb-2 block text-2xl"></i> Limpiar Apuestas
                            </button>
                            <button onClick={() => setPurgeType('DEEP_CLEAN')} className="p-6 border-2 border-red-600/50 bg-red-950/20 rounded-xl hover:bg-red-900/40 transition-all text-red-500 font-black uppercase tracking-wider shadow-[0_0_20px_rgba(220,38,38,0.2)] hover:shadow-neon-red">
                                <i className="fas fa-skull mb-2 block text-2xl animate-pulse"></i> Purga Total
                            </button>
                        </div>
                    ) : (
                        <div className="w-full max-w-md animate-in slide-in-from-bottom-4">
                            <div className={`mb-6 p-4 border rounded-xl text-center ${isNuclear ? 'border-red-500 bg-red-900/20 text-red-400' : 'border-cyan-500 bg-cyan-900/10 text-cyan-400'}`}>
                                <i className="fas fa-exclamation-triangle text-3xl mb-2"></i>
                                <p className="text-xs font-mono font-bold uppercase tracking-widest">Acción Destructiva Irreversible</p>
                            </div>
                            
                            <input 
                                type="text" 
                                value={confirmation} 
                                onChange={e => setConfirmation(e.target.value)} 
                                placeholder={getPurgePhrase()} 
                                className="w-full bg-black border-2 border-white/20 rounded-xl p-4 text-center text-white font-mono mb-4 focus:border-white outline-none uppercase"
                            />
                            
                            <div className="flex gap-4">
                                <button onClick={() => setPurgeType(null)} className="flex-1 py-3 border border-white/20 text-slate-400 rounded-lg font-bold uppercase hover:bg-white/5">Cancelar</button>
                                <button onClick={handlePurge} disabled={confirmation !== getPurgePhrase()} className={`flex-1 py-3 rounded-lg font-black uppercase tracking-wider ${isNuclear ? 'bg-red-600 text-black hover:bg-white' : 'bg-cyan-500 text-black hover:bg-white'} disabled:opacity-50 disabled:cursor-not-allowed transition-all`}>
                                    {isNuclear ? 'DETONAR' : 'EJECUTAR'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
