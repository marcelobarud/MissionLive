import { useEffect, useRef } from 'react';

type CanvasContext = CanvasRenderingContext2D & { roundRect?: (...args: number[]) => void };

export function WebThreads({ paused = false }: { paused?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return undefined;

    const context = canvas.getContext('2d') as CanvasContext | null;
    if (!context) return undefined;
    const drawingCanvas = canvas;
    const surface = parent;
    const drawingContext = context;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let density = 1;

    const palette = getComputedStyle(surface);
    const primary = palette.getPropertyValue('--landing-sage').trim() || '#335f53';
    const secondary = palette.getPropertyValue('--landing-ink-soft').trim() || '#71827b';

    function resize() {
      const bounds = surface.getBoundingClientRect();
      density = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      drawingCanvas.width = Math.round(width * density);
      drawingCanvas.height = Math.round(height * density);
      drawingCanvas.style.width = `${width}px`;
      drawingCanvas.style.height = `${height}px`;
      drawingContext.setTransform(density, 0, 0, density, 0, 0);
    }

    function draw(time: number) {
      drawingContext.clearRect(0, 0, width, height);
      const horizon = height * 0.58;
      const lines = Math.max(7, Math.min(11, Math.round(width / 125)));

      for (let line = 0; line < lines; line += 1) {
        const progress = line / Math.max(1, lines - 1);
        const base = horizon + (progress - 0.5) * height * 0.82;
        const amplitude = 12 + progress * 18;
        const drift = motionQuery.matches || paused ? 0 : time * 0.00022 * (line % 2 ? -1 : 1);
        drawingContext.beginPath();
        for (let x = -30; x <= width + 30; x += 18) {
          const y = base
            + Math.sin(x * 0.009 + line * 0.85 + drift) * amplitude
            + Math.cos(x * 0.004 - line * 0.4 + drift * 0.7) * 14;
          if (x === -30) drawingContext.moveTo(x, y);
          else drawingContext.lineTo(x, y);
        }
        const color = line % 3 === 0 ? primary : secondary;
        drawingContext.strokeStyle = color;
        drawingContext.globalAlpha = 0.16 + (1 - Math.abs(progress - 0.5) * 2) * 0.16;
        drawingContext.lineWidth = line % 4 === 0 ? 1.35 : 0.9;
        drawingContext.stroke();
      }

      drawingContext.globalAlpha = 1;
    }

    function frame(time: number) {
      draw(time);
      if (!motionQuery.matches && !paused) animationFrame = window.requestAnimationFrame(frame);
    }

    resize();
    frame(0);
    window.addEventListener('resize', resize, { passive: true });
    const handleMotionChange = () => {
      window.cancelAnimationFrame(animationFrame);
      frame(0);
    };
    motionQuery.addEventListener?.('change', handleMotionChange);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
      motionQuery.removeEventListener?.('change', handleMotionChange);
    };
  }, [paused]);

  return <canvas ref={canvasRef} className="web-threads" aria-hidden="true" />;
}
