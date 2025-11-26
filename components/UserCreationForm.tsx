
import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../services/edgeApi';
import { UserRole, AppUser } from '../types';

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

  const isVendedor = current?.role === UserRole.Vendedor;

  // Reset Role if Vendedor logs in
  useEffect(() => {
    if (isVendedor) setRole(UserRole.Cliente);
  }, [isVendedor]);

  // --- THEME ENGINE (STABLE INTERPOLATION) ---
  // Inner theme for Role differentiation
  const activeTheme = useMemo(() => {
      return role === UserRole.Cliente 
        ? { color: '#00f0ff', shadow: 'rgba(0, 240, 255, 0.5)', name: 'neon' } // Cliente: Cyan
        : { color: '#bc13fe', shadow: 'rgba(188, 19, 254, 0.5)', name: 'purple' }; // Vendedor: Purple
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
      }, 500); // Debounce 500ms

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
        }, 3000);
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
    <div className="relative group h-full">
        
        {/* --- SUCCESS OVERLAY --- */}
        {successMode && (
            <div 
                className="absolute inset-0 z-50 bg-black/95 backdrop-blur-xl rounded-2xl flex flex-col items-center justify-center animate-in fade-in duration-500 overflow-hidden border-2 transition-colors ease-out"
                style={{ borderColor: role === UserRole.Cliente ? '#22C55E' : '#7C3AED' }}
            >
                {role === UserRole.Cliente ? (
                    <>
                        <div className="absolute inset-0 bg-green-500/10 animate-pulse"></div>
                        <div className="relative mb-8 animate-in zoom-in duration-500">
                            <div className="absolute inset-0 rounded-full bg-green-500 opacity-30 animate-ping blur-xl"></div>
                            <div className="w-32 h-32 bg-black rounded-full border-4 border-green-500 shadow-[0_0_60px_rgba(34,197,94,0.6)] flex items-center justify-center relative z-10">
                                <i className="fas fa-check text-6xl text-green-500 animate-[bounce_1s_infinite]"></i>
                            </div>
                        </div>
                        <h3 className="text-2xl font-display font-black text-white uppercase tracking-widest drop-shadow-[0_0_10px_#22C55E] mb-2">
                            Jugador Verificado
                        </h3>
                    </>
                ) : (
                    <>
                        <div className="absolute inset-0 bg-purple-600/10"></div>
                        <div className="absolute top-0 left-0 w-full h-2 bg-purple-500 shadow-[0_0_20px_#8b5cf6] animate-[scanline_1.5s_linear_infinite] z-0 opacity-50"></div>
                        <div className="relative mb-8 animate-in zoom-in duration-500">
                            <div className="w-32 h-40 bg-black/80 rounded-lg border-2 border-purple-500 shadow-[0_0_60px_rgba(124,58,237,0.5)] flex flex-col items-center justify-center relative z-10 overflow-hidden">
                                <i className="fas fa-user-tie text-5xl text-purple-500 mb-2"></i>
                                <div className="absolute bottom-2 right-2"><i className="fas fa-check-circle text-green-400 text-xl bg-black rounded-full"></i></div>
                            </div>
                        </div>
                        <h3 className="text-2xl font-display font-black text-white uppercase tracking-widest drop-shadow-[0_0_10px_#7C3AED] mb-2">
                            Vendedor Verificado
                        </h3>
                    </>
                )}
                <div className="mt-8 font-mono text-[9px] text-slate-400">ID: {cedula}</div>
            </div>
        )}

        {/* --- STABLE FLUID BACKLIGHT SYSTEM (EMERALD OVERRIDE) --- */}
        {/* The outer glow is now strictly Dark Emerald with HIGHER OPACITY as requested */}
        <div 
            className="absolute -inset-2 rounded-[2rem] opacity-50 blur-2xl transition-colors duration-700 ease-in-out"
            style={{ backgroundColor: '#065f46' }} // Emerald 800 (Brighter than 900)
        ></div>
        
        <div 
            className="absolute -inset-1 rounded-2xl opacity-80 blur-lg transition-colors duration-700 ease-in-out"
            style={{ backgroundColor: '#10b981' }} // Emerald 500 (Solid)
        ></div>

        <div 
            className="relative h-full bg-[#050a14]/90 border-2 rounded-2xl p-0 shadow-2xl overflow-hidden backdrop-blur-xl transition-all duration-700 flex flex-col z-10"
            style={{ borderColor: '#10b981' }} // Emerald Border
        >
            
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
                <div className="flex items-center gap-4">
                    <div 
                        className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center transition-all duration-700 border-2"
                        style={{ borderColor: activeTheme.color, color: activeTheme.color, boxShadow: `0 0 15px ${activeTheme.shadow}` }}
                    >
                        <i className="fas fa-id-card text-lg"></i>
                    </div>
                    <div>
                        <h3 className="text-sm font-display font-bold text-white uppercase tracking-wider">
                            Aprovisionamiento <span style={{ color: activeTheme.color }} className="transition-colors duration-700">Biométrico</span>
                        </h3>
                        <p className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">Creación de Identidad Digital</p>
                    </div>
                </div>
                {/* Step Indicator */}
                <div className="flex gap-1">
                    {[1, 2, 3].map(i => (
                        <div 
                            key={i} 
                            className="w-2 h-2 rounded-full transition-all duration-500 border"
                            style={{ 
                                backgroundColor: step >= i ? activeTheme.color : '#1e293b',
                                borderColor: step >= i ? activeTheme.color : '#334155',
                                boxShadow: step >= i ? `0 0 5px ${activeTheme.shadow}` : 'none'
                            }}
                        ></div>
                    ))}
                </div>
            </div>

            <form onSubmit={submit} className="flex-1 flex flex-col bg-gradient-to-b from-transparent to-black/30">
                
                <div className="flex-1 p-6 relative">
                    
                    {/* ROLE TOGGLE CONTAINER - PHOSPHORESCENT BORDER & GLOW */}
                    <div className="flex justify-center mb-6">
                        <div 
                            className="bg-black/60 p-1.5 rounded-xl border-2 flex gap-4 shadow-lg transition-all duration-500"
                            style={{
                                borderColor: activeTheme.color, // Container matches active theme
                                boxShadow: `0 0 25px ${activeTheme.shadow.replace('0.5', '0.2')}`
                            }}
                        >
                            {/* PLAYER TOGGLE - PERMANENT CYAN BORDER */}
                            <button
                                type="button"
                                onClick={() => setRole(UserRole.Cliente)}
                                className={`px-6 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 border-2 border-cyber-neon ${
                                    role === UserRole.Cliente 
                                    ? 'bg-cyber-neon text-black shadow-[0_0_20px_#00f0ff]' 
                                    : 'bg-transparent text-slate-400 shadow-[0_0_10px_rgba(0,240,255,0.2)] hover:text-cyber-neon hover:shadow-[0_0_15px_#00f0ff] hover:bg-cyber-neon/5'
                                }`}
                            >
                                Jugador
                            </button>
                            
                            {/* VENDOR TOGGLE - PERMANENT PURPLE BORDER */}
                            <button
                                type="button"
                                disabled={isVendedor}
                                onClick={() => setRole(UserRole.Vendedor)}
                                className={`px-6 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 border-2 border-cyber-purple ${
                                    role === UserRole.Vendedor 
                                    ? 'bg-cyber-purple text-black shadow-[0_0_20px_#bc13fe]' 
                                    : 'bg-transparent text-slate-400 shadow-[0_0_10px_rgba(188,19,254,0.2)] hover:text-cyber-purple hover:shadow-[0_0_15px_#bc13fe] hover:bg-cyber-purple/5'
                                } ${isVendedor ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                Vendedor
                            </button>
                        </div>
                    </div>

                    {/* --- STEP 1: IDENTITY --- */}
                    {step === 1 && (
                        <div className="space-y-5 animate-in slide-in-from-right-8 duration-300">
                            <div className="relative group/field">
                                <label 
                                    className="absolute -top-2.5 left-3 px-1 bg-[#050a14] text-[9px] font-bold uppercase tracking-widest z-20 transition-colors duration-500"
                                    style={{ color: activeTheme.color }}
                                >
                                    Cédula de Identidad / ID
                                </label>
                                
                                <div className="relative">
                                    <input 
                                        type="text"
                                        required
                                        value={cedula}
                                        onChange={e => setCedula(e.target.value)}
                                        className={`relative w-full bg-black/60 border-2 rounded-lg px-4 py-3 text-white font-mono placeholder-slate-700 focus:outline-none transition-all duration-300 z-10 ${
                                            collisionUser 
                                            ? 'border-red-500 text-red-500 focus:shadow-[0_0_20px_red]' 
                                            : ''
                                        }`}
                                        style={!collisionUser ? { 
                                            borderColor: activeTheme.color, 
                                            boxShadow: `0 0 10px ${activeTheme.shadow.replace('0.5', '0.1')}` 
                                        } : {}}
                                        placeholder="NO. IDENTIFICACIÓN ÚNICO"
                                        autoFocus
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20">
                                        {checkingId && <i className="fas fa-circle-notch fa-spin text-slate-400"></i>}
                                        {!checkingId && collisionUser && <i className="fas fa-exclamation-triangle text-red-500 animate-pulse"></i>}
                                        {!checkingId && !collisionUser && cedula.length > 3 && <i className="fas fa-check-circle text-green-500"></i>}
                                    </div>
                                </div>
                            </div>

                            {/* COLLISION ALERT CARD */}
                            {collisionUser && (
                                <div className="animate-in slide-in-from-top-2 fade-in duration-300 bg-red-950/20 border-2 border-red-500 rounded-lg p-3 relative overflow-hidden shadow-[0_0_20px_rgba(255,0,0,0.2)]">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-red-500 animate-pulse"></div>
                                    <div className="flex gap-3 items-start">
                                        <div className="text-red-500 text-xl mt-1"><i className="fas fa-ban"></i></div>
                                        <div>
                                            <div className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">
                                                IDENTIDAD YA REGISTRADA
                                            </div>
                                            <div className="text-xs text-white font-mono">
                                                Cédula vinculada a: <span className="font-bold">{collisionUser.name}</span>
                                            </div>
                                            <div className="text-[10px] text-red-300 mt-1 bg-red-900/40 px-2 py-1 rounded inline-block border border-red-500/30">
                                                ROL ACTUAL: {collisionUser.role.toUpperCase()}
                                            </div>
                                            <p className="text-[9px] text-slate-400 mt-2 leading-tight">
                                                {collisionUser.role !== role 
                                                    ? "ERROR CRÍTICO: Conflicto de roles. Contacte al SuperAdmin para liberar esta identidad."
                                                    : "Esta cuenta ya existe en el sistema."}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="relative group/field">
                                <label 
                                    className="absolute -top-2.5 left-3 px-1 bg-[#050a14] text-[9px] font-bold uppercase tracking-widest z-20 transition-colors duration-500"
                                    style={{ color: activeTheme.color }}
                                >
                                    Nombre Completo
                                </label>
                                <input 
                                    type="text"
                                    required
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="relative w-full bg-black/60 border-2 rounded-lg px-4 py-3 text-white font-mono placeholder-slate-700 focus:outline-none transition-all z-10"
                                    style={{ 
                                        borderColor: activeTheme.color,
                                        caretColor: activeTheme.color,
                                        boxShadow: `0 0 10px ${activeTheme.shadow.replace('0.5', '0.1')}`
                                    }}
                                    placeholder="NOMBRE REGISTRADO"
                                />
                            </div>
                        </div>
                    )}

                    {/* --- STEP 2: CONTACT --- */}
                    {step === 2 && (
                        <div className="space-y-5 animate-in slide-in-from-right-8 duration-300">
                            <div className="relative group/field">
                                <label 
                                    className="absolute -top-2.5 left-3 px-1 bg-[#050a14] text-[9px] font-bold uppercase tracking-widest z-20 transition-colors duration-500"
                                    style={{ color: activeTheme.color }}
                                >
                                    Teléfono Móvil
                                </label>
                                <input 
                                    type="tel"
                                    required
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    className="relative w-full bg-black/60 border-2 rounded-lg px-4 py-3 text-white font-mono placeholder-slate-700 focus:outline-none transition-all z-10"
                                    style={{ 
                                        borderColor: activeTheme.color,
                                        caretColor: activeTheme.color,
                                        boxShadow: `0 0 10px ${activeTheme.shadow.replace('0.5', '0.1')}`
                                    }}
                                    placeholder="+506 0000-0000"
                                    autoFocus
                                />
                            </div>

                            <div className="relative group/field">
                                <label 
                                    className="absolute -top-2.5 left-3 px-1 bg-[#050a14] text-[9px] font-bold uppercase tracking-widest z-20 transition-colors duration-500"
                                    style={{ color: activeTheme.color }}
                                >
                                    Correo Electrónico {role === UserRole.Cliente && <span className="text-slate-500 text-[8px]">(OPCIONAL)</span>}
                                </label>
                                <input 
                                    type="email"
                                    required={role === UserRole.Vendedor}
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="relative w-full bg-black/60 border-2 rounded-lg px-4 py-3 text-white font-mono placeholder-slate-700 focus:outline-none transition-all z-10"
                                    style={{ 
                                        borderColor: activeTheme.color,
                                        caretColor: activeTheme.color,
                                        boxShadow: `0 0 10px ${activeTheme.shadow.replace('0.5', '0.1')}`
                                    }}
                                    placeholder={role === UserRole.Vendedor ? "REQUERIDO@RED.COM" : "OPCIONAL@RED.COM"}
                                />
                            </div>
                        </div>
                    )}

                    {/* --- STEP 3: SECURITY & FUNDS --- */}
                    {step === 3 && (
                        <div className="space-y-5 animate-in slide-in-from-right-8 duration-300">
                            {/* Balance */}
                            <div className="relative group/field">
                                <label className="absolute -top-2.5 left-3 px-1 bg-[#050a14] text-[9px] font-bold text-cyber-success uppercase tracking-widest z-20">Crédito Inicial</label>
                                <div className="relative flex items-center">
                                    <input 
                                        type="number"
                                        required
                                        min="0"
                                        value={balance}
                                        onChange={e => setBalance(parseFloat(e.target.value))}
                                        className="w-full bg-black/60 border-2 border-slate-700 rounded-lg px-4 py-3 pl-4 pr-12 text-white font-mono placeholder-slate-700 focus:outline-none focus:border-cyber-success focus:shadow-[0_0_15px_rgba(10,255,96,0.3)] transition-all z-10"
                                        style={{ borderColor: activeTheme.color }} // Using theme color as requested
                                        placeholder="0.00"
                                        autoFocus
                                    />
                                    <div className="absolute right-4 text-xs font-bold text-slate-500 z-20">CRC</div>
                                </div>
                            </div>

                            {/* PIN Generation */}
                            <div className="bg-white/5 p-4 rounded-xl border-2 border-white/10 relative overflow-hidden shadow-inner">
                                <div className="flex justify-between items-center mb-3">
                                    <label 
                                        className="text-[9px] font-bold uppercase tracking-widest transition-colors duration-500"
                                        style={{ color: activeTheme.color }}
                                    >
                                        Credenciales de Acceso (PIN)
                                    </label>
                                    <button 
                                        type="button" 
                                        onClick={generatePin}
                                        className={`text-[9px] flex items-center gap-1 text-slate-400 hover:text-white uppercase font-bold`}
                                    >
                                        <i className="fas fa-random"></i> Generar
                                    </button>
                                </div>
                                
                                <div className="relative group/input">
                                    <input 
                                        type="text"
                                        maxLength={6}
                                        value={pin}
                                        onChange={e => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                                        className="relative w-full bg-black border-2 border-slate-800 rounded-lg py-3 text-center text-3xl font-mono tracking-[0.5em] text-white outline-none z-10 transition-all duration-500"
                                        style={{ 
                                            borderColor: activeTheme.color,
                                            boxShadow: `0 0 15px ${activeTheme.shadow.replace('0.5', '0.1')}`
                                        }}
                                        placeholder="------"
                                    />
                                </div>
                                <p className="text-[8px] text-slate-500 mt-2 text-center font-mono">
                                    * El PIN será encriptado. No recuperable.
                                </p>
                            </div>
                        </div>
                    )}

                </div>

                {/* Navigation & Actions - PHOSPHORESCENT BUTTONS */}
                <div className="p-6 border-t border-white/5 bg-black/20 flex justify-between gap-4">
                    {step > 1 ? (
                        <button
                            type="button"
                            onClick={() => setStep(prev => prev - 1 as any)}
                            className="px-6 py-3 rounded-xl border-2 border-slate-700 text-slate-400 hover:text-white hover:border-white hover:shadow-[0_0_15px_white] font-bold uppercase text-xs tracking-wider transition-all"
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
                            className={`px-8 py-3 rounded-xl font-bold uppercase text-xs tracking-wider transition-all duration-300 border-2 ${
                                ((step === 1 && name && cedula && !collisionUser) || (step === 2 && phone))
                                ? 'text-black hover:scale-105' 
                                : 'bg-slate-800 text-slate-500 border-slate-800 cursor-not-allowed'
                            }`}
                            style={
                                ((step === 1 && name && cedula && !collisionUser) || (step === 2 && phone))
                                ? { 
                                    backgroundColor: activeTheme.color, 
                                    borderColor: activeTheme.color,
                                    boxShadow: `0 0 20px ${activeTheme.shadow}` 
                                  }
                                : {}
                            }
                        >
                            Siguiente
                        </button>
                    ) : (
                        <button 
                            type="submit"
                            disabled={loading || balance === '' || !pin}
                            className={`px-8 py-3 rounded-xl font-black uppercase text-xs tracking-[0.2em] transition-all duration-300 flex items-center gap-2 border-2 ${
                                !loading && balance !== '' && pin
                                ? 'text-black hover:bg-white hover:scale-105 hover:border-white'
                                : 'bg-slate-800 text-slate-500 border-slate-800 cursor-not-allowed'
                            }`}
                            style={
                                !loading && balance !== '' && pin
                                ? { 
                                    backgroundColor: activeTheme.color, 
                                    borderColor: activeTheme.color,
                                    boxShadow: `0 0 30px ${activeTheme.shadow}` 
                                  }
                                : {}
                            }
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
