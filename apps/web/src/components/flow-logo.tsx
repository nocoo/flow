import { useRef, useEffect } from "react";
import { createNoise2D } from "simplex-noise";

/**
 * Animated "FLOW" logo rendered by particles that only spawn inside
 * the letter shapes. Over time the accumulated trails reveal the word.
 * Uses the same moiré flow-field technique as the background.
 */

const LOGO_W = 280;
const LOGO_H = 80;
const PARTICLE_COUNT = 600;
const MAX_LIFE = 300;
const MIN_LIFE = 100;
const SPEED = 0.5;
const NOISE_SCALE = 0.008;
const NOISE_STRENGTH = 0.5;
const FADE_ALPHA = 0.006; // very slow fade → letters accumulate
const PHI = (1 + Math.sqrt(5)) / 2;

interface Particle {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  baseAngle: number;
  life: number;
  maxLife: number;
  shade: number;
  seed: number;
}

/** Build a bitmap mask of the text "FLOW" at the given resolution */
function buildTextMask(w: number, h: number): Uint8Array {
  const offscreen = document.createElement("canvas");
  offscreen.width = w;
  offscreen.height = h;
  const ctx = offscreen.getContext("2d")!;

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "#fff";
  ctx.font = `bold ${Math.floor(h * 0.78)}px "Inter", "SF Pro Display", "Helvetica Neue", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.letterSpacing = "4px";
  ctx.fillText("FLOW", w / 2, h / 2 + 2);

  const imageData = ctx.getImageData(0, 0, w, h);
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    // White pixels (inside text) → 1
    mask[i] = imageData.data[i * 4] > 128 ? 1 : 0;
  }
  return mask;
}

/** Pick a random point inside the text mask */
function randomPointInMask(
  mask: Uint8Array,
  w: number,
  h: number,
): { x: number; y: number } {
  // Rejection sampling — fast because text covers a decent area
  for (let attempt = 0; attempt < 500; attempt++) {
    const x = Math.floor(Math.random() * w);
    const y = Math.floor(Math.random() * h);
    if (mask[y * w + x]) return { x, y };
  }
  // Fallback: just return center
  return { x: w / 2, y: h / 2 };
}

function createLogoParticle(
  mask: Uint8Array,
  w: number,
  h: number,
  index: number,
): Particle {
  const { x, y } = randomPointInMask(mask, w, h);
  const baseAngle = ((index * PHI) % 1) * Math.PI * 2;
  const shade = 40 + ((index * 137) % 120); // darker range: 40–160
  const maxLife = MIN_LIFE + Math.floor((index * 89) % (MAX_LIFE - MIN_LIFE));

  return {
    x,
    y,
    prevX: x,
    prevY: y,
    baseAngle,
    life: Math.floor(Math.random() * maxLife),
    maxLife,
    shade,
    seed: index * 0.15,
  };
}

function resetLogoParticle(
  p: Particle,
  mask: Uint8Array,
  w: number,
  h: number,
) {
  const { x, y } = randomPointInMask(mask, w, h);
  p.x = x;
  p.y = y;
  p.prevX = x;
  p.prevY = y;
  p.life = p.maxLife;
}

export function FlowLogo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = LOGO_W * dpr;
    canvas.height = LOGO_H * dpr;
    canvas.style.width = `${LOGO_W}px`;
    canvas.style.height = `${LOGO_H}px`;

    const ctx = canvas.getContext("2d", { alpha: true })!;
    ctx.scale(dpr, dpr);

    const noise2D = createNoise2D();
    const mask = buildTextMask(LOGO_W, LOGO_H);

    const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) =>
      createLogoParticle(mask, LOGO_W, LOGO_H, i),
    );

    let t = 0;
    let animId = 0;

    const draw = () => {
      // Very slow fade → strokes accumulate to reveal letters
      ctx.fillStyle = `rgba(255,255,255,${FADE_ALPHA})`;
      ctx.fillRect(0, 0, LOGO_W, LOGO_H);

      t += 0.0005;

      for (const p of particles) {
        p.life--;

        // Reset if dead or wandered outside the canvas
        if (
          p.life <= 0 ||
          p.x < -5 ||
          p.x > LOGO_W + 5 ||
          p.y < -5 ||
          p.y > LOGO_H + 5
        ) {
          resetLogoParticle(p, mask, LOGO_W, LOGO_H);
          continue;
        }

        p.prevX = p.x;
        p.prevY = p.y;

        const n = noise2D(p.x * NOISE_SCALE + p.seed, p.y * NOISE_SCALE + t);
        const angle = p.baseAngle + n * Math.PI * NOISE_STRENGTH;

        p.x += Math.cos(angle) * SPEED;
        p.y += Math.sin(angle) * SPEED;

        // Fade in/out
        const lifeRatio = p.life / p.maxLife;
        let alpha: number;
        if (lifeRatio > 0.8) {
          alpha = (1 - lifeRatio) / 0.2;
        } else if (lifeRatio < 0.2) {
          alpha = lifeRatio / 0.2;
        } else {
          alpha = 1;
        }
        alpha *= 0.5;

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

    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-5 left-6 -z-10 pointer-events-none"
      style={{ width: LOGO_W, height: LOGO_H }}
      aria-hidden="true"
    />
  );
}
