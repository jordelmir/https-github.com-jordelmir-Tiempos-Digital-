
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useMaintenanceStore } from '../store/useMaintenanceStore';
import { useAuthStore } from '../store/useAuthStore';
import { SystemSetting, MasterCatalogItem, PurgeTarget } from '../types';
import { formatCurrency } from '../constants';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

// --- SUB-COMPONENTS ---

const SettingRow: React.FC<{ setting: SystemSetting; onSave: (val: any) => void }> = ({ setting, onSave }) => {
    const [val, setVal] = useState<string>(String(setting.value));
    const [isDirty, setIsDirty] = useState(false);
    useEffect(() => { setVal(String(setting.value)); }, [setting.value]);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { setVal(e.target.value); setIsDirty(e.target.value !== String(setting.value)); };
    const handleSave = () => { let finalVal: any = val; if (!isNaN(Number(val)) && val.trim() !== '') finalVal = Number(val); if (val === 'true') finalVal = true; if (val === 'false') finalVal = false; onSave(finalVal); setIsDirty(false); };
    return (
        <div className="flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-none border-b-0 last:border-b hover:bg-white/5 transition-all group relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyber-blue opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex-1 relative z-10">
                <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-mono font-bold text-cyber-blue uppercase tracking-widest">{setting.key}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-slate-400 font-mono border border-white/5">{setting.group}</span>
                </div>
                <p className="text-[10px] text-slate-500 font-mono pl-0 opacity-70 group-hover:opacity-100 transition-opacity">{setting.description}</p>
            </div>
            <div className="flex items-center gap-2 relative z-10">
                <input type="text" value={val} onChange={handleChange} className="bg-[#050508] border border-white/10 rounded px-3 py-1.5 text-white font-mono text-xs focus:border-cyber-blue focus:shadow-[0_0_10px_rgba(0,240,255,0.2)] focus:outline-none w-48 text-right transition-all" />
                <button onClick={handleSave} disabled={!isDirty} className={`w-8 h-8 flex items-center justify-center rounded transition-all duration-300 ${isDirty ? 'bg-cyber-blue text-black hover:scale-110 shadow-[0_0_10px_cyan]' : 'bg-transparent text-slate-700 opacity-20 cursor-default'}`}><i className="fas fa-save"></i></button>
            </div>
        </div>
    );
};

const CatalogRow: React.FC<{ item: MasterCatalogItem, onEdit: (item: MasterCatalogItem) => void }> = ({ item, onEdit }) => (
    <div className="grid grid-cols-12 gap-4 p-3 border-b border-white/5 items-center hover:bg-white/5 transition-colors text-xs font-mono group relative">
        <div className="col-span-2 text-slate-500 group-hover:text-cyber-purple transition-colors font-bold">{item.code}</div>
        <div className="col-span-4 text-white font-bold tracking-wide">{item.label}</div>
        <div className="col-span-3"><span className="text-[9px] uppercase tracking-wider text-cyber-purple/80 bg-cyber-purple/10 px-2 py-0.5 rounded border border-cyber-purple/20">{item.category}</span></div>
        <div className="col-span-2 text-center"><span className={`px-2 py-0.5 rounded text-[8px] uppercase font-bold border ${item.status === 'ACTIVE' ? 'border-green-500/30 text-green-400 bg-green-900/10' : 'border-slate-700 text-slate-500 bg-slate-900/50'}`}>{item.status}</span></div>
        <div className="col-span-1 text-right opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => onEdit(item)} className="text-slate-400 hover:text-white transition-colors hover:scale-110 transform"><i className="fas fa-edit"></i></button></div>
    </div>
);

const SectorVisualizer: React.FC<{ isScanning: boolean; hasAnalysis: boolean; riskLevel: 'LOW'|'MEDIUM'|'HIGH'; isPurging: boolean; isClean: boolean; }> = ({ isScanning, hasAnalysis, riskLevel, isPurging, isClean }) => {
    const cells = 64; const gridCells = useMemo(() => Array.from({length: cells}), []);
    return (
        <div className="relative w-full aspect-square max-w-[280px] mx-auto bg-[#050508] border-2 border-white/10 rounded-2xl p-2 grid grid-cols-8 gap-1 shadow-[inset_0_0_30px_rgba(0,0,0,1)] overflow-hidden group">
            {/* Scanner Line */}
            <div className={`absolute top-0 left-0 w-full h-2 bg-cyber-blue shadow-[0_0_20px_#00f0ff] opacity-0 transition-all duration-[1500ms] linear z-20 ${isScanning ? 'opacity-100 top-[120%]' : '-top-2'}`}></div>
            
            {gridCells.map((_, i) => {
                let colorClass = "bg-[#111116] border border-white/5"; 
                let animClass = "";
                
                if (isClean) { 
                    // NEON EMERALD CLEAN STATE
                    colorClass = "bg-emerald-500/30 border-emerald-400 shadow-[0_0_5px_rgba(16,185,129,0.3)]"; 
                    if (Math.random() > 0.8) animClass = "animate-pulse"; 
                }
                else if (isPurging) { 
                    // DESTRUCTIVE RED
                    if (i % 3 === 0) { colorClass = "bg-white border-white shadow-[0_0_15px_white]"; animClass = "animate-ping"; } 
                    else if (i % 2 === 0) { colorClass = "bg-[#ff003c] border-red-500 shadow-[0_0_10px_#ff003c]"; animClass = "animate-pulse"; } 
                    else { colorClass = "bg-black border-red-900"; } 
                }
                else if (hasAnalysis) { 
                    if (riskLevel === 'HIGH' && i % 2 === 0) { 
                        colorClass = "bg-red-600/80 border-red-400 shadow-[inset_0_0_10px_rgba(255,0,0,0.5)]"; 
                    } else if (riskLevel === 'MEDIUM' && i % 3 === 0) { 
                        colorClass = "bg-yellow-500/80 border-yellow-300 shadow-[inset_0_0_10px_rgba(234,179,8,0.5)]"; 
                    } else if (i % 5 === 0) { 
                        colorClass = "bg-slate-700/50 border-slate-600"; 
                    } 
                }
                else if (isScanning) { 
                    // ELECTRIC BLUE SCAN
                    colorClass = "bg-cyber-blue/20 border-cyber-blue/40"; 
                    if (Math.random() > 0.7) animClass = "animate-pulse"; 
                }
                
                return <div key={i} className={`rounded-[2px] transition-all duration-500 ${colorClass} ${animClass}`} style={{ transitionDelay: `${i * 5}ms` }} />
            })}
            
            <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                {isClean && <div className="bg-black/80 backdrop-blur-md p-6 rounded-full border-2 border-emerald-500 shadow-[0_0_50px_#10b981] animate-in zoom-in duration-300"><i className="fas fa-check text-5xl text-emerald-400 drop-shadow-[0_0_10px_#10b981]"></i></div>}
                {isPurging && <i className="fas fa-biohazard text-7xl text-[#ff003c] animate-[spin_2s_linear_infinite] drop-shadow-[0_0_30px_#ff003c]"></i>}
            </div>
        </div>
    );
};

const CatalogEditorModal: React.FC<{ item: Partial<MasterCatalogItem> | null, isOpen: boolean, onClose: () => void, onSave: (item: Partial<MasterCatalogItem>) => void, onDelete: (id: string) => void }> = ({ item, isOpen, onClose, onSave, onDelete }) => {
    useBodyScrollLock(isOpen);
    const [formData, setFormData] = useState<Partial<MasterCatalogItem>>({ code: '', label: '', category: 'GENERAL', status: 'ACTIVE', order_index: 0, metadata: {} });
    useEffect(() => { if (item) setFormData(item); else setFormData({ code: '', label: '', category: 'GENERAL', status: 'ACTIVE', order_index: 0, metadata: {} }); }, [item, isOpen]);
    if (!isOpen) return null;
    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#0a0a0f] border border-cyber-purple/50 w-full max-w-lg rounded-2xl shadow-[0_0_50px_rgba(188,19,254,0.15)] relative overflow-hidden flex flex-col max-h-[90%]">
                <div className="p-6 border-b border-white/10 bg-cyber-purple/5 flex justify-between items-center">
                    <h3 className="text-lg font-display font-bold text-white uppercase tracking-wider flex items-center gap-2"><i className="fas fa-database text-cyber-purple"></i> {item?.id ? 'Editar Registro' : 'Nuevo Registro'}</h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-white"><i className="fas fa-times"></i></button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Código Único</label><input value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} className="w-full bg-black border border-white/10 rounded-lg p-3 text-white font-mono text-xs focus:border-cyber-purple focus:outline-none" placeholder="COD-001" /></div>
                        <div className="space-y-1"><label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Categoría</label><input value={formData.category} onChange={e => setFormData({...formData, category: e.target.value.toUpperCase()})} className="w-full bg-black border border-white/10 rounded-lg p-3 text-white font-mono text-xs focus:border-cyber-purple focus:outline-none" placeholder="GENERAL" /></div>
                    </div>
                    <div className="space-y-1"><label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Etiqueta / Nombre</label><input value={formData.label} onChange={e => setFormData({...formData, label: e.target.value})} className="w-full bg-black border border-white/10 rounded-lg p-3 text-white font-mono text-xs focus:border-cyber-purple focus:outline-none" placeholder="Descripción del item..." /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Estado</label><select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full bg-black border border-white/10 rounded-lg p-3 text-white font-mono text-xs focus:border-cyber-purple focus:outline-none"><option value="ACTIVE">ACTIVO</option><option value="ARCHIVED">ARCHIVADO</option><option value="DELETED">ELIMINADO</option></select></div>
                        <div className="space-y-1"><label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Orden</label><input type="number" value={formData.order_index} onChange={e => setFormData({...formData, order_index: Number(e.target.value)})} className="w-full bg-black border border-white/10 rounded-lg p-3 text-white font-mono text-xs focus:border-cyber-purple focus:outline-none" /></div>
                    </div>
                    <div className="space-y-1"><label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Metadata (JSON)</label><textarea value={JSON.stringify(formData.metadata || {}, null, 2)} onChange={e => { try { const parsed = JSON.parse(e.target.value); setFormData({...formData, metadata: parsed}); } catch(err) {} }} className="w-full bg-black border border-white/10 rounded-lg p-3 text-green-500 font-mono text-[10px] focus:border-cyber-purple focus:outline-none h-24" /></div>
                </div>
                <div className="p-6 border-t border-white/10 bg-black/40 flex justify-between">
                    {item?.id ? <button onClick={() => onDelete(item.id!)} className="text-red-500 hover:text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 border border-red-900/30 rounded hover:bg-red-600 hover:border-red-600 transition-all">Eliminar</button> : <div></div>}
                    <div className="flex gap-3"><button onClick={onClose} className="px-6 py-2 rounded-lg border border-white/10 text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wide transition-all">Cancelar</button><button onClick={() => onSave(formData)} className="px-6 py-2 rounded-lg bg-cyber-purple text-white hover:bg-white hover:text-cyber-purple text-xs font-bold uppercase tracking-wide transition-all shadow-[0_0_15px_rgba(188,19,254,0.3)]">Guardar Cambios</button></div>
                </div>
            </div>
        </div>
    );
};

export default function DataPurgeCard({ theme }: { theme?: any }) {
  const [isOpen, setIsOpen] = useState(false);
  useBodyScrollLock(isOpen); // LOCK BODY SCROLL

  const [activeTab, setActiveTab] = useState<'SETTINGS' | 'CATALOGS' | 'BACKUPS' | 'LIFECYCLE' | 'LOGS'>('SETTINGS');
  const user = useAuthStore(s => s.user);
  
  const { 
      settings, fetchSettings, updateSetting, 
      catalogs, fetchCatalogs, upsertCatalogItem, deleteCatalogItem,
      analysis, isAnalyzing, analyzePurge, executePurge, clearAnalysis
  } = useMaintenanceStore();
  
  const [purgeTarget, setPurgeTarget] = useState<PurgeTarget>('BETS');
  const [purgeRange, setPurgeRange] = useState<number>(30);
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [holding, setHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [purgeSuccess, setPurgeSuccess] = useState(false);
  const holdInterval = useRef<any>(null);

  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState('ALL');
  const [editingCatalogItem, setEditingCatalogItem] = useState<Partial<MasterCatalogItem> | null>(null);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);

  const [backupProgress, setBackupProgress] = useState(0);
  const [backupStatus, setBackupStatus] = useState<'IDLE' | 'RUNNING' | 'COMPLETED'>('IDLE');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      if (isOpen) {
          if (activeTab === 'SETTINGS') fetchSettings();
          if (activeTab === 'CATALOGS') fetchCatalogs();
      }
  }, [isOpen, activeTab]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [terminalLogs]);

  const startHold = () => { if (!analysis || (analysis.riskLevel === 'HIGH' && confirmPhrase !== 'CONFIRM PURGE')) return; setHolding(true); setHoldProgress(0); holdInterval.current = setInterval(() => { setHoldProgress(prev => { if (prev >= 100) { clearInterval(holdInterval.current); handlePurge(); return 100; } return prev + 4; }); }, 30); };
  const endHold = () => { setHolding(false); if (holdProgress < 100) setHoldProgress(0); if (holdInterval.current) clearInterval(holdInterval.current); };
  const addLog = (msg: string) => { const time = new Date().toLocaleTimeString('es-CR', { hour12: false }) + '.' + new Date().getMilliseconds(); setTerminalLogs(prev => [...prev, `[${time}] ${msg}`]); };
  const handleBackup = () => { if(backupStatus === 'RUNNING') return; setBackupStatus('RUNNING'); setBackupProgress(0); setTerminalLogs([]); addLog("INITIATING_SYSTEM_DUMP_PROTOCOL_V4..."); addLog("LOCKING_WRITE_ACCESS..."); let p = 0; const interval = setInterval(() => { p += Math.random() * 8; if (p > 30 && p < 35) addLog("COMPRESSING_TABLE: APP_USERS..."); if (p > 60 && p < 65) addLog("COMPRESSING_TABLE: LEDGER_TRANSACTIONS..."); if (p > 90 && p < 95) addLog("VERIFYING_CHECKSUM_SHA256..."); if (p >= 100) { p = 100; clearInterval(interval); setBackupStatus('COMPLETED'); addLog("BACKUP_SUCCESSFUL: SNAPSHOT_" + Date.now()); addLog("RELEASE_WRITE_LOCK: OK"); } setBackupProgress(p); }, 200); };
  const handleAnalyze = () => { clearAnalysis(); analyzePurge(purgeTarget, purgeRange); };
  const handlePurge = async () => { if (!user) return; await executePurge(purgeTarget, purgeRange, user.id); setPurgeSuccess(true); setTimeout(() => { setPurgeSuccess(false); clearAnalysis(); setConfirmPhrase(''); setHoldProgress(0); }, 4000); };

  const uniqueCategories = useMemo<string[]>(() => ['ALL', ...Array.from(new Set(catalogs.map(c => c.category)))], [catalogs]);
  const filteredCatalogs = useMemo(() => { return catalogs.filter(c => (catalogCategoryFilter === 'ALL' || c.category === catalogCategoryFilter) && (c.label.toLowerCase().includes(catalogSearch.toLowerCase()) || c.code.toLowerCase().includes(catalogSearch.toLowerCase()))); }, [catalogs, catalogSearch, catalogCategoryFilter]);

  if (!isOpen) {
      return (
          <button onClick={() => setIsOpen(true)} className="w-full py-4 bg-[#0a0a0f] border-2 border-white/5 hover:border-cyber-purple/50 rounded-2xl flex items-center justify-center gap-3 group transition-all shadow-lg hover:shadow-[0_0_20px_rgba(188,19,254,0.1)]">
              <div className="w-10 h-10 rounded-full bg-black border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform"><i className="fas fa-cogs text-slate-500 group-hover:text-cyber-purple"></i></div>
              <div className="text-left"><div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-white transition-colors">Sistema</div><div className="text-xs font-mono text-slate-600 group-hover:text-cyber-purple transition-colors">Mantenimiento v4.2</div></div>
          </button>
      );
  }

  // PORTAL IMPLEMENTATION
  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl animate-in fade-in duration-300 flex items-center justify-center p-0 sm:p-4">
        <CatalogEditorModal item={editingCatalogItem} isOpen={isCatalogModalOpen} onClose={() => setIsCatalogModalOpen(false)} onSave={async (item) => { if(user) { await upsertCatalogItem(item, user.id); setIsCatalogModalOpen(false); fetchCatalogs(); } }} onDelete={async (id) => { if(user) { await deleteCatalogItem(id, user.id); setIsCatalogModalOpen(false); } }} />
        <div className="relative w-full max-w-6xl h-full sm:h-[85vh] bg-[#020305] border-0 sm:border-2 border-white/10 sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            
            {/* Header - OPTIMIZED FOR RESPONSIVENESS */}
            <div className="bg-[#0a0a0f] border-b border-white/5 p-3 sm:p-4 md:p-6 flex justify-between items-center relative overflow-hidden shrink-0">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-cyber-purple shadow-[0_0_20px_#bc13fe] animate-pulse"></div>
                <div className="flex items-center gap-2 sm:gap-3 md:gap-4 relative z-10 shrink-0 min-w-0 max-w-[75%]">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg sm:rounded-xl bg-cyber-purple/10 flex items-center justify-center border border-cyber-purple/30 shadow-neon-purple shrink-0 transition-all">
                        <i className="fas fa-server text-sm sm:text-lg md:text-2xl text-cyber-purple"></i>
                    </div>
                    <div className="min-w-0 flex flex-col justify-center">
                        <h2 className="text-base sm:text-lg md:text-2xl font-display font-black text-white uppercase tracking-tighter leading-none truncate">
                            SYSTEM KERNEL
                        </h2>
                        <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1 overflow-hidden">
                            <span className="text-[9px] sm:text-[10px] font-mono text-slate-500 whitespace-nowrap">V4.2.0</span>
                            <span className="px-1.5 py-px sm:py-0.5 rounded bg-red-900/30 border border-red-500/30 text-[7px] sm:text-[8px] text-red-400 font-bold uppercase tracking-wider whitespace-nowrap truncate">
                                Root_Access
                            </span>
                        </div>
                    </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/5 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all z-10 shrink-0 ml-2 group">
                    <i className="fas fa-power-off text-xs sm:text-sm group-hover:scale-110 transition-transform"></i>
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
                {/* Sidebar */}
                <div className="w-full md:w-64 bg-[#050508] border-b md:border-b-0 md:border-r border-white/5 flex flex-row md:flex-col p-2 md:p-4 gap-2 overflow-x-auto md:overflow-y-auto shrink-0 no-scrollbar items-center md:items-stretch">
                    {[ { id: 'SETTINGS', icon: 'fa-sliders-h', label: 'Variables' }, { id: 'CATALOGS', icon: 'fa-database', label: 'Catálogos' }, { id: 'LIFECYCLE', icon: 'fa-recycle', label: 'Ciclo' }, { id: 'BACKUPS', icon: 'fa-hdd', label: 'Backups' }, { id: 'LOGS', icon: 'fa-terminal', label: 'Logs' } ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl transition-all font-mono text-[10px] sm:text-xs uppercase tracking-wide group relative overflow-hidden whitespace-nowrap flex-shrink-0 ${activeTab === tab.id ? 'bg-cyber-purple text-black font-bold shadow-[0_0_20px_rgba(188,19,254,0.4)]' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}>
                            {activeTab === tab.id && <div className="absolute inset-0 bg-white/20 animate-pulse"></div>}
                            <i className={`fas ${tab.icon} w-4 md:w-5 text-center`}></i><span className="relative z-10">{tab.label}</span>
                        </button>
                    ))}
                </div>

                <div className="flex-1 bg-black/20 relative flex flex-col overflow-hidden">
                    {/* SETTINGS TAB */}
                    {activeTab === 'SETTINGS' && (
                        <div className="h-full overflow-y-auto custom-scrollbar divide-y divide-white/5">
                            {settings.map(s => <SettingRow key={s.key} setting={s} onSave={(val) => user && updateSetting(s.key, val, user.id)} />)}
                        </div>
                    )}

                    {/* CATALOGS TAB */}
                    {activeTab === 'CATALOGS' && (
                        <div className="flex flex-col h-full">
                            <div className="p-4 sm:p-6 border-b border-white/10 bg-[#05070a] sticky top-0 z-20">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Maestro de Datos</h3>
                                    <button onClick={() => { setEditingCatalogItem(null); setIsCatalogModalOpen(true); }} className="w-full sm:w-auto px-4 py-2 bg-cyber-purple text-white text-[10px] font-bold uppercase tracking-wider rounded hover:bg-white hover:text-cyber-purple transition-all shadow-[0_0_15px_rgba(188,19,254,0.2)] flex items-center justify-center"><i className="fas fa-plus mr-2"></i> Nuevo Registro</button>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <input value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} className="relative flex-1 bg-black border border-white/10 rounded-lg px-4 py-2 text-white font-mono text-xs focus:border-cyber-purple focus:outline-none" placeholder="Buscar..." />
                                    <select value={catalogCategoryFilter} onChange={e => setCatalogCategoryFilter(e.target.value)} className="bg-black border border-white/10 rounded-lg px-4 py-2 text-white font-mono text-xs focus:border-cyber-purple focus:outline-none">{uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}</select>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {filteredCatalogs.map(item => <CatalogRow key={item.id} item={item} onEdit={(i) => { setEditingCatalogItem(i); setIsCatalogModalOpen(true); }} />)}
                            </div>
                        </div>
                    )}

                    {/* LIFECYCLE (ATOMIC PURGE) TAB */}
                    {activeTab === 'LIFECYCLE' && (
                        <div className="h-full flex flex-col bg-[#05070a] relative overflow-hidden">
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[length:40px_40px] pointer-events-none"></div>
                            
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-8 relative z-10">
                                <div className="flex flex-col lg:flex-row gap-8">
                                    {/* 1. Targets */}
                                    <div className="w-full lg:w-1/3 flex flex-col gap-6 order-2 lg:order-1">
                                        <div className="border-b border-white/10 pb-4">
                                            <h3 className="text-lg font-display font-black text-white uppercase tracking-wide flex items-center gap-2"><i className="fas fa-microchip text-cyber-blue"></i> Objetivos</h3>
                                            <p className="text-[10px] text-slate-500 font-mono mt-1">Seleccione vector de purga</p>
                                        </div>
                                        <div className="space-y-3">
                                            {[ { id: 'BETS', label: 'Historial Apuestas', risk: 'MEDIUM', icon: 'fa-ticket-alt' }, { id: 'LOGS', label: 'Logs Auditoría', risk: 'LOW', icon: 'fa-file-medical-alt' }, { id: 'RESULTS', label: 'Sorteos Vencidos', risk: 'LOW', icon: 'fa-flag-checkered' }, { id: 'LEDGER_HISTORY', label: 'Blockchain Ledger', risk: 'HIGH', icon: 'fa-link' } ].map(opt => (
                                                <button key={opt.id} onClick={() => { setPurgeTarget(opt.id as any); clearAnalysis(); }} className={`w-full relative overflow-hidden rounded-xl border-2 p-4 transition-all duration-300 text-left group ${purgeTarget === opt.id ? 'border-cyber-purple bg-cyber-purple/10 shadow-[0_0_20px_rgba(188,19,254,0.2)]' : 'border-white/5 bg-black/40 hover:border-white/20'}`}>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded bg-black/50 flex items-center justify-center border border-white/10 ${purgeTarget === opt.id ? 'text-cyber-purple' : 'text-slate-500'}`}><i className={`fas ${opt.icon}`}></i></div>
                                                            <span className={`text-xs font-bold uppercase tracking-wider ${purgeTarget === opt.id ? 'text-white' : 'text-slate-400'}`}>{opt.label}</span>
                                                        </div>
                                                        <span className={`text-[8px] px-2 py-0.5 rounded font-black uppercase border ${opt.risk === 'HIGH' ? 'border-red-900 text-red-500 bg-red-900/20' : opt.risk === 'MEDIUM' ? 'border-yellow-900 text-yellow-500 bg-yellow-900/20' : 'border-blue-900 text-blue-500 bg-blue-900/20'}`}>{opt.risk} RISK</span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                        <div className="bg-black/40 rounded-xl p-4 border border-white/5 mt-4">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-4 block">Horizonte Temporal</label>
                                            <input type="range" min="7" max="365" step="1" value={purgeRange} onChange={(e) => { setPurgeRange(Number(e.target.value)); clearAnalysis(); }} className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyber-purple" />
                                            <div className="flex justify-between mt-3 font-mono text-[10px]"><span className="text-slate-600">7 Días</span><span className="text-cyber-purple font-bold border border-cyber-purple/30 px-2 py-0.5 rounded bg-cyber-purple/10">{purgeRange > 30 ? `${Math.floor(purgeRange/30)} Meses` : `${purgeRange} Días`}</span><span className="text-slate-600">1 Año</span></div>
                                        </div>
                                    </div>

                                    {/* 2. Monitor */}
                                    <div className="flex-1 flex flex-col bg-black/60 rounded-2xl border border-white/10 relative overflow-hidden shadow-inner order-1 lg:order-2 min-h-[450px]">
                                        <div className="p-6 border-b border-white/10 flex justify-between items-center relative z-10 bg-black/20">
                                            <div>
                                                <h4 className="text-sm font-bold text-white uppercase tracking-widest">Monitor de Integridad</h4>
                                                <div className="flex items-center gap-2 mt-1"><div className={`w-1.5 h-1.5 rounded-full ${analysis ? 'bg-cyber-blue animate-pulse' : 'bg-slate-600'}`}></div><span className="text-[9px] font-mono text-slate-500 uppercase">{analysis ? 'ANÁLISIS COMPLETADO' : 'ESPERANDO COMANDO...'}</span></div>
                                            </div>
                                        </div>
                                        <div className="flex-1 p-8 flex flex-col items-center justify-center relative z-10 gap-8">
                                            <SectorVisualizer isScanning={isAnalyzing} hasAnalysis={!!analysis} riskLevel={analysis?.riskLevel || 'LOW'} isPurging={holdProgress > 0 && holdProgress < 100} isClean={purgeSuccess} />
                                            {!analysis ? (
                                                <button onClick={handleAnalyze} disabled={isAnalyzing} className="px-8 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-cyber-blue/10 hover:border-cyber-blue hover:text-white transition-all text-xs font-bold uppercase tracking-widest flex items-center gap-2 mx-auto">{isAnalyzing ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-search"></i>}{isAnalyzing ? 'ESCANEANDO...' : 'INICIAR ESCANEO'}</button>
                                            ) : (
                                                <div className="w-full max-w-md animate-in zoom-in duration-300">
                                                    <div className="grid grid-cols-2 gap-4 mb-8">
                                                        <div className="bg-[#0a0a0f] border border-white/10 p-4 rounded-xl text-center"><div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-2">Registros</div><div className="text-3xl font-mono font-black text-white">{analysis.recordCount}</div></div>
                                                        <div className="bg-[#0a0a0f] border border-white/10 p-4 rounded-xl text-center"><div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-2">Recuperable</div><div className="text-3xl font-mono font-black text-cyber-blue">~{analysis.estimatedSizeKB} <span className="text-xs text-slate-500">KB</span></div></div>
                                                    </div>
                                                    <div className="border-t border-white/10 pt-6">
                                                        {analysis.riskLevel === 'HIGH' && (
                                                            <div className="mb-6 relative group/input"><label className="text-[8px] font-bold text-red-500 uppercase tracking-widest mb-2 block text-center">Protocolo de Seguridad</label><input type="text" placeholder='ESCRIBA "CONFIRM PURGE"' value={confirmPhrase} onChange={e => setConfirmPhrase(e.target.value.toUpperCase())} className="w-full bg-black border border-red-900 text-red-500 placeholder-red-900/50 text-center font-mono py-3 rounded-lg focus:outline-none focus:border-red-500 transition-all" /></div>
                                                        )}
                                                        <button onMouseDown={startHold} onMouseUp={endHold} onMouseLeave={endHold} onTouchStart={startHold} onTouchEnd={endHold} disabled={analysis.recordCount === 0 || (analysis.riskLevel === 'HIGH' && confirmPhrase !== 'CONFIRM PURGE')} className={`w-full h-16 rounded-xl relative overflow-hidden group select-none transition-all disabled:opacity-50 disabled:cursor-not-allowed ${analysis.riskLevel === 'HIGH' ? 'bg-red-950 border border-red-800' : 'bg-blue-950 border border-blue-800'}`}>
                                                            <div className={`absolute top-0 left-0 h-full transition-all ease-linear ${analysis.riskLevel === 'HIGH' ? 'bg-red-600' : 'bg-cyber-blue'}`} style={{ width: `${holdProgress}%` }}></div>
                                                            <div className="relative z-10 flex items-center justify-center gap-3 h-full">{holdProgress > 0 ? <span className="text-white font-black uppercase tracking-[0.2em] animate-pulse">{holdProgress < 100 ? 'MANTENGA PARA CONFIRMAR...' : 'INCINERANDO DATOS...'}</span> : <><i className={`fas fa-trash-alt ${analysis.riskLevel === 'HIGH' ? 'text-red-500' : 'text-blue-400'}`}></i><span className={`font-bold uppercase text-xs tracking-widest ${analysis.riskLevel === 'HIGH' ? 'text-red-500' : 'text-blue-400'}`}>{analysis.riskLevel === 'HIGH' ? 'MANTENER PARA PURGAR' : 'MANTENER PARA LIMPIAR'}</span></>}</div>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* BACKUPS & LOGS TABS */}
                    {activeTab === 'BACKUPS' && (
                        <div className="p-8 h-full flex flex-col justify-center items-center overflow-y-auto custom-scrollbar">
                            <div className="relative w-48 h-48 sm:w-64 sm:h-64 mb-8 shrink-0">
                                <div className={`absolute inset-0 rounded-full border-4 border-dashed border-white/10 ${backupStatus === 'RUNNING' ? 'animate-[spin_4s_linear_infinite]' : ''}`}></div>
                                <div className={`absolute inset-4 rounded-full border-2 border-cyber-purple/30 ${backupStatus === 'RUNNING' ? 'animate-[spin_3s_linear_infinite_reverse]' : ''}`}></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    {backupStatus === 'RUNNING' ? <div className="text-center"><div className="text-4xl font-mono font-black text-white">{Math.round(backupProgress)}%</div><div className="text-[9px] text-cyber-purple uppercase tracking-widest mt-1 animate-pulse">Procesando...</div></div> : backupStatus === 'COMPLETED' ? <i className="fas fa-check text-6xl text-green-500 drop-shadow-[0_0_20px_lime]"></i> : <button onClick={handleBackup} className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-cyber-purple/10 border-2 border-cyber-purple text-cyber-purple hover:bg-cyber-purple hover:text-black hover:shadow-[0_0_50px_rgba(188,19,254,0.6)] transition-all flex flex-col items-center justify-center gap-2 group"><i className="fas fa-save text-2xl sm:text-3xl group-hover:scale-110 transition-transform"></i><span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest">Iniciar</span></button>}
                                </div>
                            </div>
                            <div className="w-full max-w-2xl bg-black border border-white/10 rounded-xl p-4 font-mono text-[10px] h-48 overflow-y-auto custom-scrollbar shadow-inner text-green-500">
                                {terminalLogs.length === 0 && <span className="text-slate-600">Waiting for command...</span>}
                                {terminalLogs.map((log, i) => <div key={i}>{log}</div>)}
                                <div ref={scrollRef}></div>
                            </div>
                        </div>
                    )}

                    {/* LOGS TAB */}
                    {activeTab === 'LOGS' && (
                        <div className="h-full bg-[#050508] p-4 flex flex-col">
                            <div className="flex-1 border border-white/10 rounded-xl bg-black font-mono text-[10px] p-4 text-slate-300 overflow-y-auto custom-scrollbar">
                                <div className="text-green-500 mb-2">root@phront-core:~$ tail -f /var/log/audit.log</div>
                                {terminalLogs.length > 0 ? terminalLogs.map((l,i) => <div key={i}>{l}</div>) : <div className="opacity-50"><div>[SYSTEM] Audit daemon started. Listening for events...</div><div>[SYSTEM] Connected to Ledger Node [OK]</div><div>[SYSTEM] Syncing with Edge Network...</div></div>}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>,
    document.body
  );
}
