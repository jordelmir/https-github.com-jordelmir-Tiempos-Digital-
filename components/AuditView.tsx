
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

  const getIcon = (type: AuditEventType) => {
      switch(type) {
          case AuditEventType.IDENTITY_REGISTER: return 'fa-user-plus';
          case AuditEventType.IDENTITY_COLLISION: return 'fa-users-slash';
          case AuditEventType.SESSION_LOGIN: return 'fa-sign-in-alt';
          case AuditEventType.TX_DEPOSIT: return 'fa-arrow-down';
          case AuditEventType.TX_WITHDRAWAL: return 'fa-arrow-up';
          case AuditEventType.ADMIN_PURGE: return 'fa-radiation';
          case AuditEventType.GAME_BET: return 'fa-ticket-alt';
          case AuditEventType.AI_OPERATION: return 'fa-brain';
          case AuditEventType.SYSTEM_INTEGRITY: return 'fa-shield-alt';
          default: return 'fa-info-circle';
      }
  };

  // --- PHOSPHORESCENT STYLE ENGINE ---
  const getLogCardStyle = (sev: AuditSeverity) => {
      switch(sev) {
          case AuditSeverity.CRITICAL: 
              return 'border-red-500 bg-red-950/10 shadow-[0_0_30px_rgba(255,0,60,0.15)] hover:shadow-[0_0_50px_rgba(255,0,60,0.3)] hover:bg-red-900/20';
          case AuditSeverity.WARNING: 
              return 'border-yellow-500 bg-yellow-950/10 shadow-[0_0_20px_rgba(250,204,21,0.15)] hover:shadow-[0_0_40px_rgba(250,204,21,0.3)] hover:bg-yellow-900/20';
          case AuditSeverity.FORENSIC: 
              return 'border-cyber-purple bg-cyber-purple/5 shadow-[0_0_20px_rgba(188,19,254,0.15)] hover:shadow-neon-purple hover:bg-cyber-purple/10';
          case AuditSeverity.SUCCESS: 
              return 'border-cyber-success/50 bg-cyber-success/5 hover:border-cyber-success shadow-[0_0_10px_rgba(10,255,96,0.05)] hover:shadow-neon-green';
          default: 
              return 'border-cyber-blue/30 bg-cyber-blue/5 hover:border-cyber-blue shadow-[0_0_10px_rgba(36,99,235,0.05)] hover:shadow-neon-blue';
      }
  };

  const getIconBoxStyle = (sev: AuditSeverity) => {
      switch(sev) {
          case AuditSeverity.CRITICAL: return 'border-red-500 text-red-500 shadow-[0_0_15px_red]';
          case AuditSeverity.WARNING: return 'border-yellow-500 text-yellow-500 shadow-[0_0_15px_orange]';
          case AuditSeverity.FORENSIC: return 'border-cyber-purple text-cyber-purple shadow-[0_0_15px_#bc13fe]';
          case AuditSeverity.SUCCESS: return 'border-cyber-success text-cyber-success shadow-[0_0_10px_lime]';
          default: return 'border-cyber-blue text-cyber-blue shadow-[0_0_10px_blue]';
      }
  };

  return (
    <div className="p-4 md:p-8 space-y-12 relative animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b-2 border-cyber-purple/30 pb-6 relative">
        <div className="absolute bottom-0 left-0 w-1/3 h-0.5 bg-cyber-purple shadow-[0_0_15px_#bc13fe]"></div>
        <div>
          <h2 className="text-3xl md:text-4xl font-display font-black text-white uppercase tracking-tighter mb-2 drop-shadow-lg">
            Bitácora de <span className="text-cyber-purple text-glow">Operaciones</span>
          </h2>
          <p className="text-cyber-purple/70 text-xs font-mono uppercase tracking-[0.3em] font-bold flex items-center gap-2">
             <i className="fas fa-fingerprint"></i> Registro Inmutable & Trazabilidad Forense
          </p>
        </div>
        
        <div className="flex gap-3">
            <button 
                onClick={exportLogs}
                className="bg-[#050a14] border-2 border-cyber-purple/50 hover:border-cyber-purple text-cyber-purple hover:text-white px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(188,19,254,0.1)] hover:shadow-neon-purple group"
            >
                <i className="fas fa-download mr-2 group-hover:animate-bounce"></i> Exportar
            </button>
            <button 
                onClick={fetchLogs} 
                className="bg-[#050a14] border-2 border-cyber-neon/50 hover:border-cyber-neon text-cyber-neon hover:text-black hover:bg-cyber-neon px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(0,240,255,0.1)] hover:shadow-neon-cyan"
            >
                <i className="fas fa-sync-alt mr-2"></i> Actualizar
            </button>
        </div>
      </div>

      {/* Controls - SOLID CORE CONTAINER */}
      <div className="bg-[#050a14] border-2 border-cyber-purple/40 p-6 rounded-2xl shadow-[0_0_40px_rgba(188,19,254,0.15)] flex flex-col md:flex-row gap-6 items-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-cyber-purple/30 shadow-neon-purple opacity-50"></div>
          
          <div className="relative flex-1 w-full group/search">
              <label className="text-[9px] font-mono font-bold text-cyber-purple uppercase tracking-widest mb-1 block ml-1">Búsqueda Forense</label>
              <div className="relative">
                  <div className="absolute inset-0 bg-cyber-purple/10 blur-md rounded-xl opacity-0 group-focus-within/search:opacity-100 transition-opacity duration-500"></div>
                  <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-cyber-purple z-20"></i>
                  <input 
                    type="text" 
                    placeholder="Rastrear por ID, Actor, IP o Hash..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="relative w-full bg-black border-2 border-cyber-purple/30 rounded-xl py-3 pl-10 pr-4 text-white font-mono text-sm focus:outline-none focus:border-cyber-purple focus:shadow-neon-purple transition-all z-10 placeholder-slate-700"
                  />
              </div>
          </div>
          
          <div className="flex flex-col w-full md:w-auto">
              <label className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-1 block ml-1">Filtro de Severidad</label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                  {[
                      { id: 'ALL', label: 'Todo', color: 'border-white/30 text-slate-300', active: 'border-white bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.2)]' },
                      { id: AuditSeverity.CRITICAL, label: 'Crítico', color: 'border-red-900 text-red-700', active: 'border-red-500 bg-red-500/10 text-red-500 shadow-neon-red' },
                      { id: AuditSeverity.WARNING, label: 'Alertas', color: 'border-yellow-900 text-yellow-700', active: 'border-yellow-500 bg-yellow-500/10 text-yellow-500 shadow-[0_0_20px_orange]' },
                      { id: AuditSeverity.INFO, label: 'Info', color: 'border-blue-900 text-blue-700', active: 'border-cyber-blue bg-cyber-blue/10 text-cyber-blue shadow-neon-blue' }
                  ].map(filter => (
                      <button 
                        key={filter.id}
                        onClick={() => setFilterSeverity(filter.id as any)}
                        className={`px-5 py-2.5 rounded-lg text-[10px] font-bold uppercase border-2 transition-all whitespace-nowrap ${
                            filterSeverity === filter.id ? filter.active : `${filter.color} hover:border-white/50 hover:text-white bg-black`
                        }`}
                      >
                          {filter.label}
                      </button>
                  ))}
              </div>
          </div>
      </div>

      {/* --- TIMELINE VIEW --- */}
      <div className="relative">
          {/* Vertical Glowing Line */}
          <div className="absolute left-4 md:left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyber-purple via-cyber-blue to-transparent shadow-[0_0_10px_#bc13fe]"></div>

          <div className="space-y-6">
              {loading ? (
                  <div className="p-12 text-center text-cyber-purple animate-pulse font-mono flex flex-col items-center justify-center gap-4 border-2 border-dashed border-cyber-purple/30 rounded-2xl bg-black/40">
                      <i className="fas fa-circle-notch fa-spin text-3xl"></i>
                      <span className="tracking-[0.2em] font-bold">DESCIFRANDO LOGS...</span>
                  </div>
              ) : filteredLogs.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 font-mono border-2 border-white/10 rounded-2xl bg-black/20">
                      SIN REGISTROS COINCIDENTES
                  </div>
              ) : (
                  filteredLogs.map((log) => (
                      <div key={log.id} className="relative pl-12 md:pl-24 group perspective-1000">
                          
                          {/* Timeline Node - Living */}
                          <div className={`absolute left-[10px] md:left-[26px] top-8 w-4 h-4 rounded-full border-2 bg-black z-10 transition-all duration-300 ${
                              log.severity === AuditSeverity.CRITICAL ? 'border-red-500 shadow-[0_0_15px_red] animate-pulse' : 
                              log.severity === AuditSeverity.WARNING ? 'border-yellow-500 shadow-[0_0_10px_orange]' : 
                              log.severity === AuditSeverity.FORENSIC ? 'border-cyber-purple shadow-[0_0_10px_purple]' :
                              'border-cyber-blue shadow-[0_0_10px_cyan]'
                          }`}></div>

                          {/* Card - PHOSPHORESCENT LIFE */}
                          <div 
                            onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                            className={`border-2 rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer transform group-hover:scale-[1.01] group-hover:translate-x-1 ${getLogCardStyle(log.severity)}`}
                          >
                              {/* Summary Row */}
                              <div className="p-5 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                                  
                                  {/* Left: Icon & Action */}
                                  <div className="flex items-center gap-5">
                                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl border-2 ${getIconBoxStyle(log.severity)} bg-black`}>
                                          <i className={`fas ${getIcon(log.type)}`}></i>
                                      </div>
                                      <div>
                                          <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                                              <span className={`w-1.5 h-1.5 rounded-full ${log.severity === AuditSeverity.CRITICAL ? 'bg-red-500 animate-ping' : 'bg-slate-500'}`}></span>
                                              {log.type}
                                          </div>
                                          <div className={`font-bold font-display text-sm md:text-lg text-white group-hover:text-glow transition-all uppercase tracking-wide ${log.severity === AuditSeverity.CRITICAL ? 'text-red-400' : ''}`}>
                                              {log.action.replace(/_/g, ' ')}
                                          </div>
                                      </div>
                                  </div>

                                  {/* Middle: Actor & Target */}
                                  <div className="hidden md:block text-right md:text-left border-l border-white/10 pl-6">
                                      <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Actor</div>
                                      <div className="text-xs font-mono text-cyber-blue font-bold">{log.actor_name}</div> 
                                      <div className="text-[9px] opacity-50">{log.actor_role}</div>
                                  </div>

                                  {/* Right: Time & Meta */}
                                  <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-l border-white/10 pl-6">
                                      <div className="text-right">
                                          <div className="text-xs font-bold text-white font-mono">{formatDate(log.timestamp).split(',')[0]}</div>
                                          <div className="text-[10px] font-mono text-slate-500">{formatDate(log.timestamp).split(',')[1]}</div>
                                      </div>
                                      <div className={`w-8 h-8 rounded-full border border-white/10 flex items-center justify-center transition-all duration-300 ${expandedId === log.id ? 'rotate-180 bg-white/10 text-white' : 'text-slate-500'}`}>
                                          <i className="fas fa-chevron-down text-xs"></i>
                                      </div>
                                  </div>
                              </div>

                              {/* Expanded Details (JSON Inspector) */}
                              {expandedId === log.id && (
                                  <div className="border-t border-white/10 bg-black/60 p-6 animate-in slide-in-from-top-4">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                          <div>
                                              <h4 className="text-[10px] font-bold text-cyber-purple uppercase tracking-widest mb-4 border-b border-cyber-purple/30 pb-2">Huella Digital</h4>
                                              <div className="space-y-3">
                                                  <DetailRow label="Event ID" value={log.event_id} copy icon="fa-fingerprint" />
                                                  <DetailRow label="IP Address" value={log.ip_address} icon="fa-network-wired" />
                                                  <DetailRow label="Device" value={log.device_fingerprint} icon="fa-desktop" />
                                                  <DetailRow label="Target" value={log.target_resource || 'N/A'} icon="fa-crosshairs" />
                                              </div>
                                          </div>
                                          <div>
                                              <h4 className="text-[10px] font-bold text-cyber-success uppercase tracking-widest mb-4 border-b border-cyber-success/30 pb-2">Integridad de Cadena</h4>
                                              <div className="bg-[#050a14] border-2 border-white/10 rounded-xl p-4 font-mono text-[10px] text-slate-400 break-all shadow-inner group-hover:border-cyber-success/30 transition-colors">
                                                  <div className="text-slate-500 mb-2 flex items-center gap-2 uppercase font-bold"><i className="fas fa-lock"></i> HASH (SHA-256)</div>
                                                  <span className="text-cyber-success">{log.hash}</span>
                                              </div>
                                          </div>
                                      </div>

                                      <div>
                                          <h4 className="text-[10px] font-bold text-cyber-neon uppercase tracking-widest mb-4 flex items-center gap-2">
                                              <i className="fas fa-code"></i> Payload Metadata (JSON)
                                          </h4>
                                          <pre className="bg-[#02040a] border-2 border-white/10 rounded-xl p-5 overflow-x-auto text-[10px] font-mono text-green-400 shadow-[inset_0_0_20px_black]">
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

const DetailRow = ({ label, value, copy, icon }: any) => (
    <div className="flex justify-between items-center border-b border-white/5 pb-2 group/row">
        <span className="text-[10px] text-slate-500 uppercase flex items-center gap-2">
            <i className={`fas ${icon} w-4 text-center opacity-50`}></i> {label}
        </span>
        <span className="text-xs font-mono text-white flex items-center gap-3">
            {value}
            {copy && <i className="fas fa-copy text-slate-600 hover:text-cyber-neon cursor-pointer transition-colors opacity-0 group-hover/row:opacity-100" title="Copiar"></i>}
        </span>
    </div>
);
