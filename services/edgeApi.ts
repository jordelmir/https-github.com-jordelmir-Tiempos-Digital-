
import { supabase } from '../lib/supabaseClient';
import { ApiResponse, AppUser, TransactionResponse, DrawResultPayload } from '../types';

// In a real deployment, these would point to your deployed Edge Functions
const FUNCTION_BASE_URL = '/functions/v1'; 

async function invokeEdgeFunction<T>(functionName: string, body: any): Promise<ApiResponse<T>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    // DEMO MODE INTERCEPTION
    // @ts-ignore - access internal property for demo check
    if (supabase.supabaseUrl === 'https://demo.local') {
        console.log(`[DEMO EDGE] Invocando ${functionName}`, body);
        await new Promise(r => setTimeout(r, 1000)); // Simulate Edge latency

        if (!session) return { error: 'No autorizado (Demo)' };

        // Mock Logic for Demo
        if (functionName === 'createUser') {
            return { 
                data: { 
                    user: { 
                        id: `demo-user-${Date.now()}`, 
                        ...body, 
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        status: 'Active',
                        currency: 'CRC'
                    } as AppUser
                } as any 
            };
        }

        if (functionName === 'purgeSystem') {
             if (body.confirm_phrase !== 'CONFIRMAR PURGA TOTAL') {
                 return { error: 'Frase de confirmación inválida' };
             }
             return { data: { ok: true, message: 'Purga Simulada: Snapshot creado, multisig pendiente.' } as any };
        }

        if (functionName === 'placeBet') {
             return { data: { bet_id: `bet-${Date.now()}` } as any };
        }

        if (functionName === 'rechargeUser') {
          return { 
            data: { 
              tx_id: `tx-rec-${Date.now()}`,
              new_balance: 0, 
              timestamp: new Date().toISOString()
            } as any 
          };
        }

        if (functionName === 'updateGlobalMultiplier') {
            return { message: 'Multiplicador Global actualizado en la red.' } as any;
        }

        if (functionName === 'publishDrawResult') {
            return { message: 'Resultado inyectado en la línea temporal exitosamente.' } as any;
        }

        return { message: 'Función ejecutada exitosamente (Modo Demo)' };
    }
    // END DEMO MODE

    if (!session) {
      return { error: 'No autorizado: Sin sesión activa' };
    }

    const response = await fetch(`${supabase.supabaseUrl}${FUNCTION_BASE_URL}/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(body)
    });

    const result = await response.json();
    
    if (!response.ok) {
      return { error: result.message || 'Error en Edge function' };
    }

    return result as ApiResponse<T>;

  } catch (error: any) {
    return { error: error.message || 'Error de red al invocar Edge function' };
  }
}

export const api = {
  createUser: async (payload: { name: string; email: string; role: string; balance_bigint: number; issuer_id?: string }) => {
    return invokeEdgeFunction<{ user: AppUser }>('createUser', payload);
  },

  purgeSystem: async (payload: { confirm_phrase: string; actor_id?: string }) => {
    return invokeEdgeFunction<{ ok: boolean; message: string }>('purgeSystem', payload);
  },

  placeBet: async (payload: { numbers: string; amount: number; draw_id?: string }) => {
    return invokeEdgeFunction<{ bet_id: string }>('placeBet', payload);
  },

  rechargeUser: async (payload: { target_user_id: string; amount: number; actor_id: string }) => {
    return invokeEdgeFunction<TransactionResponse>('rechargeUser', payload);
  },

  // NEW ADMIN FUNCTIONS
  updateGlobalMultiplier: async (payload: { newValue: number; actor_id: string }) => {
    return invokeEdgeFunction<any>('updateGlobalMultiplier', payload);
  },

  publishDrawResult: async (payload: DrawResultPayload) => {
    return invokeEdgeFunction<any>('publishDrawResult', payload);
  }
};
