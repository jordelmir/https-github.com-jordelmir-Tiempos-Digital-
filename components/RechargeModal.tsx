
import React, { useState } from 'react';
import { api } from '../services/edgeApi';
import { AppUser, UserRole } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { formatCurrency } from '../constants';

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: AppUser | null;
  onSuccess?: () => void;
}

export default function RechargeModal({ isOpen, onClose, targetUser, onSuccess }: RechargeModalProps) {
  const currentUser = useAuthStore(s => s.user);
  const [amount, setAmount] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS' | 'ERROR'>('IDLE');
  
  if (!isOpen || !targetUser || !currentUser) return null;

  const handleRecharge = async () => {
    if (!amount || amount <= 0) return;
    setLoading(true);
    setStatus('PROCESSING');

    try {
        const res = await api.rechargeUser({
            target_user_id: targetUser.id,
            amount: Number(amount) * 100, // Convert to cents
            actor_id: currentUser.id
        });

        if (res.error) {
            setStatus('ERROR');
            setTimeout(() => setStatus('IDLE'), 2000);
            alert(res.error);
        } else {
            setStatus('SUCCESS');
            setTimeout(() => {
                onSuccess?.();
                onClose();
                setAmount('');
                setStatus('IDLE');
            }, 1500);
        }
    } catch (e) {
        setStatus('ERROR');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
        <div className="bg-cyber-panel border border-cyber-success/50 p-1 rounded-2xl max-w-md w-full shadow-[0_0_50px_rgba(10,255,96,0.2)] relative">
            
            {/* Inner Content */}
            <div className="bg-[#050a14] rounded-xl p-8 relative overflow-hidden">
                
                {/* Close Button */}
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
                    <i className="fas fa-times"></i>
                </button>

                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-full bg-cyber-success/10 flex items-center justify-center border border-cyber-success/30 shadow-neon-green">
                        <i className={`fas fa-bolt text-xl text-cyber-success ${status === 'PROCESSING' ? 'animate-pulse' : ''}`}></i>
                    </div>
                    <div>
                        <h3 className="font-display font-bold text-white text-lg uppercase tracking-wider">Recarga de Saldo</h3>
                        <p className="text-[10px] font-mono text-cyber-success uppercase tracking-[0.2em]">Protocolo de Transferencia</p>
                    </div>
                </div>

                {/* Target Info */}
                <div className="bg-white/5 rounded-lg p-4 mb-6 border border-white/5">
                    <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-1">Destinatario</div>
                    <div className="text-white font-bold flex justify-between items-center">
                        <span>{targetUser.name}</span>
                        <span className="text-xs bg-white/10 px-2 py-1 rounded text-slate-300">{targetUser.role}</span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-1">{targetUser.email}</div>
                </div>

                {/* Input Amount */}
                <div className="mb-8">
                    <label className="block text-[10px] font-mono font-bold text-slate-500 mb-2 uppercase tracking-wider">Monto a Transferir (CRC)</label>
                    <div className="relative group">
                        <input 
                            type="number" 
                            value={amount}
                            onChange={e => setAmount(Number(e.target.value))}
                            className="w-full bg-black border border-slate-700 rounded-lg py-4 pl-4 pr-12 text-2xl font-mono text-white focus:border-cyber-success focus:shadow-neon-green focus:outline-none transition-all placeholder-slate-800"
                            placeholder="0.00"
                            autoFocus
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">CRC</div>
                    </div>
                </div>

                {/* Action Button */}
                <button 
                    onClick={handleRecharge}
                    disabled={loading || !amount}
                    className={`
                        w-full py-4 rounded-lg font-display font-black uppercase tracking-widest text-sm transition-all duration-300 relative overflow-hidden group
                        ${status === 'SUCCESS' ? 'bg-cyber-success text-black' : 'bg-white/10 text-white hover:bg-cyber-success hover:text-black border border-cyber-success'}
                    `}
                >
                    <div className="relative z-10 flex items-center justify-center gap-2">
                        {status === 'PROCESSING' && <i className="fas fa-circle-notch fa-spin"></i>}
                        {status === 'SUCCESS' && <i className="fas fa-check"></i>}
                        {status === 'IDLE' && <i className="fas fa-paper-plane"></i>}
                        
                        <span>
                            {status === 'PROCESSING' ? 'PROCESANDO...' : 
                             status === 'SUCCESS' ? 'TRANSFERENCIA COMPLETADA' : 
                             'AUTORIZAR RECARGA'}
                        </span>
                    </div>
                    
                    {/* Hover Glow */}
                    <div className="absolute inset-0 bg-cyber-success/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity"></div>
                </button>
                
                {currentUser.role === UserRole.Vendedor && (
                    <p className="mt-4 text-center text-[10px] text-slate-500 font-mono">
                        Tu saldo actual: <span className="text-white">{formatCurrency(currentUser.balance_bigint)}</span>
                    </p>
                )}
            </div>
        </div>
    </div>
  );
}
