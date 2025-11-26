
export enum UserRole {
  SuperAdmin = 'SuperAdmin',
  Vendedor = 'Vendedor',
  Cliente = 'Cliente'
}

export enum DrawTime {
  MEDIODIA = 'Mediodía (12:55)',
  TARDE = 'Tarde (16:30)',
  NOCHE = 'Noche (19:30)'
}

export enum GameMode {
  TIEMPOS = 'Nuevos Tiempos (90x)',
  REVENTADOS = 'Reventados (200x)'
}

export interface AppUser {
  id: string;
  auth_uid: string;
  
  // Identidad Básica
  name: string; // Nombre Completo
  cedula: string; // CI / ID (UNIQUE)
  email?: string; // Opcional para Cliente, Obligatorio para Vendedor
  phone: string; // UNIQUE
  
  role: UserRole;
  balance_bigint: number;
  currency: string;
  status: 'Active' | 'Suspended';
  
  // Metadatos de Seguridad
  pin_hash?: string; // Only on backend, keeping here for type shape in mock
  failed_attempts?: number;
  locked_until?: string;
  
  issuer_id?: string;
  created_at: string;
  updated_at: string;
  
  // Dynamic fields for UI logic
  active_numbers?: string[]; 
  recent_sale?: {
    target: string;
    amount: number;
  };
}

export interface Bet {
  id: string;
  ticket_code: string;
  user_id: string;
  vendor_id?: string;
  draw_id?: string;
  amount_bigint: number;
  numbers: string;
  status: 'PENDING' | 'WON' | 'LOST' | 'REFUNDED';
  created_at: string;
}

export interface LedgerTransaction {
  id: string;
  ticket_code?: string;
  user_id: string;
  amount_bigint: number;
  balance_before: number;
  balance_after: number;
  type: 'CREDIT' | 'DEBIT' | 'FEE' | 'ADJUSTMENT' | 'COMMISSION_PAYOUT';
  reference_id?: string;
  meta?: any;
  created_at: string;
}

// --- PROFESSIONAL AUDIT SYSTEM ---

export enum AuditSeverity {
  INFO = 'INFO',       // Login, Page View
  SUCCESS = 'SUCCESS', // Transaction Complete
  WARNING = 'WARNING', // Failed Login, Role Collision Attempt
  CRITICAL = 'CRITICAL', // Admin Action, Money Movement
  FORENSIC = 'FORENSIC' // System Integrity, Purge
}

export enum AuditEventType {
  // IDENTITY
  IDENTITY_REGISTER = 'IDENTITY_REGISTER',
  IDENTITY_COLLISION = 'IDENTITY_COLLISION', // Role Violation
  IDENTITY_VERIFICATION = 'IDENTITY_VERIFICATION',
  
  // SESSION
  SESSION_LOGIN = 'SESSION_LOGIN',
  SESSION_FAILED = 'SESSION_FAILED',
  
  // FINANCIAL / GAME
  TX_DEPOSIT = 'TX_DEPOSIT',
  TX_WITHDRAWAL = 'TX_WITHDRAWAL',
  GAME_BET = 'GAME_BET',
  
  // ADMIN
  ADMIN_PURGE = 'ADMIN_PURGE',
  ADMIN_BLOCK = 'ADMIN_BLOCK',
  ADMIN_SETTINGS = 'ADMIN_SETTINGS',
  
  // SYSTEM
  SYSTEM_INTEGRITY = 'SYSTEM_INTEGRITY'
}

export interface AuditLog {
  id: number;
  event_id: string; // UUID
  timestamp: string;
  
  // Actor
  actor_id: string;
  actor_role: string;
  actor_name: string;
  
  // Network
  ip_address: string;
  device_fingerprint: string; // User Agent short
  
  // Event
  type: AuditEventType;
  action: string; // Human readable
  severity: AuditSeverity;
  
  // Data
  target_resource?: string; // ID of object affected
  metadata: any; // JSON Diff or Details
  
  // Security
  hash: string; // Integrity Hash
  previous_hash?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface TransactionResponse {
  tx_id: string;
  ticket_code: string;
  new_balance: number;
  timestamp: string;
}

export interface DrawResultPayload {
  date: string; // YYYY-MM-DD
  drawTime: DrawTime;
  winningNumber: string;
  isReventado: boolean;
  reventadoNumber?: string; // If applicable
  actor_id: string;
}

export interface DrawResult {
    id: string;
    date: string;
    drawTime: DrawTime;
    winningNumber: string;
    isReventado: boolean;
    reventadoNumber?: string;
    status: 'OPEN' | 'CLOSED' | 'VERIFYING';
    created_at: string;
}