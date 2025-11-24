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
      <div className="relative bg-cyber-black border-2 border-cyber-danger/40 rounded-2xl p-6 shadow-neon-red overflow-hidden group hover:border-cyber-danger hover:shadow-[0_0_50px_rgba(255,0,60,0.5)] transition-all duration-300">
        
        {/* Warning Stripes Background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{backgroundImage: 'repeating-linear-gradient(45deg, #ff003c 0, #ff003c 2px, transparent 0, transparent 20px)'}}></div>
        
        <div className="relative z-10">
            <h3 className="font-display font-bold text-cyber-danger text-lg flex items-center gap-3 mb-2 uppercase tracking-wider text-shadow-red animate-pulse">
                <i className="fas fa-radiation fa-spin-slow"></i> Purga de Sistema
            </h3>
            <p className="text-xs font-mono text-red-300/70 mb-6">
                Acción destructiva de Clase-A. Se requiere autorización Multi-Firma.
            </p>
            <button 
                onClick={() => setOpen(true)} 
                className="w-full py-3 bg-cyber-danger/10 border border-cyber-danger text-cyber-danger font-display font-bold uppercase tracking-[0.2em] hover:bg-cyber-danger hover:text-black hover:shadow-neon-red transition-all flex items-center justify-center gap-2 rounded-lg"
            >
                <i className="fas fa-skull"></i> Iniciar Protocolo
            </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-cyber-black border-4 border-cyber-danger rounded-2xl max-w-lg w-full p-10 shadow-[0_0_100px_rgba(255,0,60,0.5)] relative overflow-hidden">
            
            {/* Top scanning line */}
            <div className="absolute top-0 left-0 w-full h-2 bg-cyber-danger shadow-neon-red animate-[scan_2s_linear_infinite]"></div>

            <h2 className="text-3xl font-display font-black text-cyber-danger mb-8 flex items-center gap-4 tracking-tighter drop-shadow-lg">
                <i className="fas fa-exclamation-triangle animate-bounce"></i> ZONA MUERTA
            </h2>
            
            <p className="text-white mb-8 text-sm font-mono leading-relaxed border-l-2 border-cyber-danger pl-4">
                Estás a punto de eliminar permanentemente los registros transaccionales del núcleo.
                <br/>
                <span className="text-cyber-danger font-bold uppercase">Esta acción es irreversible.</span>
            </p>
            
            <div className="bg-red-950/30 border border-red-900 p-6 rounded-lg mb-8 text-center select-all">
                 <span className="font-mono font-bold text-xl text-red-200 tracking-[0.2em]">{PHRASE}</span>
            </div>
            
            <input 
                value={confirm} 
                onChange={e => setConfirm(e.target.value)} 
                className="w-full bg-black border-2 border-cyber-danger/50 rounded-lg p-5 text-cyber-danger font-mono text-xl text-center focus:outline-none focus:border-cyber-danger focus:shadow-neon-red mb-8 placeholder-red-900/50 uppercase tracking-widest"
                placeholder="ESCRIBE LA CONFIRMACIÓN"
                autoFocus
            />
            
            <div className="flex gap-6">
                <button 
                    onClick={() => { setOpen(false); setConfirm(''); }}
                    className="flex-1 py-4 border-2 border-slate-700 text-slate-400 font-display font-bold hover:bg-slate-800 hover:text-white uppercase tracking-wider rounded-lg transition-colors"
                >
                    Abortar
                </button>
                <button 
                    disabled={confirm !== PHRASE || loading} 
                    onClick={runPurge}
                    className="flex-1 py-4 bg-cyber-danger text-black font-display font-black uppercase tracking-wider rounded-lg shadow-neon-red hover:bg-white hover:text-cyber-danger transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                >
                    {loading ? 'EJECUTANDO...' : 'DETONAR'}
                </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}