import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
    define: {
      // Explicitly define process.env for libraries that might use it
      // and map specific Vercel environment variables to process.env properties
      'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY),
      'process.env.REACT_APP_SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
      'process.env.REACT_APP_SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY),
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.VITE_GOOGLE_API_KEY': JSON.stringify(env.VITE_GOOGLE_API_KEY),
      
      // Polyfill process.env to empty object to prevent crashes in 3rd party libs
      // Note: This must come AFTER specific assignments if the bundler order matters,
      // but in Vite 'define' is a simple replacement.
      // We rely on the specific keys above being more specific than 'process.env'.
      'process.env': {},
    },
  };
});