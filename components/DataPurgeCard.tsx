
import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../services/edgeApi';

export default function DataPurgeCard({ theme }: { theme?: { name: string, shadow: string } }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  
  const PHRASE = 'CONFIRMAR PURGA TOTAL';
  const user = useAuthStore(s => s.user);

  async function runPurge() {
    if (!user) return;
    setLoading(true);
    try {
        const res = await api.purgeSystem({ confirm_phrase: confirm, actor_id: user.id });
        if (res.error) {
            alert(res.error);
        } else {
            alert('PROTOCOLO INICIADO. SOLICITUD MULTI-FIRMA ENVIADA.');
            setOpen(false);
            setConfirm('');
        }
    } catch (e) {
        alert("ERROR CRÍTICO");
    } finally {
        setLoading(false);
    }
  }

  return (
    <>
      <div className="relative group h-full">
          {/* Danger Backlight Double Layer */}
          <div className="absolute -inset-2 bg-cyber-danger rounded-[2rem] opacity-20 blur-2xl animate-[pulse_4s_ease-in-out_infinite] transition-opacity"></div>
          <div className="absolute -inset-1 bg-cyber-danger rounded-2xl opacity-40 blur-lg animate-[pulse_2s_ease-in-out_infinite] group-hover:opacity-60 transition-opacity"></div>
          
          <div className="relative h-full bg-cyber-black border-2 border-cyber-danger/40 rounded-2xl p-6 shadow-neon-red overflow-hidden hover:border-cyber-danger hover:shadow-[0_0_50px_rgba(255,0,60,0.5)] transition-all duration-300 z-10 flex flex-col justify-between">
            
            {/* Warning Stripes Background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{backgroundImage: 'repeating-linear-gradient(45deg, #ff003c 0, #ff003c 2px, transparent 0, transparent 20px)'}}></div>
            
            <div className="relative z-10">
                <h3 className="font-display font-bold text-cyber-danger text-lg flex items-center gap-3 mb-2 uppercase tracking-wider text-shadow-red animate-pulse">
                    <i className="fas fa-radiation fa-spin-slow"></i> Purga de Sistema
                </h3>
                <p className="text-xs font-mono text-red-300/70 mb-6">
                    Acción destructiva de Clase-A. Se requiere autorización Multi-Firma.
                </p>
            </div>
                
            {/* BUTTON - PLASMA DANGER */}
            <button 
                onClick={() => setOpen(true)} 
                className="w-full relative group/btn overflow-visible rounded-lg mt-auto"
            >
                {/* Backlight */}
                <div className="absolute -inset-1 bg-cyber-danger rounded-lg blur opacity-0 group-hover/btn:opacity-60 transition-opacity duration-300 animate-pulse"></div>
                
                <div className="relative z-10 py-3 border border-cyber-danger bg-cyber-danger/10 group-hover/btn:bg-cyber-danger rounded-lg transition-colors">
                    <span className="flex items-center justify-center gap-2 font-display font-bold uppercase tracking-[0.2em] text-cyber-danger group-hover/btn:text-black transition-colors">
                            <i className="fas fa-skull"></i> Iniciar Protocolo
                    </span>
                </div>
            </button>
          </div>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="relative">
             <div className="absolute -inset-2 bg-cyber-danger rounded-2xl opacity-30 blur-2xl animate-pulse"></div>
             
             <div className="bg-cyber-black border-4 border-cyber-danger rounded-2xl max-w-lg w-full p-10 shadow-[0_0_100px_rgba(255,0,60,0.5)] relative overflow-hidden z-10">
                
                {/* Top scanning line */}
                <div className="absolute top-0 left-0 w-full h-2 bg-cyber-danger shadow-neon-red animate-[scan_2s_linear_infinite]"></div>

                <h2 className="text-3xl font-display font-black text-cyber-danger mb-8 flex items-center gap-4 tracking-tighter drop-shadow-lg">
                    <div className="relative w-12 h-12 flex items-center justify-center rounded-full border border-cyber-danger shadow-neon-red">
                        <div className="absolute inset-0 rounded-full bg-cyber-danger opacity-20 blur-md animate-pulse"></div>
                        <i className="fas fa-exclamation-triangle animate-bounce text-cyber-danger relative z-10"></i>
                    </div>
                    ZONA MUERTA
                </h2>
                
                <p className="text-white mb-8 text-sm font-mono leading-relaxed border-l-2 border-cyber-danger pl-4">
                    Estás a punto de eliminar permanentemente los registros transaccionales del núcleo.
                    <br/>
                    <span className="text-cyber-danger font-bold uppercase">Esta acción es irreversible.</span>
                </p>
                
                <div className="bg-red-950/30 border border-red-900 p-6 rounded-lg mb-8 text-center select-all">
                    <span className="font-mono font-bold text-xl text-red-200 tracking-[0.2em]">{PHRASE}</span>
                </div>
                
                {/* INPUT - PLASMA DANGER */}
                <div className="relative group/input mb-8">
                    {/* Backlight */}
                    <div className="absolute -inset-1 bg-cyber-danger rounded-lg blur opacity-0 group-focus-within/input:opacity-70 group-hover/input:opacity-30 transition-opacity duration-500 animate-pulse"></div>
                    
                    <input 
                        value={confirm} 
                        onChange={e => setConfirm(e.target.value)} 
                        className="relative w-full bg-black border-2 border-cyber-danger/50 rounded-lg p-5 text-cyber-danger font-mono text-xl text-center focus:outline-none focus:border-cyber-danger focus:shadow-neon-red placeholder-red-900/50 uppercase tracking-widest z-10"
                        placeholder="ESCRIBE LA CONFIRMACIÓN"
                        autoFocus
                    />
                </div>
                
                <div className="flex gap-6">
                    <button 
                        onClick={() => { setOpen(false); setConfirm(''); }}
                        className="flex-1 py-4 border-2 border-slate-700 text-slate-400 font-display font-bold hover:bg-slate-800 hover:text-white uppercase tracking-wider rounded-lg transition-colors"
                    >
                        Abortar
                    </button>
                    
                    {/* CONFIRM BUTTON - PLASMA DANGER */}
                    <button 
                        disabled={confirm !== PHRASE || loading} 
                        onClick={runPurge}
                        className="flex-1 relative group/btn overflow-visible rounded-lg"
                    >
                        {/* Backlight */}
                        <div className="absolute -inset-1 bg-cyber-danger rounded-lg blur opacity-0 group-hover/btn:opacity-60 transition-opacity duration-300 animate-pulse"></div>
                        
                        <div className={`relative z-10 flex items-center justify-center w-full h-full py-4 border border-cyber-danger bg-cyber-danger text-black font-display font-black uppercase tracking-wider shadow-neon-red transition-all group-hover/btn:bg-white group-hover/btn:text-cyber-danger ${loading || confirm !== PHRASE ? 'opacity-50 cursor-not-allowed' : ''}`}>
                             <span>{loading ? 'EJECUTANDO...' : 'DETONAR'}</span>
                        </div>
                    </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </>
  );
}
