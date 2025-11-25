
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { formatDate } from '../constants';
import { AuditLog, AuditSeverity, AuditEventType } from '../types';

export default function AuditView() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<AuditSeverity | 'ALL'>('ALL');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    setLoading(true);
    const { data, error } = await supabase
        .from('audit_trail')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
    
    if (data) {
        setLogs(data as unknown as AuditLog[]);
    }
    setLoading(false);
  }

  const filteredLogs = useMemo(() => {
      return logs.filter(log => {
          const matchesSearch = 
            log.actor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.event_id?.toLowerCase().includes(searchTerm.toLowerCase());
          
          const matchesFilter = filterSeverity === 'ALL' || log.severity === filterSeverity;
          
          return matchesSearch && matchesFilter;
      });
  }, [logs, searchTerm, filterSeverity]);

  const exportLogs = () => {
      if (filteredLogs.length === 0) {
          alert("No hay registros para exportar.");
          return;
      }
      const dataStr = JSON.stringify(filteredLogs, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `PHRONT_AUDIT_LOG_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  };

  const getSeverityColor = (sev: AuditSeverity) => {
      switch(sev) {
          case AuditSeverity.INFO: return 'text-cyber-blue border-cyber-blue bg-cyber-blue/10';
          case AuditSeverity.SUCCESS: return 'text-cyber-success border-cyber-success bg-cyber-success/10';
          case AuditSeverity.WARNING: return 'text-cyber-orange border-cyber-orange bg-cyber-orange/10';
          case AuditSeverity.CRITICAL: return 'text-cyber-danger border-cyber-danger bg-cyber-danger/10 shadow-neon-red';
          case AuditSeverity.FORENSIC: return 'text-cyber-purple border-cyber-purple bg-cyber-purple/10 shadow-neon-purple';
          default: return 'text-slate-400 border-slate-400';
      }
  };

  const getIcon = (type: AuditEventType) => {
      switch(type) {
          case AuditEventType.IDENTITY_REGISTER: return 'fa-user-plus';
          case AuditEventType.IDENTITY_COLLISION: return 'fa-users-slash';
          case AuditEventType.SESSION_LOGIN: return 'fa-sign-in-alt';
          case AuditEventType.TX_DEPOSIT: return 'fa-arrow-down';
          case AuditEventType.TX_WITHDRAWAL: return 'fa-arrow-up';
          case AuditEventType.ADMIN_PURGE: return 'fa-radiation';
          case AuditEventType.GAME_BET: return 'fa-ticket-alt';
          default: return 'fa-info-circle';
      }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 relative animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-white/10 pb-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-display font-black text-white uppercase tracking-tighter mb-2">
            Bitácora de <span className="text-cyber-purple text-glow">Operaciones</span>
          </h2>
          <p className="text-slate-400 text-xs font-mono uppercase tracking-widest flex items-center gap-2">
             <i className="fas fa-shield-alt text-cyber-success"></i> Registro Inmutable & Trazabilidad Forense
          </p>
        </div>
        
        <div className="flex gap-3">
            <button 
                onClick={exportLogs}
                className="bg-black/40 hover:bg-cyber-purple hover:text-black border border-cyber-purple/30 text-cyber-purple px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all"
            >
                <i className="fas fa-download mr-2"></i> Exportar
            </button>
            <button onClick={fetchLogs} className="bg-cyber-neon/10 hover:bg-cyber-neon hover:text-black border border-cyber-neon/30 text-cyber-neon px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all">
                <i className="fas fa-sync-alt mr-2"></i> Actualizar
            </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-cyber-panel/40 border border-white/10 p-4 rounded-xl backdrop-blur-md flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
              <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
              <input 
                type="text" 
                placeholder="Buscar por ID de Evento, Actor o Acción..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white font-mono text-sm focus:outline-none focus:border-cyber-purple transition-colors"
              />
          </div>
          
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
              {[
                  { id: 'ALL', label: 'Todo' },
                  { id: AuditSeverity.CRITICAL, label: 'Crítico' },
                  { id: AuditSeverity.WARNING, label: 'Alertas' },
                  { id: AuditSeverity.INFO, label: 'Info' }
              ].map(filter => (
                  <button 
                    key={filter.id}
                    onClick={() => setFilterSeverity(filter.id as any)}
                    className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase border transition-all whitespace-nowrap ${
                        filterSeverity === filter.id 
                        ? 'bg-white/10 border-white text-white' 
                        : 'border-white/5 text-slate-500 hover:border-white/20'
                    }`}
                  >
                      {filter.label}
                  </button>
              ))}
          </div>
      </div>

      {/* --- TIMELINE VIEW --- */}
      <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-4 md:left-8 top-0 bottom-0 w-px bg-white/10"></div>

          <div className="space-y-6">
              {loading ? (
                  <div className="p-12 text-center text-cyber-purple animate-pulse font-mono">
                      <i className="fas fa-circle-notch fa-spin text-3xl mb-4"></i><br/>
                      DESCIFRANDO LOGS...
                  </div>
              ) : filteredLogs.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 font-mono border border-white/10 rounded-xl bg-black/20">
                      SIN REGISTROS COINCIDENTES
                  </div>
              ) : (
                  filteredLogs.map((log) => (
                      <div key={log.id} className="relative pl-12 md:pl-20 group">
                          
                          {/* Timeline Node */}
                          <div className={`absolute left-[11px] md:left-[27px] top-6 w-3 h-3 rounded-full border-2 bg-black z-10 transition-all duration-300 ${
                              log.severity === AuditSeverity.CRITICAL ? 'border-red-500 shadow-[0_0_10px_red]' : 
                              log.severity === AuditSeverity.WARNING ? 'border-orange-500' : 
                              'border-slate-600 group-hover:border-cyber-neon'
                          }`}></div>

                          {/* Card */}
                          <div 
                            onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                            className={`bg-cyber-panel/60 border rounded-xl overflow-hidden transition-all duration-300 cursor-pointer hover:bg-white/5 ${
                                log.severity === AuditSeverity.CRITICAL ? 'border-red-900/50 hover:border-red-500 shadow-[0_0_20px_rgba(255,0,0,0.1)]' : 'border-white/5 hover:border-white/20'
                            }`}
                          >
                              {/* Summary Row */}
                              <div className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                                  
                                  {/* Left: Icon & Action */}
                                  <div className="flex items-center gap-4">
                                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center border text-lg ${getSeverityColor(log.severity)}`}>
                                          <i className={`fas ${getIcon(log.type)}`}></i>
                                      </div>
                                      <div>
                                          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-0.5">
                                              {log.type}
                                          </div>
                                          <div className={`font-bold text-sm md:text-base text-white group-hover:text-glow transition-all ${log.severity === AuditSeverity.CRITICAL ? 'text-red-400' : ''}`}>
                                              {log.action.replace(/_/g, ' ')}
                                          </div>
                                      </div>
                                  </div>

                                  {/* Middle: Actor & Target */}
                                  <div className="hidden md:block text-right md:text-left">
                                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">Actor</div>
                                      <div className="text-xs font-mono text-cyber-blue">{log.actor_name} <span className="opacity-50">({log.actor_role})</span></div>
                                  </div>

                                  {/* Right: Time & Meta */}
                                  <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                                      <div className="text-right">
                                          <div className="text-xs font-bold text-white">{formatDate(log.timestamp).split(',')[0]}</div>
                                          <div className="text-[10px] font-mono text-slate-500">{formatDate(log.timestamp).split(',')[1]}</div>
                                      </div>
                                      <div className={`text-xs transition-transform duration-300 ${expandedId === log.id ? 'rotate-180' : ''}`}>
                                          <i className="fas fa-chevron-down text-slate-600"></i>
                                      </div>
                                  </div>
                              </div>

                              {/* Expanded Details (JSON Inspector) */}
                              {expandedId === log.id && (
                                  <div className="border-t border-white/5 bg-black/40 p-4 md:p-6 animate-in slide-in-from-top-2">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                          <div>
                                              <h4 className="text-[10px] font-bold text-cyber-purple uppercase tracking-widest mb-3">Huella Digital</h4>
                                              <div className="space-y-2">
                                                  <DetailRow label="Event ID" value={log.event_id} copy />
                                                  <DetailRow label="IP Address" value={log.ip_address} />
                                                  <DetailRow label="Device" value={log.device_fingerprint} />
                                                  <DetailRow label="Target" value={log.target_resource || 'N/A'} />
                                              </div>
                                          </div>
                                          <div>
                                              <h4 className="text-[10px] font-bold text-cyber-success uppercase tracking-widest mb-3">Integridad de Cadena</h4>
                                              <div className="bg-black border border-white/10 rounded p-3 font-mono text-[10px] text-slate-400 break-all">
                                                  <div className="text-slate-600 mb-1">HASH (SHA-256)</div>
                                                  {log.hash}
                                              </div>
                                          </div>
                                      </div>

                                      <div>
                                          <h4 className="text-[10px] font-bold text-cyber-neon uppercase tracking-widest mb-3">Metadata Payload (JSON)</h4>
                                          <pre className="bg-[#0a0a0a] border border-white/10 rounded-lg p-4 overflow-x-auto text-[10px] font-mono text-green-400">
                                              {JSON.stringify(log.metadata, null, 2)}
                                          </pre>
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>
                  ))
              )}
          </div>
      </div>
    </div>
  );
}

const DetailRow = ({ label, value, copy }: any) => (
    <div className="flex justify-between items-center border-b border-white/5 pb-1">
        <span className="text-[10px] text-slate-500 uppercase">{label}</span>
        <span className="text-xs font-mono text-white flex items-center gap-2">
            {value}
            {copy && <i className="fas fa-copy text-slate-600 hover:text-white cursor-pointer" title="Copiar"></i>}
        </span>
    </div>
);
