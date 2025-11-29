
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatCurrency } from '../constants';
import AnimatedIconUltra from './ui/AnimatedIconUltra';

interface WinnerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    amount: number;
    number: string;
    draw: string;
    type: 'TIEMPOS' | 'REVENTADOS';
    newBalance?: number; 
  } | null;
}

export default function WinnerOverlay({ isOpen, onClose, data }: WinnerOverlayProps) {
  const [stage, setStage] = useState<'INIT' | 'BEAM' | 'MATERIALIZE' | 'STABLE' | 'DISMISS'>('INIT');

  useEffect(() => {
    if (isOpen) {
      setStage('INIT');
      // Cinematic Sequencing
      setTimeout(() => setStage('BEAM'), 100);       // Light beam descends
      setTimeout(() => setStage('MATERIALIZE'), 800); // Object forms
      setTimeout(() => setStage('STABLE'), 1600);     // Information locks in
    } else {
      setStage('DISMISS');
    }
  }, [isOpen]);

  if (!isOpen && stage === 'DISMISS') return null;
  if (!data) return null;

  const isReventado = data.type === 'REVENTADOS';
  // Theme: Reventado = Critical Red, Tiempos = Cyber Emerald/Gold mixture
  const themeColor = isReventado ? '#ff003c' : '#10b981'; 
  const glowColor = isReventado ? 'rgba(255, 0, 60, 0.6)' : 'rgba(16, 185, 129, 0.6)';
  const secondaryColor = isReventado ? '#fbbf24' : '#00f0ff'; // Amber or Cyan accents

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden">
      
      {/* 1. REALITY DIMMER (Background) */}
      <div 
        className={`absolute inset-0 bg-[#02040a]/95 backdrop-blur-2xl transition-opacity duration-1000 ${stage === 'INIT' ? 'opacity-0' : 'opacity-100'}`}
        onClick={onClose}
      >
          {/* Subtle Grid Background */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[length:40px_40px] pointer-events-none"></div>
      </div>

      {/* 2. THE VOLUMETRIC BEAM (The Projector) */}
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[300px] md:w-[500px] h-full pointer-events-none transition-all duration-[800ms] ease-out origin-top ${stage === 'INIT' ? 'scale-y-0 opacity-0' : 'scale-y-100 opacity-100'}`}>
          <div 
            className="w-full h-full bg-gradient-to-b from-white/20 via-transparent to-transparent opacity-30"
            style={{ 
                clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
                background: `linear-gradient(180deg, ${themeColor} 0%, transparent 90%)`
            }}
          ></div>
          
          {/* Digital Dust Particles (Upward Float) */}
          <div className="absolute inset-0 overflow-hidden">
              {[...Array(25)].map((_, i) => (
                  <div 
                    key={i}
                    className="absolute w-1 h-1 bg-white rounded-full opacity-0 animate-float-particle"
                    style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        animationDuration: `${1 + Math.random() * 2}s`,
                        animationDelay: `${Math.random()}s`,
                        backgroundColor: i % 2 === 0 ? '#fff' : themeColor
                    }}
                  ></div>
              ))}
          </div>
      </div>

      {/* 3. THE ARTIFACT (Main Card) */}
      <div className={`relative z-10 perspective-1000 transition-all duration-700 cubic-bezier(0.34, 1.56, 0.64, 1) ${stage === 'MATERIALIZE' || stage === 'STABLE' ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-40 scale-50'}`}>
          
          <div 
            className="relative w-[340px] md:w-[450px] bg-black border-2 rounded-[2rem] p-1 overflow-hidden select-none transform transition-transform duration-300 hover:scale-[1.02] hover:rotate-1 shadow-2xl"
            style={{ 
                borderColor: themeColor,
                boxShadow: `0 0 100px ${glowColor}, inset 0 0 50px ${glowColor}`
            }}
          >
              {/* Holographic Prism Overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.1)_0%,transparent_50%,rgba(255,255,255,0.05)_100%)] pointer-events-none z-30"></div>
              
              {/* Scanline Sweep */}
              <div className="absolute top-0 left-0 w-full h-2 bg-white/50 shadow-[0_0_20px_white] z-40 animate-[scanline_2s_linear_infinite] opacity-20"></div>

              {/* CORE CONTENT */}
              <div className="relative bg-[#050a14] rounded-[1.8rem] p-8 flex flex-col items-center text-center overflow-hidden">
                  
                  {/* Decorative Background Circles */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] animate-[spin_20s_linear_infinite] opacity-10 pointer-events-none">
                      <div className="absolute inset-0 border border-white/20 rounded-full border-dashed"></div>
                  </div>

                  {/* Header: Type of Win */}
                  <div className="relative z-20 mb-6">
                      <div 
                        className="px-6 py-2 rounded-full border bg-black/80 backdrop-blur-md shadow-lg animate-[pulse_2s_infinite]"
                        style={{ borderColor: themeColor }}
                      >
                          <span className="text-xs font-black uppercase tracking-[0.4em]" style={{ color: themeColor }}>
                              {isReventado ? '⚠️ JACKPOT REVENTADO' : 'VICTORIA CONFIRMADA'}
                          </span>
                      </div>
                  </div>

                  {/* ICON: Ultra Animated Trophy */}
                  <div className="mb-8 relative z-10 scale-125">
                      <div className="absolute inset-0 blur-2xl opacity-50 animate-pulse" style={{ backgroundColor: themeColor }}></div>
                      <AnimatedIconUltra profile={{ animation: 'bounce', theme: isReventado ? 'neon' : 'cyber', speed: 2, glow: true }}>
                          <div className="relative">
                              <i className={`fas ${isReventado ? 'fa-meteor' : 'fa-trophy'} text-7xl drop-shadow-2xl`} style={{ color: isReventado ? '#ff003c' : '#fbbf24' }}></i>
                              {/* Sparkles */}
                              <i className="fas fa-star text-white text-xl absolute -top-2 -right-4 animate-[spin_3s_linear_infinite]"></i>
                              <i className="fas fa-star text-white text-lg absolute bottom-0 -left-4 animate-[pulse_1s_infinite]"></i>
                          </div>
                      </AnimatedIconUltra>
                  </div>

                  {/* THE NUMBER: Glitch Effect */}
                  <div className="relative mb-8 w-full">
                      <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">Número Afortunado</div>
                      <div className="relative inline-block">
                          {/* Main Text */}
                          <h1 className="text-8xl md:text-9xl font-mono font-black text-white relative z-10 tracking-tighter leading-none" style={{ textShadow: `0 0 40px ${themeColor}` }}>
                              {data.number}
                          </h1>
                          
                          {/* Glitch Layers */}
                          <h1 className="text-8xl md:text-9xl font-mono font-black absolute top-0 left-0 z-0 opacity-50 animate-glitch-1 mix-blend-screen" style={{ color: secondaryColor }}>{data.number}</h1>
                          <h1 className="text-8xl md:text-9xl font-mono font-black absolute top-0 left-0 z-0 opacity-50 animate-glitch-2 mix-blend-screen" style={{ color: themeColor }}>{data.number}</h1>
                      </div>
                  </div>

                  {/* THE AMOUNT: Massive Impact */}
                  <div className="relative w-full border-t border-white/10 pt-6 space-y-2">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Ganancia Total</div>
                      <div className="text-4xl md:text-5xl font-mono font-bold text-white flex items-center justify-center gap-2">
                          <span className="text-2xl opacity-50">CRC</span>
                          <span className="animate-[pulse_0.5s_infinite]" style={{ color: secondaryColor, textShadow: `0 0 20px ${secondaryColor}` }}>
                              {formatCurrency(data.amount).replace('CRC', '').trim()}
                          </span>
                      </div>
                  </div>

                  {/* NEW BALANCE: Invasive Pop-up Style */}
                  {data.newBalance !== undefined && (
                      <div className="mt-6 w-full bg-[#0a0a0f] border-2 border-white/10 rounded-xl p-3 flex justify-between items-center relative overflow-hidden shadow-inner group-hover:border-white/30 transition-colors">
                          <div className="absolute left-0 top-0 bottom-0 w-1.5 animate-pulse" style={{ backgroundColor: themeColor }}></div>
                          
                          <div className="pl-3 flex flex-col items-start">
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Saldo Actualizado</span>
                              <div className="flex items-center gap-2 text-xs text-white/50 font-mono">
                                  <span>{formatCurrency(data.newBalance - data.amount)}</span>
                                  <i className="fas fa-arrow-right text-[8px]"></i>
                              </div>
                          </div>
                          
                          <div className="text-xl font-mono font-black text-white" style={{ textShadow: '0 0 10px rgba(255,255,255,0.5)' }}>
                              {formatCurrency(data.newBalance)}
                          </div>
                      </div>
                  )}

                  {/* CLOSE BUTTON */}
                  <button 
                    onClick={onClose}
                    className="mt-8 w-full py-4 rounded-xl font-black uppercase text-xs tracking-[0.3em] transition-all hover:scale-[1.02] active:scale-95 shadow-lg relative overflow-hidden group/btn"
                    style={{ backgroundColor: themeColor, color: '#000' }}
                  >
                      <div className="absolute inset-0 bg-white/40 -translate-x-full group-hover/btn:animate-[shine_0.5s_ease-in-out]"></div>
                      <span className="relative z-10 flex items-center justify-center gap-2">
                          <i className="fas fa-check-circle"></i> RECLAMAR PREMIO
                      </span>
                  </button>

              </div>
          </div>
      </div>

      <style>{`
        @keyframes float-particle {
            0% { transform: translateY(0) translateX(0) scale(0); opacity: 0; }
            20% { opacity: 1; scale(1); }
            100% { transform: translateY(-300px) translateX(var(--tw-translate-x, 20px)) scale(0); opacity: 0; }
        }
        @keyframes glitch-1 {
            0% { clip-path: inset(20% 0 80% 0); transform: translate(-4px, 2px); }
            20% { clip-path: inset(60% 0 10% 0); transform: translate(4px, -2px); }
            40% { clip-path: inset(40% 0 50% 0); transform: translate(-4px, 4px); }
            60% { clip-path: inset(80% 0 5% 0); transform: translate(4px, -4px); }
            80% { clip-path: inset(10% 0 70% 0); transform: translate(-2px, 2px); }
            100% { clip-path: inset(30% 0 50% 0); transform: translate(2px, -2px); }
        }
        @keyframes glitch-2 {
            0% { clip-path: inset(10% 0 60% 0); transform: translate(4px, -2px); }
            20% { clip-path: inset(80% 0 5% 0); transform: translate(-4px, 2px); }
            40% { clip-path: inset(30% 0 20% 0); transform: translate(2px, -4px); }
            60% { clip-path: inset(10% 0 80% 0); transform: translate(-2px, 2px); }
            80% { clip-path: inset(50% 0 30% 0); transform: translate(4px, -2px); }
            100% { clip-path: inset(20% 0 60% 0); transform: translate(-4px, 2px); }
        }
        @keyframes shine {
            0% { transform: translateX(-100%) skewX(-15deg); }
            100% { transform: translateX(200%) skewX(-15deg); }
        }
      `}</style>
    </div>,
    document.body
  );
}
