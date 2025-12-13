
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';
import { AuditSeverity, AuditEventType, SystemSetting, PurgeTarget, PurgeAnalysis } from '../types';

// FORCE DEMO MODE for Client Presentation
const isDemo = true; 

let client: SupabaseClient;

// --- PERSISTENCE ENGINE (SAFE MODE) ---
const STORAGE_KEYS = {
    SESSION: 'tiempospro_demo_session',
    USERS: 'tiempospro_db_users',
    BETS: 'tiempospro_db_bets',
    RESULTS: 'tiempospro_db_results',
    LIMITS: 'tiempospro_db_limits',
    LEDGER: 'tiempospro_db_ledger',
    AUDIT: 'tiempospro_db_audit',
    SETTINGS: 'tiempospro_db_settings',
    SYSTEM_SETTINGS_LIST: 'tiempospro_db_sys_settings_list'
};

// Safe Helper to load/save without crashing
const loadDB = (key: string, defaultData: any) => {
    if (typeof window === 'undefined') return defaultData;
    try {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : defaultData;
    } catch (e) {
        console.error(`Error loading DB key ${key}:`, e);
        return defaultData;
    }
};

const saveDB = (key: string, data: any) => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error(`Error saving DB key ${key}:`, e);
        // If quota exceeded, we might need to purge old logs, but for now just log it.
    }
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

// --- HISTORICAL LEDGER GENERATOR (2024 SALES DEMO) ---
const generateHistoricalLedger = () => {
    const txs: any[] = [];
    const startDate = new Date('2024-01-01T00:00:00Z');
    const now = new Date();
    let currentBalance = 150000000; // Starting capital 1.5M

    for (let d = new Date(startDate); d <= now; d.setMonth(d.getMonth() + 1)) {
        const numTxs = 5 + Math.floor(Math.random() * 4);
        for (let i = 0; i < numTxs; i++) {
            const isIncome = Math.random() > 0.4;
            const baseAmount = 500000 + Math.floor(Math.random() * 2000000);
            const amount = isIncome ? baseAmount : -(baseAmount * 0.8);
            
            const txDate = new Date(d);
            txDate.setDate(Math.floor(Math.random() * 28) + 1);
            txDate.setHours(Math.floor(Math.random() * 23), Math.floor(Math.random() * 59));

            currentBalance += amount;

            txs.push({
                id: `tx-hist-${txDate.getTime()}-${i}`,
                ticket_code: `TX-${txDate.getFullYear()}${(txDate.getMonth()+1).toString().padStart(2,'0')}-${Math.floor(Math.random()*9999)}`,
                user_id: 'app-user-001',
                amount_bigint: amount,
                balance_before: currentBalance - amount,
                balance_after: currentBalance,
                type: isIncome ? 'CREDIT' : 'DEBIT',
                reference_id: `REF-${Math.random().toString(36).substring(7).toUpperCase()}`,
                created_at: txDate.toISOString(),
                meta: { description: isIncome ? 'Ingresos Operativos' : 'Pago de Premios / Comisiones' }
            });
        }
    }
    return txs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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

// --- DATABASE IN MEMORY ---
// Define safely before loading
const DEFAULT_USERS = [MOCK_ADMIN_PROFILE, TEST_VENDOR, TEST_PLAYER];

let DB_USERS = loadDB(STORAGE_KEYS.USERS, DEFAULT_USERS);
// Fallback if loadDB returns null/empty or corrupt data without Admin
if (!Array.isArray(DB_USERS) || !DB_USERS.find((u:any) => u.role === 'SuperAdmin')) {
    DB_USERS = [...DEFAULT_USERS, ...generateUsers('Cliente', 35), ...generateUsers('Vendedor', 15)];
    saveDB(STORAGE_KEYS.USERS, DB_USERS);
}

let DB_BETS = loadDB(STORAGE_KEYS.BETS, []);
let DB_RESULTS = loadDB(STORAGE_KEYS.RESULTS, [
    { id: 'res-1', date: new Date().toISOString().split('T')[0], draw_time: 'Mediodía (12:55)', winning_number: '--', is_reventado: false, status: 'OPEN', created_at: new Date().toISOString() },
    { id: 'res-2', date: new Date().toISOString().split('T')[0], draw_time: 'Tarde (16:30)', winning_number: '--', is_reventado: false, status: 'OPEN', created_at: new Date().toISOString() },
    { id: 'res-3', date: new Date().toISOString().split('T')[0], draw_time: 'Noche (19:30)', winning_number: '--', is_reventado: false, status: 'OPEN', created_at: new Date().toISOString() }
]);
let DB_LIMITS = loadDB(STORAGE_KEYS.LIMITS, []);

let loadedLedger = loadDB(STORAGE_KEYS.LEDGER, []);
if (!Array.isArray(loadedLedger) || loadedLedger.length === 0) {
    loadedLedger = generateHistoricalLedger();
    saveDB(STORAGE_KEYS.LEDGER, loadedLedger);
}
let DB_LEDGER = loadedLedger;

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

let DB_SETTINGS = loadDB(STORAGE_KEYS.SETTINGS, {
    multiplier_tiempos: 90,
    multiplier_reventados: 200
});

let DB_SYS_SETTINGS_LIST = loadDB(STORAGE_KEYS.SYSTEM_SETTINGS_LIST, [
    { key: 'GLOBAL_LIMIT', value: 50000, description: 'Límite de exposición por defecto', group: 'RISK', updated_at: new Date().toISOString(), updated_by: 'system' },
    { key: 'MARKET_STATUS', value: 'OPEN', description: 'Estado global del mercado', group: 'CORE', updated_at: new Date().toISOString(), updated_by: 'system' },
    { key: 'RISK_THRESHOLD', value: 95, description: 'Porcentaje para auto-blindaje', group: 'RISK', updated_at: new Date().toISOString(), updated_by: 'system' },
    { key: 'UI_THEME_DEFAULT', value: 'CYBER', description: 'Tema por defecto', group: 'UI', updated_at: new Date().toISOString(), updated_by: 'system' },
    { key: 'FEE_PERCENT', value: 0.05, description: 'Comisión de pasarela', group: 'FINANCE', updated_at: new Date().toISOString(), updated_by: 'system' }
]);

export const MockDB = {
    getUsers: () => DB_USERS,
    saveUser: (user: any) => {
        const idx = DB_USERS.findIndex((u: any) => u.id === user.id);
        if (idx >= 0) DB_USERS[idx] = user;
        else DB_USERS.unshift(user);
        saveDB(STORAGE_KEYS.USERS, DB_USERS);
    },
    deleteUser: (userId: string) => {
        DB_USERS = DB_USERS.filter((u: any) => u.id !== userId);
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
        if (idx >= 0) DB_RESULTS[idx] = { ...DB_RESULTS[idx], ...res };
        else DB_RESULTS.push(res);
        saveDB(STORAGE_KEYS.RESULTS, DB_RESULTS);
    },
    getAudit: () => DB_AUDIT,
    addAudit: (log: any) => {
        const newLog = {
            id: Date.now() + Math.random(),
            timestamp: new Date().toISOString(),
            ...log
        };
        DB_AUDIT.unshift(newLog);
        saveDB(STORAGE_KEYS.AUDIT, DB_AUDIT);
    },
    getSettings: () => DB_SETTINGS,
    saveSettings: (newSettings: any) => {
        DB_SETTINGS = { ...DB_SETTINGS, ...newSettings };
        saveDB(STORAGE_KEYS.SETTINGS, DB_SETTINGS);
    },
    getSettingsList: () => DB_SYS_SETTINGS_LIST,
    updateSetting: (key: string, value: any) => {
        const idx = DB_SYS_SETTINGS_LIST.findIndex((s: any) => s.key === key);
        if (idx >= 0) {
            DB_SYS_SETTINGS_LIST[idx] = { ...DB_SYS_SETTINGS_LIST[idx], value, updated_at: new Date().toISOString() };
            saveDB(STORAGE_KEYS.SYSTEM_SETTINGS_LIST, DB_SYS_SETTINGS_LIST);
        }
    },
    analyzePurge: (target: PurgeTarget, days: number): PurgeAnalysis => {
        const now = Date.now();
        const cutoff = now - (days * 24 * 60 * 60 * 1000);
        let list: any[] = [];
        switch(target) {
            case 'BETS': list = DB_BETS; break;
            case 'AUDIT': list = DB_AUDIT; break;
            case 'LEDGER_HISTORY': list = DB_LEDGER; break;
            case 'RESULTS': list = DB_RESULTS; break;
        }
        const count = list.filter(item => new Date(item.created_at || item.timestamp).getTime() < cutoff).length;
        return {
            target,
            cutoffDate: new Date(cutoff).toISOString(),
            recordCount: count,
            estimatedSizeKB: Math.round(count * 0.5),
            riskLevel: target === 'LEDGER_HISTORY' ? 'HIGH' : target === 'BETS' ? 'MEDIUM' : 'LOW',
            canProceed: true
        };
    },
    executePurge: (target: PurgeTarget, days: number): number => {
        const now = Date.now();
        const cutoff = now - (days * 24 * 60 * 60 * 1000);
        let initialCount = 0;
        if (target === 'BETS') {
            initialCount = DB_BETS.length;
            DB_BETS = DB_BETS.filter(item => new Date(item.created_at).getTime() >= cutoff);
            saveDB(STORAGE_KEYS.BETS, DB_BETS);
            return initialCount - DB_BETS.length;
        }
        if (target === 'AUDIT') {
            initialCount = DB_AUDIT.length;
            DB_AUDIT = DB_AUDIT.filter(item => new Date(item.timestamp).getTime() >= cutoff);
            saveDB(STORAGE_KEYS.AUDIT, DB_AUDIT);
            return initialCount - DB_AUDIT.length;
        }
        if (target === 'LEDGER_HISTORY') {
            initialCount = DB_LEDGER.length;
            DB_LEDGER = DB_LEDGER.filter(item => new Date(item.created_at).getTime() >= cutoff);
            saveDB(STORAGE_KEYS.LEDGER, DB_LEDGER);
            return initialCount - DB_LEDGER.length;
        }
        if (target === 'RESULTS') {
            initialCount = DB_RESULTS.length;
            DB_RESULTS = DB_RESULTS.filter(item => new Date(item.created_at).getTime() >= cutoff);
            saveDB(STORAGE_KEYS.RESULTS, DB_RESULTS);
            return initialCount - DB_RESULTS.length;
        }
        return 0;
    },
    saveDB: saveDB
};

if (isDemo) {
  client = {
    supabaseUrl: 'https://demo.local',
    auth: {
      getUser: async () => {
        try {
            const hasSession = localStorage.getItem(STORAGE_KEYS.SESSION);
            if (hasSession) {
                const stored = JSON.parse(hasSession);
                if (stored && stored.user) return { data: { user: stored.user }, error: null };
            }
        } catch(e) { console.warn("Session parse error"); }
        return { data: { user: null }, error: null };
      },
      getSession: async () => {
        try {
            const hasSession = localStorage.getItem(STORAGE_KEYS.SESSION);
            if (hasSession) {
                const stored = JSON.parse(hasSession);
                return { data: { session: stored }, error: null };
            }
        } catch(e) {}
        return { data: { session: null }, error: null };
      },
      signInWithPassword: async ({ email }: any) => {
        await new Promise(resolve => setTimeout(resolve, 800));
        let targetProfile = DB_USERS.find((u: any) => u.email === email);
        if (!targetProfile) {
             if (email === TEST_VENDOR.email) targetProfile = TEST_VENDOR;
             else if (email === TEST_PLAYER.email) targetProfile = TEST_PLAYER;
             else targetProfile = MOCK_ADMIN_PROFILE;
        }
        const authUser = {
            id: targetProfile.auth_uid,
            email: targetProfile.email,
            aud: 'authenticated',
            role: 'authenticated',
            created_at: new Date().toISOString()
        };
        const sessionData = { access_token: 'mock-jwt-token', user: authUser };
        saveDB(STORAGE_KEYS.SESSION, sessionData);
        return { data: { user: authUser, session: sessionData }, error: null };
      },
      signOut: async () => {
        localStorage.removeItem(STORAGE_KEYS.SESSION);
        return { error: null };
      },
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    },
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
            let dataList: any[] = [];
            if (table === 'app_users') dataList = DB_USERS;
            else if (table === 'draw_results') dataList = DB_RESULTS;
            else if (table === 'limits_per_number') dataList = DB_LIMITS;

            const item = dataList.find((i: any) => i[currentFilterField!] === currentFilterValue);
            return { data: item || null, error: item ? null : { message: 'Not found' } };
        },
        then: (callback: (res: any) => void) => {
            setTimeout(() => {
                let data: any[] = [];
                const sessionStr = localStorage.getItem(STORAGE_KEYS.SESSION);
                const session = sessionStr ? JSON.parse(sessionStr) : null;
                const authUid = session?.user?.id;
                
                const currentUser = DB_USERS.find((u: any) => u.auth_uid === authUid) || MOCK_ADMIN_PROFILE;
                const isVendor = currentUser?.role === 'Vendedor';

                if (table === 'app_users') {
                    if (currentFilterValue === 'Cliente') {
                        if (isVendor) {
                            data = DB_USERS.filter((u: any) => u.role === 'Cliente' && u.issuer_id === currentUser.id);
                        } else {
                            data = DB_USERS.filter((u: any) => u.role === 'Cliente');
                        }
                    }
                    else if (currentFilterValue === 'Vendedor') data = DB_USERS.filter((u: any) => u.role === 'Vendedor');
                    else if (currentFilterField === 'auth_uid') data = [DB_USERS.find((u:any) => u.auth_uid === currentFilterValue) || null];
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

                data.sort((a, b) => {
                    if(!a || !b) return 0;
                    const dateA = new Date(a.created_at || 0).getTime();
                    const dateB = new Date(b.created_at || 0).getTime();
                    return orderAsc ? dateA - dateB : dateB - dateA;
                });

                callback({ data: data.slice(0, limitCount), error: null });
            }, 100);
        }
      };
      return chain;
    },
    rpc: async (fn: string, args: any) => {
        return { data: { success: true, message: 'RPC Mock Success' }, error: null };
    }
  } as any;
} else {
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export const supabase = client;
