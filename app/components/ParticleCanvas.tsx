'use client';

import { useRef, useEffect } from 'react';

export default function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Respect prefers-reduced-motion: skip animation loop, render a single static frame
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animId: number;
    const colors = ['rgba(0,229,160,', 'rgba(99,102,241,', 'rgba(244,114,182,', 'rgba(255,255,255,'];

    interface Particle {
      x: number; y: number; vx: number; vy: number;
      r: number; color: string; phase: number;
    }
    let particles: Particle[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const init = () => {
      resize();
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      const count = Math.min(60, Math.floor((w * h) / 12000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.15,
        r: Math.random() * 2 + 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        phase: Math.random() * Math.PI * 2,
      }));
    };

    const draw = (t: number) => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      // Flowing wave lines
      for (let wave = 0; wave < 3; wave++) {
        ctx.beginPath();
        const yBase = h * 0.35 + wave * 60;
        const opacity = 0.03 - wave * 0.008;
        ctx.strokeStyle =
          wave === 0 ? `rgba(0,229,160,${opacity})` :
          wave === 1 ? `rgba(99,102,241,${opacity})` :
          `rgba(244,114,182,${opacity})`;
        ctx.lineWidth = 1;
        for (let x = 0; x <= w; x += 4) {
          const y = yBase +
            Math.sin(x * 0.005 + t * 0.0004 + wave * 1.2) * 40 +
            Math.sin(x * 0.012 + t * 0.0007) * 15;
          if (x === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
        }
        ctx.stroke();
      }

      // Particles + connections
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy + Math.sin(t * 0.001 + p.phase) * 0.1;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;

        const alpha = 0.15 + Math.sin(t * 0.002 + p.phase) * 0.1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + alpha + ')';
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(255,255,255,${0.03 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      if (!reducedMotion) {
        animId = requestAnimationFrame(draw);
      }
    };

    init();
    if (reducedMotion) {
      // Render a single static frame and skip the animation loop entirely
      draw(0);
      window.addEventListener('resize', init);
      return () => {
        window.removeEventListener('resize', init);
      };
    }
    animId = requestAnimationFrame(draw);
    window.addEventListener('resize', init);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', init);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  );
}
