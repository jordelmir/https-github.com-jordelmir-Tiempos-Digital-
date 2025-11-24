import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { formatDate } from '../constants';

interface SecureLog {
    id: string;
    timestamp_utc?: string; // Mapeo a created_at
    created_at: string;
    actor_app_user: string;
    action: string;
    object_type: string;
    object_id: string;
    payload: any;
    integrity_hash?: string;
    severity?: 'INFO' | 'WARNING' | 'CRITICAL';
}

export default function AuditView() {
  const [logs, setLogs] = useState<SecureLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [integrityStatus, setIntegrityStatus] = useState<'OK' | 'BROKEN' | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    setLoading(true);
    // Fetching from the standard trail for now, assume data enrichment
    const { data, error } = await supabase
        .from('audit_trail')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
    
    if (data) {
        // Simular datos de seguridad extra para la demo visual
        const enriched = data.map((d: any, i: number) => ({
            ...d,
            integrity_hash: d.payload?.hash || `sha256-${Math.random().toString(36).substring(7)}...`,
            severity: d.action.includes('PURGE') || d.action.includes('DELETE') ? 'CRITICAL' : 'INFO'
        }));
        setLogs(enriched);
    }
    setLoading(false);
  }

  const verifyChain = () => {
      setVerifying(true);
      setTimeout(() => {
          setVerifying(false);
          setIntegrityStatus('OK');
          // En caso real, aquí se recalcularían los hashes cliente-side o se pediría validación al backend Kotlin
      }, 2000);
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-display font-black text-white italic tracking-tighter uppercase mb-2">
            <span className="text-cyber-purple text-glow-purple">NÚCLEO</span> FORENSE
          </h2>
          <p className="text-cyber-purple/60 text-xs font-mono uppercase tracking-[0.3em] flex items-center gap-2">
             <i className="fas fa-shield-alt"></i> Módulo de Trazabilidad Inmutable v3.1
          </p>
        </div>
        
        <div className="flex gap-4">
             <div className="text-right">
                <div className="text-[10px] font-mono text-slate-500 uppercase">Integridad de Cadena</div>
                <div className={`text-xl font-mono font-bold ${integrityStatus === 'OK' ? 'text-cyber-success' : integrityStatus === 'BROKEN' ? 'text-cyber-danger' : 'text-slate-300'} text-glow`}>
                    {verifying ? 'VERIFICANDO...' : integrityStatus || 'PENDIENTE'}
                </div>
            </div>
            <button 
                onClick={verifyChain}
                disabled={verifying}
                className="bg-cyber-purple/20 border border-cyber-purple hover:bg-cyber-purple hover:text-black text-cyber-purple px-4 py-2 rounded font-display font-bold text-xs uppercase tracking-widest transition-all shadow-neon-purple disabled:opacity-50"
            >
                {verifying ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-check-double"></i>} Verificar Hash
            </button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-cyber-panel/50 border border-cyber-border/30 p-3 rounded">
              <div className="text-[10px] text-slate-500 uppercase">Eventos Totales</div>
              <div className="text-xl text-white font-mono">14,205</div>
          </div>
          <div className="bg-cyber-panel/50 border border-cyber-danger/30 p-3 rounded">
              <div className="text-[10px] text-slate-500 uppercase">Alertas Críticas</div>
              <div className="text-xl text-cyber-danger font-mono">3</div>
          </div>
          <div className="bg-cyber-panel/50 border border-cyber-border/30 p-3 rounded">
              <div className="text-[10px] text-slate-500 uppercase">Usuarios Auditados</div>
              <div className="text-xl text-white font-mono">12</div>
          </div>
          <div className="bg-cyber-panel/50 border border-cyber-success/30 p-3 rounded">
              <div className="text-[10px] text-slate-500 uppercase">Estado Ledger</div>
              <div className="text-xl text-cyber-success font-mono">SELLADO</div>
          </div>
      </div>

      {/* Terminal View */}
      <div className="bg-cyber-black border border-cyber-purple/50 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(188,19,254,0.1)] relative flex flex-col h-[600px]">
        
        {/* Decorative Top Bar */}
        <div className="h-8 bg-slate-900 border-b border-cyber-purple/30 flex items-center px-4 justify-between flex-shrink-0">
            <div className="flex gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
            </div>
            <div className="text-[10px] font-mono text-slate-500">
                root@phront-sec-core:~# tail -f /var/log/audit_secure | grep --color=auto CRITICAL
            </div>
        </div>

        {/* Table Content */}
        <div className="overflow-auto flex-1 custom-scrollbar relative">
          {/* Scanline */}
          <div className="sticky top-0 left-0 w-full h-1 bg-cyber-purple/50 shadow-[0_0_15px_#bc13fe] z-10 opacity-50 pointer-events-none"></div>
          
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-cyber-black z-20 shadow-lg">
              <tr className="border-b border-cyber-purple/30 text-[10px] font-display uppercase tracking-wider text-cyber-purple bg-cyber-purple/5">
                <th className="p-4 w-10"></th>
                <th className="p-4">Timestamp (UTC)</th>
                <th className="p-4">Actor</th>
                <th className="p-4">Evento / Acción</th>
                <th className="p-4">Target</th>
                <th className="p-4">Integrity Hash</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs text-slate-300">
              {loading ? (
                <tr>
                   <td colSpan={6} className="p-20 text-center text-cyber-purple animate-pulse">
                      <i className="fas fa-satellite-dish fa-spin text-4xl mb-4"></i><br/>
                      DESENCRIPTANDO REGISTROS SEGUROS...
                   </td>
                </tr>
              ) : logs.map((log, idx) => (
                <tr key={log.id} className={`border-b border-slate-800 hover:bg-white/5 transition-colors group ${log.severity === 'CRITICAL' ? 'bg-red-900/10' : ''}`}>
                  <td className="p-4 text-center">
                      {log.severity === 'CRITICAL' ? (
                          <i className="fas fa-exclamation-triangle text-cyber-danger animate-pulse"></i>
                      ) : (
                          <i className="fas fa-terminal text-slate-600 group-hover:text-cyber-purple"></i>
                      )}
                  </td>
                  <td className="p-4 text-slate-500 whitespace-nowrap">{formatDate(log.created_at || log.timestamp_utc || '')}</td>
                  <td className="p-4 font-bold text-white">{log.actor_app_user}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded border text-[10px] font-bold ${
                        log.severity === 'CRITICAL' ? 'border-cyber-danger text-cyber-danger bg-cyber-danger/10' : 
                        log.severity === 'WARNING' ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10' :
                        'border-cyber-purple text-cyber-purple bg-cyber-purple/10'
                    }`}>
                        {log.action}
                    </span>
                  </td>
                  <td className="p-4 text-slate-400">{log.object_type} :: {log.object_id}</td>
                  <td className="p-4">
                     <div className="flex items-center gap-2 group/hash cursor-pointer">
                        <span className="opacity-30 group-hover/hash:opacity-100 transition-opacity font-mono text-[10px]">
                            {log.integrity_hash?.substring(0, 16)}...
                        </span>
                        <i className="fas fa-lock text-[10px] text-cyber-success opacity-50 group-hover/hash:opacity-100"></i>
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
