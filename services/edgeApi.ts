
import { supabase } from '../lib/supabaseClient';
import { ApiResponse, AppUser, TransactionResponse, DrawResultPayload, GameMode, DrawResult, Bet, AuditEventType, AuditSeverity } from '../types';

// In a real deployment, these would point to your deployed Edge Functions
const FUNCTION_BASE_URL = '/functions/v1'; 

// --- SECURE SERVER-SIDE CONFIGURATION (SIMULATED) ---
// In Production, this comes from process.env.AI_GLOBAL_KEY on the server
const SERVER_SECRETS = {
    AI_GLOBAL_KEY: 'AIzaSyCAt1OtlHnxOVGD0K-Al7PIFLJ0poIG9B4' // Simulating Secure Vault
};

// Helper to generate Cyberpunk Ticket IDs
const generateTicketCode = (prefix: string) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${prefix}-${result.substring(0,3)}-${result.substring(3,6)}`;
};

// Simulate simple hashing for demo purposes (In prod: use bcrypt)
const mockHash = (pin: string) => `hash_sha256_${pin.split('').reverse().join('')}_salt_${Date.now()}`;

async function invokeEdgeFunction<T>(functionName: string, body: any): Promise<ApiResponse<T>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    // DEMO MODE INTERCEPTION
    // @ts-ignore - access internal property for demo check
    if ((supabase as any).supabaseUrl === 'https://demo.local' || (supabase as any).supabaseUrl.includes('mock')) {
        // console.log(`[DEMO EDGE] Invocando ${functionName}`, body); // Reduced log noise
        
        // Faster response for clock sync
        if (functionName === 'getServerTime') {
             return { data: { 
                 server_time: new Date().toISOString(),
                 // Mock Draw Times: 12:55, 16:30, 19:30
                 // We return the config, client logic handles the rest
                 draw_config: {
                     mediodia: '12:55:00',
                     tarde: '16:30:00',
                     noche: '19:30:00'
                 }
             } as any };
        }

        // Live Results Mock - READ FROM PERSISTENT MOCK TABLE
        if (functionName === 'getLiveResults') {
            const { data } = await supabase.from('lottery_results').select('*');
            return { data: { results: data || [], history: [] } as any };
        }

        await new Promise(r => setTimeout(r, 800)); // Simulate Edge latency for other calls

        if (!session) return { error: 'No autorizado (Demo)' };

        // --- AI SECURE GATEWAY (SERVER SIDE ONLY) ---
        if (functionName === 'generateAIAnalysis') {
            // This function runs on the "Server", so it can access SERVER_SECRETS
            // It does NOT expose the key to the client.
            
            const apiKey = SERVER_SECRETS.AI_GLOBAL_KEY; 
            if (!apiKey) return { error: "Configuration Error: AI Key Missing" };

            // Simulate AI Processing
            const prediction = {
                draw: body.drawTime || 'NEXT',
                confidence: '87%',
                insight: 'Patrones neuronales indican alta probabilidad en sector 40-50.',
                generated_at: new Date().toISOString()
            };

            // SECURITY AUDIT: Log AI usage as per architecture requirements
            const { data: user } = await supabase.from('app_users').select('name, role').eq('auth_uid', session.user.id).single();
            
            await supabase.from('audit_trail').insert([{
                actor_id: session.user.id,
                actor_role: user?.role || 'Unknown',
                actor_name: user?.name || 'System AI',
                ip_address: 'internal', 
                device_fingerprint: 'AI_GATEWAY',
                type: AuditEventType.AI_OPERATION,
                action: 'AI_PREDICTION_GENERATED',
                severity: AuditSeverity.INFO,
                target_resource: 'GEMINI_PRO_3',
                metadata: { 
                    model: 'gemini-3-pro-preview',
                    request_draw: body.drawTime,
                    confidence: prediction.confidence
                },
                hash: `sha256-ai-${Date.now()}` // Simulated integrity hash
            }]);

            return { data: prediction as any };
        }

        // 1. PLACE BET LOGIC (Full Simulation)
        if (functionName === 'placeBet') {
             // A. Get User
             const { data: profile } = await supabase
                .from('app_users')
                .select('*')
                .eq('auth_uid', session.user.id)
                .single();

             if (!profile) return { error: 'Usuario no encontrado' };

             // B. Check Balance
             if (profile.balance_bigint < body.amount) {
                 return { error: 'Saldo insuficiente en el Núcleo (Demo)' };
             }

             // C. Deduct Balance (Atomic Simulation)
             const newBalance = profile.balance_bigint - body.amount;
             await supabase
                .from('app_users')
                .update({ balance_bigint: newBalance })
                .eq('id', profile.id)
                .select()
                .single();

             // D. Insert Bet with TICKET CODE
             const ticketCode = generateTicketCode('BET');
             const { data: bet } = await supabase.from('bets').insert([{
                 user_id: profile.id,
                 ticket_code: ticketCode,
                 amount_bigint: body.amount,
                 numbers: body.numbers,
                 draw_id: body.draw_id, // e.g. 'Noche (19:30)'
                 status: 'PENDING'
             }]).select().single();

             return { data: { bet_id: bet.id, ticket_code: ticketCode } as any };
        }

        // 2. CREATE USER LOGIC (IDENTITY PROVISIONING - ENHANCED ANTI-DUPLICATION)
        if (functionName === 'createUser') {
            const { name, email, phone, cedula, role, balance_bigint, pin, issuer_id } = body;

            // A. Validation Rules
            if (role === 'SuperAdmin') return { error: "PROHIBIDO: Creación de SuperAdmin no autorizada por consola." };
            if (role === 'Vendedor' && !email) return { error: "Requerido: Email obligatorio para Vendedores." };
            if (!cedula || !phone || !pin) return { error: "Datos incompletos." };

            // B. Uniqueness & Role Integrity Check (Simulated against MOCK DB)
            const { data: existingUsers } = await supabase.from('app_users').select('*');
            const usersList = existingUsers as any[];
            
            // Check CI Collision
            const duplicateCI = usersList.find(u => u.cedula === cedula);
            
            if (duplicateCI) {
                // REGLA DE ORO: Bloqueo de Doble Rol
                if (duplicateCI.role === role) {
                    return { error: `IDENTIDAD DUPLICADA: La cédula ${cedula} ya está activa como ${role}.` };
                } else {
                    // Cross-Role Collision (Critical)
                    return { 
                        error: `CONFLICTO DE ROL CRÍTICO: Esta identidad ya existe como [${duplicateCI.role.toUpperCase()}]. Solo el SuperAdministrador puede liberar la identidad para cambiar de rol.` 
                    };
                }
            }

            const duplicatePhone = usersList.find(u => u.phone === phone);
            if (duplicatePhone) return { error: `ERROR: Teléfono ${phone} ya vinculado a otra identidad.` };

            // C. PIN Hashing
            const pin_hash = mockHash(pin);

            // D. Creation
            const { data: newUser, error } = await supabase
                .from('app_users')
                .insert([{
                    name,
                    email: email || `no-email-${Date.now()}@phront.local`, // Dummy email for auth linkage if missing
                    phone,
                    cedula,
                    role,
                    balance_bigint: balance_bigint || 0,
                    pin_hash,
                    issuer_id,
                    auth_uid: `auth-${cedula}-${Date.now()}`, // Mock Auth Link
                    status: 'Active'
                }])
                .select()
                .single();
            
            if (error) return { error: error.message };

            return { 
                data: { 
                    user: newUser as AppUser
                } as any 
            };
        }

        // REAL-TIME CHECK IDENTITY (For UI Warnings)
        if (functionName === 'checkIdentity') {
            const { cedula } = body;
            // Global Fetch from mock
            const { data: existingUsers } = await supabase.from('app_users').select('*');
            const usersList = existingUsers as any[];
            const found = usersList.find(u => u.cedula === cedula);
            
            if (found) {
                return { data: found as any };
            }
            return { data: null as any };
        }

        if (functionName === 'purgeSystem') {
             if (body.confirm_phrase !== 'CONFIRMAR PURGA TOTAL') {
                 return { error: 'Frase de confirmación inválida' };
             }
             return { data: { ok: true, message: 'Purga Simulada: Snapshot creado, multisig pendiente.' } as any };
        }

        if (functionName === 'rechargeUser') {
          const { data: target } = await supabase.from('app_users').select('*').eq('id', body.target_user_id).single();
          if (target) {
             const newBalance = target.balance_bigint + body.amount;
             const ticketCode = generateTicketCode('DEP');

             // 1. Update User
             await supabase.from('app_users').update({ balance_bigint: newBalance }).eq('id', body.target_user_id);
             
             // 2. Create Ledger Entry
             await supabase.from('ledger_transactions').insert([{
                 user_id: body.target_user_id,
                 ticket_code: ticketCode,
                 amount_bigint: body.amount,
                 balance_before: target.balance_bigint,
                 balance_after: newBalance,
                 type: 'CREDIT',
                 reference_id: `DEP-${Date.now().toString().slice(-6)}`,
                 meta: { actor: body.actor_id }
             }]);

             return { 
                data: { 
                  tx_id: `tx-rec-${Date.now()}`,
                  ticket_code: ticketCode,
                  new_balance: newBalance, 
                  timestamp: new Date().toISOString()
                } as any 
              };
          }
          return { error: "Usuario destino no encontrado" };
        }

        if (functionName === 'withdrawUser') {
            // 1. Fetch Target User
            const { data: target } = await supabase
                .from('app_users')
                .select('*')
                .eq('id', body.target_user_id)
                .single();
            
            if (!target) return { error: 'Usuario no encontrado en la red.' };
            
            // 2. Validate Funds
            if (target.balance_bigint < body.amount) {
                return { error: 'FONDOS INSUFICIENTES: Operación cancelada por el Núcleo.' };
            }

            // 3. Calculate New Balance
            const newBalance = target.balance_bigint - body.amount;
            const ticketCode = generateTicketCode('RET');

            // 4. Update User Balance (Atomic Update Simulation)
            await supabase
                .from('app_users')
                .update({ balance_bigint: newBalance })
                .eq('id', body.target_user_id);
            
            // 5. Create Ledger Transaction
            await supabase.from('ledger_transactions').insert([{
                user_id: body.target_user_id,
                ticket_code: ticketCode,
                amount_bigint: -body.amount, // Negative for debit visual logic
                balance_before: target.balance_bigint,
                balance_after: newBalance,
                type: 'DEBIT',
                reference_id: `LIQ-${Date.now().toString().slice(-6)}`,
                meta: { actor: body.actor_id, device: 'TERMINAL_V3', method: 'CASH_OUT' }
            }]);
  
            return { 
              data: { 
                tx_id: `tx-wd-${Date.now()}`,
                ticket_code: ticketCode,
                new_balance: newBalance, 
                timestamp: new Date().toISOString()
              } as any 
            };
        }

        if (functionName === 'payVendor') {
            const { target_user_id, amount, concept, notes, actor_id } = body;

            const { data: target } = await supabase.from('app_users').select('*').eq('id', target_user_id).single();
            const { data: admin } = await supabase.from('app_users').select('*').eq('id', actor_id).single();

            if (!target || !admin) return { error: "Entidad no encontrada" };

            if (admin.balance_bigint < amount) {
                return { error: "Fondos insuficientes en Caja Central (Admin)." };
            }

            const newAdminBalance = admin.balance_bigint - amount;
            const newTargetBalance = target.balance_bigint + amount;
            const ticketCode = generateTicketCode('PAY');

            await supabase.from('app_users').update({ balance_bigint: newAdminBalance }).eq('id', actor_id);
            await supabase.from('app_users').update({ balance_bigint: newTargetBalance }).eq('id', target_user_id);

            await supabase.from('ledger_transactions').insert([{
                user_id: target_user_id,
                ticket_code: ticketCode,
                amount_bigint: amount,
                balance_before: target.balance_bigint,
                balance_after: newTargetBalance,
                type: 'COMMISSION_PAYOUT',
                reference_id: `PAY-${Date.now().toString().slice(-6)}`,
                meta: { 
                    concept, 
                    notes, 
                    payer: actor_id,
                    system_debit: amount 
                }
            }]);

            return {
                data: {
                    success: true,
                    ticket_code: ticketCode,
                    timestamp: new Date().toISOString()
                } as any
            };
        }

        if (functionName === 'updateGlobalMultiplier') {
            return { message: 'Multiplicador Global actualizado en la red.' } as any;
        }

        // --- LOGICA DE LIQUIDACIÓN DE RESULTADOS ---
        if (functionName === 'publishDrawResult') {
            const { drawTime, winningNumber, isReventado, reventadoNumber, actor_id } = body;
            console.log(`[EDGE] LIQUIDANDO RESULTADOS: ${drawTime} - Número: ${winningNumber}`);

            // 1. UPDATE LIVE RESULTS STORE
            await supabase.from('lottery_results').update({
                winningNumber,
                isReventado,
                reventadoNumber: isReventado ? reventadoNumber : undefined,
                status: 'CLOSED'
            }).eq('drawTime', drawTime);

            // 2. Get all Pending Bets for this Draw
            const { data: allBets } = await supabase.from('bets').select('*');
            const pendingBets = (allBets as any[]).filter(b => 
                b.status === 'PENDING' && b.draw_id === drawTime
            );

            let processedCount = 0;

            // 3. Iterate and Settle
            for (const bet of pendingBets) {
                const isWin = bet.numbers === winningNumber;
                
                if (isWin) {
                    // Calculate Prize
                    let multiplier = 90; // Standard
                    if (isReventado && bet.mode === GameMode.REVENTADOS) {
                        multiplier = 200;
                    }
                    
                    const prizeAmount = bet.amount_bigint * multiplier;

                    // Update User Balance
                    const { data: winner } = await supabase.from('app_users').select('*').eq('id', bet.user_id).single();
                    if (winner) {
                        const newBalance = winner.balance_bigint + prizeAmount;
                        await supabase.from('app_users').update({ balance_bigint: newBalance }).eq('id', winner.id);
                        
                        // Update Bet Status
                        bet.status = 'WON'; 
                        // Mock DB hack to update array item:
                        const betIndex = (allBets as any[]).findIndex(b => b.id === bet.id);
                        if (betIndex >= 0) (allBets as any[])[betIndex].status = 'WON';

                        // Log Transaction
                        await supabase.from('ledger_transactions').insert([{
                            user_id: winner.id,
                            ticket_code: generateTicketCode('WIN'),
                            amount_bigint: prizeAmount,
                            balance_before: winner.balance_bigint,
                            balance_after: newBalance,
                            type: 'CREDIT', // Prize is a credit
                            reference_id: `WIN-${drawTime.split(' ')[0].toUpperCase()}-${winningNumber}`,
                            meta: { notes: 'PREMIO LOTERIA', draw: drawTime }
                        }]);
                        
                        processedCount++;
                    }
                } else {
                    // Mark as LOST
                    const betIndex = (allBets as any[]).findIndex(b => b.id === bet.id);
                    if (betIndex >= 0) (allBets as any[])[betIndex].status = 'LOST';
                }
            }

            return { 
                data: { 
                    success: true, 
                    message: 'Liquidación completada',
                    processed: processedCount
                } as any 
            };
        }

        if (functionName === 'updateUserStatus') {
            const { data, error } = await supabase
                .from('app_users')
                .update({ status: body.status })
                .eq('id', body.target_user_id)
                .select()
                .single();
            
            if (error) return { error: "Error actualizando estado del nodo." };
            return { data: { success: true, user: data } as any };
        }

        if (functionName === 'deleteUser') {
            if (!body.confirmation) return { error: "Confirmación requerida." };
            const { error } = await supabase.from('app_users').delete().eq('id', body.target_user_id);
            if (error) return { error: "Error eliminando nodo." };
            return { data: { success: true } as any };
        }

        // NEW: Server Clock
        if (functionName === 'getServerTime') {
             return { data: { 
                 server_time: new Date().toISOString(),
                 draw_config: {
                     mediodia: '12:55:00',
                     tarde: '16:30:00',
                     noche: '19:30:00'
                 }
             } as any };
        }

        // NEW: Live Results
        if (functionName === 'getLiveResults') {
            const { data } = await supabase.from('lottery_results').select('*');
            return { data: { results: data || [], history: [] } as any };
        }

        // NEW: GLOBAL BETS FETCHING (With Roles)
        if (functionName === 'getGlobalBets') {
            const { role, userId, timeFilter, statusFilter } = body;
            
            // 1. Get all Bets
            const { data: allBets } = await supabase.from('bets').select('*');
            let filteredBets = allBets as any[];

            // 2. Role-Based Visibility
            if (role === 'Cliente') {
                filteredBets = filteredBets.filter(b => b.user_id === userId);
            } else if (role === 'Vendedor') {
                // Mock: Get clients issued by this vendor
                const { data: clients } = await supabase.from('app_users').select('*');
                const myClientIds = (clients as any[])
                    .filter(c => c.issuer_id === userId)
                    .map(c => c.id);
                // Vendor sees their own bets + their clients' bets
                filteredBets = filteredBets.filter(b => b.user_id === userId || myClientIds.includes(b.user_id));
            }
            // SuperAdmin sees all (no filter needed)

            // 3. Time/Draw Filter
            if (timeFilter && timeFilter !== 'ALL') {
                filteredBets = filteredBets.filter(b => b.draw_id && b.draw_id.includes(timeFilter));
            }

            // 4. Status Filter
            if (statusFilter && statusFilter !== 'ALL') {
                filteredBets = filteredBets.filter(b => b.status === statusFilter);
            }

            // 5. Attach User Metadata (Mock Join)
            const { data: allUsers } = await supabase.from('app_users').select('*');
            const enrichedBets = filteredBets.map(bet => {
                const user = (allUsers as any[]).find(u => u.id === bet.user_id);
                return {
                    ...bet,
                    user_name: user ? user.name : 'Usuario Desconocido',
                    user_role: user ? user.role : 'Desconocido',
                    origin: user ? (user.role === 'Vendedor' ? 'Vendedor' : 'Jugador') : 'N/A'
                };
            });

            // Sort by Date Desc
            enrichedBets.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            return { data: { bets: enrichedBets } as any };
        }

        return { message: 'Función ejecutada exitosamente (Modo Demo)' };
    }
    // END DEMO MODE

    if (!session) {
      return { error: 'No autorizado: Sin sesión activa' };
    }

    const response = await fetch(`${(supabase as any).supabaseUrl}${FUNCTION_BASE_URL}/${functionName}`, {
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
  createUser: async (payload: { name: string; email?: string; phone: string; cedula: string; role: string; balance_bigint: number; pin: string; issuer_id?: string }) => {
    return invokeEdgeFunction<{ user: AppUser }>('createUser', payload);
  },

  checkIdentityAvailability: async (cedula: string) => {
    return invokeEdgeFunction<AppUser | null>('checkIdentity', { cedula });
  },

  purgeSystem: async (payload: { confirm_phrase: string; actor_id?: string }) => {
    return invokeEdgeFunction<{ ok: boolean; message: string }>('purgeSystem', payload);
  },

  placeBet: async (payload: { numbers: string; amount: number; draw_id?: string }) => {
    return invokeEdgeFunction<{ bet_id: string; ticket_code: string }>('placeBet', payload);
  },

  rechargeUser: async (payload: { target_user_id: string; amount: number; actor_id: string }) => {
    return invokeEdgeFunction<TransactionResponse>('rechargeUser', payload);
  },

  withdrawUser: async (payload: { target_user_id: string; amount: number; actor_id: string }) => {
    return invokeEdgeFunction<TransactionResponse>('withdrawUser', payload);
  },
  
  payVendor: async (payload: { target_user_id: string; amount: number; concept: string; notes: string; actor_id: string }) => {
    return invokeEdgeFunction<{ ticket_code: string }>('payVendor', payload);
  },

  updateGlobalMultiplier: async (payload: { newValue: number; actor_id: string }) => {
    return invokeEdgeFunction<any>('updateGlobalMultiplier', payload);
  },

  publishDrawResult: async (payload: DrawResultPayload) => {
    return invokeEdgeFunction<any>('publishDrawResult', payload);
  },

  updateUserStatus: async (payload: { target_user_id: string; status: 'Active' | 'Suspended'; actor_id: string }) => {
    return invokeEdgeFunction<any>('updateUserStatus', payload);
  },

  deleteUser: async (payload: { target_user_id: string; confirmation: string; actor_id: string }) => {
    return invokeEdgeFunction<any>('deleteUser', payload);
  },

  getServerTime: async () => {
      return invokeEdgeFunction<{ server_time: string; draw_config: any }>('getServerTime', {});
  },

  getLiveResults: async () => {
      return invokeEdgeFunction<{ results: DrawResult[]; history: DrawResult[] }>('getLiveResults', {});
  },

  getGlobalBets: async (payload: { role: string; userId: string; timeFilter?: string; statusFilter?: string }) => {
      return invokeEdgeFunction<{ bets: Bet[] }>('getGlobalBets', payload);
  },

  generateAIAnalysis: async (payload: { drawTime: string }) => {
      return invokeEdgeFunction<any>('generateAIAnalysis', payload);
  }
};