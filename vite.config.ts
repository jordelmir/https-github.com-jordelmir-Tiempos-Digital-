import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carga las variables de entorno del directorio actual.
  // El tercer parámetro '' permite cargar todas las variables, incluidas SUPABASE_URL (sin prefijo VITE_)
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Exponemos las variables del servidor (Vercel) al cliente
      // Esto soluciona el problema de que Vercel usa SUPABASE_... en lugar de VITE_SUPABASE_...
      'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY),
      // Mapeo legacy por si acaso
      'process.env.REACT_APP_SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
      'process.env.REACT_APP_SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY),
      // Fallback para evitar crashes si alguna librería accede a process.env
      'process.env': {}
    },
  };
});