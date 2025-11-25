
import React, { useState, useMemo } from 'react';
import { AppUser, UserRole } from '../types';
import { formatCurrency } from '../constants';
import UserControlModal from './UserControlModal';
import VendorPaymentModal from './VendorPaymentModal';

interface UserManagementPanelProps {
  players: AppUser[];
  vendors: AppUser[];
  onRecharge: (user: AppUser) => void;
  onWithdraw: (user: AppUser) => void;
  onRefresh: () => void;
}

export default function UserManagementPanel({ players, vendors, onRecharge, onWithdraw, onRefresh }: UserManagementPanelProps) {
  const [activeTab, setActiveTab] = useState<'CLIENTES' | 'VENDEDORES'>('CLIENTES');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  
  const [controlUser, setControlUser] = useState<AppUser | null>(null);
  const [payUser, setPayUser] = useState<AppUser | null>(null);

  const theme = activeTab === 'CLIENTES' 
    ? { name: 'neon', hex: '#00f0ff', bg: 'bg-cyber-neon', text: 'text-cyber-neon', border: 'border-cyber-neon', shadow: 'shadow-neon-cyan', icon: 'fa-users' }
    : { name: 'purple', hex: '#bc13fe', bg: 'bg-cyber-purple', text: 'text-cyber-purple', border: 'border-cyber-purple', shadow: 'shadow-neon-purple', icon: 'fa-user-tie' };

  const sourceList = activeTab === 'CLIENTES' ? players : vendors;
  
  // --- ADVANCED SEARCH ENGINE ---
  const filteredUsers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return sourceList.filter(u => {
      // Search Priority: 1. Cedula, 2. Phone, 3. Name, 4. Email
      const matchesSearch = 
        (u.cedula && u.cedula.toLowerCase().includes(query)) ||
        (u.phone && u.phone.toLowerCase().includes(query)) ||
        u.name.toLowerCase().includes(query) || 
        (u.email && u.email.toLowerCase().includes(query));
        
      const matchesStatus = filterStatus === 'ALL' ? true : 
                            filterStatus === 'ACTIVE' ? u.status === 'Active' : 
                            u.status === 'Suspended';
      return matchesSearch && matchesStatus;
    });
  }, [sourceList, searchQuery, filterStatus]);

  const totalBalance = useMemo(() => filteredUsers.reduce((acc, curr) => acc + curr.balance_bigint, 0), [filteredUsers]);
  const activeCount = useMemo(() => filteredUsers.filter(u => u.status === 'Active').length, [filteredUsers]);
  const suspendedCount = filteredUsers.length - activeCount;

  return (
    <div className="relative group animate-in fade-in duration-500">
      <UserControlModal isOpen={!!controlUser} targetUser={controlUser} onClose={() => setControlUser(null)} onSuccess={onRefresh} />
      <VendorPaymentModal isOpen={!!payUser} targetUser={payUser} onClose={() => setPayUser(null)} onSuccess={onRefresh} />
      
      {/* --- DOUBLE PLASMA LAYER --- */}
      {/* 1. Deep Ambient Layer */}
      <div className={`absolute -inset-2 ${theme.bg} rounded-[2.5rem] opacity-20 blur-3xl animate-[pulse_5s_infinite] transition-colors duration-700`}></div>
      {/* 2. Active Surface Layer */}
      <div className={`absolute -inset-1 ${theme.bg} rounded-3xl opacity-40 blur-xl animate-[pulse_3s_infinite] transition-colors duration-500`}></div>

      <div className={`relative bg-cyber-panel/40 border border-white/10 rounded-3xl backdrop-blur-xl overflow-hidden transition-all duration-500 hover:border-white/20 z-10`}>
        
        <div className="border-b border-white/5 bg-black/20">
            <div className="flex flex-col md:flex-row items-center justify-between p-6 pb-0 md:pb-0">
                <h3 className="text-xl font-display font-black text-white uppercase tracking-widest flex items-center gap-3 mb-6 md:mb-0">
                    <div className={`w-10 h-10 rounded-lg ${theme.bg}/10 border ${theme.border}/30 flex items-center justify-center ${theme.shadow}`}>
                        <i className={`fas ${theme.icon} ${theme.text}`}></i>
                    </div>
                    <span>Directorio <span className={theme.text}>Global</span></span>
                </h3>

                <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
                    <button onClick={() => setActiveTab('CLIENTES')} className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all duration-300 ${activeTab === 'CLIENTES' ? 'bg-cyber-neon/20 text-cyber-neon border border-cyber-neon/50 shadow-[0_0_15px_rgba(0,240,255,0.2)]' : 'text-slate-500 hover:text-white'}`}>Jugadores</button>
                    <button onClick={() => setActiveTab('VENDEDORES')} className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all duration-300 ${activeTab === 'VENDEDORES' ? 'bg-cyber-purple/20 text-cyber-purple border border-cyber-purple/50 shadow-[0_0_15px_rgba(188,19,254,0.2)]' : 'text-slate-500 hover:text-white'}`}>Vendedores</button>
                </div>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
                <div className="lg:col-span-5 relative group/input">
                    <label className={`text-[10px] font-mono font-bold ${theme.text} uppercase tracking-widest ml-1 mb-1 block`}>Búsqueda: ID, Teléfono, Nombre</label>
                    <div className={`absolute -inset-0.5 ${theme.bg} rounded-lg blur opacity-0 group-hover/input:opacity-20 group-focus-within/input:opacity-50 transition-opacity duration-500`}></div>
                    <div className="relative flex items-center bg-black/60 border border-white/10 rounded-lg overflow-hidden">
                        <div className="pl-4 text-slate-500"><i className="fas fa-search"></i></div>
                        <input 
                            type="text" 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Ej: 102340567 o +506..."
                            className={`w-full bg-transparent border-none text-white font-mono text-sm px-4 py-3 focus:outline-none placeholder-slate-600 focus:text-${theme.name}-400`}
                        />
                    </div>
                </div>

                <div className="lg:col-span-3 flex items-end gap-2">
                    {['ALL', 'ACTIVE', 'SUSPENDED'].map(status => (
                        <button key={status} onClick={() => setFilterStatus(status as any)} className={`flex-1 py-3 rounded-lg text-[10px] font-bold uppercase border transition-all ${filterStatus === status ? `${theme.bg}/20 ${theme.border} ${theme.text}` : 'border-white/5 text-slate-500 hover:bg-white/5'}`}>
                            {status === 'ALL' ? 'Todos' : status === 'ACTIVE' ? 'Activos' : 'Bloq.'}
                        </button>
                    ))}
                </div>

                <div className="lg:col-span-4 flex items-center justify-end gap-4">
                    <div className="text-right">
                        <div className="text-[9px] text-slate-500 uppercase tracking-widest">Capital Total</div>
                        <div className={`text-xl font-mono font-bold ${theme.text} text-glow-sm`}>{formatCurrency(totalBalance)}</div>
                    </div>
                    <div className="h-8 w-px bg-white/10"></div>
                    <div className="text-right">
                        <div className="text-[9px] text-slate-500 uppercase tracking-widest">Usuarios</div>
                        <div className="text-lg font-mono font-bold text-white"><span className="text-green-500">{activeCount}</span> / <span className="text-red-500">{suspendedCount}</span></div>
                    </div>
                </div>
            </div>
        </div>

        <div className="relative overflow-x-auto min-h-[400px] max-h-[600px] custom-scrollbar bg-black/20">
             <div className={`fixed inset-0 pointer-events-none opacity-[0.02] bg-[linear-gradient(transparent_50%,${theme.hex}_50%)] bg-[length:100%_4px]`}></div>

             <table className="w-full text-left border-collapse relative z-10">
                <thead className="sticky top-0 bg-[#02040a] z-20 shadow-xl">
                    <tr className={`text-[9px] font-mono ${theme.text} uppercase border-b border-white/10 tracking-widest`}>
                        <th className="p-4 pl-6">Identidad / Nombre</th>
                        <th className="p-4">Cédula & Contacto</th>
                        <th className="p-4 text-right">Balance</th>
                        <th className="p-4 text-center">Estado</th>
                        <th className="p-4 text-right pr-6">Control</th>
                    </tr>
                </thead>
                <tbody className="font-mono text-xs">
                    {filteredUsers.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="p-20 text-center">
                                <div className="flex flex-col items-center justify-center gap-4 text-slate-600 opacity-50">
                                    <i className="fas fa-search text-4xl"></i>
                                    <span className="uppercase tracking-widest text-sm">No se encontraron registros</span>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        filteredUsers.map(u => (
                            <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group/row">
                                <td className="p-4 pl-6">
                                    <div className="flex items-center gap-4">
                                        <div className={`relative w-10 h-10 rounded-full bg-black flex items-center justify-center border border-white/10 group-hover/row:border-${theme.name}-500/50 transition-colors`}>
                                            <span className="font-display font-bold text-white">{u.name.substring(0,2).toUpperCase()}</span>
                                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-black rounded-full flex items-center justify-center">
                                                <div className={`w-1.5 h-1.5 rounded-full ${u.status === 'Active' ? 'bg-green-500 shadow-[0_0_5px_lime]' : 'bg-red-500 shadow-[0_0_5px_red]'}`}></div>
                                            </div>
                                        </div>
                                        <div className="font-bold text-white">{u.name}</div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-col">
                                        <span className={`text-[10px] font-bold ${theme.text} tracking-wider`}>ID: {u.cedula || 'N/A'}</span>
                                        <span className="text-[9px] text-slate-500">{u.phone}</span>
                                        {u.email && <span className="text-[8px] text-slate-600 opacity-70">{u.email}</span>}
                                    </div>
                                </td>
                                <td className="p-4 text-right">
                                    <div className={`font-bold text-sm ${u.balance_bigint > 0 ? theme.text : 'text-slate-500'} text-glow-sm`}>{formatCurrency(u.balance_bigint)}</div>
                                    {activeTab === 'VENDEDORES' && (
                                        <button onClick={() => setPayUser(u)} className="mt-1 px-2 py-0.5 bg-cyber-purple/10 border border-cyber-purple/30 rounded text-[8px] font-bold text-cyber-purple hover:bg-cyber-purple hover:text-black transition-all ml-auto">LIQUIDAR</button>
                                    )}
                                </td>
                                <td className="p-4 text-center">
                                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-bold uppercase border ${u.status === 'Active' ? 'border-green-500/30 text-green-400 bg-green-900/10' : 'border-red-500/30 text-red-400 bg-red-900/10'}`}>
                                        {u.status === 'Active' ? 'OPERATIVO' : 'BLOQUEADO'}
                                    </div>
                                </td>
                                <td className="p-4 pr-6 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-90">
                                        <button onClick={() => onRecharge(u)} className="w-8 h-8 rounded bg-black/40 border border-cyber-success/30 flex items-center justify-center text-cyber-success hover:bg-cyber-success hover:text-black transition-all" title="Recargar"><i className="fas fa-bolt"></i></button>
                                        <button onClick={() => onWithdraw(u)} className="w-8 h-8 rounded bg-black/40 border border-cyber-orange/30 flex items-center justify-center text-cyber-orange hover:bg-cyber-orange hover:text-black transition-all" title="Retirar"><i className="fas fa-hand-holding-usd"></i></button>
                                        <button onClick={() => setControlUser(u)} className="w-8 h-8 rounded bg-black/40 border border-cyber-danger/30 flex items-center justify-center text-cyber-danger hover:bg-cyber-danger hover:text-black transition-all" title="Bloquear/Eliminar"><i className={`fas ${u.status === 'Active' ? 'fa-lock' : 'fa-unlock'}`}></i></button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
             </table>
        </div>
        <div className="bg-[#02040a] p-3 border-t border-white/5 flex justify-between items-center text-[10px] font-mono text-slate-500">
            <div>MOSTRANDO {filteredUsers.length} DE {sourceList.length} REGISTROS</div>
            <div className="flex gap-4"><span className="flex items-center gap-1"><i className="fas fa-circle text-[6px] text-green-500"></i> SYSTEM_READY</span></div>
        </div>
      </div>
    </div>
  );
}
