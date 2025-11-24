
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
  email: string;
  name: string;
  role: UserRole;
  balance_bigint: number;
  currency: string;
  status: 'Active' | 'Suspended';
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
  user_id: string;
  amount_bigint: number;
  balance_before: number;
  balance_after: number;
  type: 'CREDIT' | 'DEBIT' | 'FEE' | 'ADJUSTMENT';
  reference_id?: string;
  meta?: any;
  created_at: string;
}

export interface AuditLog {
  id: number;
  actor_app_user: string;
  action: string;
  object_type: string;
  object_id: string;
  payload: any;
  created_at: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface TransactionResponse {
  tx_id: string;
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
