import { useRef, useEffect } from "react";
import { createNoise2D } from "simplex-noise";

const PARTICLE_COUNT = 800;
const NOISE_SCALE = 0.003;
const SPEED = 0.4;
const PARTICLE_ALPHA = 0.12;
const FADE_ALPHA = 0.03;
const PARTICLE_COLOR = "150,150,150";

interface Particle {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
}

function createParticle(w: number, h: number): Particle {
  const x = Math.random() * w;
  const y = Math.random() * h;
  return { x, y, prevX: x, prevY: y };
}

export function FlowBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true })!;
    const noise2D = createNoise2D();
    let animId = 0;
    let particles: Particle[] = [];

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);

      // Re-initialize particles on resize
      const w = window.innerWidth;
      const h = window.innerHeight;
      particles = Array.from({ length: PARTICLE_COUNT }, () =>
        createParticle(w, h),
      );
    };

    resize();
    window.addEventListener("resize", resize);

    // Slowly evolve the flow field over time
    let zOffset = 0;

    const draw = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Fade previous frame — creates trailing effect
      ctx.fillStyle = `rgba(255,255,255,${FADE_ALPHA})`;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = `rgba(${PARTICLE_COLOR},${PARTICLE_ALPHA})`;
      ctx.lineWidth = 1;

      zOffset += 0.0002;

      for (const p of particles) {
        p.prevX = p.x;
        p.prevY = p.y;

        // Sample flow field angle from noise
        const angle =
          noise2D(p.x * NOISE_SCALE, p.y * NOISE_SCALE + zOffset) *
          Math.PI *
          2;

        p.x += Math.cos(angle) * SPEED;
        p.y += Math.sin(angle) * SPEED;

        // Draw trail segment
        ctx.beginPath();
        ctx.moveTo(p.prevX, p.prevY);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        // Reset if out of bounds
        if (p.x < 0 || p.x > w || p.y < 0 || p.y > h) {
          const np = createParticle(w, h);
          p.x = np.x;
          p.y = np.y;
          p.prevX = np.prevX;
          p.prevY = np.prevY;
        }
      }

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 pointer-events-none"
      aria-hidden="true"
    />
  );
}
