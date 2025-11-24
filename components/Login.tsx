
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [bootSequence, setBootSequence] = useState<string[]>([]);
  const navigate = useNavigate();
  const fetchUser = useAuthStore(s => s.fetchUser);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setBootSequence(['> INICIANDO HANDSHAKE...']);

    // Animation Sequence Simulation
    const sequence = [
        { msg: '> ESTABLECIENDO TÚNEL SEGURO (TLS 1.3)', delay: 400 },
        { msg: '> VERIFICANDO CREDENCIALES BIOMÉTRICAS', delay: 1000 },
        { msg: '> DESENCRIPTANDO LLAVES PRIVADAS [RSA-4096]', delay: 1800 },
        { msg: '> SINCRONIZANDO CON NÚCLEO SUPABASE...', delay: 2500 }
    ];

    sequence.forEach(({ msg, delay }) => {
        setTimeout(() => setBootSequence(prev => [...prev, msg]), delay);
    });
    
    // Attempt standard login (delayed slightly to allow animation)
    setTimeout(async () => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setBootSequence(prev => [...prev, `> ERROR FATAL: ${error.message}`, '> ABORTANDO CONEXIÓN.']);
            setTimeout(() => {
                setLoading(false);
                setBootSequence([]);
            }, 2000);
        } else {
            setBootSequence(prev => [...prev, '> ACCESO AUTORIZADO.', '> BIENVENIDO, OPERADOR.']);
            await fetchUser();
            setTimeout(() => navigate('/dashboard'), 800);
        }
    }, 3000);
  };

  if (loading) {
      return (
          <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 font-mono relative overflow-hidden">
              {/* Matrix Rain Effect Hint */}
              <div className="absolute inset-0 bg-[url('https://media.giphy.com/media/dummy-matrix/giphy.gif')] opacity-5 pointer-events-none"></div>
              
              <div className="w-full max-w-lg z-10 space-y-6">
                  <div className="flex items-center gap-4 mb-8">
                      <i className="fas fa-microchip text-4xl text-cyber-neon animate-pulse"></i>
                      <h2 className="text-2xl font-bold text-white tracking-[0.2em] animate-pulse">SYSTEM_BOOT_SEQUENCE</h2>
                  </div>

                  <div className="bg-black/80 border border-cyber-neon/50 p-6 rounded-lg shadow-[0_0_30px_rgba(0,240,255,0.1)] min-h-[300px] flex flex-col relative overflow-hidden">
                      {/* Scanline */}
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyber-neon/5 to-transparent h-[10px] w-full animate-[scanline_2s_linear_infinite] pointer-events-none"></div>
                      
                      {bootSequence.map((msg, i) => (
                          <div key={i} className={`mb-2 text-sm ${msg.includes('ERROR') ? 'text-cyber-danger' : msg.includes('ACCESO') ? 'text-cyber-success font-bold' : 'text-cyber-neon'}`}>
                              {msg}
                              {i === bootSequence.length - 1 && !msg.includes('ACCESO') && <span className="animate-pulse">_</span>}
                          </div>
                      ))}
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-900 h-1 mt-4 relative overflow-hidden">
                      <div className="absolute inset-0 bg-cyber-neon animate-[load_3s_ease-in-out_forwards]"></div>
                  </div>
              </div>
          </div>
      )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* El fondo ya viene del body global (neural-bg), aquí añadimos un foco local extra intenso */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyber-neon/5 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>

      <div className="w-full max-w-md bg-cyber-panel/40 backdrop-blur-xl border border-white/10 rounded-2xl p-1 shadow-[0_0_60px_rgba(0,240,255,0.1)] relative z-10 group">
        
        {/* Neon Border Pulse - Organico */}
        <div className="absolute -inset-[2px] bg-gradient-to-br from-cyber-neon via-transparent to-cyber-purple rounded-2xl opacity-30 group-hover:opacity-80 transition-opacity duration-1000 blur-md"></div>

        <div className="bg-[#030508]/80 rounded-xl p-10 relative overflow-hidden">
             
            {/* Líneas de energía conectando el contenedor */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-20 bg-gradient-to-b from-cyber-neon to-transparent opacity-50"></div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-px h-20 bg-gradient-to-t from-cyber-purple to-transparent opacity-50"></div>

            <div className="text-center mb-12 relative">
                <div className="inline-block p-5 rounded-full bg-black/50 border border-cyber-neon/30 mb-6 shadow-[0_0_30px_rgba(0,240,255,0.2)] relative group-hover:scale-110 transition-transform duration-500">
                    <div className="absolute inset-0 rounded-full border border-cyber-neon opacity-50 animate-[spin_10s_linear_infinite]"></div>
                    <i className="fas fa-brain text-4xl text-cyber-neon relative z-10 drop-shadow-md"></i>
                </div>
                <h1 className="text-5xl font-display font-black text-white mb-2 tracking-tighter italic drop-shadow-lg">
                    TIEMPOS<span className="text-cyber-neon text-glow">PRO</span>
                </h1>
                <p className="text-cyber-neon/60 text-xs font-mono tracking-[0.4em] uppercase">Conexión Neuronal Segura v3.3</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-8">
                <div>
                    <label className="flex justify-between text-cyber-neon text-[10px] font-bold uppercase tracking-widest mb-2 font-mono">
                        <span>Identidad de Nodo</span>
                        <span className="text-slate-600 opacity-50">ID-X</span>
                    </label>
                    <div className="relative group/input">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within/input:text-cyber-neon transition-colors">
                            <i className="fas fa-user-astronaut"></i>
                        </div>
                        <input 
                            type="email" 
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full bg-black/50 border border-slate-700 rounded-lg py-4 pl-12 pr-4 text-white font-mono focus:border-cyber-neon focus:ring-1 focus:ring-cyber-neon focus:shadow-[0_0_20px_rgba(0,240,255,0.3)] focus:outline-none transition-all placeholder-slate-800"
                            placeholder="OPERADOR_NET"
                        />
                        {/* Line decoration */}
                        <div className="absolute bottom-0 left-2 right-2 h-[1px] bg-cyber-neon scale-x-0 group-focus-within/input:scale-x-100 transition-transform duration-500"></div>
                    </div>
                </div>

                <div>
                    <label className="flex justify-between text-cyber-neon text-[10px] font-bold uppercase tracking-widest mb-2 font-mono">
                        <span>Clave Encriptada</span>
                        <span className="text-slate-600 opacity-50">AES-256</span>
                    </label>
                    <div className="relative group/input">
                         <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within/input:text-cyber-neon transition-colors">
                            <i className="fas fa-fingerprint"></i>
                        </div>
                        <input 
                            type="password" 
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-black/50 border border-slate-700 rounded-lg py-4 pl-12 pr-4 text-white font-mono focus:border-cyber-neon focus:ring-1 focus:ring-cyber-neon focus:shadow-[0_0_20px_rgba(0,240,255,0.3)] focus:outline-none transition-all placeholder-slate-800"
                            placeholder="••••••••••••"
                        />
                        <div className="absolute bottom-0 left-2 right-2 h-[1px] bg-cyber-neon scale-x-0 group-focus-within/input:scale-x-100 transition-transform duration-500"></div>
                    </div>
                </div>

                <button 
                    type="submit" 
                    className="w-full mt-6 relative overflow-hidden group/btn bg-transparent border border-cyber-neon text-cyber-neon font-display font-black text-lg py-4 rounded-lg transition-all hover:shadow-[0_0_30px_rgba(0,240,255,0.6)] uppercase tracking-widest"
                >
                    <div className="absolute inset-0 bg-cyber-neon/10 group-hover/btn:bg-cyber-neon group-hover/btn:text-black transition-colors duration-300"></div>
                    <span className="relative z-10 group-hover/btn:text-black transition-colors duration-300 flex items-center justify-center gap-3">
                         Sincronizar <i className="fas fa-bolt"></i>
                    </span>
                </button>
            </form>

            <div className="mt-10 pt-6 border-t border-white/5 flex justify-between items-center text-[9px] font-mono text-slate-500 uppercase tracking-wider">
                <span className="flex items-center gap-2"><i className="fas fa-shield-alt text-cyber-purple"></i> Phront Security</span>
                <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyber-success animate-pulse"></span>
                    Neural Link: 100%
                </span>
            </div>
        </div>
      </div>
    </div>
  );
}
