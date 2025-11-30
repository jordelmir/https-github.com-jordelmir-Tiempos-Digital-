
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../services/edgeApi';
import { UserRole, AppUser } from '../types';
import MatrixRain from './ui/MatrixRain';
import AnimatedIconUltra from './ui/AnimatedIconUltra';

interface UserCreationFormProps {
  onCreated?: (newUser: AppUser) => void;
  theme?: { name: string, shadow: string, glow: string, hex?: string };
}

export default function UserCreationForm({ onCreated }: UserCreationFormProps) {
  const current = useAuthStore(s => s.user);
  
  // Form State - Identity
  const [name, setName] = useState('');
  const [cedula, setCedula] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.Cliente);
  
  // Real-Time Check State
  const [checkingId, setCheckingId] = useState(false);
  const [collisionUser, setCollisionUser] = useState<AppUser | null>(null);
  
  // Form State - Contact
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  // Form State - Financial & Security
  const [balance, setBalance] = useState<number | ''>('');
  const [pin, setPin] = useState('');
  
  // UX State
  const [loading, setLoading] = useState(false);
  const [successMode, setSuccessMode] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [inputActive, setInputActive] = useState(false); // Track typing for "Living" effect

  const isVendedor = current?.role === UserRole.Vendedor;
  const isAdmin = current?.role === UserRole.SuperAdmin;

  // Reset Role if Vendedor logs in (Force Cliente)
  useEffect(() => {
    if (isVendedor) setRole(UserRole.Cliente);
  }, [isVendedor]);

  // --- THEME ENGINE (REACTIVE CORE) ---
  const ui = useMemo(() => {
      const isClient = role === UserRole.Cliente;
      return isClient 
        ? { 
            color: 'text-cyber-neon', 
            border: 'border-cyber-neon', 
            bg: 'bg-cyan-950', 
            shadow: 'shadow-neon-cyan', 
            hex: '#00f0ff',
            accent: 'bg-cyber-neon',
            scanline: 'from-cyan-500/50'
          } 
        : { 
            color: 'text-cyber-purple', 
            border: 'border-cyber-purple', 
            bg: 'bg-purple-950', 
            shadow: 'shadow-neon-purple', 
            hex: '#bc13fe',
            accent: 'bg-cyber-purple',
            scanline: 'from-purple-500/50'
          };
  }, [role]);

  // --- REAL-TIME IDENTITY SCANNING ---
  useEffect(() => {
      if (cedula.length < 4) {
          setCollisionUser(null);
          setCheckingId(false);
          return;
      }

      setCheckingId(true);
      const timer = setTimeout(async () => {
          const res = await api.checkIdentityAvailability(cedula);
          setCheckingId(false);
          if (res.data) {
              setCollisionUser(res.data);
          } else {
              setCollisionUser(null);
          }
      }, 600); // Cinematic Scan Delay

      return () => clearTimeout(timer);
  }, [cedula]);
  
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (balance === '' || !pin || !cedula || collisionUser) return;
    
    setLoading(true);

    const balanceInCents = Number(balance) * 100;

    const payload = {
      name,
      email: email || undefined,
      phone,
      cedula,
      role,
      balance_bigint: balanceInCents, 
      pin,
      issuer_id: current?.id
    };

    try {
      const res = await api.createUser(payload);

      if (res.error) {
        alert(res.error);
      } else if (res.data && res.data.user) {
        setSuccessMode(true);
        setTimeout(() => {
            onCreated?.(res.data!.user);
            resetForm();
        }, 3500);
      }
    } catch (err) {
      alert('Error crítico en aprovisionamiento.');
    } finally {
      setLoading(false);
    }
  }

  const resetForm = () => {
      setSuccessMode(false);
      setName('');
      setEmail('');
      setPhone('');
      setCedula('');
      setPin('');
      setBalance('');
      setStep(1);
      setCollisionUser(null);
  };

  const generatePin = () => {
      const r = Math.floor(100000 + Math.random() * 900000).toString();
      setPin(r);
  };

  if (!current || (current.role === UserRole.Cliente)) return null;

  return (
    <div className="relative group h-full perspective-1000">
        
        {/* --- SUCCESS OVERLAY (HOLOGRAPHIC COMPLETION) --- */}
        {successMode && (
            <div className="absolute inset-0 z-50 bg-[#02040a]/95 backdrop-blur-2xl rounded-3xl flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500 overflow-hidden border-2" style={{ borderColor: ui.hex }}>
                
                {/* Background Matrix Explosion */}
                <div className="absolute inset-0 opacity-20">
                    <MatrixRain colorHex={ui.hex} speed={4} density="HIGH" />
                </div>

                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-32 h-32 relative mb-8">
                        <div className={`absolute inset-0 rounded-full border-4 ${ui.border} animate-[spin_3s_linear_infinite] opacity-50`}></div>
                        <div className={`absolute inset-4 rounded-full border-4 border-dashed ${ui.border} animate-[spin_5s_linear_infinite_reverse]`}></div>
                        <div className={`absolute inset-0 rounded-full ${ui.accent} opacity-20 blur-xl animate-pulse`}></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <i className={`fas fa-fingerprint text-6xl ${ui.color} animate-pulse drop-shadow-[0_0_15px_currentColor]`}></i>
                        </div>
                    </div>
                    
                    <h3 className="text-3xl font-display font-black text-white uppercase tracking-widest drop-shadow-lg mb-2">
                        Identidad <span className={ui.color}>Forjada</span>
                    </h3>
                    <div className={`px-4 py-1 rounded-full border ${ui.border} bg-black/50 text-xs font-mono ${ui.color} tracking-[0.2em]`}>
                        ID: {cedula}
                    </div>
                </div>
                
                {/* Success Scanline */}
                <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-${role === UserRole.Cliente ? 'cyan' : 'purple'}-500 to-transparent animate-[scanline_1s_linear_infinite] shadow-[0_0_30px_currentColor]`}></div>
            </div>
        )}

        {/* --- LIVING CHASSIS --- */}
        <div className={`relative h-full bg-[#05070a] border-2 ${ui.border} rounded-[2rem] overflow-hidden shadow-2xl flex flex-col transition-all duration-700 hover:shadow-[0_0_50px_rgba(0,0,0,0.5)]`}>
            
            {/* Background Layer: Matrix Rain (Internal) */}
            <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-screen">
                <MatrixRain colorHex={ui.hex} speed={inputActive ? 2 : 0.5} density="MEDIUM" />
            </div>

            {/* Ambient Breathing Glow */}
            <div className={`absolute -inset-20 ${ui.bg} opacity-10 blur-[80px] animate-[pulse_6s_ease-in-out_infinite] transition-colors duration-1000`}></div>

            {/* HEADER: HUD STYLE */}
            <div className="p-6 border-b border-white/5 relative z-10 flex justify-between items-center bg-gradient-to-b from-white/5 to-transparent">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-black border ${ui.border} flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.5)] relative overflow-hidden group/icon`}>
                        <div className={`absolute inset-0 ${ui.accent} opacity-0 group-hover/icon:opacity-20 transition-opacity`}></div>
                        <AnimatedIconUltra profile={{ animation: 'pulse', theme: role === UserRole.Cliente ? 'neon' : 'cyber', speed: 2 }}>
                            <i className={`fas fa-user-plus text-xl ${ui.color}`}></i>
                        </AnimatedIconUltra>
                    </div>
                    <div>
                        <h3 className="text-sm font-display font-black text-white uppercase tracking-wider leading-tight">
                            Aprovisionamiento <br/><span className={`${ui.text} ${ui.color} transition-colors duration-500 text-glow-sm`}>Biométrico</span>
                        </h3>
                    </div>
                </div>

                {/* Step Progress - Connected Dots */}
                <div className="flex items-center gap-2">
                    {[1, 2, 3].map((s, idx) => (
                        <div key={s} className="flex items-center">
                            <div 
                                className={`w-3 h-3 rounded-full border-2 transition-all duration-500 ${
                                    step >= s ? `${ui.bg} border-${role === UserRole.Cliente ? 'cyan' : 'purple'}-400 shadow-[0_0_10px_currentColor]` : 'bg-transparent border-slate-700'
                                }`}
                            ></div>
                            {idx < 2 && (
                                <div className={`w-6 h-0.5 transition-all duration-500 ${step > s ? ui.accent : 'bg-slate-800'}`}></div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <form onSubmit={submit} className="flex-1 flex flex-col relative z-10">
                
                <div className="flex-1 p-8 relative overflow-y-auto custom-scrollbar">
                    
                    {/* ROLE SLIDER - TACTILE SWITCH */}
                    <div className="flex justify-center mb-8">
                        <div className="relative bg-black/60 p-1 rounded-full border border-white/10 flex items-center w-64 shadow-inner">
                            {/* Sliding Active Background */}
                            <div 
                                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-all duration-500 ease-out shadow-lg ${
                                    role === UserRole.Cliente 
                                    ? `left-1 bg-cyan-900/50 border border-cyan-500/50` 
                                    : `left-[calc(50%+2px)] bg-purple-900/50 border border-purple-500/50`
                                }`}
                            ></div>

                            <button
                                type="button"
                                onClick={() => setRole(UserRole.Cliente)}
                                className={`flex-1 relative z-10 text-[10px] font-black uppercase tracking-widest py-2 rounded-full transition-colors ${role === UserRole.Cliente ? 'text-white' : 'text-slate-500 hover:text-white'}`}
                            >
                                Jugador
                            </button>
                            
                            {isAdmin && (
                                <button
                                    type="button"
                                    onClick={() => setRole(UserRole.Vendedor)}
                                    className={`flex-1 relative z-10 text-[10px] font-black uppercase tracking-widest py-2 rounded-full transition-colors ${role === UserRole.Vendedor ? 'text-white' : 'text-slate-500 hover:text-white'}`}
                                >
                                    Vendedor
                                </button>
                            )}
                        </div>
                    </div>

                    {/* STEPS CONTAINER */}
                    <div className="relative min-h-[300px]">
                        
                        {/* --- STEP 1: IDENTITY (LASER SCANNER) --- */}
                        {step === 1 && (
                            <div className="space-y-8 animate-in slide-in-from-right-8 fade-in duration-500">
                                
                                {/* CEDULA INPUT WITH SCANNER */}
                                <div className="relative group/scan">
                                    <label className={`text-[9px] font-mono font-bold ${ui.color} uppercase tracking-widest mb-2 block pl-1`}>
                                        <i className="fas fa-id-card mr-2"></i>Cédula de Identidad
                                    </label>
                                    <div className="relative overflow-hidden rounded-xl bg-black/40 border border-white/10 group-focus-within/scan:border-white/30 transition-all">
                                        <input 
                                            type="text"
                                            required
                                            value={cedula}
                                            onChange={e => { setCedula(e.target.value); setInputActive(true); }}
                                            onBlur={() => setInputActive(false)}
                                            className={`w-full bg-transparent px-6 py-4 text-white font-mono text-lg outline-none placeholder-slate-700 tracking-wider relative z-10 transition-colors ${collisionUser ? 'text-red-500' : ''}`}
                                            placeholder="SCAN-ID-0000"
                                            autoFocus
                                        />
                                        
                                        {/* Status Icon */}
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20">
                                            {checkingId && <i className={`fas fa-circle-notch fa-spin ${ui.color}`}></i>}
                                            {!checkingId && collisionUser && <i className="fas fa-exclamation-triangle text-red-500 animate-pulse"></i>}
                                            {!checkingId && !collisionUser && cedula.length > 3 && <i className="fas fa-check text-green-500 drop-shadow-[0_0_5px_lime]"></i>}
                                        </div>

                                        {/* LASER SCANNER ANIMATION */}
                                        {(checkingId || inputActive) && (
                                            <div className={`absolute top-0 left-0 w-2 h-full bg-gradient-to-r from-transparent via-${role === UserRole.Cliente ? 'cyan' : 'purple'}-500 to-transparent opacity-50 animate-[scanline_1.5s_linear_infinite] pointer-events-none z-0`}></div>
                                        )}
                                        
                                        {/* Bottom Highlight */}
                                        <div className={`absolute bottom-0 left-0 h-[2px] w-0 group-focus-within/scan:w-full transition-all duration-700 ${ui.accent} shadow-[0_0_10px_currentColor]`}></div>
                                    </div>
                                </div>

                                {/* COLLISION ALERT */}
                                {collisionUser && (
                                    <div className="bg-red-950/30 border border-red-500/50 rounded-xl p-4 flex items-start gap-4 animate-in zoom-in duration-300 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,0,0,0.05)_10px,rgba(255,0,0,0.05)_20px)]"></div>
                                        <div className="w-10 h-10 rounded-lg bg-red-900/50 flex items-center justify-center border border-red-500 text-red-500 shrink-0 shadow-neon-red">
                                            <i className="fas fa-ban text-xl"></i>
                                        </div>
                                        <div>
                                            <h4 className="text-red-500 font-bold uppercase text-xs tracking-wider mb-1">Identidad Registrada</h4>
                                            <p className="text-red-400/80 text-[10px] font-mono leading-relaxed">
                                                ID vinculado a: <span className="text-white font-bold">{collisionUser.name}</span> <br/>
                                                Rol Actual: {collisionUser.role}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="relative group/input">
                                    <label className={`text-[9px] font-mono font-bold ${ui.color} uppercase tracking-widest mb-2 block pl-1`}>
                                        <i className="fas fa-user mr-2"></i>Nombre Completo
                                    </label>
                                    <div className="relative overflow-hidden rounded-xl bg-black/40 border border-white/10 group-focus-within/input:border-white/30 transition-all">
                                        <input 
                                            type="text"
                                            required
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            className="w-full bg-transparent px-6 py-4 text-white font-mono text-lg outline-none placeholder-slate-700 tracking-wider relative z-10"
                                            placeholder="NOMBRE DEL AGENTE"
                                        />
                                        <div className={`absolute bottom-0 left-0 h-[2px] w-0 group-focus-within/input:w-full transition-all duration-700 ${ui.accent} shadow-[0_0_10px_currentColor]`}></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* --- STEP 2: CONTACT (HOLOGRAPHIC INPUTS) --- */}
                        {step === 2 && (
                            <div className="space-y-8 animate-in slide-in-from-right-8 fade-in duration-500">
                                <div className="relative group/input">
                                    <label className={`text-[9px] font-mono font-bold ${ui.color} uppercase tracking-widest mb-2 block pl-1`}>
                                        <i className="fas fa-phone mr-2"></i>Móvil Seguro
                                    </label>
                                    <div className="relative overflow-hidden rounded-xl bg-black/40 border border-white/10 group-focus-within/input:border-white/30 transition-all">
                                        <input 
                                            type="tel"
                                            required
                                            value={phone}
                                            onChange={e => setPhone(e.target.value)}
                                            className="w-full bg-transparent px-6 py-4 text-white font-mono text-lg outline-none placeholder-slate-700 tracking-wider relative z-10"
                                            placeholder="+506 0000-0000"
                                            autoFocus
                                        />
                                        <div className={`absolute bottom-0 left-0 h-[2px] w-0 group-focus-within/input:w-full transition-all duration-700 ${ui.accent} shadow-[0_0_10px_currentColor]`}></div>
                                    </div>
                                </div>

                                <div className="relative group/input">
                                    <label className={`text-[9px] font-mono font-bold ${ui.color} uppercase tracking-widest mb-2 block pl-1`}>
                                        <i className="fas fa-envelope mr-2"></i>Enlace Digital <span className="text-slate-500 text-[8px] ml-2">(OPCIONAL)</span>
                                    </label>
                                    <div className="relative overflow-hidden rounded-xl bg-black/40 border border-white/10 group-focus-within/input:border-white/30 transition-all">
                                        <input 
                                            type="email"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className="w-full bg-transparent px-6 py-4 text-white font-mono text-lg outline-none placeholder-slate-700 tracking-wider relative z-10"
                                            placeholder="AGENTE@RED.COM"
                                        />
                                        <div className={`absolute bottom-0 left-0 h-[2px] w-0 group-focus-within/input:w-full transition-all duration-700 ${ui.accent} shadow-[0_0_10px_currentColor]`}></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* --- STEP 3: SECURITY (VAULT UI) --- */}
                        {step === 3 && (
                            <div className="space-y-8 animate-in slide-in-from-right-8 fade-in duration-500">
                                
                                <div className="relative group/input">
                                    <label className="text-[9px] font-mono font-bold text-cyber-success uppercase tracking-widest mb-2 block pl-1">
                                        <i className="fas fa-coins mr-2"></i>Crédito Inicial
                                    </label>
                                    <div className="relative overflow-hidden rounded-xl bg-black/40 border border-white/10 group-focus-within/input:border-cyber-success transition-all flex items-center">
                                        <input 
                                            type="number"
                                            required
                                            min="0"
                                            value={balance}
                                            onChange={e => setBalance(parseFloat(e.target.value))}
                                            className="w-full bg-transparent px-6 py-4 text-white font-mono text-2xl outline-none placeholder-slate-700 tracking-wider relative z-10"
                                            placeholder="0.00"
                                            autoFocus
                                        />
                                        <span className="text-xs font-bold text-slate-500 mr-4">CRC</span>
                                        <div className="absolute bottom-0 left-0 h-[2px] w-0 group-focus-within/input:w-full transition-all duration-700 bg-cyber-success shadow-[0_0_10px_#0aff60]"></div>
                                    </div>
                                </div>

                                {/* PIN Generator - The Vault Key */}
                                <div className="bg-[#0a0a0f] border border-white/10 rounded-xl p-4 relative overflow-hidden shadow-inner group/pin hover:border-white/20 transition-all">
                                    <div className="flex justify-between items-center mb-4">
                                        <label className={`text-[9px] font-mono font-bold ${ui.color} uppercase tracking-widest`}>
                                            <i className="fas fa-key mr-2"></i>Llave de Acceso (PIN)
                                        </label>
                                        <button 
                                            type="button" 
                                            onClick={generatePin}
                                            className={`text-[9px] font-bold uppercase px-3 py-1 rounded bg-white/5 hover:bg-white/10 ${ui.color} border border-transparent hover:border-white/20 transition-all`}
                                        >
                                            <i className="fas fa-random mr-1"></i> Generar
                                        </button>
                                    </div>
                                    
                                    <div className="relative bg-black rounded-lg border border-slate-800 py-4 flex items-center justify-center">
                                        <input 
                                            type="text"
                                            maxLength={6}
                                            value={pin}
                                            onChange={e => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                                            className="bg-transparent text-center text-3xl font-mono tracking-[0.5em] text-white outline-none w-full z-10"
                                            placeholder="------"
                                        />
                                        {/* Pin Glow */}
                                        <div className={`absolute inset-0 ${ui.accent} opacity-5 blur-md`}></div>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>

                {/* --- FOOTER: ACTION BAR --- */}
                <div className="p-6 border-t border-white/5 bg-black/20 flex justify-between gap-4 relative z-20">
                    {step > 1 ? (
                        <button
                            type="button"
                            onClick={() => setStep(prev => prev - 1 as any)}
                            className="px-6 py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 font-bold uppercase text-xs tracking-wider transition-all"
                        >
                            Atrás
                        </button>
                    ) : (
                        <div className="flex-1"></div>
                    )}

                    {step < 3 ? (
                        <button
                            type="button"
                            disabled={
                                (step === 1 && (!name || !cedula || collisionUser !== null)) || 
                                (step === 2 && (!phone || (role === UserRole.Vendedor && !email)))
                            }
                            onClick={() => setStep(prev => prev + 1 as any)}
                            className={`px-10 py-3 rounded-xl font-bold uppercase text-xs tracking-widest transition-all duration-300 shadow-lg ${
                                ((step === 1 && name && cedula && !collisionUser) || (step === 2 && phone))
                                ? `${ui.accent} text-black hover:scale-105 hover:brightness-110 shadow-[0_0_20px_${ui.hex}]` 
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                            }`}
                        >
                            Siguiente
                        </button>
                    ) : (
                        <button 
                            type="submit"
                            disabled={loading || balance === '' || !pin}
                            className={`px-10 py-3 rounded-xl font-black uppercase text-xs tracking-[0.2em] transition-all duration-300 flex items-center gap-3 shadow-lg ${
                                !loading && balance !== '' && pin
                                ? `${ui.accent} text-black hover:scale-105 hover:brightness-110 shadow-[0_0_30px_${ui.hex}]`
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                            }`}
                        >
                            {loading ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-fingerprint"></i>}
                            {loading ? 'FORJANDO...' : 'CREAR IDENTIDAD'}
                        </button>
                    )}
                </div>

            </form>
        </div>
    </div>
  );
}
