import React, { useEffect, useRef } from 'react';

interface MatrixRainProps {
    colorHex?: string;
    speed?: number;
    density?: 'LOW' | 'MEDIUM' | 'HIGH';
    opacity?: number;
    brightness?: number;
}

const MatrixRain: React.FC<MatrixRainProps> = ({ 
    colorHex = '#00f0ff', 
    speed = 1, 
    density = 'MEDIUM', 
    opacity = 0.3,
    brightness = 1
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
        let height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
        
        // Characters: Katakana + Hex + Operators
        const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF<>';
        const charArray = chars.split('');
        
        const fontSize = 12;
        const columns = Math.ceil(width / fontSize);
        
        // Density control via drop probability
        const dropSpawnRate = density === 'HIGH' ? 0.98 : density === 'MEDIUM' ? 0.985 : 0.99;
        
        const drops: number[] = Array(columns).fill(1).map(() => Math.random() * -100); 

        const draw = () => {
            // Trail effect
            ctx.fillStyle = `rgba(0, 0, 0, ${0.1 * brightness})`; 
            ctx.fillRect(0, 0, width, height);

            ctx.font = `bold ${fontSize}px monospace`;
            
            for (let i = 0; i < drops.length; i++) {
                // Randomize lightness for depth
                const isBright = Math.random() > 0.95;
                
                // Color Logic
                ctx.fillStyle = isBright ? '#ffffff' : colorHex;
                
                // Random character
                const text = charArray[Math.floor(Math.random() * charArray.length)];
                
                const x = i * fontSize;
                const y = drops[i] * fontSize;

                ctx.fillText(text, x, y);

                // Reset drop or move down
                if (y > height && Math.random() > dropSpawnRate) {
                    drops[i] = 0;
                }
                drops[i] += 0.5 * speed;
            }
        };

        let animationFrameId: number;
        const loop = () => {
            draw();
            animationFrameId = requestAnimationFrame(loop);
        };
        loop();

        const handleResize = () => {
            if(canvas && canvas.parentElement) {
                width = canvas.width = canvas.parentElement.clientWidth;
                height = canvas.height = canvas.parentElement.clientHeight;
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
        };
    }, [colorHex, speed, density, brightness]);

    return (
        <canvas 
            ref={canvasRef} 
            className="absolute inset-0 w-full h-full pointer-events-none mix-blend-screen"
            style={{ opacity }}
        />
    );
};

export default MatrixRain;