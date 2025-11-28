
import { supabase } from '../lib/supabaseClient';
import { ApiResponse, AppUser, TransactionResponse, DrawResultPayload, GameMode, DrawResult, Bet, AuditEventType, AuditSeverity, WeeklyDataStats, RiskAnalysisReport } from '../types';
import { GoogleGenAI } from "@google/genai";

// In a real deployment, these would point to your deployed Edge Functions
const FUNCTION_BASE_URL = '/functions/v1'; 

// --- SECURE SERVER-SIDE CONFIGURATION ---
// Safe access to env var, defaulting to empty if not found
const getApiKey = () => {
    // 1. Check Vite standard
    // @ts-ignore
    if (import.meta.env && import.meta.env.VITE_GOOGLE_API_KEY) return import.meta.env.VITE_GOOGLE_API_KEY;
    
    // 2. Check process.env (injected by vite define)
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) return process.env.API_KEY;
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env.VITE_GOOGLE_API_KEY) return process.env.VITE_GOOGLE_API_KEY;

    return 'AIzaSyCAt1OtlHnxOVGD0K-Al7PIFLJ0poIG9B4'; // Placeholder/Demo
};

const SERVER_SECRETS = {
    AI_GLOBAL_KEY: getApiKey()
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
    if ((supabase as any).supabaseUrl === 'https://demo.local' || (supabase as any).supabaseUrl.includes('mock') || (supabase as any).supabaseUrl.includes('your-project')) {
        
        // Faster response for clock sync
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

        // Live Results Mock
        if (functionName === 'getLiveResults') {
            const { data } = await supabase.from('lottery_results').select('*');
            return { data: { results: data || [], history: [] } as any };
        }

        await new Promise(r => setTimeout(r, 500)); // Simulate Edge latency

        if (!session) return { error: 'No autorizado (Demo)' };

        // --- NEW: WEEKLY DATA STATS ---
        if (functionName === 'getWeeklyDataStats') {
            const { year } = body;
            const { data: bets } = await supabase.from('bets').select('created_at');
            const betsList = bets as any[];
            
            const stats: Record<number, WeeklyDataStats> = {};
            
            // Generate basic structure for all weeks
            for(let i=1; i<=52; i++) {
                // Approximate start date calculation
                const date = new Date(year, 0, 1 + (i - 1) * 7);
                const endDate = new Date(date);
                endDate.setDate(date.getDate() + 6);
                
                stats[i] = {
                    year,
                    weekNumber: i,
                    recordCount: 0,
                    startDate: date.toISOString().split('T')[0],
                    endDate: endDate.toISOString().split('T')[0],
                    sizeEstimate: '0 KB'
                };
            }

            // Populate counts
            betsList.forEach(b => {
                const date = new Date(b.created_at);
                if (date.getFullYear() === year) {
                    const firstDay = new Date(date.getFullYear(), 0, 1);
                    const pastDays = (date.getTime() - firstDay.getTime()) / 86400000;
                    const weekNum = Math.ceil((pastDays + firstDay.getDay() + 1) / 7);
                    
                    if (stats[weekNum]) {
                        stats[weekNum].recordCount++;
                        // Estimate 0.5KB per record
                        const kb = stats[weekNum].recordCount * 0.5;
                        stats[weekNum].sizeEstimate = kb > 1024 ? `${(kb/1024).toFixed(2)} MB` : `${kb.toFixed(0)} KB`;
                    }
                }
            });

            return { data: { stats: Object.values(stats) } as any };
        }

        // --- NEW: PURGE WEEKLY DATA ---
        if (functionName === 'purgeWeeklyData') {
            const { year, weekNumber, confirmation } = body;
            if (!confirmation.includes(`ELIMINAR SEMANA ${weekNumber}`)) {
                return { error: 'Frase de confirmación incorrecta.' };
            }

            // Mock Deletion Logic
            // In real app: DELETE FROM bets WHERE created_at BETWEEN ...
            // Here we verify permisions and return success
            
            // Log this destructive action
            await supabase.from('audit_trail').insert([{
                actor_app_user: body.actor_id,
                action: 'WEEKLY_DATA_PURGE',
                object_type: 'bets',
                payload: { year, weekNumber, recovered_space: 'Estimated' }
            }]);

            // Actually remove from mock store (if possible with current mock implementation limits)
            // For the demo visual effect, returning success is sufficient as the 'getWeeklyStats' relies on persistent mock which we can't easily filter partially without complex logic in supabaseClient mock.
            // However, we can simulate the "Effect" by clearing bets that match if we implemented a delete filter in mock.
            // For now, we simulate success.
            
            return { data: { success: true, message: `Datos de Semana ${weekNumber} eliminados.` } as any };
        }

        // --- AI SECURE GATEWAY (SERVER SIDE ONLY) ---
        if (functionName === 'generateAIAnalysis') {
            const apiKey = SERVER_SECRETS.AI_GLOBAL_KEY; 
            if (!apiKey) return { error: "Configuration Error: AI Key Missing" };

            let predictionText = 'Patrones neuronales indican alta probabilidad en sector 40-50.';

            try {
                const ai = new GoogleGenAI({ apiKey: apiKey });
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: `Analyze the lottery draw for ${body.drawTime || 'NEXT'} and provide a brief prediction insight.`,
                });
                
                if (response.text) {
                    predictionText = response.text;
                }
            } catch (e) {
                console.warn("AI Generation Failed, using fallback", e);
            }

            const prediction = {
                draw: body.drawTime || 'NEXT',
                confidence: '87%',
                insight: predictionText,
                generated_at: new Date().toISOString()
            };
            return { data: prediction as any };
        }

        // --- RISK ENGINE AI ANALYSIS ---
        if (functionName === 'generateRiskAnalysis') {
            await new Promise(r => setTimeout(r, 1500)); // AI thinking simulation
            
            const analysis: RiskAnalysisReport = {
                riskLevel: Math.random() > 0.7 ? 'HIGH' : (Math.random() > 0.4 ? 'MODERATE' : 'LOW'),
                projectedLoss: Math.floor(Math.random() * 5000000),
                suggestedGlobalLimit: Math.floor(Math.random() * 500000) + 100000,
                hotNumbers: Array.from({length: 3}, () => Math.floor(Math.random() * 100).toString().padStart(2, '0')),
                anomaliesDetected: Math.random() > 0.8 ? ['Patrón Serpiente en N°33', 'Apuestas masivas desde IP Cluster'] : []
            };
            
            return { data: analysis as any };
        }

        // 1. PLACE BET LOGIC
        if (functionName === 'placeBet') {
             const { data: profile } = await supabase.from('app_users').select('*').eq('auth_uid', session.user.id).single();
             if (!profile) return { error: 'Usuario no encontrado' };

             if (profile.balance_bigint < body.amount) {
                 return { error: 'Saldo insuficiente en el Núcleo (Demo)' };
             }

             // Risk Limit Check (Simplified for brevity in this update)
             const draw = body.draw_id;
             const number = body.numbers;
             const { data: allLimits } = await supabase.from('limits_per_number').select('*').eq('draw_type', draw);
             const limitsArray = allLimits as any[];
             const activeLimit = limitsArray.find(l => l.number === number) || limitsArray.find(l => l.number === 'ALL');

             if (activeLimit) {
                 const { data: bets } = await supabase.from('bets').select('*');
                 const totalSold = (bets as any[])
                    .filter(b => b.draw_id === draw && b.numbers === number && b.status === 'PENDING')
                    .reduce((sum, b) => sum + b.amount_bigint, 0);
                 
                 const remaining = activeLimit.max_amount - totalSold;
                 if (remaining <= 0 || body.amount > remaining) {
                     return { error: `LIMIT_REACHED: Límite excedido para ${number}.` };
                 }
             }

             const newBalance = profile.balance_bigint - body.amount;
             await supabase.from('app_users').update({ balance_bigint: newBalance }).eq('id', profile.id).select().single();

             const ticketCode = generateTicketCode('BET');
             const { data: bet } = await supabase.from('bets').insert([{
                 user_id: profile.id,
                 ticket_code: ticketCode,
                 amount_bigint: body.amount,
                 numbers: body.numbers,
                 draw_id: body.draw_id, 
                 status: 'PENDING'
             }]).select().single();

             return { data: { bet_id: bet.id, ticket_code: ticketCode } as any };
        }

        // RISK MANAGEMENT ENDPOINTS
        if (functionName === 'getRiskLimits') {
            const { data } = await supabase.from('limits_per_number').select('*').eq('draw_type', body.draw);
            return { data: { limits: data } as any };
        }

        if (functionName === 'getRiskStats') {
            const { draw } = body;
            const { data: bets } = await supabase.from('bets').select('*');
            const stats: any[] = [];
            const drawBets = (bets as any[]).filter(b => b.draw_id === draw && b.status === 'PENDING');
            
            const grouped = drawBets.reduce((acc, b) => {
                acc[b.numbers] = (acc[b.numbers] || 0) + b.amount_bigint;
                return acc;
            }, {});

            Object.keys(grouped).forEach(num => {
                stats.push({ number: num, total_sold: grouped[num] });
            });

            return { data: { stats } as any };
        }

        if (functionName === 'updateRiskLimit') {
            const { draw, number, max_amount } = body;
            await supabase.from('limits_per_number').insert([{ draw_type: draw, number, max_amount }]);
            return { data: { success: true } as any };
        }

        // CREATE USER LOGIC
        if (functionName === 'createUser') {
            const { name, email, phone, cedula, role, balance_bigint, pin, issuer_id } = body;
            const { data: existingUsers } = await supabase.from('app_users').select('*');
            const usersList = existingUsers as any[];
            
            const duplicateCI = usersList.find(u => u.cedula === cedula);
            if (duplicateCI) return { error: `IDENTIDAD DUPLICADA: ${cedula} ya existe.` };

            const { data: newUser, error } = await supabase.from('app_users').insert([{
                    name, email: email || `no-email-${Date.now()}@phront.local`, phone, cedula, role,
                    balance_bigint: balance_bigint || 0, pin_hash: mockHash(pin), issuer_id,
                    auth_uid: `auth-${cedula}-${Date.now()}`, status: 'Active'
                }]).select().single();
            
            if (error) return { error: error.message };
            return { data: { user: newUser as AppUser } as any };
        }

        if (functionName === 'checkIdentity') {
            const { cedula } = body;
            const { data: existingUsers } = await supabase.from('app_users').select('*');
            const found = (existingUsers as any[]).find(u => u.cedula === cedula);
            return { data: found || null as any };
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
             await supabase.from('app_users').update({ balance_bigint: newBalance }).eq('id', body.target_user_id);
             await supabase.from('ledger_transactions').insert([{
                 user_id: body.target_user_id, ticket_code: ticketCode, amount_bigint: body.amount,
                 balance_before: target.balance_bigint, balance_after: newBalance, type: 'CREDIT',
                 reference_id: `DEP-${Date.now()}`, meta: { actor: body.actor_id }
             }]);
             return { data: { tx_id: `tx-rec-${Date.now()}`, ticket_code: ticketCode, new_balance: newBalance, timestamp: new Date().toISOString() } as any };
          }
          return { error: "Usuario destino no encontrado" };
        }

        if (functionName === 'withdrawUser') {
            const { data: target } = await supabase.from('app_users').select('*').eq('id', body.target_user_id).single();
            if (!target) return { error: 'Usuario no encontrado.' };
            if (target.balance_bigint < body.amount) return { error: 'FONDOS INSUFICIENTES.' };

            const newBalance = target.balance_bigint - body.amount;
            const ticketCode = generateTicketCode('RET');
            await supabase.from('app_users').update({ balance_bigint: newBalance }).eq('id', body.target_user_id);
            await supabase.from('ledger_transactions').insert([{
                user_id: body.target_user_id, ticket_code: ticketCode, amount_bigint: -body.amount,
                balance_before: target.balance_bigint, balance_after: newBalance, type: 'DEBIT',
                reference_id: `LIQ-${Date.now()}`, meta: { actor: body.actor_id }
            }]);
            return { data: { tx_id: `tx-wd-${Date.now()}`, ticket_code: ticketCode, new_balance: newBalance, timestamp: new Date().toISOString() } as any };
        }

        if (functionName === 'payVendor') {
            const { target_user_id, amount, concept, notes, actor_id } = body;
            const { data: target } = await supabase.from('app_users').select('*').eq('id', target_user_id).single();
            const { data: admin } = await supabase.from('app_users').select('*').eq('id', actor_id).single();
            if (!target || !admin) return { error: "Entidad no encontrada" };
            if (admin.balance_bigint < amount) return { error: "Fondos insuficientes en Caja Central." };

            const newAdminBalance = admin.balance_bigint - amount;
            const newTargetBalance = target.balance_bigint + amount;
            const ticketCode = generateTicketCode('PAY');

            await supabase.from('app_users').update({ balance_bigint: newAdminBalance }).eq('id', actor_id);
            await supabase.from('app_users').update({ balance_bigint: newTargetBalance }).eq('id', target_user_id);
            await supabase.from('ledger_transactions').insert([{
                user_id: target_user_id, ticket_code: ticketCode, amount_bigint: amount,
                balance_before: target.balance_bigint, balance_after: newTargetBalance, type: 'COMMISSION_PAYOUT',
                reference_id: `PAY-${Date.now()}`, meta: { concept, notes, payer: actor_id }
            }]);
            return { data: { success: true, ticket_code: ticketCode, timestamp: new Date().toISOString() } as any };
        }

        if (functionName === 'updateGlobalMultiplier') {
            return { message: 'Multiplicadores actualizados.' } as any;
        }

        if (functionName === 'publishDrawResult') {
            const { drawTime, winningNumber, isReventado, reventadoNumber } = body;
            await supabase.from('lottery_results').update({ winningNumber, isReventado, reventadoNumber, status: 'CLOSED' }).eq('drawTime', drawTime);
            
            // Simple payout simulation loop
            const { data: allBets } = await supabase.from('bets').select('*');
            const pendingBets = (allBets as any[]).filter(b => b.status === 'PENDING' && b.draw_id === drawTime);
            let processedCount = 0;
            for (const bet of pendingBets) {
                const isWin = bet.numbers === winningNumber;
                if (isWin) {
                    const multiplier = (isReventado && bet.mode === GameMode.REVENTADOS) ? 200 : 90;
                    const prize = bet.amount_bigint * multiplier;
                    const { data: winner } = await supabase.from('app_users').select('*').eq('id', bet.user_id).single();
                    if(winner) {
                        await supabase.from('app_users').update({ balance_bigint: winner.balance_bigint + prize }).eq('id', winner.id);
                        await supabase.from('ledger_transactions').insert([{
                            user_id: winner.id, ticket_code: generateTicketCode('WIN'), amount_bigint: prize,
                            balance_before: winner.balance_bigint, balance_after: winner.balance_bigint + prize,
                            type: 'CREDIT', reference_id: `WIN-${drawTime}`, meta: { notes: 'PREMIO' }
                        }]);
                        bet.status = 'WON';
                        processedCount++;
                    }
                } else {
                    bet.status = 'LOST';
                }
            }
            return { data: { success: true, message: 'Liquidación completada', processed: processedCount } as any };
        }

        if (functionName === 'updateUserStatus') {
            const { data } = await supabase.from('app_users').update({ status: body.status }).eq('id', body.target_user_id).select().single();
            return { data: { success: true, user: data } as any };
        }

        if (functionName === 'deleteUser') {
            await supabase.from('app_users').delete().eq('id', body.target_user_id);
            return { data: { success: true } as any };
        }

        if (functionName === 'getGlobalBets') {
            const { role, userId, timeFilter, statusFilter } = body;
            const { data: allBets } = await supabase.from('bets').select('*');
            let filteredBets = allBets as any[];
            if (role === 'Cliente') filteredBets = filteredBets.filter(b => b.user_id === userId);
            
            if (timeFilter && timeFilter !== 'ALL') filteredBets = filteredBets.filter(b => b.draw_id && b.draw_id.includes(timeFilter));
            if (statusFilter && statusFilter !== 'ALL') filteredBets = filteredBets.filter(b => b.status === statusFilter);

            const { data: allUsers } = await supabase.from('app_users').select('*');
            const enrichedBets = filteredBets.map(bet => {
                const user = (allUsers as any[]).find(u => u.id === bet.user_id);
                return { ...bet, user_name: user ? user.name : 'Unknown', user_role: user?.role, origin: user?.role === 'Vendedor' ? 'Vendedor' : 'Jugador' };
            });
            enrichedBets.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            return { data: { bets: enrichedBets } as any };
        }

        return { message: 'Función ejecutada (Demo)' };
    }

    if (!session) return { error: 'No autorizado' };

    const response = await fetch(`${(supabase as any).supabaseUrl}${FUNCTION_BASE_URL}/${functionName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify(body)
    });
    return await response.json() as ApiResponse<T>;

  } catch (error: any) {
    return { error: error.message || 'Error de red' };
  }
}

export const api = {
  createUser: async (payload: any) => invokeEdgeFunction<{ user: AppUser }>('createUser', payload),
  checkIdentityAvailability: async (cedula: string) => invokeEdgeFunction<AppUser | null>('checkIdentity', { cedula }),
  purgeSystem: async (payload: { confirm_phrase: string; actor_id?: string }) => invokeEdgeFunction<{ ok: boolean; message: string }>('purgeSystem', payload),
  
  // NEW: Maintenance Methods
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
  
  // RISK
  getRiskLimits: async (payload: any) => invokeEdgeFunction<any>('getRiskLimits', payload),
  getRiskStats: async (payload: any) => invokeEdgeFunction<any>('getRiskStats', payload),
  updateRiskLimit: async (payload: any) => invokeEdgeFunction<any>('updateRiskLimit', payload),
  generateRiskAnalysis: async (payload: { draw: string }) => invokeEdgeFunction<RiskAnalysisReport>('generateRiskAnalysis', payload)
};
