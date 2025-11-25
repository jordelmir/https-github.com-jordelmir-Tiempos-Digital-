import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

// Note: MatrixBackground is now global in App.tsx. 
// Login component is transparent to show the global background.

type LogLine = {
    text: string;
    type: 'INFO' | 'WARN' | 'SUCCESS' | 'ERROR' | 'SYSTEM';
    id: number;
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [viewState, setViewState] = useState<'IDLE' | 'BOOTING' | 'ACCESS_GRANTED' | 'ACCESS_DENIED'>('IDLE');
  const [logs, setLogs] = useState<LogLine[]>([]);
  const navigate = useNavigate();
  const fetchUser = useAuthStore(s => s.fetchUser);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (text: string, type: LogLine['type'] = 'INFO') => {
      setLogs(prev => [...prev, { text, type, id: Date.now() + Math.random() }]);
  };

  const runBootSequence = async () => {
      setViewState('BOOTING');
      setLogs([]);

      const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

      // PHASE 1: INITIALIZATION
      addLog('INITIALIZING PHRONT KERNEL v3.3.0...', 'SYSTEM');
      await sleep(400);
      addLog('LOADING MODULES: [AUTH, CRYPTO, LEDGER, UI]', 'INFO');
      await sleep(300);
      addLog('CHECKING INTEGRITY...', 'INFO');
      await sleep(500);
      addLog('INTEGRITY CHECK: PASS [SHA-256 Verified]', 'SUCCESS');
      
      // PHASE 2: CONNECTION
      addLog(`ESTABLISHING SECURE TUNNEL TO ${email.split('@')[0].toUpperCase()}@NODE_01...`, 'WARN');
      await sleep(800);
      
      // PHASE 3: AUTHENTICATION (Real Attempt)
      addLog('TRANSMITTING ENCRYPTED CREDENTIALS (TLS 1.3)...', 'INFO');
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
          await sleep(600);
          addLog('FATAL: CREDENTIALS REJECTED BY MAINFRAME.', 'ERROR');
          addLog(`ERR_CODE: ${error.message.toUpperCase()}`, 'ERROR');
          addLog('CLOSING PORT 443...', 'SYSTEM');
          await sleep(1500);
          setViewState('IDLE'); // Reset
          alert('ACCESO DENEGADO: Credenciales inválidas.');
      } else {
          // PHASE 4: SUCCESS SEQUENCE
          await sleep(600);
          addLog('HANDSHAKE COMPLETE. TOKEN RECEIVED.', 'SUCCESS');
          addLog('DECRYPTING USER PROFILE...', 'INFO');
          await fetchUser();
          addLog('PROFILE LOADED. ALLOCATING MEMORY...', 'INFO');
          await sleep(400);
          addLog('SYSTEM READY.', 'SUCCESS');
          
          setViewState('ACCESS_GRANTED');
          
          // Final cinematic pause before redirect
          await sleep(1200);
          navigate('/dashboard');
      }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    runBootSequence();
  };

  return (
    <div className="relative min-h-screen text-white font-mono overflow-hidden flex items-center justify-center">
      
      {/* 3. MAIN CONTENT CONTAINER */}
      <div className="relative z-20 w-full max-w-lg perspective-1000">
        
        {/* --- STATE: IDLE (LOGIN FORM) --- */}
        {viewState === 'IDLE' && (
            <div className="animate-in zoom-in-95 fade-in duration-500 relative">
                
                {/* PLASMA BACKLIGHT - CARD LEVEL */}
                <div className="absolute -inset-1 bg-cyber-neon rounded-2xl opacity-20 blur-xl animate-plasma-pulse"></div>

                {/* Holographic Card */}
                <div className="relative bg-[#050a14]/60 backdrop-blur-md border border-white/10 rounded-2xl p-1 shadow-[0_0_80px_rgba(0,240,255,0.15)] group overflow-hidden z-10">
                    
                    {/* Animated Border Gradient */}
                    <div className="absolute -inset-[200%] bg-[conic-gradient(from_0deg,transparent_0_340deg,#00f0ff_360deg)] opacity-30 animate-[spin_4s_linear_infinite] group-hover:opacity-50 transition-opacity"></div>
                    
                    <div className="relative bg-[#050a14]/80 rounded-xl p-8 md:p-12 overflow-hidden">
                        
                        {/* Decorative HUD Elements */}
                        <div className="absolute top-4 left-4 w-2 h-2 bg-cyber-neon rounded-full animate-pulse shadow-neon-cyan"></div>
                        <div className="absolute top-4 right-4 text-[9px] text-cyber-neon font-bold tracking-[0.2em] opacity-70 text-glow-sm">SECURE_LOGIN_v3.3</div>
                        <div className="absolute bottom-4 left-4 text-[9px] text-cyber-blue font-bold tracking-widest">PHRONT.NET</div>
                        <div className="absolute bottom-4 right-4 flex gap-1">
                             <div className="w-1 h-3 bg-cyber-purple/50 shadow-[0_0_5px_#bc13fe]"></div>
                             <div className="w-1 h-3 bg-cyber-purple/30"></div>
                             <div className="w-1 h-3 bg-cyber-purple/10"></div>
                        </div>

                        {/* Logo Section */}
                        <div className="text-center mb-10">
                            {/* FINGERPRINT ICON REACTOR */}
                            <div className="inline-flex items-center justify-center w-24 h-24 mb-6 relative group/icon cursor-pointer">
                                <div className="absolute inset-0 bg-cyber-neon rounded-full blur-xl opacity-20 group-hover/icon:opacity-50 animate-pulse transition-opacity duration-500"></div>
                                <div className="relative z-10 w-full h-full rounded-full bg-black/50 border border-cyber-neon/30 group-hover/icon:border-cyber-neon/80 transition-all shadow-neon-cyan flex items-center justify-center overflow-hidden">
                                    <div className="absolute inset-0 rounded-full border-t border-cyber-neon animate-[spin_2s_linear_infinite] opacity-50"></div>
                                    <div className="absolute inset-2 rounded-full border-b border-cyber-purple animate-[spin_3s_linear_infinite_reverse] opacity-50"></div>
                                    <i className="fas fa-fingerprint text-5xl text-cyber-neon drop-shadow-[0_0_10px_rgba(0,240,255,0.8)] group-hover/icon:scale-110 transition-transform"></i>
                                </div>
                            </div>
                            
                            <h1 className="text-4xl font-display font-black italic tracking-tighter text-white mb-1 drop-shadow-md">
                                TIEMPOS<span className="text-cyber-neon text-glow">PRO</span>
                            </h1>
                            <p className="text-[10px] text-cyber-blue uppercase tracking-[0.6em] font-bold">Acceso Restringido</p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleLogin} className="space-y-8">
                            
                            {/* IDENTIFIER INPUT - PLASMA REACTOR */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-cyber-neon uppercase tracking-widest ml-1 text-glow-sm flex items-center gap-2">
                                    <i className="fas fa-id-badge"></i> Identificador
                                </label>
                                <div className="relative group/input">
                                    {/* Input Backlight */}
                                    <div className="absolute -inset-0.5 bg-cyber-neon rounded-lg blur opacity-0 group-hover/input:opacity-30 group-focus-within/input:opacity-70 transition-opacity duration-500 animate-pulse"></div>
                                    
                                    <div className="relative flex items-center">
                                        <div className="absolute left-4 text-cyber-neon/50 group-focus-within/input:text-cyber-neon transition-colors"><i className="fas fa-user-astronaut"></i></div>
                                        <input 
                                            type="email" 
                                            required
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className="relative w-full bg-black/80 border border-cyber-border/50 rounded-lg py-4 pl-10 pr-4 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-cyber-neon focus:text-cyber-neon transition-all focus:shadow-[0_0_20px_rgba(0,240,255,0.2)] z-10"
                                            placeholder="OPERADOR@NET.LOCAL"
                                        />
                                        {/* Scanning Beam inside Input */}
                                        <div className="absolute bottom-0 left-0 h-[2px] w-full bg-cyber-neon/50 shadow-[0_0_10px_#00f0ff] scale-x-0 group-focus-within/input:scale-x-100 transition-transform duration-500 origin-left z-20"></div>
                                    </div>
                                </div>
                            </div>

                            {/* PRIVATE KEY INPUT - PLASMA REACTOR */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-cyber-purple uppercase tracking-widest ml-1 text-glow-sm flex items-center gap-2">
                                    <i className="fas fa-key"></i> Llave Privada
                                </label>
                                <div className="relative group/input">
                                    {/* Input Backlight (Purple) */}
                                    <div className="absolute -inset-0.5 bg-cyber-purple rounded-lg blur opacity-0 group-hover/input:opacity-30 group-focus-within/input:opacity-70 transition-opacity duration-500 animate-pulse"></div>
                                    
                                    <div className="relative flex items-center">
                                        <div className="absolute left-4 text-cyber-purple/50 group-focus-within/input:text-cyber-purple transition-colors"><i className="fas fa-shield-alt"></i></div>
                                        <input 
                                            type="password" 
                                            required
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            className="relative w-full bg-black/80 border border-cyber-border/50 rounded-lg py-4 pl-10 pr-4 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-cyber-purple focus:text-cyber-purple transition-all focus:shadow-[0_0_20px_rgba(188,19,254,0.2)] z-10"
                                            placeholder="••••••••••••"
                                        />
                                        {/* Scanning Beam inside Input */}
                                        <div className="absolute bottom-0 left-0 h-[2px] w-full bg-cyber-purple/50 shadow-[0_0_10px_#bc13fe] scale-x-0 group-focus-within/input:scale-x-100 transition-transform duration-500 origin-left z-20"></div>
                                    </div>
                                </div>
                            </div>

                            {/* SUBMIT BUTTON - PLASMA REACTOR */}
                            <button 
                                type="submit" 
                                className="w-full relative group/btn overflow-visible mt-8"
                            >
                                {/* Button Backlight Glow */}
                                <div className="absolute -inset-1 bg-cyber-neon rounded-lg blur-md opacity-20 group-hover/btn:opacity-60 transition-opacity duration-300 animate-pulse"></div>
                                
                                <div className="relative overflow-hidden rounded-lg bg-cyber-neon/10 border border-cyber-neon/50 px-6 py-4 transition-all group-hover/btn:bg-cyber-neon group-hover/btn:border-cyber-neon group-hover/btn:shadow-[0_0_30px_rgba(0,240,255,0.4)]">
                                    <div className="absolute inset-0 w-full h-full bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] -translate-x-[100%] group-hover/btn:animate-[shine_0.5s_ease-in-out_forwards]"></div>
                                    <div className="flex items-center justify-center gap-3 relative z-10">
                                        <span className="font-display font-black uppercase tracking-[0.2em] text-sm text-cyber-neon group-hover/btn:text-black transition-colors text-glow-sm">Iniciar Enlace</span>
                                        <i className="fas fa-satellite-dish text-cyber-neon group-hover/btn:text-black transition-colors animate-pulse"></i>
                                    </div>
                                </div>
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        )}

        {/* --- STATE: BOOTING / TERMINAL --- */}
        {(viewState === 'BOOTING' || viewState === 'ACCESS_GRANTED') && (
            <div className="animate-in fade-in zoom-in-95 duration-300 relative">
                {/* Backlight for Terminal */}
                <div className="absolute -inset-1 bg-cyber-success rounded-lg opacity-10 blur-xl animate-pulse"></div>

                <div className="bg-black/90 border-2 border-cyber-border rounded-lg shadow-[0_0_30px_rgba(30,58,138,0.5)] overflow-hidden font-mono text-xs md:text-sm relative h-[400px] flex flex-col z-10">
                    
                    {/* Terminal Header */}
                    <div className="bg-slate-900 border-b border-slate-700 p-2 flex items-center justify-between">
                        <div className="flex gap-2">
                             <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_5px_red]"></div>
                             <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_5px_orange]"></div>
                             <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_5px_lime]"></div>
                        </div>
                        <div className="text-cyber-neon font-bold tracking-widest text-glow-sm">ROOT@PHRONT-CORE:~</div>
                        <div className="text-cyber-success animate-pulse"><i className="fas fa-wifi"></i></div>
                    </div>

                    {/* Scanline Overlay */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] bg-repeat pointer-events-none opacity-50 z-20"></div>

                    {/* Logs Content */}
                    <div ref={logContainerRef} className="flex-1 p-6 overflow-y-auto space-y-2 scroll-smooth z-10">
                        {logs.map((log) => (
                            <div key={log.id} className="flex gap-3">
                                <span className="text-slate-500 select-none">[{new Date(log.id).toLocaleTimeString().split(' ')[0]}]</span>
                                <span className={`
                                    ${log.type === 'INFO' ? 'text-cyber-blue' : 
                                      log.type === 'WARN' ? 'text-yellow-400' : 
                                      log.type === 'ERROR' ? 'text-red-500 font-bold bg-red-900/20 px-1 shadow-[0_0_10px_red]' : 
                                      log.type === 'SUCCESS' ? 'text-cyber-success font-bold text-glow-green' : 
                                      'text-cyber-purple italic'}
                                `}>
                                    {log.type === 'SUCCESS' && '✔ '}
                                    {log.type === 'ERROR' && '✖ '}
                                    {log.text}
                                </span>
                            </div>
                        ))}
                        <div className="w-2 h-4 bg-cyber-neon animate-pulse inline-block align-middle ml-2 box-shadow-[0_0_5px_#00f0ff]"></div>
                    </div>

                    {/* Progress Indicator */}
                    <div className="h-1 w-full bg-slate-800">
                        <div className="h-full bg-cyber-neon shadow-[0_0_10px_#00f0ff] animate-[load_4s_ease-out_forwards]"></div>
                    </div>
                </div>
            </div>
        )}

        {/* --- STATE: ACCESS GRANTED (OVERLAY) --- */}
        {viewState === 'ACCESS_GRANTED' && (
            <div className="absolute inset-0 flex items-center justify-center z-50">
                <div className="text-center animate-in zoom-in duration-500">
                    <div className="text-6xl text-cyber-success drop-shadow-[0_0_30px_rgba(10,255,96,1)] mb-4">
                        <i className="fas fa-unlock-alt"></i>
                    </div>
                    <h2 className="text-4xl font-display font-black text-white tracking-widest uppercase bg-black/70 px-8 py-3 rounded border-2 border-cyber-success/50 backdrop-blur-xl shadow-[0_0_50px_rgba(10,255,96,0.3)]">
                        Acceso Autorizado
                    </h2>
                </div>
            </div>
        )}

      </div>

      {/* Global Styles for Animations */}
      <style>{`
        @keyframes shine {
            100% { transform: translateX(100%); }
        }
        @keyframes scan {
            0% { top: 0; opacity: 0; }
            50% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
        }
        @keyframes load {
            0% { width: 0%; }
            100% { width: 100%; }
        }
      `}</style>
    </div>
  );
}