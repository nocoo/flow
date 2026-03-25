import { useRef, useEffect } from "react";
import { createNoise2D } from "simplex-noise";

/**
 * Ukiyo-e wave-inspired flow field background.
 *
 * Multiple layers of particles at different speeds and shades create
 * a rolling wave effect reminiscent of Hokusai's "The Great Wave".
 * Particles flow horizontally with vertical undulation driven by
 * layered simplex noise, producing black/gray/white wave bands.
 */

interface WaveLayer {
  count: number;
  speed: number;
  shade: number;       // 0 = black, 255 = white
  alpha: number;
  lineWidth: number;
  noiseScale: number;
  amplitude: number;   // vertical wave strength
}

const LAYERS: WaveLayer[] = [
  // Deep background — slow, light gray, wide strokes
  { count: 300, speed: 0.3, shade: 210, alpha: 0.25, lineWidth: 2, noiseScale: 0.002, amplitude: 1.2 },
  // Mid layer — medium speed, medium gray
  { count: 400, speed: 0.6, shade: 150, alpha: 0.3, lineWidth: 1.5, noiseScale: 0.003, amplitude: 1.8 },
  // Wave crests — faster, dark, thin strokes
  { count: 500, speed: 1.0, shade: 80, alpha: 0.35, lineWidth: 1, noiseScale: 0.004, amplitude: 2.5 },
  // Foam / spray — fastest, near-black accents
  { count: 200, speed: 1.4, shade: 30, alpha: 0.2, lineWidth: 0.8, noiseScale: 0.006, amplitude: 3.0 },
];

const FADE_ALPHA = 0.015;

interface Particle {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  layer: number;
}

function createParticle(w: number, h: number, layer: number): Particle {
  const x = Math.random() * w;
  const y = Math.random() * h;
  return { x, y, prevX: x, prevY: y, layer };
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
      particles = [];
      for (let i = 0; i < LAYERS.length; i++) {
        for (let j = 0; j < LAYERS[i].count; j++) {
          particles.push(createParticle(w, h, i));
        }
      }
    };

    resize();
    window.addEventListener("resize", resize);

    let t = 0;

    const draw = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Fade — white overlay for trailing wave effect
      ctx.fillStyle = `rgba(255,255,255,${FADE_ALPHA})`;
      ctx.fillRect(0, 0, w, h);

      t += 0.0003;

      for (const p of particles) {
        const layer = LAYERS[p.layer];

        p.prevX = p.x;
        p.prevY = p.y;

        // Horizontal flow + vertical wave undulation from noise
        const n = noise2D(
          p.x * layer.noiseScale + t,
          p.y * layer.noiseScale,
        );

        // Primary flow is rightward; noise modulates vertical position
        // creating wave-like undulation bands
        p.x += layer.speed;
        p.y += n * layer.amplitude;

        // Draw trail
        ctx.strokeStyle = `rgba(${layer.shade},${layer.shade},${layer.shade},${layer.alpha})`;
        ctx.lineWidth = layer.lineWidth;
        ctx.beginPath();
        ctx.moveTo(p.prevX, p.prevY);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        // Wrap around horizontally (continuous wave), reset if out vertically
        if (p.x > w) {
          p.x = 0;
          p.prevX = 0;
        }
        if (p.y < -10 || p.y > h + 10) {
          p.x = Math.random() * w * 0.3; // re-enter from left side
          p.y = Math.random() * h;
          p.prevX = p.x;
          p.prevY = p.y;
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
