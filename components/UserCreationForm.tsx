import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../services/edgeApi';
import { UserRole } from '../types';

interface UserCreationFormProps {
  onCreated?: () => void;
  theme?: { name: string, shadow: string }; // Optional theme prop
}

export default function UserCreationForm({ onCreated, theme }: UserCreationFormProps) {
  const current = useAuthStore(s => s.user);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.Cliente);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // Fallback if theme not provided
  const activeColor = theme ? theme.name : 'neon';
  const activeShadow = theme ? theme.shadow : 'shadow-neon-cyan';

  const isVendedor = current?.role === UserRole.Vendedor;
  
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      name,
      email,
      role,
      balance_bigint: Math.round(balance * 100), 
      issuer_id: current?.id
    };

    try {
      const res = await api.createUser(payload);

      if (res.error) {
        alert(res.error);
      } else {
        alert('Usuario provisionado correctamente en la red.');
        setName('');
        setEmail('');
        setBalance(0);
        onCreated?.();
      }
    } catch (err) {
      alert('Error de conexión a la red neuronal.');
    } finally {
      setLoading(false);
    }
  }

  if (!current || (current.role === UserRole.Cliente)) return null;

  return (
    <div className={`relative group bg-cyber-panel/60 border border-cyber-${activeColor}/40 rounded-2xl p-6 shadow-xl overflow-hidden backdrop-blur-md transition-colors duration-500`}>
      {/* Animated glow border effect */}
      <div className={`absolute -inset-1 bg-gradient-to-br from-cyber-${activeColor}/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}></div>

      <h3 className="text-lg font-display font-bold text-white mb-6 flex items-center gap-2 relative z-10 border-b border-white/10 pb-2">
        <i className={`fas fa-user-plus text-cyber-${activeColor} ${activeShadow} p-1 rounded-full`}></i> 
        <span className="tracking-widest uppercase">Provisionar Usuario</span>
      </h3>
      
      <form onSubmit={submit} className="space-y-5 relative z-10">
        
        <div className="group/field">
          <label className={`block text-[10px] font-mono font-bold text-slate-500 mb-1 uppercase tracking-wider group-focus-within/field:text-cyber-${activeColor} transition-colors`}>Nombre Operativo</label>
          <div className="relative">
             <input 
                type="text" 
                required 
                value={name} 
                onChange={e => setName(e.target.value)}
                className={`w-full bg-black/60 border border-slate-700 rounded-lg px-4 py-3 text-white font-mono focus:border-cyber-${activeColor} focus:${activeShadow} focus:outline-none transition-all placeholder-slate-700`}
                placeholder="Identificador Humano"
             />
          </div>
        </div>

        <div className="group/field">
          <label className={`block text-[10px] font-mono font-bold text-slate-500 mb-1 uppercase tracking-wider group-focus-within/field:text-cyber-${activeColor} transition-colors`}>Email Link</label>
          <div className="relative">
            <input 
                type="email" 
                required 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                className={`w-full bg-black/60 border border-slate-700 rounded-lg px-4 py-3 text-white font-mono focus:border-cyber-${activeColor} focus:${activeShadow} focus:outline-none transition-all placeholder-slate-700`}
                placeholder="usuario@red.pro"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="group/field">
            <label className="block text-[10px] font-mono font-bold text-slate-500 mb-1 uppercase tracking-wider">Rol</label>
            <div className="relative">
                <select 
                value={role} 
                onChange={e => setRole(e.target.value as UserRole)}
                className={`w-full bg-black/60 border border-slate-700 rounded-lg px-3 py-3 text-white font-mono focus:border-cyber-${activeColor} focus:outline-none appearance-none`}
                disabled={isVendedor}
                >
                <option value={UserRole.Cliente}>CLIENTE</option>
                {!isVendedor && <option value={UserRole.Vendedor}>VENDEDOR</option>}
                </select>
                <div className="absolute right-3 top-3 pointer-events-none text-slate-500"><i className="fas fa-chevron-down"></i></div>
            </div>
          </div>
          <div className="group/field">
            <label className="block text-[10px] font-mono font-bold text-slate-500 mb-1 uppercase tracking-wider group-focus-within/field:text-cyber-success">Crédito Inicial</label>
            <input 
              type="number" 
              min="0"
              step="100"
              value={balance} 
              onChange={e => setBalance(parseFloat(e.target.value))}
              className="w-full bg-black/60 border border-slate-700 rounded-lg px-3 py-3 text-white font-mono focus:border-cyber-success focus:shadow-neon-green focus:outline-none transition-all"
            />
          </div>
        </div>

        <div className="pt-4">
          <button 
            type="submit" 
            disabled={loading}
            className={`w-full relative overflow-hidden bg-cyber-${activeColor}/10 hover:bg-cyber-${activeColor} hover:text-black border border-cyber-${activeColor} text-cyber-${activeColor} font-display font-bold py-3 px-4 rounded-lg ${activeShadow} transition-all disabled:opacity-50 disabled:cursor-not-allowed group/btn`}
          >
            <span className="relative z-10 flex items-center justify-center gap-2 uppercase tracking-widest text-sm">
                {loading ? <i className="fas fa-circle-notch fa-spin"></i> : <><i className="fas fa-upload"></i> Cargar Usuario</>}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}