import React from 'react';
import { Bet } from '../types';
import { formatCurrency, formatDate } from '../constants';

interface TicketViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  bet: Bet | null;
}

export default function TicketViewModal({ isOpen, onClose, bet }: TicketViewModalProps) {
  if (!isOpen || !bet) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
        <div className="relative max-w-sm w-full mx-4 perspective-1000">
            
            {/* CLOSE BUTTON OUTSIDE */}
            <button 
                onClick={onClose}
                className="absolute -top-12 right-0 text-white hover:text-cyber-neon transition-colors"
            >
                <i className="fas fa-times text-2xl"></i>
            </button>

            {/* --- TICKET BODY --- */}
            <div 
                className="bg-[#e2e8f0] text-slate-900 font-mono text-xs relative shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden pb-4 transform rotate-1 animate-in zoom-in-95 duration-300"
                style={{
                    clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)', // Clean top, ragged bottom
                }}
            >
                {/* Holographic Strip */}
                <div className="absolute top-0 bottom-0 left-0 w-3 bg-gradient-to-b from-slate-300 via-white to-slate-300 opacity-80 border-r border-slate-300"></div>

                {/* Content Container */}
                <div className="pl-6 pr-4 py-6 relative">
                    
                    {/* Watermark */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-45 text-[50px] font-black text-slate-400 pointer-events-none opacity-10 border-4 border-slate-400 p-2 rounded">
                        PHRONT
                    </div>

                    {/* Winner Stamp */}
                    {bet.status === 'WON' && (
                        <div className="absolute top-1/3 right-2 -rotate-12 border-4 border-cyber-success text-cyber-success px-2 py-1 font-black text-xl opacity-80 animate-pulse bg-white/50 rounded">
                            GANADOR
                        </div>
                    )}

                    {/* Header */}
                    <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-3">
                        <div>
                            <h4 className="font-black text-lg tracking-tighter leading-none">PHRONT<span className="text-slate-500">.BET</span></h4>
                            <div className="text-[8px] uppercase tracking-widest mt-1">Ticket de Apuesta Oficial</div>
                        </div>
                        <div className="text-right">
                            <i className="fas fa-qrcode text-3xl"></i>
                        </div>
                    </div>
                    
                    {/* Data Grid */}
                    <div className="grid grid-cols-2 gap-y-2 text-[10px] mb-4">
                        <div className="text-slate-500">TICKET_ID</div>
                        <div className="text-right font-bold font-mono tracking-widest bg-black text-white px-1 inline-block ml-auto">{bet.ticket_code || '---'}</div>

                        <div className="text-slate-500">FECHA</div>
                        <div className="text-right font-bold">{formatDate(bet.created_at)}</div>
                        
                        <div className="text-slate-500">SORTEO</div>
                        <div className="text-right font-bold uppercase">{bet.draw_id || 'GENERAL'}</div>
                    </div>

                    {/* Main Numbers */}
                    <div className="border-y-2 border-dashed border-slate-400 py-4 mb-4 flex justify-between items-center">
                        <div className="text-center">
                            <div className="text-[8px] text-slate-500 uppercase">Número</div>
                            <div className="text-4xl font-black tracking-tighter">{bet.numbers}</div>
                        </div>
                        <div className="h-8 w-px bg-slate-300"></div>
                        <div className="text-center">
                             <div className="text-[8px] text-slate-500 uppercase">Monto</div>
                             <div className="text-xl font-bold">{formatCurrency(bet.amount_bigint)}</div>
                        </div>
                    </div>

                    {/* Footer Info */}
                    <div className="text-[9px] flex justify-between items-end">
                        <div>
                            <div className="text-slate-500">ESTADO</div>
                            <div className={`font-bold text-sm ${bet.status === 'WON' ? 'text-green-600' : bet.status === 'PENDING' ? 'text-blue-600' : 'text-slate-400'}`}>
                                {bet.status === 'WON' ? 'PAGADO' : bet.status === 'PENDING' ? 'EN JUEGO' : 'NO PREMIADO'}
                            </div>
                        </div>
                        <div className="text-right">
                             <div className="text-[7px] text-slate-400 font-mono">{bet.id.split('-')[1]}</div>
                        </div>
                    </div>

                    {/* CSS BARCODE */}
                    <div className="h-10 w-full mt-4 bg-[repeating-linear-gradient(90deg,black,black_1px,transparent_1px,transparent_3px,black_3px,black_4px,transparent_4px,transparent_6px)] opacity-90 mix-blend-multiply"></div>
                    <div className="text-center text-[8px] font-mono tracking-[0.5em] mt-1">{bet.ticket_code?.replace(/-/g, '') || '00000000'}</div>
                </div>
                
                {/* Bottom Jagged Edge */}
                <div className="absolute bottom-0 left-0 w-full h-1 bg-transparent" style={{backgroundImage: 'linear-gradient(45deg, transparent 75%, #000 75%), linear-gradient(-45deg, transparent 75%, #000 75%)', backgroundSize: '10px 10px', backgroundPosition: '0 100%'}}></div>
            </div>
            
            <div className="text-center mt-6">
                <p className="text-cyber-neon text-xs font-mono animate-pulse">Ticket Digital Verificado por Blockchain</p>
            </div>
        </div>
    </div>
  );
}