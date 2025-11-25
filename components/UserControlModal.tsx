import React, { useState, useEffect } from 'react';
import { api } from '../services/edgeApi';
import { AppUser } from '../types';
import { useAuthStore } from '../store/useAuthStore';

interface UserControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: AppUser | null;
  onSuccess?: () => void;
}

type ActionType = 'BLOCK' | 'UNBLOCK' | 'DELETE' | null;

export default function UserControlModal({ isOpen, onClose, targetUser, onSuccess }: UserControlModalProps) {
  const currentUser = useAuthStore(s => s.user);
  
  const [action, setAction] = useState<ActionType>(null);
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
        setAction(null);
        setConfirmPhrase('');
        setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen || !targetUser || !currentUser) return null;

  // Determine available block action based on current status
  const blockAction = targetUser.status === 'Active' ? 'BLOCK' : 'UNBLOCK';
  
  // Required Phrases
  const PHRASE_BLOCK = 'BLOQUEAR NODO';
  const PHRASE_UNBLOCK = 'REACTIVAR NODO';
  const PHRASE_DELETE = 'ELIMINAR NODO';

  const requiredPhrase = 
    action === 'BLOCK' ? PHRASE_BLOCK :
    action === 'UNBLOCK' ? PHRASE_UNBLOCK :
    action === 'DELETE' ? PHRASE_DELETE : '';

  // THEME ENGINE
  const getTheme = () => {
      if (action === 'DELETE') return {
          color: 'text-cyber-danger',
          border: 'border-cyber-danger',
          bg: 'bg-cyber-danger',
          shadow: 'shadow-neon-red',
          glow: 'rgba(255, 0, 60, 0.5)'
      };
      // Orange for Block/Unblock (High Alert)
      return {
          color: 'text-cyber-orange',
          border: 'border-cyber-orange',
          bg: 'bg-cyber-orange',
          shadow: 'shadow-neon-orange',
          glow: 'rgba(255, 95, 0, 0.5)'
      };
  };

  const theme = getTheme();
  const isMatch = confirmPhrase.trim() === requiredPhrase;

  const handleExecute = async () => {
    if (!isMatch) return;
    setLoading(true);

    try {
        if (action === 'DELETE') {
            const res = await api.deleteUser({
                target_user_id: targetUser.id,
                confirmation: confirmPhrase,
                actor_id: currentUser.id
            });
            if (res.error) throw new Error(res.error);
        } else {
            // Block/Unblock logic
            // Careful: Logic was inverted or confusing before. 
            // If action is BLOCK -> set Suspended.
            // If action is UNBLOCK -> set Active.
            const newStatus = action === 'BLOCK' ? 'Suspended' : 'Active';
            
            const res = await api.updateUserStatus({
                target_user_id: targetUser.id,
                status: newStatus,
                actor_id: currentUser.id
            });
            if (res.error) throw new Error(res.error);
        }

        onSuccess?.();
        onClose();

    } catch (e: any) {
        alert(e.message || "Error ejecutando comando.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
        
        {/* Decorative Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[length:40px_40px] pointer-events-none"></div>

        <div className="relative max-w-lg w-full mx-4">
            
            {/* --- LIVING BREATHING BORDER --- */}
            <div 
                className={`absolute -inset-1 rounded-2xl opacity-40 blur-xl transition-colors duration-700 animate-[pulse_3s_ease-in-out_infinite] ${action === 'DELETE' ? 'bg-red-600' : action ? 'bg-cyber-orange' : 'bg-cyber-blue'}`}
                style={{ animationDuration: action ? '1.5s' : '4s' }}
            ></div>
            
            <div className="bg-[#050a14] border-2 border-white/10 rounded-2xl overflow-hidden relative shadow-2xl z-10 transition-colors duration-500">
                
                {/* Header */}
                <div className="bg-black/40 border-b border-white/10 p-6 flex justify-between items-center relative overflow-hidden">
                    {/* Scanline Header */}
                    {action && <div className={`absolute top-0 left-0 w-full h-1 ${theme.bg} shadow-[0_0_10px_currentColor] animate-[scanline_2s_linear_infinite]`}></div>}
                    
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded bg-black border border-white/20 flex items-center justify-center relative overflow-hidden group`}>
                            {action && <div className={`absolute inset-0 ${theme.bg} opacity-20 animate-pulse`}></div>}
                            <i className={`fas fa-user-shield text-2xl text-white relative z-10 ${loading ? 'animate-spin' : ''}`}></i>
                        </div>
                        <div>
                            <h3 className="font-display font-black text-white uppercase tracking-wider text-lg text-glow-sm">Control de Nodo</h3>
                            <div className="text-[10px] font-mono text-slate-500 flex items-center gap-2">
                                {targetUser.name}
                                <span className={`w-2 h-2 rounded-full ${targetUser.status === 'Active' ? 'bg-green-500 shadow-[0_0_5px_lime]' : 'bg-red-500 shadow-[0_0_5px_red]'}`}></span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        <i className="fas fa-times text-xl"></i>
                    </button>
                </div>

                {/* --- LEVEL 1: SELECTION --- */}
                {!action && (
                    <div className="p-8 grid grid-cols-2 gap-6 animate-in slide-in-from-right-4 duration-300">
                        {/* Option A: Block/Unblock (ORANGE THEME) */}
                        <button 
                            onClick={() => setAction(blockAction)}
                            className={`relative group overflow-hidden rounded-xl border-2 border-dashed border-slate-700 hover:border-cyber-orange p-6 text-left transition-all hover:bg-cyber-orange/10`}
                        >
                            <div className="text-4xl mb-4 text-slate-600 group-hover:text-cyber-orange transition-colors duration-300 transform group-hover:scale-110">
                                <i className={`fas ${blockAction === 'BLOCK' ? 'fa-lock' : 'fa-lock-open'}`}></i>
                            </div>
                            <h4 className="font-display font-bold text-white uppercase mb-1 group-hover:text-cyber-orange transition-colors">
                                {blockAction === 'BLOCK' ? 'Bloquear' : 'Reactivar'}
                            </h4>
                            <p className="text-[10px] text-slate-500 font-mono leading-tight">
                                {blockAction === 'BLOCK' 
                                    ? 'Suspender permisos operativos. Nivel alerta.' 
                                    : 'Restaurar conexión al núcleo.'}
                            </p>
                        </button>

                        {/* Option B: Delete (RED THEME) */}
                        <button 
                            onClick={() => setAction('DELETE')}
                            className={`relative group overflow-hidden rounded-xl border-2 border-dashed border-slate-700 hover:border-cyber-danger p-6 text-left transition-all hover:bg-cyber-danger/10`}
                        >
                            <div className="text-4xl mb-4 text-slate-600 group-hover:text-cyber-danger transition-colors duration-300 transform group-hover:scale-110">
                                <i className="fas fa-trash-alt"></i>
                            </div>
                            <h4 className="font-display font-bold text-white uppercase mb-1 group-hover:text-cyber-danger transition-colors">
                                Eliminar
                            </h4>
                            <p className="text-[10px] text-slate-500 font-mono leading-tight">
                                Purga definitiva de identidad. <span className="text-cyber-danger font-bold">Irreversible.</span>
                            </p>
                        </button>
                    </div>
                )}

                {/* --- LEVEL 2 & 3: CONFIRMATION --- */}
                {action && (
                    <div className="p-8 animate-in slide-in-from-bottom-4 duration-300">
                        
                        <button onClick={() => setAction(null)} className="text-[10px] text-slate-500 hover:text-white mb-6 flex items-center gap-2 uppercase font-bold tracking-widest transition-colors">
                            <i className="fas fa-arrow-left"></i> Abortar Secuencia
                        </button>

                        <div className={`border-l-4 pl-4 mb-8 ${theme.border} transition-colors duration-500`}>
                            <h4 className={`font-display font-bold text-xl uppercase ${theme.color} text-shadow`}>
                                {action === 'DELETE' ? 'Protocolo de Eliminación' : 'Modificación de Estado'}
                            </h4>
                            <p className="text-xs text-slate-400 font-mono mt-2">
                                Acción protegida por protocolo de seguridad nivel 3.
                            </p>
                        </div>

                        {/* Phrase Display */}
                        <div className="bg-black/50 p-4 rounded-lg text-center mb-6 select-all border border-white/10 group relative overflow-hidden">
                            <div className={`absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shine_1s_ease-in-out]`}></div>
                            <span className="font-mono font-bold text-lg tracking-[0.2em] text-white select-text relative z-10">
                                {requiredPhrase}
                            </span>
                        </div>

                        {/* INPUT - TRIPLE CHECK (BREATHING) */}
                        <div className="relative group/input mb-8">
                            <div className={`absolute -inset-1 rounded-lg blur opacity-0 group-focus-within/input:opacity-60 transition-opacity duration-500 ${theme.bg} ${isMatch ? 'opacity-80 animate-pulse' : ''}`}></div>
                            
                            <input 
                                value={confirmPhrase}
                                onChange={e => setConfirmPhrase(e.target.value.toUpperCase())}
                                className={`relative w-full bg-black border-2 rounded-lg py-4 text-center font-mono text-xl text-white uppercase tracking-widest focus:outline-none transition-all duration-300 z-10 ${
                                    isMatch 
                                    ? `${theme.border} shadow-[0_0_30px_${theme.glow}]` 
                                    : 'border-slate-800 focus:border-white/50'
                                }`}
                                placeholder="ESCRIBA LA FRASE AQUÍ"
                                autoFocus
                            />
                            
                            {/* Match Indicator */}
                            {isMatch && (
                                <div className={`absolute right-4 top-1/2 -translate-y-1/2 ${theme.color} animate-bounce z-20`}>
                                    <i className="fas fa-check-circle text-xl"></i>
                                </div>
                            )}
                        </div>

                        {/* EXECUTE BUTTON - PLASMA REACTOR */}
                        <button 
                            onClick={handleExecute}
                            disabled={!isMatch || loading}
                            className={`w-full py-4 rounded-lg font-display font-black uppercase tracking-[0.2em] transition-all duration-300 relative overflow-hidden group/btn disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {/* Button Backlight */}
                            <div className={`absolute inset-0 ${theme.bg} opacity-20 group-hover/btn:opacity-100 transition-opacity duration-300`}></div>
                            
                            {/* Scanline Effect when Active */}
                            {isMatch && !loading && (
                                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.4)_50%,transparent_75%)] bg-[length:250%_250%,100%_100%] animate-[shine_2s_infinite]"></div>
                            )}

                            <div className={`relative z-10 flex items-center justify-center gap-3 ${isMatch ? 'text-black' : theme.color} group-hover/btn:text-black transition-colors`}>
                                {loading ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-radiation"></i>}
                                <span>{loading ? ' EJECUTANDO...' : ' CONFIRMAR Y EJECUTAR'}</span>
                            </div>
                            
                            {/* Border */}
                            <div className={`absolute inset-0 border ${theme.border} rounded-lg opacity-50 group-hover/btn:opacity-100`}></div>
                        </button>

                    </div>
                )}
            </div>
            
            <style>{`
                @keyframes shine {
                    0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
                    100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
                }
            `}</style>
        </div>
    </div>
  );
}