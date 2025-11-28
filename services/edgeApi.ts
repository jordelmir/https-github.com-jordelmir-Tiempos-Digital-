
import { supabase, MockDB } from '../lib/supabaseClient';
import { ApiResponse, AppUser, TransactionResponse, DrawResultPayload, GameMode, DrawResult, Bet, AuditEventType, AuditSeverity, WeeklyDataStats, RiskAnalysisReport } from '../types';

// In a real deployment, these would point to your deployed Edge Functions
const FUNCTION_BASE_URL = '/functions/v1'; 

// Helper to generate Cyberpunk Ticket IDs
const generateTicketCode = (prefix: string) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${prefix}-${result.substring(0,3)}-${result.substring(3,6)}`;
};

async function invokeEdgeFunction<T>(functionName: string, body: any): Promise<ApiResponse<T>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    // --- DEMO MODE INTERCEPTOR ---
    // Use true persistent data instead of random mocks
    if ((supabase as any).supabaseUrl === 'https://demo.local' || !session?.access_token.startsWith('ey')) { 
        
        await new Promise(r => setTimeout(r, 600)); // Cinematic latency

        console.log(`[Mock Edge] Invoking ${functionName}`, body);

        // 1. CLOCK
        if (functionName === 'getServerTime') {
             return { data: { 
                 server_time: new Date().toISOString(),
                 draw_config: { mediodia: '12:55:00', tarde: '16:30:00', noche: '19:30:00' }
             } as any };
        }

        // 2. LIVE RESULTS (Reading from persistent DB)
        if (functionName === 'getLiveResults') {
            const results = MockDB.getResults();
            const mapped = results.map((r: any) => ({
                ...r,
                drawTime: r.draw_time,
                winningNumber: r.winning_number,
                isReventado: r.is_reventado,
                reventadoNumber: r.reventado_number
            }));
            return { data: { results: mapped, history: mapped } as any };
        }

        // 3. CREATE USER (Writing to persistent DB)
        if (functionName === 'createUser') {
             const { name, email, role, balance_bigint, issuer_id } = body;
             const newUser = {
                 name, email, role, balance_bigint: balance_bigint ?? 0, issuer_id,
                 id: `user-${Date.now()}`,
                 created_at: new Date().toISOString(),
                 status: 'Active',
                 currency: 'CRC'
             };
             
             // Audit & Save
             MockDB.saveUser(newUser);
             MockDB.addAudit({
                 action: 'CREATE_USER',
                 actor_id: issuer_id,
                 target_resource: newUser.id,
                 severity: 'WARNING',
                 metadata: { role }
             });

             return { data: { user: newUser } as any };
        }

        // 4. PLACE BET (REAL LOGIC)
        if (functionName === 'placeBet') {
             const { numbers, amount, draw_id } = body;
             const user = MockDB.getUsers().find((u: any) => u.id === session?.user?.id);
             
             if (!user) return { error: 'Usuario no encontrado' };
             if (user.balance_bigint < amount) return { error: 'Saldo insuficiente' };

             // Check Risk Limits (Mock Calculation)
             const drawType = draw_id; // e.g. "Noche (19:30)"
             const limits = MockDB.getLimits();
             const specificLimit = limits.find((l: any) => l.draw_type === drawType && l.number === numbers);
             const globalLimit = limits.find((l: any) => l.draw_type === drawType && l.number === 'ALL');
             
             // Calculate current exposure
             const currentBets = MockDB.getBets().filter((b: any) => b.draw_id === drawType && b.numbers === numbers);
             const currentExposure = currentBets.reduce((acc: number, b: any) => acc + b.amount_bigint, 0);
             
             const limit = specificLimit?.max_amount ?? globalLimit?.max_amount ?? Infinity;
             if (limit !== -1 && (currentExposure + amount) > limit) {
                 return { error: `LIMIT_REACHED: Límite de riesgo excedido para ${numbers}.` };
             }

             // Execute Transaction
             user.balance_bigint -= amount;
             MockDB.saveUser(user);

             const newBet = {
                 id: `bet-${Date.now()}`,
                 ticket_code: generateTicketCode('BT'),
                 user_id: user.id,
                 draw_id: drawType,
                 amount_bigint: amount,
                 numbers,
                 status: 'PENDING',
                 created_at: new Date().toISOString()
             };
             
             MockDB.addBet(newBet);
             MockDB.addTransaction({
                 id: `tx-${Date.now()}`,
                 user_id: user.id,
                 amount_bigint: -amount,
                 balance_after: user.balance_bigint,
                 type: 'BET',
                 created_at: new Date().toISOString()
             });

             return { data: { bet_id: newBet.id, ticket_code: newBet.ticket_code } as any };
        }

        // 5. TRANSACTIONS (REAL BALANCE UPDATE)
        if (functionName === 'rechargeUser' || functionName === 'withdrawUser') {
             const { target_user_id, amount, actor_id } = body;
             const targetUser = MockDB.getUsers().find((u: any) => u.id === target_user_id);
             
             if (!targetUser) return { error: 'Usuario destino no encontrado' };

             if (functionName === 'withdrawUser' && targetUser.balance_bigint < amount) {
                 return { error: 'Fondos insuficientes en la cuenta destino' };
             }

             const realAmount = functionName === 'rechargeUser' ? amount : -amount;
             targetUser.balance_bigint += realAmount;
             MockDB.saveUser(targetUser);

             const tx = {
                 id: `tx-${Date.now()}`,
                 ticket_code: generateTicketCode('TX'),
                 user_id: targetUser.id,
                 amount_bigint: realAmount,
                 balance_after: targetUser.balance_bigint,
                 type: realAmount > 0 ? 'CREDIT' : 'DEBIT',
                 created_at: new Date().toISOString(),
                 meta: { actor: actor_id }
             };
             MockDB.addTransaction(tx);

             return { data: { 
                 tx_id: tx.id, 
                 ticket_code: tx.ticket_code, 
                 new_balance: targetUser.balance_bigint 
             } as any };
        }

        // 6. GLOBAL BETS (READ REAL MOCK DATA)
        if (functionName === 'getGlobalBets') {
            const allBets = MockDB.getBets();
            // Augment with user names
            const augmented = allBets.map((b: any) => {
                const u = MockDB.getUsers().find((user: any) => user.id === b.user_id);
                return {
                    ...b,
                    user_name: u ? u.name : 'Desconocido',
                    origin: u?.role === 'Vendedor' ? 'Vendedor' : 'Jugador'
                };
            }).reverse(); // Newest first
            return { data: { bets: augmented } as any };
        }

        // 7. RISK STATS (CALCULATE REAL EXPOSURE)
        if (functionName === 'getRiskStats') {
            const bets = MockDB.getBets().filter((b: any) => b.draw_id === body.draw);
            
            // Aggregate
            const map: Record<string, number> = {};
            bets.forEach((b: any) => {
                map[b.numbers] = (map[b.numbers] || 0) + b.amount_bigint;
            });

            const stats = Object.keys(map).map(num => ({
                number: num,
                total_sold: map[num],
                risk_percentage: 0 // Will be calc'd by frontend against limit
            }));

            // Fill holes for 00-99 if needed or just send active
            // Let's send top active
            return { data: { stats } as any };
        }

        // 8. RISK LIMITS
        if (functionName === 'getRiskLimits') {
            const limits = MockDB.getLimits().filter((l: any) => l.draw_type === body.draw);
            return { data: { limits } as any };
        }

        if (functionName === 'updateRiskLimit') {
            const { draw, number, max_amount } = body;
            MockDB.saveLimit({
                id: `lim-${Date.now()}`,
                draw_type: draw,
                number,
                max_amount,
                created_at: new Date().toISOString()
            });
            return { data: { success: true } as any };
        }

        if (functionName === 'payVendor') {
            const { target_user_id, amount, concept } = body;
            const user = MockDB.getUsers().find((u: any) => u.id === target_user_id);
            if(user) {
                user.balance_bigint += amount; // Assuming payment adds to balance
                MockDB.saveUser(user);
                MockDB.addTransaction({
                    id: `pay-${Date.now()}`,
                    user_id: user.id,
                    amount_bigint: amount,
                    balance_after: user.balance_bigint,
                    type: 'COMMISSION_PAYOUT',
                    meta: { concept }
                });
            }
            return { data: { ticket_code: generateTicketCode('PY') } as any };
        }

        if (functionName === 'checkIdentity') {
            const user = MockDB.getUsers().find((u: any) => u.cedula === body.cedula);
            return { data: user || null } as any;
        }

        if (functionName === 'deleteUser') {
            const user = MockDB.getUsers().find((u: any) => u.id === body.target_user_id);
            if (user) {
                user.status = 'Deleted'; // Soft delete or handle real delete in supabaseClient
                MockDB.saveUser(user);
            }
            return { data: { success: true } as any };
        }

        if (functionName === 'updateUserStatus') {
            const user = MockDB.getUsers().find((u: any) => u.id === body.target_user_id);
            if (user) {
                user.status = body.status;
                MockDB.saveUser(user);
            }
            return { data: { success: true } as any };
        }

        if (functionName === 'publishDrawResult') {
            const { drawTime, winningNumber, isReventado, reventadoNumber, date } = body;
            MockDB.saveResult({
                date,
                draw_time: drawTime,
                winning_number: winningNumber,
                is_reventado: isReventado,
                reventado_number: reventadoNumber,
                status: 'CLOSED',
                created_at: new Date().toISOString()
            });
            
            // Process Payouts (Mock Logic)
            const winningBets = MockDB.getBets().filter((b: any) => 
                b.draw_id === drawTime && 
                b.numbers === winningNumber && 
                b.status === 'PENDING'
            );
            
            winningBets.forEach((bet: any) => {
                bet.status = 'WON';
                const user = MockDB.getUsers().find((u: any) => u.id === bet.user_id);
                if (user) {
                    const prize = bet.amount_bigint * 90; // Standard multiplier
                    user.balance_bigint += prize;
                    MockDB.saveUser(user);
                }
            });
            
            return { data: { success: true, processed: winningBets.length } as any };
        }

        // Default fallback for any other function
        return { message: 'Función simulada correctamente' } as any;
    }

    // --- REAL PRODUCTION CALLS ---
    // Direct DB Calls (RLS)
    if (functionName === 'getLiveResults') {
        const { data, error } = await supabase.from('draw_results').select('*').order('created_at', { ascending: false }).limit(10);
        if (error) throw error;
        // Map snake_case to camelCase
        const mapped = data.map((r: any) => ({
            ...r,
            drawTime: r.draw_time,
            winningNumber: r.winning_number,
            isReventado: r.is_reventado,
            reventadoNumber: r.reventado_number
        }));
        return { data: { results: mapped, history: mapped } as any };
    }

    if (functionName === 'getRiskLimits') {
        const { data, error } = await supabase.from('limits_per_number').select('*').eq('draw_type', body.draw);
        if (error) throw error;
        return { data: { limits: data } as any };
    }

    if (functionName === 'updateRiskLimit') {
        const { draw, number, max_amount } = body;
        const { data: existing } = await supabase.from('limits_per_number').select('id').eq('draw_type', draw).eq('number', number).single();
        if (existing) {
             const { error } = await supabase.from('limits_per_number').update({ max_amount }).eq('id', existing.id);
             if (error) throw error;
        } else {
             const { error } = await supabase.from('limits_per_number').insert([{ draw_type: draw, number, max_amount }]);
             if (error) throw error;
        }
        return { data: { success: true } as any };
    }

    if (functionName === 'publishDrawResult') {
        const { drawTime, winningNumber, isReventado, reventadoNumber, date } = body;
        const { error } = await supabase.from('draw_results').upsert({
            date,
            draw_time: drawTime,
            winning_number: winningNumber,
            is_reventado: isReventado,
            reventado_number: reventadoNumber,
            status: 'CLOSED'
        }, { onConflict: 'date,draw_time' });

        if (error) throw error;
        return { data: { success: true, processed: 0 } as any }; 
    }

    // Edge Functions (via Relay)
    const response = await fetch(`${(supabase as any).supabaseUrl}${FUNCTION_BASE_URL}/${functionName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
      body: JSON.stringify(body)
    });
    return await response.json() as ApiResponse<T>;

  } catch (error: any) {
    console.error("API Error:", error);
    return { error: error.message || 'Error de red' };
  }
}

export const api = {
  createUser: async (payload: any) => invokeEdgeFunction<{ user: AppUser }>('createUser', payload),
  checkIdentityAvailability: async (cedula: string) => invokeEdgeFunction<AppUser | null>('checkIdentity', { cedula }),
  purgeSystem: async (payload: { confirm_phrase: string; actor_id?: string }) => invokeEdgeFunction<{ ok: boolean; message: string }>('purgeSystem', payload),
  getWeeklyDataStats: async (payload: { year: number }) => invokeEdgeFunction<{ stats: WeeklyDataStats[] }>('getWeeklyDataStats', payload),
  purgeWeeklyData: async (payload: { year: number; weekNumber: number; confirmation: string; actor_id: string }) => invokeEdgeFunction<{ success: boolean; message: string }>('purgeWeeklyData', payload),
  placeBet: async (payload: any) => invokeEdgeFunction<{ bet_id: string; ticket_code: string }>('placeBet', payload),
  rechargeUser: async (payload: any) => invokeEdgeFunction<TransactionResponse>('rechargeUser', payload),
  withdrawUser: async (payload: any) => invokeEdgeFunction<TransactionResponse>('withdrawUser', payload),
  payVendor: async (payload: any) => invokeEdgeFunction<{ ticket_code: string }>('payVendor', payload),
  updateGlobalMultiplier: async (payload: any) => invokeEdgeFunction<any>('updateGlobalMultiplier', payload),
  publishDrawResult: async (payload: DrawResultPayload) => invokeEdgeFunction<any>('publishDrawResult', payload),
  updateUserStatus: async (payload: any) => invokeEdgeFunction<any>('updateUserStatus', payload),
  deleteUser: async (payload: any) => invokeEdgeFunction<any>('deleteUser', payload),
  getServerTime: async () => invokeEdgeFunction<{ server_time: string; draw_config: any }>('getServerTime', {}),
  getLiveResults: async () => invokeEdgeFunction<{ results: DrawResult[]; history: DrawResult[] }>('getLiveResults', {}),
  getGlobalBets: async (payload: any) => invokeEdgeFunction<{ bets: Bet[] }>('getGlobalBets', payload),
  generateAIAnalysis: async (payload: { drawTime: string }) => invokeEdgeFunction<any>('generateAIAnalysis', payload),
  getRiskLimits: async (payload: any) => invokeEdgeFunction<any>('getRiskLimits', payload),
  getRiskStats: async (payload: any) => invokeEdgeFunction<any>('getRiskStats', payload),
  updateRiskLimit: async (payload: any) => invokeEdgeFunction<any>('updateRiskLimit', payload),
  generateRiskAnalysis: async (payload: { draw: string }) => invokeEdgeFunction<RiskAnalysisReport>('generateRiskAnalysis', payload)
};
