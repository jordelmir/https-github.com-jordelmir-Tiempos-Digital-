
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';
import { AuditSeverity, AuditEventType } from '../types';

// Detect if we are using default/placeholder credentials
const isDemo = SUPABASE_URL.includes('your-project') || !SUPABASE_URL || SUPABASE_URL === 'https://demo.local';

let client: SupabaseClient;

// --- MOCK DATA STORE (PERSISTENT IN MEMORY) ---
const MOCK_STORAGE_KEY = 'tiempospro_demo_session';

// Mutable Mock Data
const MOCK_BETS: any[] = [];
const MOCK_AUTH_USER = {
  id: 'mock-auth-uid-001',
  email: 'admin@tiempos.local',
  aud: 'authenticated',
  role: 'authenticated',
  created_at: new Date().toISOString()
};

const MOCK_ADMIN_PROFILE = {
  id: 'app-user-001',
  auth_uid: 'mock-auth-uid-001',
  email: 'admin@tiempos.local',
  name: 'Admin PHRONT (Demo)',
  role: 'SuperAdmin',
  cedula: '1-1111-1111',
  phone: '+506 8888-8888',
  balance_bigint: 5000000,
  currency: 'CRC',
  status: 'Active',
  issuer_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const generateUsers = (role: string, count: number) => {
  return Array.from({ length: count }).map((_, i) => ({
      id: `${role.toLowerCase()}-${i}`,
      auth_uid: `auth-${role}-${i}`,
      email: `${role.toLowerCase()}${i}@cyber.net`,
      name: `${role} Unidad ${i + 100}`,
      cedula: `1-0${i+200}-${i+300}`,
      phone: `+506 8${i}00-${i}000`,
      role: role,
      balance_bigint: Math.floor(Math.random() * 1000000),
      currency: 'CRC',
      status: Math.random() > 0.8 ? 'Suspended' : 'Active',
      issuer_id: 'app-user-001',
      created_at: new Date(Date.now() - Math.random() * 1000000000).toISOString(),
      updated_at: new Date().toISOString()
  }));
};

// Initialize only once
const MOCK_CLIENTS = generateUsers('Cliente', 50);
const MOCK_VENDORS = generateUsers('Vendedor', 50);

// MOCK RESULTS - INITIALIZE FOR TODAY
const todayStr = new Date().toISOString().split('T')[0];
const MOCK_RESULTS = [
    { id: 'res-1', date: todayStr, drawTime: 'Mediodía (12:55)', winningNumber: '--', isReventado: false, status: 'OPEN', created_at: new Date().toISOString() },
    { id: 'res-2', date: todayStr, drawTime: 'Tarde (16:30)', winningNumber: '--', isReventado: false, status: 'OPEN', created_at: new Date().toISOString() },
    { id: 'res-3', date: todayStr, drawTime: 'Noche (19:30)', winningNumber: '--', isReventado: false, status: 'OPEN', created_at: new Date().toISOString() }
];

const MOCK_LEDGER = Array.from({ length: 15 }).map((_, i) => ({
  id: `tx-${i}`,
  ticket_code: `TX-${Math.random().toString(36).substring(2,6).toUpperCase()}-${Math.random().toString(36).substring(2,6).toUpperCase()}`,
  user_id: 'app-user-001',
  amount_bigint: i % 2 === 0 ? 500000 : -250000,
  balance_before: 4500000,
  balance_after: 5000000,
  type: i % 2 === 0 ? 'CREDIT' : 'DEBIT',
  reference_id: `ref-${Date.now()}-${i}`,
  created_at: new Date(Date.now() - i * 86400000).toISOString(),
  meta: { description: i % 2 === 0 ? 'Depósito vía Admin' : 'Colocación de Apuesta' }
}));

// --- GENERATE PROFESSIONAL FORENSIC AUDIT TRAIL ---
const MOCK_AUDIT = [
    // 1. Critical Admin Action
    {
        id: 1001,
        event_id: 'evt-purge-001',
        timestamp: new Date().toISOString(),
        actor_id: 'app-user-001',
        actor_role: 'SuperAdmin',
        actor_name: 'Admin PHRONT',
        ip_address: '10.0.0.5',
        device_fingerprint: 'Chrome / MacOS / SecureTerm',
        type: AuditEventType.ADMIN_PURGE,
        action: 'SYSTEM_DATA_PURGE_INITIATED',
        severity: AuditSeverity.FORENSIC,
        target_resource: 'SYSTEM_DB',
        metadata: { confirmation_phrase: 'CONFIRMAR PURGA TOTAL', snapshot_id: 'snap-992' },
        hash: 'sha256-e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    },
    // 2. Role Collision Warning (Security Rule Violation)
    {
        id: 1002,
        event_id: 'evt-col-002',
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        actor_id: 'vendedor-2',
        actor_role: 'Vendedor',
        actor_name: 'Vendedor Unidad 102',
        ip_address: '192.168.1.45',
        device_fingerprint: 'Mobile Safari / iOS',
        type: AuditEventType.IDENTITY_COLLISION,
        action: 'ATTEMPT_REGISTER_DUAL_ROLE',
        severity: AuditSeverity.CRITICAL,
        target_resource: 'cedula:1-0202-0302',
        metadata: { 
            attempted_role: 'Cliente', 
            existing_role: 'Vendedor', 
            error: 'CROSS_ROLE_VIOLATION_BLOCK' 
        },
        hash: 'sha256-88d4266fd4e6338d13b845fcf289579d209c897823b9217da3e161936f031589'
    },
    // 3. High Value Transaction
    {
        id: 1003,
        event_id: 'evt-tx-003',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        actor_id: 'app-user-001',
        actor_role: 'SuperAdmin',
        actor_name: 'Admin PHRONT',
        ip_address: '10.0.0.5',
        device_fingerprint: 'Chrome / MacOS',
        type: AuditEventType.TX_DEPOSIT,
        action: 'MANUAL_RECHARGE_EXEC',
        severity: AuditSeverity.CRITICAL,
        target_resource: 'cliente-5',
        metadata: { amount_cents: 5000000, previous_balance: 200, new_balance: 5000200 },
        hash: 'sha256-04e77bf5f45ed0b6c228f6749c51d73c12594695b5774a255d42344a37874799'
    },
    // 4. Routine Bet
    {
        id: 1004,
        event_id: 'evt-bet-004',
        timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        actor_id: 'cliente-10',
        actor_role: 'Cliente',
        actor_name: 'Cliente Unidad 110',
        ip_address: '186.15.22.101',
        device_fingerprint: 'Android / Chrome',
        type: AuditEventType.GAME_BET,
        action: 'BET_PLACED',
        severity: AuditSeverity.INFO,
        target_resource: 'bet-ref-332',
        metadata: { number: '42', amount: 5000, draw: 'NOCHE' },
        hash: 'sha256-valid'
    },
    // 5. Login Success
    {
        id: 1005,
        event_id: 'evt-log-005',
        timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        actor_id: 'app-user-001',
        actor_role: 'SuperAdmin',
        actor_name: 'Admin PHRONT',
        ip_address: '10.0.0.5',
        device_fingerprint: 'Chrome / MacOS',
        type: AuditEventType.SESSION_LOGIN,
        action: 'AUTH_SUCCESS_MFA',
        severity: AuditSeverity.SUCCESS,
        target_resource: 'session-token',
        metadata: { method: 'PASSWORD + PIN' },
        hash: 'sha256-valid'
    }
];


if (isDemo) {
  console.warn('⚠️ TIEMPOSPRO v3.1: Ejecutando en MODO DEMO (Sin URL de Supabase válida). Usando mocks en memoria.');
  
  // Mock Implementation
  client = {
    supabaseUrl: 'https://demo.local',
    auth: {
      getUser: async () => {
        const hasSession = localStorage.getItem(MOCK_STORAGE_KEY);
        if (hasSession) return { data: { user: MOCK_AUTH_USER }, error: null };
        return { data: { user: null }, error: null };
      },
      getSession: async () => {
        const hasSession = localStorage.getItem(MOCK_STORAGE_KEY);
        if (hasSession) return { data: { session: { access_token: 'mock-jwt-token', user: MOCK_AUTH_USER } }, error: null };
        return { data: { session: null }, error: null };
      },
      signInWithPassword: async ({ email, password }: any) => {
        await new Promise(resolve => setTimeout(resolve, 800));
        if (password === 'error') return { data: { user: null, session: null }, error: { message: 'Error de Inicio de Sesión Simulado' } };
        localStorage.setItem(MOCK_STORAGE_KEY, 'true');
        return { data: { user: MOCK_AUTH_USER, session: { access_token: 'mock-jwt-token', user: MOCK_AUTH_USER } }, error: null };
      },
      signOut: async () => {
        localStorage.removeItem(MOCK_STORAGE_KEY);
        return { error: null };
      },
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    },
    from: (table: string) => {
      let currentFilterField: string | null = null;
      let currentFilterValue: string | null = null;
      let orderBy = 'created_at';
      let orderAsc = false;

      const chain = {
        select: (cols: string) => chain,
        eq: (field: string, value: string) => {
            currentFilterField = field;
            currentFilterValue = value;
            return chain;
        },
        order: (field: string, { ascending }: any) => {
            orderBy = field;
            orderAsc = ascending;
            return chain;
        },
        limit: (num: number) => chain,
        single: async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            if (table === 'app_users' && currentFilterField === 'auth_uid') {
                return { data: MOCK_ADMIN_PROFILE, error: null };
            }
            if (table === 'app_users' && currentFilterField === 'id' && currentFilterValue === MOCK_ADMIN_PROFILE.id) {
                return { data: MOCK_ADMIN_PROFILE, error: null };
            }
            if (table === 'app_users' && currentFilterField === 'id') {
                 // Busca en Clientes
                 let user = MOCK_CLIENTS.find(c => c.id === currentFilterValue);
                 if (!user) user = MOCK_VENDORS.find(v => v.id === currentFilterValue);
                 
                 // Busca Admin
                 if (!user && currentFilterValue === MOCK_ADMIN_PROFILE.id) user = MOCK_ADMIN_PROFILE;
                 
                 if (user) return { data: user, error: null };
                 
                 return { data: null, error: { message: 'User Not Found' } };
            }
            if (table === 'lottery_results' && currentFilterField === 'drawTime') {
                // Find result for today and this draw time
                const res = MOCK_RESULTS.find(r => r.drawTime === currentFilterValue);
                return { data: res || null, error: null };
            }
            return { data: null, error: { message: 'No encontrado' } };
        },
        then: (callback: (res: any) => void) => {
            setTimeout(() => {
                let data: any[] = [];
                if (table === 'app_users') {
                    // FIX: Improved Query Resolver for Uniqueness Check
                    if (currentFilterValue === 'Cliente') {
                        data = [...MOCK_CLIENTS]; // RETURN COPY TO FORCE RE-RENDER
                    } else if (currentFilterValue === 'Vendedor') {
                        data = [...MOCK_VENDORS]; // RETURN COPY TO FORCE RE-RENDER
                    } else if (currentFilterField === 'auth_uid') {
                        data = [MOCK_ADMIN_PROFILE];
                    } else {
                        // GLOBAL FETCH (Crucial for Cross-Role Validation)
                        // If no specific role or ID is requested, return EVERYONE
                        data = [...MOCK_CLIENTS, ...MOCK_VENDORS, MOCK_ADMIN_PROFILE];
                    }
                } else if (table === 'ledger_transactions') {
                    data = [...MOCK_LEDGER];
                    // Sort ledger
                    data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                } else if (table === 'audit_trail') {
                    data = [...MOCK_AUDIT];
                } else if (table === 'bets') {
                    if (currentFilterField === 'user_id') {
                        data = MOCK_BETS.filter(b => b.user_id === currentFilterValue);
                    } else {
                        data = [...MOCK_BETS];
                    }
                    data.sort((a, b) => {
                        const dateA = new Date(a.created_at).getTime();
                        const dateB = new Date(b.created_at).getTime();
                        return orderAsc ? dateA - dateB : dateB - dateA;
                    });
                } else if (table === 'lottery_results') {
                    data = [...MOCK_RESULTS];
                }
                callback({ data, error: null });
            }, 300);
        },
        insert: (payload: any) => ({
            select: () => ({
                single: async () => {
                    await new Promise(resolve => setTimeout(resolve, 200));
                    const newItem = { ...payload[0] };

                    if (table === 'bets') {
                         newItem.id = `bet-${Date.now()}-${Math.random()}`;
                         newItem.created_at = new Date().toISOString();
                         newItem.status = 'PENDING';
                         MOCK_BETS.unshift(newItem);
                         return { data: newItem, error: null };
                    }

                    if (table === 'ledger_transactions') {
                         newItem.id = `tx-${Date.now()}-${Math.random()}`;
                         newItem.created_at = new Date().toISOString();
                         MOCK_LEDGER.unshift(newItem);
                         return { data: newItem, error: null };
                    }
                    
                    if (table === 'app_users') {
                        newItem.id = `user-${Date.now()}`;
                        newItem.created_at = new Date().toISOString();
                        if (newItem.role === 'Cliente') MOCK_CLIENTS.unshift(newItem);
                        if (newItem.role === 'Vendedor') MOCK_VENDORS.unshift(newItem);
                        return { data: newItem, error: null };
                    }

                    // SUPPORT AUDIT LOG INSERTS
                    if (table === 'audit_trail') {
                        newItem.id = Date.now(); // Simple numeric ID
                        newItem.event_id = `evt-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                        newItem.timestamp = new Date().toISOString();
                        newItem.hash = `sha256-mock-${Date.now()}`;
                        MOCK_AUDIT.unshift(newItem);
                        return { data: newItem, error: null };
                    }
                    
                    return { data: null, error: { message: 'Insert not mocked for this table' } };
                }
            })
        }),
        update: (payload: any) => ({
            eq: (field: string, value: string) => {
                const executeUpdate = async () => {
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                    if (table === 'lottery_results') {
                        const target = MOCK_RESULTS.find(r => r[field] === value);
                        if (target) {
                            Object.assign(target, payload);
                            return { data: target, error: null };
                        }
                    }

                    let target = MOCK_CLIENTS.find(u => u[field] === value);
                    if (!target) target = MOCK_VENDORS.find(u => u[field] === value);
                    if (!target && value === MOCK_ADMIN_PROFILE.id) target = MOCK_ADMIN_PROFILE;

                    if (target) {
                        // Apply updates specifically
                        Object.assign(target, payload);
                        return { data: target, error: null };
                    }
                    return { data: null, error: { message: 'Update Target Not Found' } };
                };

                return {
                    select: () => ({
                        single: executeUpdate
                    }),
                    // Allow await direct on eq() chain by providing thenable
                    then: (onfulfilled: any) => executeUpdate().then(onfulfilled)
                };
            }
        }),
        delete: () => ({
             eq: (field: string, value: string) => {
                 return {
                     then: (callback: any) => {
                         setTimeout(() => {
                             let idx = MOCK_CLIENTS.findIndex(u => u[field] === value);
                             if (idx !== -1) {
                                 MOCK_CLIENTS.splice(idx, 1);
                                 callback({ data: true, error: null });
                                 return;
                             }
                             idx = MOCK_VENDORS.findIndex(u => u[field] === value);
                             if (idx !== -1) {
                                 MOCK_VENDORS.splice(idx, 1);
                                 callback({ data: true, error: null });
                                 return;
                             }
                             callback({ data: null, error: { message: 'Not found to delete' }});
                         }, 200);
                     }
                 }
             }
        })
      };
      return chain;
    }
  } as any;
} else {
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export const supabase = client;