import { useRef, useEffect } from "react";
import { createNoise2D } from "simplex-noise";

/**
 * Moiré-pattern flow field background.
 *
 * Particles travel in all directions, each seeded with a deterministic
 * angle derived from a modular hash of its index. The directions aren't
 * random — they follow (index * PHI) % 1 mapped to a full circle, so
 * the golden-ratio spacing guarantees even angular distribution while
 * being perfectly repeatable.
 *
 * Simplex noise bends each path slightly, and because hundreds of
 * near-parallel lines overlay at slightly different offsets, the
 * accumulated strokes produce emergent moiré / interference patterns
 * that evolve over time.
 *
 * Each particle has a limited lifespan; when it dies it fades out,
 * preventing the canvas from getting muddy.
 */

const PARTICLE_COUNT = 1200;
const MAX_LIFE = 400;          // frames before a particle resets
const MIN_LIFE = 150;
const SPEED = 0.8;
const NOISE_SCALE = 0.0025;
const NOISE_STRENGTH = 0.6;   // how much noise bends the base angle
const FADE_ALPHA = 0.008;     // per-frame white overlay → lower = longer trails

const PHI = (1 + Math.sqrt(5)) / 2; // golden ratio

interface Particle {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  baseAngle: number;  // deterministic direction from modular hash
  life: number;       // remaining frames
  maxLife: number;
  shade: number;      // 0–255
  seed: number;       // unique offset for noise sampling
}

function createParticle(w: number, h: number, index: number): Particle {
  const x = Math.random() * w;
  const y = Math.random() * h;

  // Golden-ratio angular distribution → even spread, not random
  const baseAngle = ((index * PHI) % 1) * Math.PI * 2;

  // Shade from modular hash — creates bands of black / gray / white
  // (index * 137) % 256 is a classic low-discrepancy sequence
  const shade = (index * 137) % 256;

  const maxLife = MIN_LIFE + Math.floor(((index * 89) % (MAX_LIFE - MIN_LIFE)));

  return {
    x, y,
    prevX: x,
    prevY: y,
    baseAngle,
    life: Math.floor(Math.random() * maxLife), // stagger initial deaths
    maxLife,
    shade,
    seed: index * 0.1,
  };
}

function resetParticle(p: Particle, w: number, h: number) {
  p.x = Math.random() * w;
  p.y = Math.random() * h;
  p.prevX = p.x;
  p.prevY = p.y;
  p.life = p.maxLife;
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

      const w = window.innerWidth;
      const h = window.innerHeight;
      particles = Array.from({ length: PARTICLE_COUNT }, (_, i) =>
        createParticle(w, h, i),
      );
    };

    resize();
    window.addEventListener("resize", resize);

    let t = 0;

    const draw = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Fade previous frame → trails decay to white over time
      ctx.fillStyle = `rgba(255,255,255,${FADE_ALPHA})`;
      ctx.fillRect(0, 0, w, h);

      t += 0.0004;

      for (const p of particles) {
        p.life--;

        if (p.life <= 0 || p.x < -20 || p.x > w + 20 || p.y < -20 || p.y > h + 20) {
          resetParticle(p, w, h);
          continue;
        }

        p.prevX = p.x;
        p.prevY = p.y;

        // Noise bends the deterministic base angle
        const n = noise2D(
          p.x * NOISE_SCALE + p.seed,
          p.y * NOISE_SCALE + t,
        );
        const angle = p.baseAngle + n * Math.PI * NOISE_STRENGTH;

        p.x += Math.cos(angle) * SPEED;
        p.y += Math.sin(angle) * SPEED;

        // Fade in/out over lifespan: ramp up first 20%, ramp down last 20%
        const lifeRatio = p.life / p.maxLife;
        let alpha: number;
        if (lifeRatio > 0.8) {
          alpha = (1 - lifeRatio) / 0.2; // fade in
        } else if (lifeRatio < 0.2) {
          alpha = lifeRatio / 0.2;        // fade out
        } else {
          alpha = 1;
        }
        alpha *= 0.45; // stroke visibility

        ctx.strokeStyle = `rgba(${p.shade},${p.shade},${p.shade},${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.prevX, p.prevY);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
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
