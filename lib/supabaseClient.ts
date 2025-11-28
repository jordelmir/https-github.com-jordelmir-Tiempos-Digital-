
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';
import { AuditSeverity, AuditEventType } from '../types';

// FORCE DEMO MODE for Client Presentation
const isDemo = true; 

let client: SupabaseClient;

// --- PERSISTENCE ENGINE ---
const STORAGE_KEYS = {
    SESSION: 'tiempospro_demo_session',
    USERS: 'tiempospro_db_users',
    BETS: 'tiempospro_db_bets',
    RESULTS: 'tiempospro_db_results',
    LIMITS: 'tiempospro_db_limits',
    LEDGER: 'tiempospro_db_ledger',
    AUDIT: 'tiempospro_db_audit'
};

// Helper to load/save
const loadDB = (key: string, defaultData: any[]) => {
    if (typeof window === 'undefined') return defaultData;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultData;
};

const saveDB = (key: string, data: any[]) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(data));
};

// --- INITIAL DATA GENERATORS ---
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
      status: Math.random() > 0.9 ? 'Suspended' : 'Active',
      issuer_id: 'app-user-001',
      created_at: new Date(Date.now() - Math.random() * 1000000000).toISOString(),
      updated_at: new Date().toISOString()
  }));
};

const MOCK_ADMIN_PROFILE = {
  id: 'app-user-001',
  auth_uid: 'mock-auth-uid-001',
  email: 'admin@tiempos.local',
  name: 'Admin PHRONT (Demo)',
  role: 'SuperAdmin',
  cedula: '1-1111-1111',
  phone: '+506 8888-8888',
  balance_bigint: 1000000000, 
  currency: 'CRC',
  status: 'Active',
  issuer_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const TEST_VENDOR = {
    id: 'test-vendor-01',
    auth_uid: 'auth-vendor-test',
    email: 'vendedor@test.com',
    name: 'Vendedor Demo (Purple)',
    cedula: '2-2222-2222',
    phone: '+506 2222-2222',
    role: 'Vendedor',
    balance_bigint: 25000000, 
    currency: 'CRC',
    status: 'Active',
    issuer_id: 'app-user-001',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
};

const TEST_PLAYER = {
    id: 'test-player-01',
    auth_uid: 'auth-player-test',
    email: 'jugador@test.com',
    name: 'Jugador Demo (Cyan)',
    cedula: '3-3333-3333',
    phone: '+506 3333-3333',
    role: 'Cliente',
    balance_bigint: 5000000, 
    currency: 'CRC',
    status: 'Active',
    issuer_id: 'test-vendor-01',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
};

// --- DATABASE IN MEMORY (LINKED TO LOCALSTORAGE) ---
// We initialize these lazily or immediately
let DB_USERS = loadDB(STORAGE_KEYS.USERS, [MOCK_ADMIN_PROFILE, TEST_VENDOR, TEST_PLAYER, ...generateUsers('Cliente', 35), ...generateUsers('Vendedor', 15)]);
let DB_BETS = loadDB(STORAGE_KEYS.BETS, []);
let DB_RESULTS = loadDB(STORAGE_KEYS.RESULTS, [
    { id: 'res-1', date: new Date().toISOString().split('T')[0], draw_time: 'Mediodía (12:55)', winning_number: '--', is_reventado: false, status: 'OPEN', created_at: new Date().toISOString() },
    { id: 'res-2', date: new Date().toISOString().split('T')[0], draw_time: 'Tarde (16:30)', winning_number: '--', is_reventado: false, status: 'OPEN', created_at: new Date().toISOString() },
    { id: 'res-3', date: new Date().toISOString().split('T')[0], draw_time: 'Noche (19:30)', winning_number: '--', is_reventado: false, status: 'OPEN', created_at: new Date().toISOString() }
]);
let DB_LIMITS = loadDB(STORAGE_KEYS.LIMITS, []);
let DB_LEDGER = loadDB(STORAGE_KEYS.LEDGER, []);
let DB_AUDIT = loadDB(STORAGE_KEYS.AUDIT, [{
    id: 1001,
    event_id: 'evt-init-001',
    timestamp: new Date().toISOString(),
    actor_id: 'system',
    actor_role: 'SYSTEM',
    actor_name: 'PHRONT CORE',
    ip_address: 'LOCALHOST',
    device_fingerprint: 'Server Boot',
    type: AuditEventType.SYSTEM_INTEGRITY,
    action: 'SYSTEM_INITIALIZED',
    severity: AuditSeverity.INFO,
    target_resource: 'DB',
    metadata: { version: '3.3.0' },
    hash: 'sha256-init'
}]);

// --- EXPOSED HELPERS FOR EDGE API SIMULATION ---
export const MockDB = {
    getUsers: () => DB_USERS,
    saveUser: (user: any) => {
        const idx = DB_USERS.findIndex((u: any) => u.id === user.id);
        if (idx >= 0) DB_USERS[idx] = user;
        else DB_USERS.unshift(user);
        saveDB(STORAGE_KEYS.USERS, DB_USERS);
    },
    getBets: () => DB_BETS,
    addBet: (bet: any) => {
        DB_BETS.unshift(bet);
        saveDB(STORAGE_KEYS.BETS, DB_BETS);
    },
    getLimits: () => DB_LIMITS,
    saveLimit: (limit: any) => {
        const idx = DB_LIMITS.findIndex((l: any) => l.draw_type === limit.draw_type && l.number === limit.number);
        if (idx >= 0) DB_LIMITS[idx] = limit;
        else DB_LIMITS.push(limit);
        saveDB(STORAGE_KEYS.LIMITS, DB_LIMITS);
    },
    getLedger: () => DB_LEDGER,
    addTransaction: (tx: any) => {
        DB_LEDGER.unshift(tx);
        saveDB(STORAGE_KEYS.LEDGER, DB_LEDGER);
    },
    getResults: () => DB_RESULTS,
    saveResult: (res: any) => {
        const idx = DB_RESULTS.findIndex((r: any) => r.draw_time === res.draw_time && r.date === res.date);
        if (idx >= 0) DB_RESULTS[idx] = res;
        else DB_RESULTS.push(res);
        saveDB(STORAGE_KEYS.RESULTS, DB_RESULTS);
    },
    getAudit: () => DB_AUDIT,
    addAudit: (log: any) => {
        DB_AUDIT.unshift(log);
        saveDB(STORAGE_KEYS.AUDIT, DB_AUDIT);
    }
};


if (isDemo) {
  console.log('%c TIEMPOSPRO PERSISTENT MOCK DB ACTIVATED ', 'background: #00f0ff; color: #000; font-weight: bold; padding: 4px;');
  
  // Mock Implementation
  client = {
    supabaseUrl: 'https://demo.local',
    auth: {
      getUser: async () => {
        const hasSession = localStorage.getItem(STORAGE_KEYS.SESSION);
        if (hasSession) {
            const stored = JSON.parse(hasSession);
            // Refresh user data from DB to get latest balance
            const freshUser = DB_USERS.find((u: any) => u.id === stored.user.id);
            return { data: { user: freshUser || stored.user }, error: null };
        }
        return { data: { user: null }, error: null };
      },
      getSession: async () => {
        const hasSession = localStorage.getItem(STORAGE_KEYS.SESSION);
        if (hasSession) {
            const stored = JSON.parse(hasSession);
            return { data: { session: stored }, error: null };
        }
        return { data: { session: null }, error: null };
      },
      signInWithPassword: async ({ email }: any) => {
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Find in real DB
        let targetUser = DB_USERS.find((u: any) => u.email === email);
        
        // Fallback for hardcoded test emails if they were deleted from DB
        if (!targetUser) {
             if (email === TEST_VENDOR.email) targetUser = TEST_VENDOR;
             else if (email === TEST_PLAYER.email) targetUser = TEST_PLAYER;
             else targetUser = MOCK_ADMIN_PROFILE;
        }

        const sessionData = { access_token: 'mock-jwt-token', user: targetUser };
        localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(sessionData));
        return { data: { user: targetUser, session: sessionData }, error: null };
      },
      signOut: async () => {
        localStorage.removeItem(STORAGE_KEYS.SESSION);
        return { error: null };
      },
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    },
    // Mock Database Query Builder
    from: (table: string) => {
      let currentFilterField: string | null = null;
      let currentFilterValue: string | null = null;
      let orderBy = 'created_at';
      let orderAsc = false;
      let limitCount = 100;

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
        limit: (num: number) => {
            limitCount = num;
            return chain;
        },
        single: async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Generic Single Finder
            let dataList: any[] = [];
            if (table === 'app_users') dataList = DB_USERS;
            else if (table === 'draw_results') dataList = DB_RESULTS;
            else if (table === 'limits_per_number') dataList = DB_LIMITS;

            const item = dataList.find((i: any) => i[currentFilterField!] === currentFilterValue);
            return { data: item || null, error: item ? null : { message: 'Not found' } };
        },
        upsert: async (payload: any) => {
             await new Promise(resolve => setTimeout(resolve, 200));
             if (table === 'draw_results') {
                 MockDB.saveResult({ ...payload, created_at: new Date().toISOString() });
                 return { data: payload, error: null };
             }
             return { data: null, error: null };
        },
        insert: (payload: any) => ({
            select: () => ({
                single: async () => {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    const newItem = { ...payload[0] };
                    newItem.id = newItem.id || `mock-id-${Date.now()}-${Math.random()}`;
                    if (!newItem.created_at) newItem.created_at = new Date().toISOString();

                    if (table === 'bets') MockDB.addBet(newItem);
                    if (table === 'ledger_transactions') MockDB.addTransaction(newItem);
                    if (table === 'app_users') MockDB.saveUser(newItem);
                    if (table === 'limits_per_number') MockDB.saveLimit(newItem);
                    if (table === 'audit_trail') MockDB.addAudit(newItem);

                    return { data: newItem, error: null };
                }
            })
        }),
        update: (payload: any) => ({
            eq: (field: string, value: string) => {
                const execute = async () => {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    if (table === 'limits_per_number') {
                        const limit = DB_LIMITS.find((l: any) => l[field] === value);
                        if (limit) {
                            const updated = { ...limit, ...payload };
                            MockDB.saveLimit(updated);
                            return { data: updated, error: null };
                        }
                    }
                    if (table === 'app_users') {
                        const user = DB_USERS.find((u: any) => u[field] === value);
                        if (user) {
                            const updated = { ...user, ...payload };
                            MockDB.saveUser(updated);
                            return { data: updated, error: null };
                        }
                    }
                    return { data: { ...payload }, error: null };
                };
                return { then: (cb: any) => execute().then(cb), select: () => ({ single: execute }) };
            }
        }),
        delete: () => ({
            eq: (field: string, value: string) => ({
                then: (cb: any) => {
                    if (table === 'limits_per_number') {
                        const newData = DB_LIMITS.filter((l: any) => l[field] !== value);
                        DB_LIMITS = newData;
                        saveDB(STORAGE_KEYS.LIMITS, DB_LIMITS);
                    }
                    if (table === 'app_users') {
                        const newData = DB_USERS.filter((u: any) => u[field] !== value);
                        DB_USERS = newData;
                        saveDB(STORAGE_KEYS.USERS, DB_USERS);
                    }
                    cb({ data: true, error: null });
                }
            })
        }),
        then: (callback: (res: any) => void) => {
            setTimeout(() => {
                let data: any[] = [];
                
                if (table === 'app_users') {
                    if (currentFilterValue === 'Cliente') data = DB_USERS.filter((u: any) => u.role === 'Cliente');
                    else if (currentFilterValue === 'Vendedor') data = DB_USERS.filter((u: any) => u.role === 'Vendedor');
                    else data = DB_USERS;
                } 
                else if (table === 'ledger_transactions') data = DB_LEDGER;
                else if (table === 'audit_trail') data = DB_AUDIT;
                else if (table === 'bets') {
                    data = currentFilterField === 'user_id' 
                        ? DB_BETS.filter((b: any) => b.user_id === currentFilterValue)
                        : DB_BETS;
                }
                else if (table === 'draw_results') data = DB_RESULTS;
                else if (table === 'limits_per_number') {
                    data = currentFilterField === 'draw_type' 
                        ? DB_LIMITS.filter((l: any) => l.draw_type === currentFilterValue)
                        : DB_LIMITS;
                }

                // Simple Sort
                data.sort((a, b) => {
                    const dateA = new Date(a.created_at || 0).getTime();
                    const dateB = new Date(b.created_at || 0).getTime();
                    return orderAsc ? dateA - dateB : dateB - dateA;
                });

                callback({ data: data.slice(0, limitCount), error: null });
            }, 150);
        }
      };
      return chain;
    },
    rpc: async (fn: string, args: any) => {
        // Mock RPC calls
        return { data: { success: true, message: 'RPC Mock Success' }, error: null };
    }
  } as any;
} else {
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export const supabase = client;
