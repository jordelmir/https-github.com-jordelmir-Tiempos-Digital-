import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';

// Detect if we are using default/placeholder credentials
const isDemo = SUPABASE_URL.includes('your-project') || !SUPABASE_URL;

let client: SupabaseClient;

if (isDemo) {
  console.warn('⚠️ TIEMPOSPRO v3.1: Ejecutando en MODO DEMO (Sin URL de Supabase válida). Usando mocks en memoria.');
  
  const MOCK_STORAGE_KEY = 'tiempospro_demo_session';
  
  // Mock Auth User
  const MOCK_AUTH_USER = {
    id: 'mock-auth-uid-001',
    email: 'admin@tiempos.local',
    aud: 'authenticated',
    role: 'authenticated',
    created_at: new Date().toISOString()
  };

  // Mock Admin Profile
  const MOCK_ADMIN_PROFILE = {
    id: 'app-user-001',
    auth_uid: 'mock-auth-uid-001',
    email: 'admin@tiempos.local',
    name: 'Admin PHRONT (Demo)',
    role: 'SuperAdmin',
    balance_bigint: 5000000,
    currency: 'CRC',
    status: 'Active',
    issuer_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Generators for Lists
  const generateUsers = (role: string, count: number) => {
    return Array.from({ length: count }).map((_, i) => {
        // Extra data logic for specific views
        const extraData: any = {};
        
        if (role === 'Cliente') {
            // JPS LOGIC: Generate between 20 and 35 random numbers per player
            const numCount = Math.floor(Math.random() * 15) + 20; 
            const numbers = [];
            for(let k=0; k<numCount; k++) {
                const n = Math.floor(Math.random() * 100).toString().padStart(2, '0');
                numbers.push(n);
            }
            extraData.active_numbers = numbers;
        }

        if (role === 'Vendedor') {
            // Generate last sale info
            extraData.recent_sale = {
                target: `Cliente_${Math.floor(Math.random() * 900) + 100}`,
                amount: (Math.floor(Math.random() * 50) + 1) * 1000 // Random amount in thousands
            };
        }

        return {
            id: `${role.toLowerCase()}-${i}`,
            auth_uid: `auth-${role}-${i}`,
            email: `${role.toLowerCase()}${i}@cyber.net`,
            name: `${role} Unidad ${i + 100}`,
            role: role,
            balance_bigint: Math.floor(Math.random() * 1000000),
            currency: 'CRC',
            status: Math.random() > 0.8 ? 'Suspended' : 'Active',
            issuer_id: 'app-user-001',
            created_at: new Date(Date.now() - Math.random() * 1000000000).toISOString(),
            updated_at: new Date().toISOString(),
            ...extraData
        };
    });
  };

  const MOCK_CLIENTS = generateUsers('Cliente', 50); // Increased count for infinite scroll feel
  const MOCK_VENDORS = generateUsers('Vendedor', 50);

  const MOCK_LEDGER = Array.from({ length: 15 }).map((_, i) => ({
    id: `tx-${i}`,
    user_id: 'app-user-001',
    amount_bigint: i % 2 === 0 ? 500000 : -250000,
    balance_before: 4500000,
    balance_after: 5000000,
    type: i % 2 === 0 ? 'CREDIT' : 'DEBIT',
    reference_id: `ref-${Date.now()}-${i}`,
    created_at: new Date(Date.now() - i * 86400000).toISOString(),
    meta: { description: i % 2 === 0 ? 'Depósito vía Admin' : 'Colocación de Apuesta' }
  }));

  const MOCK_AUDIT = Array.from({ length: 10 }).map((_, i) => ({
    id: i,
    actor_app_user: 'app-user-001',
    action: ['LOGIN', 'CREATE_USER', 'PURGE_ATTEMPT', 'UPDATE_SETTINGS'][i % 4],
    object_type: 'sistema',
    object_id: `obj-${i}`,
    payload: { ip: '192.168.1.1', device: 'NeuralLink_v3' },
    created_at: new Date(Date.now() - i * 3600000).toISOString()
  }));

  // Mock Implementation
  client = {
    supabaseUrl: 'https://demo.local',
    auth: {
      getUser: async () => {
        const hasSession = localStorage.getItem(MOCK_STORAGE_KEY);
        if (hasSession) {
          return { data: { user: MOCK_AUTH_USER }, error: null };
        }
        return { data: { user: null }, error: null };
      },
      getSession: async () => {
        const hasSession = localStorage.getItem(MOCK_STORAGE_KEY);
        if (hasSession) {
          return { data: { session: { access_token: 'mock-jwt-token', user: MOCK_AUTH_USER } }, error: null };
        }
        return { data: { session: null }, error: null };
      },
      signInWithPassword: async ({ email, password }: any) => {
        await new Promise(resolve => setTimeout(resolve, 800));
        if (password === 'error') {
          return { data: { user: null, session: null }, error: { message: 'Error de Inicio de Sesión Simulado' } };
        }
        localStorage.setItem(MOCK_STORAGE_KEY, 'true');
        return { data: { user: MOCK_AUTH_USER, session: { access_token: 'mock-jwt-token', user: MOCK_AUTH_USER } }, error: null };
      },
      signOut: async () => {
        localStorage.removeItem(MOCK_STORAGE_KEY);
        return { error: null };
      },
      onAuthStateChange: () => {
          return { data: { subscription: { unsubscribe: () => {} } } };
      }
    },
    from: (table: string) => {
      let currentFilterField: string | null = null;
      let currentFilterValue: string | null = null;

      const chain = {
        select: (cols: string) => chain,
        eq: (field: string, value: string) => {
            currentFilterField = field;
            currentFilterValue = value;
            return chain;
        },
        single: async () => {
            await new Promise(resolve => setTimeout(resolve, 300));
            // Profile Fetch
            if (table === 'app_users' && currentFilterField === 'auth_uid' && currentFilterValue === MOCK_AUTH_USER.id) {
                return { data: MOCK_ADMIN_PROFILE, error: null };
            }
            return { data: null, error: { message: 'No encontrado' } };
        },
        order: (field: string, { ascending }: any) => chain,
        limit: (num: number) => chain,
        // The final fetch for lists
        then: (callback: (res: any) => void) => {
            setTimeout(() => {
                let data = [];
                if (table === 'app_users') {
                    if (currentFilterValue === 'Cliente') data = MOCK_CLIENTS;
                    else if (currentFilterValue === 'Vendedor') data = MOCK_VENDORS;
                    else data = [MOCK_ADMIN_PROFILE];
                } else if (table === 'ledger_transactions') {
                    data = MOCK_LEDGER;
                } else if (table === 'audit_trail') {
                    data = MOCK_AUDIT;
                }
                callback({ data, error: null });
            }, 500);
        },
        insert: (payload: any) => ({
            select: () => ({
                single: async () => {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    return { data: { id: `new-${Date.now()}`, ...payload[0] }, error: null };
                }
            })
        })
      };
      return chain;
    },
    channel: (name: string) => ({
        on: () => ({
            subscribe: (callback?: (status: string) => void) => {
                if(callback) setTimeout(() => callback('SUBSCRIBED'), 100);
            }
        })
    }),
    removeChannel: () => {}
  } as unknown as SupabaseClient;

} else {
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  });
}

export const supabase = client;