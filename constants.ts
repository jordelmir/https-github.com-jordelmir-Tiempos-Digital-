
// Supabase Configuration
// Soporte híbrido para Vite (import.meta.env) y el define de vite.config.ts (process.env)

const getEnv = (key: string, legacyKey?: string) => {
  // 1. Vite Standard (VITE_ prefix)
  // @ts-ignore
  if (import.meta.env && import.meta.env[`VITE_${key}`]) return import.meta.env[`VITE_${key}`];
  
  // 2. Vercel System Env (via vite.config.ts define)
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
  
  // 3. Legacy React Env
  if (legacyKey) {
      // @ts-ignore
      if (typeof process !== 'undefined' && process.env && process.env[legacyKey]) return process.env[legacyKey];
  }
  
  return '';
};

export const SUPABASE_URL = getEnv('SUPABASE_URL', 'REACT_APP_SUPABASE_URL') || 'https://your-project.supabase.co';
export const SUPABASE_ANON_KEY = getEnv('SUPABASE_ANON_KEY', 'REACT_APP_SUPABASE_ANON_KEY') || 'your-anon-key';

// Formatters
export const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    minimumFractionDigits: 0
  }).format(cents / 100);
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('es-CR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  AUDIT: '/admin/audit',
  LEDGER: '/ledger',
  VENDEDOR: '/vendedor',
  CLIENTE: '/cliente'
};