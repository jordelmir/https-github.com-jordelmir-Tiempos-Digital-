
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

type LoginRole = 'ADMIN' | 'VENDOR' | 'PLAYER';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeRole, setActiveRole] = useState<LoginRole>('ADMIN');
  const [viewState, setViewState] = useState<'IDLE' | 'BOOTING' | 'ACCESS_GRANTED' | 'ACCESS_DENIED'>('IDLE');
  const navigate = useNavigate();
  const fetchUser = useAuthStore(s => s.fetchUser);

  // --- THEME ENGINE ---
  const theme = useMemo(() => {
      switch (activeRole) {
          case 'VENDOR':
              // DARK MASCULINE PURPLE (Imperial/Obsidian)
              return {
                  primary: 'text-violet-400',
                  border: 'border-violet-900',
                  shadow: 'shadow-[0_0_80px_rgba(91,33,182,0.2)]', // Violet-800
                  inputBorder: 'border-violet-900/50',
                  inputFocus: 'focus:border-violet-700 focus:text-violet-200 focus:shadow-[0_0_30px_rgba(109,40,217,0.4)]',
                  btnBg: 'bg-gradient-to-r from-[#1e1b4b] to-[#4c1d95]', // Indigo-950 to Violet-800
                  btnText: 'text-gray-200',
                  btnShadow: 'group-hover/btn:shadow-[0_0_50px_rgba(76,29,149,0.5)]',
                  iconColor: 'text-violet-600',
                  secondaryText: 'text-indigo-400', 
                  backlight: 'bg-[#2e1065]', // Violet-950
                  label: 'MERCHANT_PRIME',
                  ringColor: 'border-violet-800',
              };
          case 'PLAYER':
              // DARK NEON BLUE PHOSPHORESCENT (Deep Abyss)
              return {
                  primary: 'text-blue-500',
                  border: 'border-blue-900',
                  shadow: 'shadow-[0_0_80px_rgba(29,78,216,0.25)]', // Blue-700
                  inputBorder: 'border-blue-900/50',
                  inputFocus: 'focus:border-blue-600 focus:text-blue-200 focus:shadow-[0_0_30px_rgba(37,99,235,0.5)]',
                  btnBg: 'bg-gradient-to-r from-[#020617] to-[#172554]', // Slate-950 to Blue-950
                  btnText: 'text-blue-100',
                  btnShadow: 'group-hover/btn:shadow-[0_0_50px_rgba(29,78,216,0.6)]',
                  iconColor: 'text-blue-600',
                  secondaryText: 'text-blue-400', 
                  backlight: 'bg-[#172554]', // Blue-950
                  label: 'PLAYER_GRID_V2',
                  ringColor: 'border-blue-800',
              };
          case 'ADMIN':
          default:
              // RED MATTER (Unchanged)
              return {
                  primary: 'text-rose-500',
                  border: 'border-rose-600/60',
                  shadow: 'shadow-[0_0_80px_rgba(225,29,72,0.2)]',
                  inputBorder: 'border-rose-600/30',
                  inputFocus: 'focus:border-rose-500 focus:text-rose-300 focus:shadow-[0_0_20px_rgba(225,29,72,0.4)]',
                  btnBg: 'bg-gradient-to-r from-rose-700 to-red-500',
                  btnText: 'text-white',
                  btnShadow: 'group-hover/btn:shadow-[0_0_40px_rgba(225,29,72,0.6)]',
                  iconColor: 'text-rose-500',
                  secondaryText: 'text-slate-400', 
                  backlight: 'bg-rose-600',
                  label: 'ROOT_ACCESS_LEVEL_5',
                  ringColor: 'border-rose-600',
              };
      }
  }, [activeRole]);

  // --- LOGIC ---
  const fillCredentials = (role: LoginRole) => {
      setActiveRole(role);
      if (role === 'ADMIN') {
          setEmail('admin@tiempos.local');
          setPassword('123456');
      } else if (role === 'VENDOR') {
          setEmail('vendedor@test.com');
          setPassword('123456');
      } else {
          setEmail('jugador@test.com');
          setPassword('123456');
      }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setViewState('BOOTING');

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    // Cinematic Delay
    await new Promise(r => setTimeout(r, 2500));

    if (error) {
        setViewState('ACCESS_DENIED');
        setTimeout(() => setViewState('IDLE'), 2000);
        alert('ACCESO DENEGADO');
    } else {
        setViewState('ACCESS_GRANTED');
        await fetchUser();
        setTimeout(() => navigate('/dashboard'), 1000);
    }
  };

  // 1. ADMIN: THE RED MATTER CORE (Biosecurity / Reactor)
  const renderAdminBoot = () => (
      <div className="flex flex-col items-center justify-center h-full w-full relative overflow-hidden bg-black border-[1px] border-rose-900 rounded-3xl shadow-[0_0_100px_rgba(225,29,72,0.2)] group">
          
          {/* Background: Digital Rain (Red Matrix) */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
              <div className="w-full h-full bg-[linear-gradient(0deg,transparent_20%,rgba(225,29,72,0.2)_50%,transparent_80%)] bg-[length:100%_4px] animate-[scanline_3s_linear_infinite]"></div>
              <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_50%,black_100%)]"></div>
          </div>

          {/* LASER SCANNER BEAM */}
          <div className={`absolute left-0 w-full h-1 bg-rose-500 shadow-[0_0_20px_#f43f5e] z-20 animate-[scan_2s_ease-in-out_infinite] ${viewState === 'ACCESS_GRANTED' ? 'hidden' : 'block'}`}></div>

          {/* CENTER REACTOR */}
          <div className="relative z-10 w-80 h-80 flex items-center justify-center perspective-1000">
              
              {/* Outer Gyroscope Rings */}
              <div className={`absolute inset-0 rounded-full border border-rose-900/50 border-t-rose-500 animate-[spin_4s_linear_infinite] transition-all duration-500 ${viewState === 'ACCESS_GRANTED' ? 'scale-150 opacity-0' : ''}`}></div>
              <div className={`absolute inset-4 rounded-full border border-rose-900/50 border-b-rose-500 animate-[spin_6s_linear_infinite_reverse] transition-all duration-500 ${viewState === 'ACCESS_GRANTED' ? 'scale-125 opacity-0' : ''}`}></div>
              <div className={`absolute inset-8 rounded-full border-2 border-dashed border-rose-800 animate-[spin_10s_linear_infinite] opacity-50`}></div>

              {/* The Core Mass */}
              <div className={`relative w-40 h-40 bg-black rounded-full flex items-center justify-center border-2 border-rose-600 shadow-[0_0_50px_rgba(225,29,72,0.4)] overflow-hidden transition-all duration-700 ${viewState === 'ACCESS_GRANTED' ? 'scale-110 border-white shadow-[0_0_80px_white]' : ''}`}>
                  
                  {/* Internal Texture */}
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30 mix-blend-overlay"></div>
                  
                  {/* Iris/Lens Mechanism */}
                  <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${viewState === 'ACCESS_GRANTED' ? 'opacity-0' : 'opacity-100'}`}>
                      <div className="w-20 h-20 border-4 border-rose-500 rounded-full animate-pulse shadow-[inset_0_0_20px_rgba(225,29,72,0.8)]"></div>
                      <div className="absolute w-full h-[1px] bg-rose-500 animate-[spin_2s_linear_infinite]"></div>
                      <div className="absolute h-full w-[1px] bg-rose-500 animate-[spin_2s_linear_infinite]"></div>
                  </div>

                  {/* Success State */}
                  {viewState === 'ACCESS_GRANTED' && (
                      <div className="absolute inset-0 bg-white flex items-center justify-center animate-in zoom-in duration-300">
                          <i className="fas fa-check text-5xl text-black"></i>
                      </div>
                  )}
              </div>
          </div>

          {/* HUD OVERLAY */}
          <div className="absolute inset-0 p-6 pointer-events-none flex flex-col justify-between">
              <div className="flex justify-between items-start opacity-70">
                  <div className="text-[10px] font-mono text-rose-500 border border-rose-900 px-2 py-1 bg-black/50">SYS.ROOT</div>
                  <div className="text-[10px] font-mono text-rose-500 border border-rose-900 px-2 py-1 bg-black/50">SEC.LVL.5</div>
              </div>
              <div className="text-center">
                  <div className={`font-display font-black text-2xl tracking-[0.2em] transition-all duration-300 ${viewState === 'ACCESS_GRANTED' ? 'text-white drop-shadow-[0_0_10px_white]' : 'text-rose-500 animate-pulse'}`}>
                      {viewState === 'ACCESS_GRANTED' ? 'ACCESS GRANTED' : 'AUTHENTICATING...'}
                  </div>
              </div>
          </div>
      </div>
  );

  // 2. VENDOR: THE DARK OBSIDIAN CONSTRUCT (Dark Violet/Indigo)
  const renderVendorBoot = () => (
      <div className="flex flex-col items-center justify-center h-full w-full relative overflow-hidden bg-[#0a0514] border border-violet-900 rounded-3xl shadow-[0_0_100px_rgba(76,29,149,0.3)]">
          {/* Deep Void Fog */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(46,16,101,0.4),black_90%)] animate-pulse"></div>
          
          {/* Grid Overlay - Dark & Subtle */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.05)_1px,transparent_1px)] bg-[length:30px_30px] opacity-20 perspective-1000 transform rotate-x-12"></div>

          <div className="relative z-10 w-72 h-72 flex items-center justify-center">
              
              {/* HEAVY METAL RINGS - Dark Purple */}
              <div className={`absolute inset-0 border-[6px] border-violet-950 border-t-violet-700 rounded-full animate-[spin_6s_linear_infinite] shadow-[0_0_30px_rgba(109,40,217,0.4)]`}></div>
              <div className={`absolute inset-4 border-[2px] border-indigo-900 border-b-indigo-500 rounded-full animate-[spin_8s_linear_infinite_reverse]`}></div>
              
              {/* Rotating Glyphs */}
              <div className="absolute inset-0 animate-[spin_20s_linear_infinite]">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 text-violet-800 text-xs font-mono">$$</div>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-4 text-violet-800 text-xs font-mono">$$</div>
              </div>

              {/* CENTRAL OBSIDIAN CRYSTAL */}
              <div className={`relative w-36 h-36 transform transition-all duration-700 ${viewState === 'ACCESS_GRANTED' ? 'scale-110' : 'animate-float'}`}>
                  <div className="absolute inset-0 bg-violet-900 blur-2xl opacity-40 rounded-full"></div>
                  
                  {/* Diamond Shape */}
                  <div className="relative w-full h-full bg-gradient-to-br from-[#1e1b4b] to-black border-2 border-violet-700 flex items-center justify-center rotate-45 shadow-[inset_0_0_30px_rgba(76,29,149,0.8)] overflow-hidden">
                      {/* Inner Reflection */}
                      <div className="absolute top-0 left-0 w-full h-1/2 bg-white opacity-5"></div>
                      
                      <div className="-rotate-45">
                        {viewState === 'ACCESS_GRANTED' ? (
                            <i className="fas fa-check text-5xl text-violet-200 drop-shadow-[0_0_15px_white]"></i>
                        ) : (
                            <i className="fas fa-briefcase text-5xl text-violet-800 drop-shadow-[0_0_10px_#4c1d95] animate-pulse"></i>
                        )}
                      </div>
                  </div>
              </div>
          </div>

          <div className="absolute bottom-12 text-center w-full">
              <div className={`font-display font-bold text-lg tracking-[0.3em] uppercase ${viewState === 'ACCESS_GRANTED' ? 'text-violet-200 text-shadow-white' : 'text-violet-700 text-shadow-purple'}`}>
                  {viewState === 'ACCESS_GRANTED' ? 'ASSETS VERIFIED' : 'SYNCING LEDGER'}
              </div>
              <div className="text-[9px] font-mono text-indigo-900 mt-1">SECURE_CHANNEL_ESTABLISHED</div>
          </div>
      </div>
  );

  // 3. PLAYER: THE DARK PHOSPHORESCENT GATEWAY (Deep Navy/Electric Blue)
  const renderPlayerBoot = () => (
      <div className="flex flex-col items-center justify-center h-full w-full relative overflow-hidden bg-[#02040a] border border-blue-900 rounded-3xl shadow-[0_0_60px_rgba(30,58,138,0.3)]">
          
          {/* Deep Abyss Background */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#0f172a_0%,#000000_100%)] opacity-90"></div>

          {/* PHOSPHORESCENT GRID LINES */}
          <div className="absolute inset-0 flex items-center justify-center perspective-500">
              <div className="absolute inset-0 bg-[linear-gradient(0deg,transparent_24%,rgba(37,99,235,0.1)_25%,rgba(37,99,235,0.1)_26%,transparent_27%,transparent_74%,rgba(37,99,235,0.1)_75%,rgba(37,99,235,0.1)_76%,transparent_77%,transparent),linear-gradient(90deg,transparent_24%,rgba(37,99,235,0.1)_25%,rgba(37,99,235,0.1)_26%,transparent_27%,transparent_74%,rgba(37,99,235,0.1)_75%,rgba(37,99,235,0.1)_76%,transparent_77%,transparent)] bg-[length:50px_50px] animate-[pan-down_2s_linear_infinite]"></div>
          </div>

          {/* THE GATEWAY */}
          <div className="relative z-10 w-64 h-64 flex items-center justify-center">
              {/* Outer Glow */}
              <div className="absolute inset-0 bg-blue-600 blur-[60px] opacity-10 rounded-full animate-pulse"></div>

              {/* Spinners */}
              <div className="absolute inset-0 border-4 border-blue-900/50 border-l-blue-500 rounded-full animate-[spin_3s_linear_infinite] shadow-[0_0_20px_rgba(37,99,235,0.4)]"></div>
              <div className="absolute inset-6 border-2 border-blue-900 border-r-cyan-500 rounded-full animate-[spin_5s_linear_infinite_reverse] shadow-[0_0_15px_cyan]"></div>

              {/* Core Icon */}
              <div className="bg-[#020617] p-8 rounded-full border border-blue-800 shadow-[inset_0_0_40px_#1e3a8a] relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-900/20 to-transparent"></div>
                  {viewState === 'ACCESS_GRANTED' ? (
                      <i className="fas fa-gamepad text-6xl text-cyan-400 animate-[bounce_1s_infinite] drop-shadow-[0_0_20px_cyan]"></i>
                  ) : (
                      <div className="text-blue-500 text-center animate-pulse">
                          <i className="fas fa-satellite-dish text-4xl mb-2"></i>
                      </div>
                  )}
              </div>
          </div>

          <div className="absolute bottom-16 w-full px-12">
              <div className="flex justify-between text-[8px] font-mono text-blue-900 font-bold mb-1">
                  <span>LOADING RESOURCES</span>
                  <span>{viewState === 'ACCESS_GRANTED' ? '100%' : '98%'}</span>
              </div>
              <div className="w-full h-1 bg-blue-950 rounded-full overflow-hidden">
                  <div className={`h-full bg-cyan-500 shadow-[0_0_10px_cyan] ${viewState === 'ACCESS_GRANTED' ? 'w-full' : 'w-[90%] animate-pulse'}`}></div>
              </div>
          </div>

          <div className="absolute bottom-8 font-display font-black text-xl italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-400 drop-shadow-[0_0_5px_rgba(37,99,235,0.8)]">
              {viewState === 'ACCESS_GRANTED' ? 'WELCOME PLAYER_1' : 'CONNECTING...'}
          </div>
          
          <style>{`
            @keyframes pan-down {
                0% { background-position: 0 0; }
                100% { background-position: 0 50px; }
            }
          `}</style>
      </div>
  );

  return (
    <div className="relative min-h-screen text-white font-mono overflow-hidden flex items-center justify-center">
      
      <div className="relative z-20 w-full max-w-lg perspective-1000 p-4 min-h-[600px] flex items-center justify-center">
        
        {/* --- STATE: IDLE (LOGIN FORM) --- */}
        {viewState === 'IDLE' && (
            <div className="animate-in zoom-in-95 fade-in duration-500 relative w-full">
                
                {/* DYNAMIC BACKLIGHT */}
                <div className={`absolute -inset-1 ${theme.backlight} rounded-3xl opacity-20 blur-2xl animate-pulse transition-colors duration-700`}></div>

                <div className={`relative bg-[#0a0500]/90 backdrop-blur-xl border-2 rounded-3xl p-1 group overflow-hidden z-10 transition-colors duration-700 ${theme.border} ${theme.shadow}`}>
                    
                    <div className="relative bg-[#020202]/95 rounded-[1.4rem] p-8 md:p-10 overflow-hidden transition-colors duration-700">
                        
                        {/* Decorative HUD Elements */}
                        <div className={`absolute top-4 left-4 w-2 h-2 rounded-full animate-pulse shadow-[0_0_10px_currentColor] ${theme.backlight}`}></div>
                        <div className={`absolute top-4 right-4 text-[9px] font-bold tracking-[0.2em] opacity-80 drop-shadow-[0_0_5px_currentColor] transition-colors duration-500 ${theme.primary}`}>
                            {theme.label}
                        </div>

                        {/* Logo Section */}
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-24 h-24 mb-6 relative group/icon cursor-pointer">
                                <div className={`absolute inset-0 rounded-full blur-xl opacity-20 group-hover/icon:opacity-50 animate-pulse transition-all duration-700 ${theme.backlight}`}></div>
                                <div className={`relative z-10 w-full h-full rounded-full bg-black/50 border-2 group-hover/icon:border-opacity-100 transition-all duration-700 flex items-center justify-center overflow-hidden border-opacity-30 ${theme.border}`}>
                                    <div className={`absolute inset-0 rounded-full border-t-2 animate-[spin_3s_linear_infinite] opacity-50 ${theme.ringColor}`}></div>
                                    <div className={`absolute inset-2 rounded-full border-b-2 animate-[spin_2s_linear_infinite_reverse] opacity-50 ${theme.border}`}></div>
                                    <i className={`fas fa-fingerprint text-5xl drop-shadow-[0_0_15px_currentColor] group-hover/icon:scale-110 transition-all duration-700 ${theme.primary}`}></i>
                                </div>
                            </div>
                            
                            <h1 className="text-4xl font-display font-black italic tracking-tighter text-white mb-1 drop-shadow-md">
                                TIEMPOS<span className={`drop-shadow-[0_0_15px_currentColor] ${theme.primary} transition-colors duration-700`}>PRO</span>
                            </h1>
                            <p className={`text-[10px] uppercase tracking-[0.6em] font-bold animate-pulse transition-colors duration-700 ${theme.secondaryText}`}>Acceso Blindado</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-6">
                            
                            {/* IDENTIFIER INPUT */}
                            <div className="space-y-2">
                                <label className={`text-[10px] font-bold uppercase tracking-widest ml-1 drop-shadow-[0_0_5px_currentColor] flex items-center gap-2 transition-colors duration-500 ${theme.primary}`}>
                                    <i className="fas fa-id-badge"></i> Identificador
                                </label>
                                <div className="relative group/input">
                                    <div className={`absolute -inset-0.5 rounded-lg blur opacity-0 group-hover/input:opacity-20 group-focus-within/input:opacity-50 transition-all duration-500 animate-pulse ${theme.backlight}`}></div>
                                    
                                    <div className="relative flex items-center">
                                        <div className={`absolute left-4 transition-colors duration-500 ${theme.primary} opacity-70`}><i className="fas fa-user-shield"></i></div>
                                        <input 
                                            type="email" 
                                            required
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className={`relative w-full bg-black/60 border rounded-lg py-4 pl-10 pr-4 text-white font-mono placeholder-slate-700 focus:outline-none transition-all duration-500 z-10 ${theme.inputBorder} ${theme.inputFocus}`}
                                            placeholder="OPERADOR@NET.LOCAL"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* PRIVATE KEY INPUT */}
                            <div className="space-y-2">
                                <label className={`text-[10px] font-bold uppercase tracking-widest ml-1 drop-shadow-[0_0_5px_currentColor] flex items-center gap-2 transition-colors duration-500 ${theme.secondaryText}`}>
                                    <i className="fas fa-key"></i> Llave Privada
                                </label>
                                <div className="relative group/input">
                                    <div className={`absolute -inset-0.5 rounded-lg blur opacity-0 group-hover/input:opacity-20 group-focus-within/input:opacity-50 transition-all duration-500 animate-pulse ${theme.backlight}`}></div>
                                    
                                    <div className="relative flex items-center">
                                        <div className={`absolute left-4 transition-colors duration-500 ${theme.secondaryText} opacity-70`}><i className="fas fa-lock"></i></div>
                                        <input 
                                            type="password" 
                                            required
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            className={`relative w-full bg-black/60 border rounded-lg py-4 pl-10 pr-4 text-white font-mono placeholder-slate-700 focus:outline-none transition-all duration-500 z-10 ${theme.inputBorder} ${theme.inputFocus}`}
                                            placeholder="••••••••••••"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button 
                                type="submit"
                                className={`w-full py-4 rounded-lg font-display font-black uppercase tracking-[0.2em] relative overflow-hidden group/btn transition-all duration-500 ${theme.btnShadow}`}
                            >
                                <div className={`absolute inset-0 ${theme.btnBg} transition-all duration-500`}></div>
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-multiply"></div>
                                <div className="absolute inset-0 bg-white/10 -translate-x-full group-hover/btn:animate-[shine_0.5s_ease-in-out]"></div>
                                
                                <span className={`relative z-10 flex items-center justify-center gap-3 ${theme.btnText}`}>
                                    <i className="fas fa-power-off"></i> INICIAR SESIÓN
                                </span>
                            </button>

                        </form>

                        {/* DEMO ACCESS KEYS */}
                        <div className="mt-8 pt-6 border-t border-white/5">
                            <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-3 text-center">
                                Protocolo de Acceso Rápido
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <button 
                                    onClick={() => fillCredentials('ADMIN')}
                                    className={`py-2 rounded border transition-all duration-500 flex flex-col items-center justify-center gap-1 group ${activeRole === 'ADMIN' ? 'bg-rose-900/20 border-rose-500 text-rose-500 shadow-[0_0_15px_rgba(225,29,72,0.4)]' : 'bg-black/40 border-white/10 text-slate-500 hover:border-rose-500/50 hover:text-rose-400'}`}
                                >
                                    <i className="fas fa-shield-alt text-lg"></i>
                                    <span className="text-[8px] font-bold uppercase tracking-wider">SuperAdmin</span>
                                </button>

                                <button 
                                    onClick={() => fillCredentials('VENDOR')}
                                    className={`py-2 rounded border transition-all duration-500 flex flex-col items-center justify-center gap-1 group ${activeRole === 'VENDOR' ? 'bg-[#1e1b4b] border-violet-800 text-violet-400 shadow-[0_0_15px_rgba(109,40,217,0.3)]' : 'bg-black/40 border-white/10 text-slate-500 hover:border-violet-800 hover:text-violet-400'}`}
                                >
                                    <i className="fas fa-briefcase text-lg"></i>
                                    <span className="text-[8px] font-bold uppercase tracking-wider">Vendedor</span>
                                </button>

                                <button 
                                    onClick={() => fillCredentials('PLAYER')}
                                    className={`py-2 rounded border transition-all duration-500 flex flex-col items-center justify-center gap-1 group ${activeRole === 'PLAYER' ? 'bg-[#0f172a] border-blue-700 text-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'bg-black/40 border-white/10 text-slate-500 hover:border-blue-700 hover:text-blue-400'}`}
                                >
                                    <i className="fas fa-user text-lg"></i>
                                    <span className="text-[8px] font-bold uppercase tracking-wider">Jugador</span>
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        )}

        {/* --- STATE: BOOTING / ACCESS GRANTED (GRAPHICAL MODE) --- */}
        {(viewState === 'BOOTING' || viewState === 'ACCESS_GRANTED' || viewState === 'ACCESS_DENIED') && (
            <div className="w-full h-[500px] flex items-center justify-center animate-in zoom-in duration-500">
                {activeRole === 'ADMIN' && renderAdminBoot()}
                {activeRole === 'VENDOR' && renderVendorBoot()}
                {activeRole === 'PLAYER' && renderPlayerBoot()}
            </div>
        )}

      </div>
      
      <style>{`
        @keyframes shine {
            0% { transform: translateX(-100%) skewX(-15deg); }
            100% { transform: translateX(200%) skewX(-15deg); }
        }
        @keyframes scan {
            0%, 100% { top: 10%; opacity: 0; }
            50% { top: 90%; opacity: 1; }
        }
      `}</style>
    </div>
  );
}
