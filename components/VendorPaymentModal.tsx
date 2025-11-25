import React, { useState, useEffect } from 'react';
import { api } from '../services/edgeApi';
import { AppUser, UserRole } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { formatCurrency, formatDate } from '../constants';

interface VendorPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: AppUser | null;
  onSuccess?: () => void;
}

type PaymentConcept = 'COMISION_VENTAS' | 'BONO_RENDIMIENTO' | 'AJUSTE_OPERATIVO' | 'SALARIO_BASE';

export default function VendorPaymentModal({ isOpen, onClose, targetUser, onSuccess }: VendorPaymentModalProps) {
  const currentUser = useAuthStore(s => s.user);
  const [amount, setAmount] = useState<number | ''>('');
  const [concept, setConcept] = useState<PaymentConcept>('COMISION_VENTAS');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [txId, setTxId] = useState('');
  
  // Live Clock for Automatic Timestamp Logic
  const [systemTime, setSystemTime] = useState(new Date());

  useEffect(() => {
    if (isOpen) {
        const timer = setInterval(() => setSystemTime(new Date()), 1000);
        return () => clearInterval(timer);
    }
  }, [isOpen]);

  if (!isOpen || !targetUser || !currentUser) return null;

  const handleSubmit = async () => {
    if (!amount || amount <= 0) return;
    setLoading(true);

    try {
        const res = await api.payVendor({
            target_user_id: targetUser.id,
            amount: Number(amount) * 100, // Cents
            concept,
            notes, // Date is handled by backend automatically
            actor_id: currentUser.id
        });

        if (res.error) {
            alert(res.error);
        } else {
            setTxId(res.data?.ticket_code || 'TX-000');
            setSuccess(true);
            setTimeout(() => {
                onSuccess?.();
                setSuccess(false);
                setAmount('');
                setNotes('');
                onClose();
            }, 2500);
        }
    } catch (e) {
        alert("Error en el sistema contable.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
        <div className="relative max-w-md w-full mx-4">
            
            {/* --- LIVING BREATHING AURA (Purple) --- */}
            <div className="absolute -inset-1 bg-cyber-purple rounded-2xl opacity-20 blur-xl animate-[pulse_4s_ease-in-out_infinite] transition-all duration-1000"></div>

            <div className="bg-[#0a0a0f] border border-cyber-purple/40 rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(188,19,254,0.2)] relative z-10 group">
                
                {/* Header Contable */}
                <div className="bg-[#1a1a24]/80 p-6 border-b border-cyber-purple/20 flex justify-between items-start relative overflow-hidden">
                    {/* Top Scanline */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-cyber-purple/50 shadow-[0_0_10px_#bc13fe] animate-[scanline_3s_linear_infinite]"></div>
                    
                    <div>
                        <h3 className="font-display font-bold text-white uppercase tracking-widest flex items-center gap-2 text-glow-sm">
                            <i className="fas fa-file-invoice-dollar text-cyber-purple animate-pulse"></i>
                            Liquidación
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="w-1.5 h-1.5 bg-cyber-purple rounded-full animate-ping"></div>
                            <p className="text-[10px] font-mono text-cyber-purple uppercase tracking-wider">
                                T. Real: {systemTime.toLocaleTimeString()}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors z-10">
                        <i className="fas fa-times text-lg"></i>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 bg-gradient-to-b from-[#0a0a0f] to-[#050508]">
                    
                    {/* Beneficiary Card */}
                    <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5 relative overflow-hidden group/card">
                        <div className="absolute inset-0 bg-cyber-purple/5 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500"></div>
                        <div className="relative w-12 h-12 rounded-lg bg-cyber-purple/10 flex items-center justify-center text-cyber-purple font-bold border border-cyber-purple/30 shadow-neon-purple">
                            {targetUser.name.substring(0,2).toUpperCase()}
                        </div>
                        <div className="relative">
                            <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Beneficiario</div>
                            <div className="text-white font-mono font-bold text-sm">{targetUser.name}</div>
                            <div className="text-[9px] text-cyber-purple opacity-80">{targetUser.email}</div>
                        </div>
                    </div>

                    {/* Accounting Form */}
                    {!success ? (
                        <div className="space-y-5 animate-in slide-in-from-bottom-2">
                            
                            {/* Concept Selector */}
                            <div>
                                <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase mb-2 tracking-wider">Concepto de Transacción</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'COMISION_VENTAS', label: 'Comisión' },
                                        { id: 'BONO_RENDIMIENTO', label: 'Bono Extra' },
                                        { id: 'AJUSTE_OPERATIVO', label: 'Ajuste Oper.' },
                                        { id: 'SALARIO_BASE', label: 'Pago Fijo' }
                                    ].map((opt) => (
                                        <button
                                            key={opt.id}
                                            onClick={() => setConcept(opt.id as PaymentConcept)}
                                            className={`py-2.5 px-3 rounded-lg text-[9px] font-bold uppercase border transition-all duration-300 ${
                                                concept === opt.id 
                                                ? 'bg-cyber-purple/20 border-cyber-purple text-cyber-purple shadow-[0_0_15px_rgba(188,19,254,0.2)]' 
                                                : 'bg-black/40 border-slate-800 text-slate-500 hover:border-slate-600 hover:text-white'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Amount Input */}
                            <div>
                                <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase mb-2 tracking-wider">Monto a Liquidar (CRC)</label>
                                <div className="relative group/input">
                                    {/* Input Backlight */}
                                    <div className="absolute -inset-0.5 bg-cyber-purple rounded-lg blur opacity-0 group-hover/input:opacity-30 group-focus-within/input:opacity-60 transition-opacity duration-500"></div>
                                    
                                    <input 
                                        type="number"
                                        value={amount}
                                        onChange={e => setAmount(Number(e.target.value))}
                                        className="relative w-full bg-black/80 border border-slate-700 rounded-lg py-4 pl-4 pr-12 text-white font-mono text-2xl focus:border-cyber-purple focus:shadow-[0_0_20px_rgba(188,19,254,0.3)] focus:outline-none transition-all placeholder-slate-700 z-10"
                                        placeholder="0.00"
                                        autoFocus
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs z-20">CRC</div>
                                </div>
                            </div>

                            {/* Notes - Now freed from Dates */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Detalles / Referencia</label>
                                    <span className="text-[9px] text-cyber-purple bg-cyber-purple/10 px-1.5 py-0.5 rounded border border-cyber-purple/20">
                                        <i className="fas fa-clock mr-1"></i> FECHA AUTOMÁTICA
                                    </span>
                                </div>
                                <div className="relative group/input">
                                     <div className="absolute -inset-0.5 bg-cyber-purple rounded-lg blur opacity-0 group-focus-within/input:opacity-40 transition-opacity duration-500"></div>
                                    <input 
                                        type="text"
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        className="relative w-full bg-black/80 border border-slate-700 rounded-lg py-3 px-4 text-white font-mono text-sm focus:border-cyber-purple focus:outline-none transition-colors z-10 placeholder-slate-600"
                                        placeholder="Ej: Incentivo por meta superada..."
                                    />
                                </div>
                            </div>

                            {/* Summary Preview */}
                            <div className="bg-red-950/20 border border-red-900/40 p-3 rounded-lg flex justify-between items-center relative overflow-hidden">
                                <div className="absolute inset-0 bg-red-900/5 animate-pulse"></div>
                                <span className="text-[10px] text-red-400 uppercase font-mono relative z-10 font-bold">Debitar de Caja Central</span>
                                <span className="text-red-500 font-bold font-mono text-lg relative z-10 drop-shadow-[0_0_5px_rgba(220,38,38,0.5)]">
                                    - {amount ? formatCurrency(Number(amount)*100) : 'CRC 0'}
                                </span>
                            </div>

                            {/* Action Button - PLASMA STYLE */}
                            <button 
                                onClick={handleSubmit}
                                disabled={loading || !amount}
                                className="relative w-full py-4 mt-2 group/btn overflow-visible rounded-lg"
                            >
                                <div className="absolute -inset-1 bg-cyber-purple rounded-lg blur opacity-0 group-hover/btn:opacity-50 transition-opacity duration-300 animate-pulse"></div>
                                <div className="relative bg-cyber-purple text-black font-display font-black uppercase tracking-widest rounded-lg py-4 flex items-center justify-center gap-2 group-hover/btn:bg-white group-hover/btn:text-cyber-purple transition-colors shadow-neon-purple">
                                    {loading ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-fingerprint"></i>}
                                    {loading ? 'AUTORIZANDO...' : 'EJECUTAR PAGO'}
                                </div>
                            </button>

                        </div>
                    ) : (
                        // SUCCESS STATE (RECEIPT)
                        <div className="text-center py-8 animate-in zoom-in duration-300 relative">
                            {/* Holographic light beam */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-cyber-purple/20 blur-3xl rounded-full animate-pulse"></div>
                            
                            <div className="relative w-24 h-24 bg-cyber-purple/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-cyber-purple shadow-[0_0_40px_rgba(188,19,254,0.4)]">
                                <i className="fas fa-check text-5xl text-cyber-purple drop-shadow-[0_0_10px_currentColor]"></i>
                            </div>
                            <h4 className="text-3xl font-display font-black text-white uppercase mb-2 tracking-wide text-shadow-purple">Pago Exitoso</h4>
                            
                            <div className="bg-black/50 border border-cyber-purple/30 rounded px-4 py-2 inline-block mb-8">
                                <div className="text-[9px] text-slate-400 uppercase tracking-widest mb-1">ID Transacción</div>
                                <div className="font-mono text-cyber-purple text-lg font-bold tracking-widest">{txId}</div>
                            </div>
                            
                            <p className="text-xs text-slate-400 max-w-[200px] mx-auto leading-relaxed font-mono">
                                Fondos transferidos y registro contable actualizado en tiempo real.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
}