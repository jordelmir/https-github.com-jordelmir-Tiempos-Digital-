
import React, { useState, useEffect } from 'react';
import { api } from '../services/edgeApi';
import { AppUser, UserRole } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { formatCurrency } from '../constants';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: AppUser | null;
  onSuccess?: () => void;
}

type WithdrawalStatus = 'IDLE' | 'SCANNING' | 'PROCESSING' | 'PRINTING' | 'CUTTING' | 'DROPPING' | 'FINISHED' | 'ERROR' | 'INSUFFICIENT_FUNDS';

export default function WithdrawModal({ isOpen, onClose, targetUser, onSuccess }: WithdrawModalProps) {
  const currentUser = useAuthStore(s => s.user);
  const [amount, setAmount] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<WithdrawalStatus>('IDLE');
  
  // New Balance for receipt
  const [finalBalance, setFinalBalance] = useState<number>(0);
  const [txId, setTxId] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
        setStatus('IDLE');
        setAmount('');
        setFinalBalance(0);
        setTxId('');
        setLoading(false);
    }
  }, [isOpen]);
  
  if (!isOpen || !targetUser || !currentUser) return null;

  const currentBalanceCents = targetUser.balance_bigint;

  const handleClose = () => {
    // RAPID EXIT PROTOCOL
    if (['PRINTING', 'CUTTING', 'DROPPING', 'FINISHED'].includes(status)) {
        onSuccess?.();
    }
    onClose();
  };

  // Auto-clear error when typing
  const handleAmountChange = (val: string) => {
      if (status === 'INSUFFICIENT_FUNDS') setStatus('IDLE');
      setAmount(Number(val));
  };

  const handleWithdraw = async () => {
    if (!amount || Number(amount) <= 0) return;
    
    // 1. Local Validation (High Level Animation Trigger)
    if (Number(amount) * 100 > currentBalanceCents) {
        setStatus('INSUFFICIENT_FUNDS');
        return;
    }

    // 2. Start Visual Sequence
    setLoading(true);
    setStatus('SCANNING'); 

    try {
        // 3. Artificial Delay for "Scanning" effect (Cinema)
        await new Promise(resolve => setTimeout(resolve, 1500));

        setStatus('PROCESSING');

        // 4. API Execution
        const res = await api.withdrawUser({
            target_user_id: targetUser.id,
            amount: Number(amount) * 100,
            actor_id: currentUser.id
        });

        if (res.error) {
            throw new Error(res.error);
        }

        // 5. Success Data Setup
        if (res.data) {
            setFinalBalance(res.data.new_balance);
            setTxId(res.data.tx_id);
        }
        
        // --- CINEMATIC SEQUENCE START ---
        
        // 6. Print the receipt (Slide Down)
        setStatus('PRINTING');
        
        // 7. Laser Cut (Slide Across)
        setTimeout(() => setStatus('CUTTING'), 2000);

        // 8. Physical Drop (Gravity + Fade)
        setTimeout(() => setStatus('DROPPING'), 2600); 

        // 9. Final Hologram (Result)
        setTimeout(() => setStatus('FINISHED'), 3400);

        // 10. AUTO-CLOSE PROTOCOL (New)
        // Give user 2.5 seconds to read the success message, then close.
        setTimeout(() => {
            onSuccess?.();
            onClose();
        }, 5900);

    } catch (e: any) {
        console.error("Withdrawal Error:", e);
        setStatus('ERROR');
        alert(e.message || "Error de conexión con el Núcleo.");
        setLoading(false); // CRITICAL: Reset loading so user can try again
    }
  };

  // Helper to determine ticket position based on state
  const getTicketClass = () => {
      switch (status) {
          case 'PRINTING': return 'translate-y-0 opacity-100'; // Slide in is handled by animate-in
          case 'CUTTING': return 'translate-y-2 opacity-100'; // Slight shake/drop
          case 'DROPPING': return 'translate-y-[150%] rotate-12 opacity-0 pointer-events-none transition-all duration-700 ease-in'; // Fall
          case 'FINISHED': return 'hidden';
          default: return 'hidden';
      }
  };

  // LIGHTING ENGINE
  const getVolumetricLightClass = () => {
      switch (status) {
          case 'IDLE': return 'opacity-0 scale-x-50';
          case 'INSUFFICIENT_FUNDS': return 'opacity-0';
          case 'SCANNING': return 'opacity-20 scale-x-75 bg-cyber-blue animate-pulse';
          case 'PROCESSING': return 'opacity-40 scale-x-90 bg-amber-500 animate-[pulse_0.2s_infinite]';
          case 'PRINTING': return 'opacity-100 scale-100 bg-cyber-orange mix-blend-screen';
          case 'CUTTING': return 'opacity-80 scale-x-100 bg-red-500 mix-blend-screen animate-[pulse_0.1s_infinite]';
          case 'DROPPING': return 'opacity-0 scale-x-110 duration-1000';
          case 'FINISHED': return 'opacity-0';
          case 'ERROR': return 'opacity-0';
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
        <div className="relative max-w-sm w-full mx-4 perspective-1000">
            
            {/* --- PRINTER HEAD (The Source) --- */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-[95%] z-10">
                {/* 1. Hardware Casing */}
                <div className="h-10 bg-[#0a0a0a] rounded-t-xl shadow-[inset_0_5px_15px_black] border-x border-t border-white/10 flex items-end justify-center overflow-hidden relative">
                    
                    {/* Internal Core Glow */}
                    <div className={`absolute top-0 left-0 w-full h-full bg-cyber-orange blur-xl transition-all duration-300 ${status === 'PRINTING' ? 'opacity-40' : 'opacity-0'}`}></div>

                    {/* The Slot Opening */}
                    <div className="w-[90%] h-1 bg-black rounded-full mb-2 relative z-20 shadow-[0_0_10px_black] overflow-hidden">
                         {/* Slot Plasma Strip */}
                        <div className={`w-full h-full transition-all duration-300 ${
                            status === 'PRINTING' ? 'bg-white shadow-[0_0_20px_white] opacity-100' : 
                            status === 'CUTTING' ? 'bg-red-500 shadow-[0_0_15px_red] opacity-100' :
                            status === 'PROCESSING' ? 'bg-amber-500 opacity-50' :
                            status === 'INSUFFICIENT_FUNDS' ? 'bg-red-900 opacity-50' :
                            'bg-cyber-orange opacity-20'
                        }`}></div>
                    </div>
                </div>

                {/* 2. VOLUMETRIC LIGHT BEAM (The Effect) */}
                <div className="absolute top-[38px] left-1/2 -translate-x-1/2 w-[85%] h-[400px] pointer-events-none z-0 overflow-hidden perspective-500 flex justify-center">
                     {/* The Main Beam */}
                     <div className={`
                        w-full h-full origin-top transition-all duration-500 ease-out
                        bg-gradient-to-b from-transparent via-transparent to-transparent
                        ${getVolumetricLightClass()}
                     `}
                     style={{
                        background: status === 'PRINTING' 
                            ? 'linear-gradient(180deg, rgba(255,160,50,0.8) 0%, rgba(255,95,0,0.2) 60%, transparent 100%)' 
                            : undefined
                     }}
                     >
                        {/* Particulate Matter (Dust/Smoke) - Only visible during active states */}
                        {(status === 'PRINTING' || status === 'CUTTING') && (
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-50 animate-pan-down"></div>
                        )}
                     </div>

                     {/* Secondary diffuse glow */}
                     {status === 'PRINTING' && (
                         <div className="absolute top-0 w-[150%] h-32 bg-cyber-orange blur-[60px] opacity-40 animate-pulse"></div>
                     )}
                </div>
            </div>

            {/* --- MAIN CHASIS --- */}
            <div className={`bg-[#0f0f12] border-2 rounded-2xl w-full relative z-20 overflow-hidden flex flex-col min-h-[400px] transition-all duration-200 
                ${status === 'PRINTING' ? 'shadow-[0_0_80px_rgba(255,95,0,0.3)] translate-y-0.5 border-cyber-orange' : ''}
                ${status === 'INSUFFICIENT_FUNDS' ? 'border-red-600 shadow-[0_0_50px_rgba(255,0,0,0.5)] animate-[shake_0.4s_ease-in-out]' : 'border-cyber-orange shadow-[0_0_60px_rgba(255,95,0,0.15)]'}
            `}>
                
                {/* Chassis Vibration Effect */}
                {status === 'PRINTING' && <div className="absolute inset-0 animate-[shake_0.1s_linear_infinite] opacity-50 pointer-events-none border-2 border-white/20 rounded-2xl"></div>}

                {/* BACKGROUND NOISE */}
                <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>

                {/* --- HEADER --- */}
                <div className={`p-6 border-b relative z-20 transition-colors duration-300 ${status === 'INSUFFICIENT_FUNDS' ? 'bg-red-950/50 border-red-500/50' : 'bg-[#050a14] border-white/5'}`}>
                     <button 
                        onClick={handleClose} 
                        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-cyber-orange hover:text-black text-slate-400 transition-colors z-50"
                     >
                        <i className="fas fa-times"></i>
                     </button>

                     <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded flex items-center justify-center shadow-neon-orange relative overflow-hidden group transition-all
                            ${status === 'INSUFFICIENT_FUNDS' ? 'bg-red-600 text-white border border-white' : 'bg-cyber-orange/10 border border-cyber-orange/30'}
                        `}>
                            {status === 'SCANNING' && (
                                <div className="absolute inset-0 bg-cyber-orange/50 animate-[scanline_0.5s_linear_infinite]"></div>
                            )}
                            <i className={`fas ${status === 'INSUFFICIENT_FUNDS' ? 'fa-ban' : 'fa-hand-holding-usd'} text-2xl ${status === 'INSUFFICIENT_FUNDS' ? 'text-white animate-pulse' : 'text-cyber-orange'} relative z-10 ${status === 'PRINTING' ? 'animate-bounce' : ''}`}></i>
                        </div>
                        <div>
                            <h3 className={`font-display font-bold uppercase tracking-wider transition-colors ${status === 'INSUFFICIENT_FUNDS' ? 'text-red-500' : 'text-white'}`}>
                                {status === 'INSUFFICIENT_FUNDS' ? 'ACCESO DENEGADO' : 'Retiro de Fondos'}
                            </h3>
                            <div className={`text-[9px] font-mono uppercase tracking-widest flex items-center gap-1 ${status === 'INSUFFICIENT_FUNDS' ? 'text-red-400' : 'text-cyber-orange'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${status === 'INSUFFICIENT_FUNDS' ? 'bg-red-500 animate-ping' : 'bg-cyber-orange'}`}></span>
                                {status === 'FINISHED' ? 'COMPLETADO' : status === 'INSUFFICIENT_FUNDS' ? 'ERROR DE FONDOS' : status === 'IDLE' ? 'EN ESPERA' : status}
                            </div>
                        </div>
                     </div>
                </div>

                {/* --- BODY --- */}
                <div className="p-6 relative flex-1 flex flex-col">
                    
                    {/* INPUT / SCANNING STATE */}
                    {(status === 'IDLE' || status === 'SCANNING' || status === 'PROCESSING' || status === 'ERROR' || status === 'INSUFFICIENT_FUNDS') && (
                        <div className={`transition-all duration-500 ${status === 'PROCESSING' ? 'opacity-50 scale-95 pointer-events-none' : 'opacity-100'}`}>
                            {/* TARGET CARD */}
                            <div className={`bg-black border rounded-lg p-4 mb-6 relative overflow-hidden group transition-colors duration-300 ${status === 'INSUFFICIENT_FUNDS' ? 'border-red-500/50 shadow-[0_0_30px_rgba(255,0,0,0.2)]' : 'border-slate-800'}`}>
                                {status === 'SCANNING' && (
                                     <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent via-cyan-400/30 to-transparent animate-[scan_1s_linear_infinite] pointer-events-none z-20 border-b border-cyan-400/50 shadow-[0_0_15px_cyan]"></div>
                                )}
                                
                                {/* Error Flash Overlay */}
                                {status === 'INSUFFICIENT_FUNDS' && (
                                    <div className="absolute inset-0 bg-red-900/20 animate-pulse z-0"></div>
                                )}

                                <div className="flex justify-between items-start mb-2 relative z-10">
                                    <span className="text-[9px] text-slate-500 uppercase font-mono">Cuenta Origen</span>
                                    <span className="text-[10px] text-cyber-orange font-mono font-bold">{targetUser.role}</span>
                                </div>
                                <div className="text-white font-bold text-lg relative z-10">{targetUser.name}</div>
                                <div className="text-right mt-2 relative z-10">
                                    <span className="text-[10px] text-slate-500 mr-2">DISPONIBLE:</span>
                                    <span className={`font-mono font-bold text-glow-sm transition-colors ${status === 'INSUFFICIENT_FUNDS' ? 'text-red-500' : 'text-white'}`}>
                                        {formatCurrency(currentBalanceCents)}
                                    </span>
                                </div>
                            </div>

                            {/* --- INSUFFICIENT FUNDS ALERT OVERLAY --- */}
                            {status === 'INSUFFICIENT_FUNDS' && (
                                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in zoom-in duration-300 rounded-lg">
                                    <div className="text-red-600 text-5xl mb-4 animate-bounce drop-shadow-[0_0_15px_rgba(220,38,38,0.8)]">
                                        <i className="fas fa-hand-paper"></i>
                                    </div>
                                    <h3 className="text-red-500 font-black font-display text-2xl uppercase tracking-widest text-center mb-2 drop-shadow-sm">
                                        FONDOS INSUFICIENTES
                                    </h3>
                                    <p className="text-white/70 text-xs font-mono text-center mb-6 max-w-[200px]">
                                        El monto solicitado excede el balance disponible en la cuenta.
                                    </p>
                                    <div className="bg-red-950/50 border border-red-500/30 rounded p-3 mb-6 font-mono text-center w-3/4">
                                        <div className="text-[9px] text-red-400 uppercase">Déficit</div>
                                        <div className="text-white font-bold">
                                            {formatCurrency((Number(amount) * 100) - currentBalanceCents)}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setStatus('IDLE')}
                                        className="px-8 py-3 bg-red-600 hover:bg-white hover:text-red-600 text-black font-black uppercase tracking-widest rounded-full transition-all shadow-neon-red"
                                    >
                                        Corregir Monto
                                    </button>
                                </div>
                            )}

                            <div className="mb-6 relative group/input">
                                <label className="block text-[10px] font-mono font-bold text-cyber-orange mb-2 uppercase tracking-wider ml-1">Monto a Retirar</label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        value={amount}
                                        onChange={e => handleAmountChange(e.target.value)}
                                        disabled={loading}
                                        className="w-full bg-black/60 border-b-2 border-slate-700 py-3 pl-3 pr-12 text-3xl font-mono text-white focus:border-cyber-orange focus:outline-none transition-colors placeholder-slate-800 disabled:opacity-50"
                                        placeholder="0.00"
                                        autoFocus
                                    />
                                    <span className="absolute right-2 bottom-4 text-slate-600 font-bold text-xs">CRC</span>
                                </div>
                            </div>

                            <button 
                                onClick={handleWithdraw}
                                disabled={loading || !amount}
                                className="w-full bg-cyber-orange text-black font-display font-black uppercase py-4 rounded hover:bg-white hover:shadow-[0_0_30px_rgba(255,95,0,0.6)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group/btn"
                            >
                                {(status === 'SCANNING' || status === 'PROCESSING') ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-print group-hover/btn:animate-pulse"></i>}
                                {status === 'SCANNING' ? 'VERIFICANDO...' : status === 'PROCESSING' ? 'PROCESANDO...' : 'IMPRIMIR RETIRO'}
                            </button>
                        </div>
                    )}

                    {/* --- FINAL HOLOGRAPHIC RESULT --- */}
                    {status === 'FINISHED' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-40 animate-in zoom-in-95 duration-500">
                             {/* Hologram Projector Light */}
                             <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-cyber-orange opacity-30 blur-[50px] rounded-full animate-pulse"></div>
                             
                             <div className="text-center relative z-10">
                                <div className="w-24 h-24 mx-auto bg-cyber-orange/10 rounded-full flex items-center justify-center border-2 border-cyber-orange shadow-[0_0_50px_rgba(255,95,0,0.6)] mb-6 animate-[bounce_2s_infinite]">
                                    <i className="fas fa-check text-5xl text-cyber-orange drop-shadow-sm"></i>
                                </div>
                                <h4 className="text-3xl font-display font-black text-white uppercase italic tracking-wider mb-2 drop-shadow-lg">
                                    Transacción <br/><span className="text-cyber-orange text-glow">Finalizada</span>
                                </h4>
                                <div className="bg-black/50 border border-white/10 p-4 rounded-xl mt-4 backdrop-blur-md">
                                    <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Saldo Restante</div>
                                    <div className="text-2xl font-mono font-bold text-white">{formatCurrency(finalBalance)}</div>
                                </div>
                                
                                <button 
                                    onClick={handleClose}
                                    className="mt-8 px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-xs font-bold uppercase tracking-widest text-white transition-all hover:scale-105"
                                >
                                    Cerrar Consola
                                </button>
                             </div>
                        </div>
                    )}

                    {/* --- ANIMATED RECEIPT --- */}
                    {(['PRINTING', 'CUTTING', 'DROPPING'].includes(status)) && (
                        <div 
                            className={`absolute top-0 left-4 right-4 z-30 origin-top animate-in slide-in-from-top-[100%] duration-[2000ms] ease-linear ${getTicketClass()}`}
                        >
                            {/* TICKET BODY */}
                            <div 
                                className="bg-[#e2e8f0] text-slate-900 font-mono text-xs relative shadow-2xl overflow-hidden pb-4"
                                style={{
                                    clipPath: 'polygon(0 0, 100% 0, 100% 98%, 0 98%)', // Clean top for cutting
                                    boxShadow: '0 10px 50px rgba(0,0,0,0.8)'
                                }}
                            >
                                {/* Holographic Strip */}
                                <div className="absolute top-0 bottom-0 left-0 w-3 bg-gradient-to-b from-slate-300 via-white to-slate-300 opacity-80 border-r border-slate-300"></div>

                                {/* Perforation Line (Visible only during cut) */}
                                {status === 'CUTTING' && (
                                     <>
                                        <div className="absolute top-0 left-0 w-full border-t-2 border-dashed border-red-500 opacity-80 z-50"></div>
                                        {/* Laser Burn Effect */}
                                        <div className="absolute top-[-2px] left-0 h-1 w-full bg-white shadow-[0_0_15px_red] z-50 animate-[laserSweep_0.6s_ease-in-out_forwards]"></div>
                                     </>
                                )}

                                {/* Content Container */}
                                <div className="pl-6 pr-4 py-6 relative">
                                    
                                    {/* Watermark */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-45 text-[40px] font-black text-slate-300 pointer-events-none opacity-20 border-4 border-slate-300 p-2 rounded">
                                        PAGADO
                                    </div>

                                    {/* Header */}
                                    <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-3">
                                        <div>
                                            <h4 className="font-black text-lg tracking-tighter leading-none">PHRONT<span className="text-slate-500">.CORP</span></h4>
                                            <div className="text-[8px] uppercase tracking-widest mt-1">Sistemas de Liquidación</div>
                                        </div>
                                        <div className="text-right">
                                            <i className="fas fa-qrcode text-3xl"></i>
                                        </div>
                                    </div>
                                    
                                    {/* Data Grid */}
                                    <div className="grid grid-cols-2 gap-y-1 text-[10px] mb-3">
                                        <div className="text-slate-500">FECHA_EMISIÓN</div>
                                        <div className="text-right font-bold">{new Date().toLocaleDateString()}</div>
                                        
                                        <div className="text-slate-500">ID_TERMINAL</div>
                                        <div className="text-right font-bold">{currentUser.id.substring(0,6).toUpperCase()}</div>
                                        
                                        <div className="text-slate-500">HASH_TX</div>
                                        <div className="text-right font-mono text-[8px] break-all leading-tight">{txId}</div>
                                    </div>

                                    {/* Main Amount */}
                                    <div className="bg-black text-white p-2 rounded-sm mb-3 relative overflow-hidden">
                                        <div className="text-[8px] text-cyber-orange uppercase tracking-widest mb-1">Total Retirado</div>
                                        <div className="text-xl font-bold font-mono tracking-tight flex justify-between items-baseline">
                                            <span>{formatCurrency(Number(amount) * 100)}</span>
                                            <span className="text-xs text-slate-500">CRC</span>
                                        </div>
                                    </div>

                                    {/* Footer Info */}
                                    <div className="text-[9px] flex justify-between items-end border-t border-dashed border-slate-400 pt-2">
                                        <div>
                                            <div className="text-slate-500">SALDO RESTANTE</div>
                                            <div className="font-bold text-sm">{formatCurrency(finalBalance)}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="bg-slate-800 text-white px-2 py-0.5 rounded-[2px] mb-1">APROBADO</div>
                                        </div>
                                    </div>

                                    {/* CSS BARCODE */}
                                    <div className="h-8 w-full mt-3 bg-[repeating-linear-gradient(90deg,black,black_1px,transparent_1px,transparent_3px,black_3px,black_4px,transparent_4px,transparent_6px)] opacity-80"></div>
                                </div>
                                
                                {/* Bottom Jagged Edge */}
                                <div className="absolute bottom-0 left-0 w-full h-2 bg-[#0f0f12]" style={{clipPath: 'polygon(0 100%, 5% 0, 10% 100%, 15% 0, 20% 100%, 25% 0, 30% 100%, 35% 0, 40% 100%, 45% 0, 50% 100%, 55% 0, 60% 100%, 65% 0, 70% 100%, 75% 0, 80% 100%, 85% 0, 90% 100%, 95% 0, 100% 100%)'}}></div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            <style>{`
                @keyframes laserSweep {
                    0% { width: 0; opacity: 1; }
                    50% { width: 100%; opacity: 1; }
                    100% { width: 100%; opacity: 0; }
                }
                @keyframes shake {
                    0% { transform: translate(1px, 1px) rotate(0deg); }
                    10% { transform: translate(-1px, -2px) rotate(-1deg); }
                    20% { transform: translate(-3px, 0px) rotate(1deg); }
                    30% { transform: translate(3px, 2px) rotate(0deg); }
                    40% { transform: translate(1px, -1px) rotate(1deg); }
                    50% { transform: translate(-1px, 2px) rotate(-1deg); }
                    60% { transform: translate(-3px, 1px) rotate(0deg); }
                    70% { transform: translate(3px, 1px) rotate(-1deg); }
                    80% { transform: translate(-1px, -1px) rotate(1deg); }
                    90% { transform: translate(1px, 2px) rotate(0deg); }
                    100% { transform: translate(1px, -2px) rotate(-1deg); }
                }
                @keyframes pan-down {
                    0% { background-position: 0% 0%; }
                    100% { background-position: 0% 100%; }
                }
            `}</style>
        </div>
    </div>
  );
}
