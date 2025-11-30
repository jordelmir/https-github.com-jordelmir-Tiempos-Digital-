
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bet } from '../types';
import { formatCurrency, formatDate } from '../constants';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface TicketViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  bet: Bet | null;
}

export default function TicketViewModal({ isOpen, onClose, bet }: TicketViewModalProps) {
  useBodyScrollLock(isOpen); // LOCK SCROLL
  const [isClosing, setIsClosing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // --- AUTO-CLOSE LOGIC ---
  useEffect(() => {
    if (isOpen && !isHovered) {
        const timer = setTimeout(() => {
            triggerClose();
        }, 6000); // 6 Seconds auto-close
        return () => clearTimeout(timer);
    }
  }, [isOpen, isHovered]);

  const triggerClose = () => {
      setIsClosing(true);
      setTimeout(() => {
          onClose();
          setIsClosing(false);
      }, 400); // Wait for exit animation
  };

  if (!isOpen || !bet) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-300">
        
        {/* CLICK OUTSIDE TO CLOSE */}
        <div className="absolute inset-0" onClick={triggerClose}></div>

        <div 
            className={`relative max-w-sm w-full mx-4 perspective-1000 z-10 transition-all duration-500 ease-out transform
                ${isClosing 
                    ? 'translate-y-[120%] rotate-6 opacity-0' // Exit: Fall down & rotate (Tear off)
                    : 'translate-y-0 rotate-0 opacity-100' // Stable
                }
                ${!isClosing ? 'animate-[printSlide_0.6s_cubic-bezier(0.22,1,0.36,1)]' : ''} // Enter: Slide down (Print)
            `}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            
            {/* CLOSE BUTTON (Floating) */}
            <button 
                onClick={triggerClose}
                className="absolute -top-10 right-0 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white text-white hover:text-black transition-all duration-300 backdrop-blur-md border border-white/20 shadow-lg group"
            >
                <i className="fas fa-times text-sm group-hover:rotate-90 transition-transform"></i>
            </button>

            {/* --- TICKET BODY --- */}
            <div 
                className="bg-[#f1f5f9] text-slate-900 font-mono text-xs relative shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden"
                style={{
                    clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
                    maskImage: 'radial-gradient(circle at center bottom, transparent 6px, black 7px)',
                    maskSize: '20px 100%',
                    maskPosition: 'bottom',
                    maskRepeat: 'repeat-x',
                    paddingBottom: '20px' // Space for jagged edge
                }}
            >
                {/* Paper Texture Overlay */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] opacity-50 mix-blend-multiply pointer-events-none"></div>
                
                {/* Holographic Security Strip */}
                <div className="absolute top-0 bottom-0 left-0 w-4 bg-gradient-to-b from-slate-200 via-white to-slate-200 opacity-60 border-r border-slate-300/50"></div>

                {/* --- AUTO-CLOSE PROGRESS BAR --- */}
                <div className="absolute top-0 left-0 h-1 bg-cyber-neon z-50 transition-all ease-linear"
                     style={{ 
                         width: isHovered ? '100%' : '0%', 
                         transitionDuration: isHovered ? '0.2s' : '6s',
                         opacity: isHovered ? 0.3 : 1
                     }}
                ></div>

                {/* Content Container */}
                <div className="pl-8 pr-6 py-8 relative">
                    
                    {/* Watermark */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-45 text-[50px] font-black text-slate-300 pointer-events-none opacity-20 border-4 border-slate-300 p-2 rounded mix-blend-multiply">
                        PHRONT
                    </div>

                    {/* Winner Stamp */}
                    {bet.status === 'WON' && (
                        <div className="absolute top-20 right-4 -rotate-12 border-4 border-green-600 text-green-600 px-4 py-1 font-black text-2xl opacity-90 animate-pulse bg-white/80 rounded mix-blend-multiply z-20 shadow-xl backdrop-blur-sm">
                            PAGADO
                        </div>
                    )}

                    {/* Header */}
                    <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
                        <div>
                            <h4 className="font-black text-xl tracking-tighter leading-none flex items-center gap-1">
                                <i className="fas fa-cube text-sm"></i> PHRONT<span className="text-slate-500">.BET</span>
                            </h4>
                            <div className="text-[9px] uppercase tracking-widest mt-1 font-bold text-slate-500">Ticket Oficial de Juego</div>
                        </div>
                        <div className="text-right">
                            <i className="fas fa-qrcode text-4xl opacity-80"></i>
                        </div>
                    </div>
                    
                    {/* Data Grid */}
                    <div className="space-y-3 mb-6">
                        <div className="flex justify-between items-end border-b border-dashed border-slate-300 pb-1">
                            <span className="text-[9px] text-slate-500 font-bold uppercase">Ticket ID</span>
                            <span className="font-bold font-mono tracking-widest bg-black text-white px-1.5 py-0.5 text-[10px]">{bet.ticket_code || '---'}</span>
                        </div>
                        <div className="flex justify-between items-end border-b border-dashed border-slate-300 pb-1">
                            <span className="text-[9px] text-slate-500 font-bold uppercase">Fecha</span>
                            <span className="font-bold">{formatDate(bet.created_at)}</span>
                        </div>
                        <div className="flex justify-between items-end border-b border-dashed border-slate-300 pb-1">
                            <span className="text-[9px] text-slate-500 font-bold uppercase">Sorteo</span>
                            <span className="font-bold uppercase text-xs">{bet.draw_id || 'GENERAL'}</span>
                        </div>
                    </div>

                    {/* Main Numbers */}
                    <div className="bg-slate-200/50 border-2 border-slate-900 rounded-lg p-4 mb-6 flex justify-between items-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-white/40 pointer-events-none"></div>
                        <div className="text-center relative z-10">
                            <div className="text-[9px] text-slate-500 uppercase font-bold mb-1">Número</div>
                            <div className="text-5xl font-black tracking-tighter text-slate-900">{bet.numbers}</div>
                        </div>
                        <div className="h-10 w-px bg-slate-400/50 relative z-10"></div>
                        <div className="text-center relative z-10">
                             <div className="text-[9px] text-slate-500 uppercase font-bold mb-1">Inversión</div>
                             <div className="text-2xl font-bold text-slate-900">{formatCurrency(bet.amount_bigint)}</div>
                        </div>
                    </div>

                    {/* Footer Info */}
                    <div className="flex justify-between items-center bg-black text-white p-2 rounded font-mono text-[10px] uppercase tracking-wider mb-4">
                        <div className="opacity-70">Estado:</div>
                        <div className={`font-bold ${bet.status === 'WON' ? 'text-green-400' : bet.status === 'PENDING' ? 'text-blue-400 animate-pulse' : 'text-red-400'}`}>
                            {bet.status === 'WON' ? '● PREMIADO' : bet.status === 'PENDING' ? '○ EN JUEGO' : '× NO PREMIADO'}
                        </div>
                    </div>

                    {/* CSS BARCODE */}
                    <div className="h-8 w-full bg-[repeating-linear-gradient(90deg,black,black_1px,transparent_1px,transparent_3px,black_3px,black_4px,transparent_4px,transparent_6px)] opacity-80 mix-blend-multiply"></div>
                    <div className="text-center text-[7px] font-mono tracking-[0.5em] mt-1 text-slate-400">{bet.id.toUpperCase()}</div>
                </div>
                
                {/* Bottom Jagged Edge Visual (CSS Gradient Trick) */}
                <div 
                    className="absolute bottom-0 left-0 w-full h-2 bg-transparent" 
                    style={{
                        backgroundImage: 'linear-gradient(135deg, transparent 75%, #000 75%), linear-gradient(-135deg, transparent 75%, #000 75%)',
                        backgroundSize: '10px 10px',
                        backgroundPosition: '0 100%',
                        opacity: 0.1
                    }}
                ></div>
            </div>
            
            {/* MANUAL CLOSE BUTTON (TEAR OFF) */}
            <div className={`text-center mt-4 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-60'}`}>
                <button 
                    onClick={triggerClose}
                    className="text-[10px] font-bold text-slate-400 hover:text-white uppercase tracking-[0.2em] flex items-center justify-center gap-2 mx-auto group"
                >
                    <span className="w-8 h-px bg-slate-600 group-hover:bg-white transition-colors"></span>
                    Cerrar Recibo
                    <span className="w-8 h-px bg-slate-600 group-hover:bg-white transition-colors"></span>
                </button>
            </div>

        </div>

        <style>{`
            @keyframes printSlide {
                0% { transform: translateY(-50px); opacity: 0; }
                100% { transform: translateY(0); opacity: 1; }
            }
        `}</style>
    </div>,
    document.body
  );
}
