
import React, { useState, useMemo, useEffect } from 'react';
import { AppUser, UserRole } from '../types';
import { formatCurrency } from '../constants';
import UserControlModal from './UserControlModal';
import VendorPaymentModal from './VendorPaymentModal';
import { useAuthStore } from '../store/useAuthStore';
import AnimatedIconUltra from './ui/AnimatedIconUltra';

interface UserManagementPanelProps {
  players: AppUser[];
  vendors: AppUser[];
  onRecharge: (user: AppUser) => void;
  onWithdraw: (user: AppUser) => void;
  onRefresh: () => void;
}

export default function UserManagementPanel({ players, vendors, onRecharge, onWithdraw, onRefresh }: UserManagementPanelProps) {
  const currentUser = useAuthStore(s => s.user);
  
  // LOGIC: If Vendor, force tab to CLIENTES and lock it.
  const isVendor = currentUser?.role === UserRole.Vendedor;
  const isAdmin = currentUser?.role === UserRole.SuperAdmin;

  const [activeTab, setActiveTab] = useState<'CLIENTES' | 'VENDEDORES'>('CLIENTES');
  
  useEffect(() => {
      if (isVendor) setActiveTab('CLIENTES');
  }, [isVendor]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  
  const [controlUser, setControlUser] = useState<AppUser | null>(null);
  const [payUser, setPayUser] = useState<AppUser | null>(null);

  // THEME ENGINE
  const theme = activeTab === 'CLIENTES' 
    ? { 
        name: 'blue', 
        hex: '#00f0ff', 
        bg: 'bg-cyber-neon', 
        text: 'text-cyber-neon', 
        border: 'border-cyber-neon', 
        shadow: 'shadow-neon-cyan', 
        icon: 'fa-users',
        gradient: 'from-cyan-600 via-blue-600 to-indigo-900',
        glow: 'rgba(0, 240, 255, 0.4)'
      }
    : { 
        name: 'purple', 
        hex: '#bc13fe', 
        bg: 'bg-cyber-purple', 
        text: 'text-cyber-purple', 
        border: 'border-cyber-purple', 
        shadow: 'shadow-neon-purple', 
        icon: 'fa-user-tie',
        gradient: 'from-purple-600 via-fuchsia-600 to-pink-900',
        glow: 'rgba(188, 19, 254, 0.4)'
      };

  // SEGREGATION LOGIC
  let sourceList: AppUser[] = [];

  if (activeTab === 'CLIENTES') {
      if (isAdmin) {
          sourceList = players;
      } else if (isVendor) {
          sourceList = players.filter(p => p.issuer_id === currentUser?.id);
      }
  } else if (activeTab === 'VENDEDORES') {
      if (isAdmin) {
          sourceList = vendors;
      } else {
          sourceList = [];
      }
  }
  
  // --- ADVANCED SEARCH ENGINE ---
  const filteredUsers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return sourceList.filter(u => {
      if (u.status === 'Deleted') return false;

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
    <div className="relative group animate-in fade-in duration-700 perspective-1000 mt-12 mb-24">
      <UserControlModal isOpen={!!controlUser} targetUser={controlUser} onClose={() => setControlUser(null)} onSuccess={onRefresh} />
      <VendorPaymentModal isOpen={!!payUser} targetUser={payUser} onClose={() => setPayUser(null)} onSuccess={onRefresh} />
      
      {/* === 1. VOLUMETRIC BACKLIGHT (The Glow Behind) === */}
      <div className={`absolute -inset-4 bg-gradient-to-r ${theme.gradient} rounded-[3rem] opacity-20 blur-3xl animate-[pulse_6s_ease-in-out_infinite] transition-all duration-1000 group-hover:opacity-30 group-hover:blur-[60px]`}></div>
      <div className={`absolute -inset-[2px] ${theme.bg} rounded-[2.5rem] opacity-10 blur-md transition-all duration-700`}></div>
      
      {/* === 2. MAIN CHASSIS (Solid Core) === */}
      <div className={`relative bg-[#05070a] border-2 ${theme.border} rounded-[2.5rem] overflow-hidden transition-all duration-500 z-10 shadow-2xl backdrop-blur-xl`}>
        
        {/* Internal Grid Texture */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[length:30px_30px] opacity-20 pointer-events-none"></div>

        {/* HEADER AREA */}
        <div className="relative border-b border-white/5 bg-[#020305]/90 backdrop-blur-xl overflow-hidden p-6 md:p-8">
            
            {/* Top Scanning Line */}
            <div className={`absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-${theme.name === 'blue' ? 'cyan' : 'purple'}-500 to-transparent opacity-70 shadow-[0_0_20px_currentColor] animate-[scanline_8s_linear_infinite]`}></div>

            <div className="flex flex-col xl:flex-row items-center justify-between gap-8 relative z-10">
                
                {/* TITLE & ICON */}
                <div className="flex items-center gap-6 w-full xl:w-auto">
                    <div className={`relative w-16 h-16 rounded-2xl bg-black border border-white/10 flex items-center justify-center ${theme.shadow} overflow-hidden group/icon shrink-0`}>
                        <div className={`absolute inset-0 ${theme.bg} opacity-10 group-hover/icon:opacity-30 transition-opacity duration-500`}></div>
                        <AnimatedIconUltra profile={{ animation: 'spin3d', theme: theme.name === 'blue' ? 'neon' : 'cyber', speed: 3 }}>
                            <i className={`fas ${theme.icon} ${theme.text} text-3xl drop-shadow-[0_0_10px_currentColor]`}></i>
                        </AnimatedIconUltra>
                    </div>
                    <div>
                        <h3 className="text-2xl md:text-3xl font-display font-black text-white uppercase tracking-widest leading-none drop-shadow-md">
                            Directorio <span className={`text-transparent bg-clip-text bg-gradient-to-r ${theme.gradient} text-glow-sm block md:inline`}>
                                {isVendor ? 'Personal' : 'Global'}
                            </span>
                        </h3>
                        <div className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${theme.bg} animate-pulse`}></span>
                            Base de Datos Activa
                        </div>
                    </div>
                </div>

                {/* TAB CONTROLS (Floating Island) */}
                {isAdmin && (
                    <div className="flex bg-black/80 p-1.5 rounded-2xl border border-white/10 shadow-lg relative overflow-hidden backdrop-blur-md w-full xl:w-auto">
                        <button 
                            onClick={() => setActiveTab('CLIENTES')} 
                            className={`flex-1 relative px-4 md:px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 overflow-hidden group/tab ${
                                activeTab === 'CLIENTES' ? 'text-black' : 'text-slate-500 hover:text-white'
                            }`}
                        >
                            {activeTab === 'CLIENTES' && <div className="absolute inset-0 bg-cyber-neon shadow-[0_0_20px_#00f0ff]"></div>}
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                <i className="fas fa-users"></i> <span className="hidden md:inline">Jugadores</span>
                            </span>
                        </button>
                        <button 
                            onClick={() => setActiveTab('VENDEDORES')} 
                            className={`flex-1 relative px-4 md:px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 overflow-hidden group/tab ${
                                activeTab === 'VENDEDORES' ? 'text-white' : 'text-slate-500 hover:text-white'
                            }`}
                        >
                            {activeTab === 'VENDEDORES' && <div className="absolute inset-0 bg-cyber-purple shadow-[0_0_20px_#bc13fe]"></div>}
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                <i className="fas fa-user-tie"></i> <span className="hidden md:inline">Vendedores</span>
                            </span>
                        </button>
                    </div>
                )}
            </div>

            {/* CONTROLS DECK */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end mt-8 relative z-10">
                
                {/* HOLOGRAPHIC SEARCH */}
                <div className="lg:col-span-5 relative group/search">
                    <label className={`text-[9px] font-mono font-bold ${theme.text} uppercase tracking-widest ml-1 mb-2 block transition-colors duration-500`}>
                        <i className="fas fa-search mr-1"></i> Filtrar Nodos
                    </label>
                    <div className={`relative h-14 flex items-center bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden transition-all duration-500 group-focus-within/search:${theme.border} group-focus-within/search:shadow-[0_0_30px_${theme.glow}]`}>
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${theme.bg} opacity-0 group-focus-within/search:opacity-100 transition-opacity`}></div>
                        <i className={`fas fa-search ml-5 text-slate-600 group-focus-within/search:${theme.text} transition-colors text-lg`}></i>
                        <input 
                            type="text" 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Buscar..."
                            className="w-full bg-transparent border-none text-white font-mono text-sm px-4 h-full focus:outline-none placeholder-slate-700 tracking-wide uppercase"
                        />
                    </div>
                </div>

                {/* TACTICAL FILTERS */}
                <div className="lg:col-span-4 flex items-end gap-3">
                    {['ALL', 'ACTIVE', 'SUSPENDED'].map(status => (
                        <button 
                            key={status} 
                            onClick={() => setFilterStatus(status as any)} 
                            className={`flex-1 h-14 rounded-xl text-[10px] font-bold uppercase border transition-all duration-300 relative overflow-hidden group/filter ${
                                filterStatus === status 
                                ? `${theme.border} bg-white/5 text-white shadow-inner` 
                                : `border-white/10 bg-black text-slate-500 hover:border-white/30 hover:text-white`
                            }`}
                        >
                            <span className="relative z-10 flex flex-col items-center gap-1">
                                <i className={`fas ${status === 'ALL' ? 'fa-list' : status === 'ACTIVE' ? 'fa-check' : 'fa-ban'} text-lg mb-0.5`}></i>
                                {status === 'ALL' ? 'Todos' : status === 'ACTIVE' ? 'Activos' : 'Bloq'}
                            </span>
                            {filterStatus === status && <div className={`absolute bottom-0 left-0 w-full h-1 ${theme.bg} shadow-[0_0_10px_currentColor]`}></div>}
                        </button>
                    ))}
                </div>

                {/* METRICS HUD */}
                <div className="lg:col-span-3 flex items-center justify-end">
                    <div className="bg-black/40 border border-white/10 rounded-2xl p-4 w-full flex justify-between items-center relative overflow-hidden">
                        <div className={`absolute right-0 top-0 bottom-0 w-1 ${theme.bg} opacity-50`}></div>
                        <div>
                            <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Capital Activo</div>
                            <div className={`text-xl font-mono font-black ${theme.text} text-glow-sm`}>{formatCurrency(totalBalance)}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Usuarios</div>
                            <div className="text-sm font-mono font-bold text-white">
                                <span className="text-green-500">{activeCount}</span> / <span className="text-red-500">{suspendedCount}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* === DATA DISPLAY === */}
        <div className="relative bg-[#020305] min-h-[400px] max-h-[700px] overflow-y-auto custom-scrollbar">
            
            {/* 1. DESKTOP TABLE (Hidden on Mobile) */}
            <div className="hidden lg:block relative">
                <table className="w-full text-left border-collapse relative z-10">
                    <thead className="sticky top-0 bg-[#05070a] z-20 shadow-2xl border-b border-white/10">
                        <tr className={`text-[9px] font-mono text-slate-400 uppercase tracking-[0.2em]`}>
                            <th className="p-6 pl-8">Identidad</th>
                            <th className="p-6">Credenciales</th>
                            <th className="p-6 text-right">Balance</th>
                            <th className="p-6 text-center">Estado</th>
                            <th className="p-6 text-right pr-8">Operaciones</th>
                        </tr>
                    </thead>
                    <tbody className="font-mono text-xs">
                        {filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-32 text-center">
                                    <div className="flex flex-col items-center justify-center gap-6 text-slate-700 opacity-50">
                                        <div className="w-24 h-24 rounded-full border-4 border-dashed border-slate-800 flex items-center justify-center animate-[spin_10s_linear_infinite]">
                                            <i className="fas fa-search text-4xl"></i>
                                        </div>
                                        <span className="uppercase tracking-[0.3em] text-sm font-bold">No se encontraron nodos</span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredUsers.map(u => (
                                <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-all duration-300 group/row relative overflow-hidden">
                                    
                                    {/* Active Laser Indicator (Left) */}
                                    <td className="absolute left-0 top-0 bottom-0 w-1 bg-current opacity-0 group-hover/row:opacity-100 transition-opacity duration-300" style={{ color: theme.hex }}></td>

                                    <td className="p-6 pl-8 min-w-[300px]">
                                        <div className="flex items-center gap-5">
                                            {/* Avatar Ring */}
                                            <div className={`relative w-12 h-12 rounded-full bg-black flex items-center justify-center border-2 border-white/10 group-hover/row:${theme.border} transition-all duration-500 group-hover/row:shadow-[0_0_20px_${theme.glow}] shrink-0`}>
                                                <div className={`absolute inset-0 rounded-full border-t-2 border-transparent group-hover/row:border-${theme.name === 'blue' ? 'cyan' : 'purple'}-400 animate-[spin_3s_linear_infinite] opacity-0 group-hover/row:opacity-100`}></div>
                                                <span className="font-display font-bold text-white text-lg">{u.name ? u.name.substring(0,2).toUpperCase() : '??'}</span>
                                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-black rounded-full flex items-center justify-center border border-white/10">
                                                    <div className={`w-2 h-2 rounded-full ${u.status === 'Active' ? 'bg-green-500 shadow-[0_0_5px_lime]' : 'bg-red-500 shadow-[0_0_5px_red]'}`}></div>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="font-bold text-white text-sm group-hover/row:text-glow-sm transition-all">{u.name || 'Sin Nombre'}</div>
                                                <div className="text-[9px] text-slate-500 mt-1 uppercase tracking-wider">Registrado: {new Date(u.created_at).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex flex-col gap-1">
                                            <span className={`text-[10px] font-bold ${theme.text} tracking-wider opacity-80 group-hover/row:opacity-100 transition-opacity`}>ID: {u.cedula || 'N/A'}</span>
                                            <div className="flex items-center gap-2 text-[9px] text-slate-500">
                                                <i className="fas fa-phone opacity-50"></i> {u.phone}
                                            </div>
                                            {u.email && <span className="text-[8px] text-slate-600 opacity-50">{u.email}</span>}
                                        </div>
                                    </td>
                                    <td className="p-6 text-right">
                                        <div className={`font-mono font-bold text-base ${u.balance_bigint > 0 ? theme.text : 'text-slate-500'} group-hover/row:scale-105 transition-transform origin-right`}>
                                            {formatCurrency(u.balance_bigint)}
                                        </div>
                                        {activeTab === 'VENDEDORES' && (
                                            <button onClick={() => setPayUser(u)} className="mt-2 px-3 py-1 bg-cyber-purple/10 border border-cyber-purple/30 rounded text-[8px] font-bold text-cyber-purple hover:bg-cyber-purple hover:text-black transition-all ml-auto shadow-[0_0_10px_rgba(188,19,254,0.1)] uppercase tracking-wider flex items-center justify-end gap-1">
                                                <i className="fas fa-hand-holding-usd"></i> Liquidar
                                            </button>
                                        )}
                                    </td>
                                    <td className="p-6 text-center">
                                        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-bold uppercase border transition-all duration-300 ${
                                            u.status === 'Active' 
                                            ? 'border-green-500/30 bg-green-500/10 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.1)] group-hover/row:border-green-500 group-hover/row:shadow-[0_0_20px_rgba(34,197,94,0.3)]' 
                                            : 'border-red-500/30 bg-red-500/10 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.1)] group-hover/row:border-red-500 group-hover/row:shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'Active' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                                            {u.status === 'Active' ? 'OPERATIVO' : 'BLOQUEADO'}
                                        </div>
                                    </td>
                                    <td className="p-6 text-right pr-8">
                                        <div className="flex items-center justify-end gap-3 opacity-0 group-hover/row:opacity-100 transition-all duration-300 translate-x-4 group-hover/row:translate-x-0">
                                            
                                            {/* RECHARGE ICON - GREEN NEON */}
                                            <button 
                                                onClick={() => onRecharge(u)} 
                                                className="relative w-10 h-10 rounded-xl bg-[#0a0a0a] border border-white/10 flex items-center justify-center text-slate-500 transition-all duration-300 group/btn overflow-hidden hover:border-emerald-500 hover:text-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]" 
                                                title="Inyectar Saldo"
                                            >
                                                <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                                                <i className="fas fa-bolt text-lg group-hover/btn:scale-110 group-hover/btn:drop-shadow-[0_0_5px_currentColor] transition-transform"></i>
                                            </button>
                                            
                                            {/* WITHDRAW ICON - ORANGE NEON */}
                                            <button 
                                                onClick={() => onWithdraw(u)} 
                                                className="relative w-10 h-10 rounded-xl bg-[#0a0a0a] border border-white/10 flex items-center justify-center text-slate-500 transition-all duration-300 group/btn overflow-hidden hover:border-orange-500 hover:text-orange-400 hover:shadow-[0_0_20px_rgba(249,115,22,0.4)]" 
                                                title="Retirar Fondos"
                                            >
                                                <div className="absolute inset-0 bg-orange-500/10 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                                                <i className="fas fa-hand-holding-usd text-lg group-hover/btn:scale-110 group-hover/btn:drop-shadow-[0_0_5px_currentColor] transition-transform"></i>
                                            </button>
                                            
                                            {/* SETTINGS ICON - WHITE NEON */}
                                            <button 
                                                onClick={() => setControlUser(u)} 
                                                className="relative w-10 h-10 rounded-xl bg-[#0a0a0a] border border-white/10 flex items-center justify-center text-slate-500 transition-all duration-300 group/btn overflow-hidden hover:border-white hover:text-white hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]" 
                                                title="Configuración de Nodo"
                                            >
                                                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                                                <i className={`fas ${u.status === 'Active' ? 'fa-cog' : 'fa-lock'} text-lg group-hover/btn:rotate-90 transition-transform duration-500`}></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* 2. MOBILE HOLOGRAPHIC CARDS (Visible on Mobile) */}
            <div className="lg:hidden p-4 space-y-4">
                {filteredUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-4 py-20 text-slate-700 opacity-50">
                        <i className="fas fa-search text-4xl animate-pulse"></i>
                        <span className="uppercase tracking-widest text-xs font-bold">Sin Datos</span>
                    </div>
                ) : (
                    filteredUsers.map(u => (
                        <div key={u.id} className="relative bg-[#080c14] border border-white/10 rounded-2xl p-5 overflow-hidden group shadow-lg animate-in slide-in-from-bottom-2 duration-500">
                            {/* Card Active Indicator */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${theme.bg}`}></div>
                            
                            <div className="flex justify-between items-start mb-4 pl-3">
                                <div className="flex items-center gap-3">
                                     {/* Avatar */}
                                     <div className={`relative w-12 h-12 rounded-xl bg-black flex items-center justify-center border border-white/10 ${theme.shadow} shrink-0`}>
                                        <span className="font-display font-bold text-white text-lg">{u.name ? u.name.substring(0,2).toUpperCase() : '??'}</span>
                                     </div>
                                     <div className="min-w-0">
                                        <div className="font-bold text-white text-base leading-tight truncate">{u.name || 'SIN NOMBRE'}</div>
                                        <div className="text-[10px] text-slate-500 font-mono mt-1 flex items-center gap-2">
                                            <i className="fas fa-id-badge"></i> {u.cedula || '---'}
                                        </div>
                                     </div>
                                </div>
                                {/* Status */}
                                <div className={`shrink-0 px-2 py-1 rounded text-[8px] font-bold uppercase border ${u.status === 'Active' ? 'border-green-500/30 text-green-400 bg-green-900/20' : 'border-red-500/30 text-red-400 bg-red-900/20'}`}>
                                    {u.status === 'Active' ? 'ON' : 'OFF'}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4 border-y border-white/5 py-4 pl-3">
                                <div>
                                    <div className="text-[9px] text-slate-600 uppercase tracking-wider font-bold mb-1">Contacto</div>
                                    <div className="text-xs text-slate-300 font-mono flex flex-col gap-1">
                                        <span className="flex items-center gap-2"><i className="fas fa-phone opacity-50 text-[10px]"></i>{u.phone}</span>
                                        {u.email && <span className="flex items-center gap-2 truncate"><i className="fas fa-envelope opacity-50 text-[10px]"></i>{u.email}</span>}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[9px] text-slate-600 uppercase tracking-wider font-bold mb-1">Balance</div>
                                    <div className={`text-xl font-mono font-black ${u.balance_bigint > 0 ? theme.text : 'text-slate-500'}`}>
                                        {formatCurrency(u.balance_bigint)}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pl-2 mt-2">
                                {/* RECHARGE */}
                                <button 
                                    onClick={() => onRecharge(u)} 
                                    className="flex-1 relative overflow-hidden py-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-emerald-400 font-bold uppercase text-[10px] tracking-wider transition-all duration-300 hover:border-emerald-400 hover:bg-emerald-900/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] active:scale-95 group/btn"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover/btn:animate-[shine_0.5s_ease-in-out]"></div>
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        <i className="fas fa-bolt text-lg group-hover/btn:animate-pulse"></i> 
                                        <span className="">Cargar</span>
                                    </span>
                                </button>

                                {/* WITHDRAW */}
                                <button 
                                    onClick={() => onWithdraw(u)} 
                                    className="flex-1 relative overflow-hidden py-3 rounded-xl border border-orange-500/30 bg-orange-950/20 text-orange-400 font-bold uppercase text-[10px] tracking-wider transition-all duration-300 hover:border-orange-400 hover:bg-orange-900/40 hover:shadow-[0_0_20px_rgba(249,115,22,0.2)] active:scale-95 group/btn"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover/btn:animate-[shine_0.5s_ease-in-out]"></div>
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        <i className="fas fa-hand-holding-usd text-lg group-hover/btn:animate-bounce"></i> 
                                        <span className="">Retirar</span>
                                    </span>
                                </button>

                                {/* SETTINGS */}
                                <button 
                                    onClick={() => setControlUser(u)} 
                                    className="w-12 relative overflow-hidden py-3 rounded-xl border border-white/10 bg-white/5 text-slate-400 font-bold transition-all duration-300 hover:border-white/30 hover:bg-white/10 hover:text-white hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-95 group/btn flex items-center justify-center"
                                >
                                    <i className="fas fa-cog text-lg group-hover/btn:rotate-90 transition-transform duration-500"></i>
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

        </div>
        
        {/* Footer Status */}
        <div className="bg-[#05070a] p-4 border-t border-white/5 flex justify-between items-center text-[9px] font-mono text-slate-600 uppercase tracking-widest relative z-20 rounded-b-[2.5rem]">
            <div>VISUALIZANDO {filteredUsers.length} REGISTROS</div>
            <div className="flex gap-4 items-center">
                <span className="flex items-center gap-1"><i className="fas fa-circle text-[5px] text-green-500 animate-pulse"></i> SYSTEM_READY</span>
                <div className="h-3 w-px bg-white/10 hidden sm:block"></div>
                <span className="hidden sm:block">LATENCY: 12ms</span>
            </div>
        </div>
      </div>
    </div>
  );
}
