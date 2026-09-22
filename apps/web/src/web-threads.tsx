import { useEffect, useRef, type FC } from 'react';
import { Mesh, Program, Renderer, Triangle } from 'ogl';

// Adapted from React Bits Web Threads (MIT + Commons Clause): https://reactbits.dev/backgrounds/web-threads

export type FanMode = 'center' | 'left' | 'right';

export interface WebThreadsProps {
  color1?: string;
  color2?: string;
  color3?: string;
  speed?: number;
  threadCount?: number;
  frequency?: number;
  spread?: number;
  taper?: number;
  position?: number;
  fanMode?: FanMode;
  glow?: number;
  falloff?: number;
  thickness?: number;
  brightness?: number;
  opacity?: number;
  mirror?: boolean;
  shimmer?: boolean;
  grain?: boolean;
  grainIntensity?: number;
  mouseInteraction?: boolean;
  mouseStrength?: number;
  backgroundColor?: string;
  lightMode?: boolean;
  className?: string;
}

type UniformValue = { value: number | boolean | Float32Array };
type WebThreadsContext = { program: { uniforms: Record<string, UniformValue> } };

const ctxMap = new WeakMap<HTMLDivElement, WebThreadsContext>();
const FAN_MODE: Record<FanMode, number> = { center: 0, left: 1, right: 2 };

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [1, 1, 1];
  return [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255];
};

const vertex = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uSpeed;
uniform float uThreadCount;
uniform float uFrequency;
uniform float uSpread;
uniform float uTaper;
uniform float uPosition;
uniform float uFanMode;
uniform float uGlow;
uniform float uFalloff;
uniform float uThickness;
uniform float uBrightness;
uniform float uOpacity;
uniform float uMirror;
uniform float uShimmer;
uniform float uGrain;
uniform float uGrainIntensity;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec3 uBackgroundColor;
uniform bool uLightMode;
uniform vec2 uMouse;
uniform float uMouseStrength;
uniform float uEnableMouse;
uniform float uMouseActive;
out vec4 fragColor;
#define TAU 6.28318530718
#define MAX_THREADS 10

float glow(float x, float str, float dist) {
  return dist / pow(max(x, 1e-4), str);
}

void main() {
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  float n = max(uThreadCount, 1.0);
  float pinchX = uFanMode < 0.5 ? 0.5 : (uFanMode < 1.5 ? 0.0 : 1.0);
  if (uEnableMouse > 0.5) pinchX = mix(pinchX, uMouse.x, clamp(uMouseStrength, 0.0, 1.0) * uMouseActive);
  float spreadDx = uSpread * abs(uv.x - pinchX);
  float baseT = iTime * uSpeed;
  float tauOverN = TAU / n;
  float mirror = uMirror > 0.5 ? sign(pinchX - uv.x) : 1.0;
  bool doShimmer = uShimmer > 0.5;
  float shimmerT = iTime * 1.7;
  float invThickness = 1.0 / max(uThickness, 0.01);
  float xFreq = uv.x * uFrequency;
  float yOff = uv.y - uPosition;
  float ciScale = n > 1.0 ? 1.0 / (n - 1.0) : 0.0;
  vec3 col = vec3(0.0);
  float gsum = 0.0;
  for (int idx = 0; idx < MAX_THREADS; idx++) {
    float i = float(idx);
    if (i >= n) break;
    float amplitude = spreadDx * (1.0 + i * uTaper);
    float shimmer = doShimmer ? sin(shimmerT + i * 1.3) * 0.35 : 0.0;
    float phase = (baseT + i * tauOverN) * mirror + shimmer;
    float sdf = abs(yOff + sin(xFreq + phase) * amplitude) * invThickness;
    float g = glow(sdf, uFalloff, uGlow);
    float ci = i * ciScale;
    vec3 threadCol = mix(uColor1, uColor2, ci);
    col += g * threadCol;
    gsum += g;
  }
  float coreAmt = smoothstep(0.5, 2.2, gsum);
  col = mix(col, uColor3 * gsum, coreAmt * 0.5);
  float bright = uBrightness;
  if (uEnableMouse > 0.5) {
    vec2 md = uv - uMouse;
    float d2 = dot(md, md);
    bright += clamp(uMouseStrength, 0.0, 1.0) * uMouseActive * exp(-d2 * 6.0) * 0.6;
  }
  col *= bright;
  float alpha = clamp(gsum, 0.0, 1.0) * uOpacity;
  vec3 outRgb = col * alpha;
  if (uGrain > 0.5) {
    float gv = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + iTime) * 43758.5453) - 0.5) * uGrainIntensity;
    outRgb = clamp(outRgb + gv, 0.0, 1.0);
    alpha = clamp(alpha + gv, 0.0, 1.0);
  }
  if (uLightMode) {
    vec3 mapped = vec3(1.0) - exp(-max(col, vec3(0.0)) * 1.3);
    float rawEnergy = clamp(max(mapped.r, max(mapped.g, mapped.b)) * uOpacity, 0.0, 1.0);
    float coverage = smoothstep(0.18, 0.72, rawEnergy);
    coverage *= coverage;
    vec3 hue = mapped / max(max(mapped.r, mapped.g), max(mapped.b, 1e-4));
    vec3 chroma = pow(clamp(hue, 0.0, 1.0), vec3(0.78));
    vec3 pigment = mix(chroma, vec3(0.08), 0.12);
    vec3 baseInk = vec3(0.16, 0.35, 0.29);
    vec3 ink = mix(baseInk, pigment, 0.48 + coverage * 0.22);
    fragColor = vec4(mix(uBackgroundColor, ink, coverage), 1.0);
  } else {
    fragColor = vec4(outRgb, alpha);
  }
}`;

export const WebThreads: FC<WebThreadsProps> = ({
  color1 = '#335f53',
  color2 = '#52645d',
  color3 = '#6f9989',
  speed = 0.055,
  threadCount = 5,
  frequency = 5,
  spread = 0.16,
  taper = 0.8,
  position = 0.5,
  fanMode = 'center',
  glow = 0.014,
  falloff = 0.62,
  thickness = 1.1,
  brightness = 0.34,
  opacity = 0.32,
  mirror = true,
  shimmer = false,
  grain = false,
  grainIntensity = 0,
  mouseInteraction = false,
  mouseStrength = 0,
  backgroundColor = '#f1f4f1',
  lightMode = false,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const reducedMotionRef = useRef(false);
  const mouseRef = useRef({ enabled: mouseInteraction, strength: mouseStrength });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const renderer = new Renderer({ webgl: 2, alpha: true, premultipliedAlpha: true, antialias: false, dpr: Math.min(window.devicePixelRatio || 1, 1.5) });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        iTime: { value: 0 }, iResolution: { value: new Float32Array([1, 1]) },
        uSpeed: { value: speed }, uThreadCount: { value: threadCount }, uFrequency: { value: frequency }, uSpread: { value: spread },
        uTaper: { value: taper }, uPosition: { value: position }, uFanMode: { value: FAN_MODE[fanMode] ?? 0 },
        uGlow: { value: glow }, uFalloff: { value: falloff }, uThickness: { value: thickness }, uBrightness: { value: brightness },
        uOpacity: { value: opacity }, uMirror: { value: mirror ? 1 : 0 }, uShimmer: { value: shimmer ? 1 : 0 },
        uGrain: { value: grain ? 1 : 0 }, uGrainIntensity: { value: grainIntensity },
        uColor1: { value: new Float32Array([1, 1, 1]) }, uColor2: { value: new Float32Array([1, 1, 1]) }, uColor3: { value: new Float32Array([1, 1, 1]) },
        uBackgroundColor: { value: new Float32Array([1, 1, 1]) }, uLightMode: { value: lightMode },
        uMouse: { value: new Float32Array([0.5, 0.5]) }, uMouseStrength: { value: mouseStrength }, uEnableMouse: { value: mouseInteraction ? 1 : 0 }, uMouseActive: { value: 0 },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });
    const uniforms = program.uniforms as unknown as Record<string, UniformValue>;
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionRef.current = motionQuery.matches;
    let raf = 0;
    let isVisible = true;
    let isPageVisible = !document.hidden;

    const setSize = () => {
      const rect = container.getBoundingClientRect();
      renderer.setSize(Math.max(1, Math.floor(rect.width)), Math.max(1, Math.floor(rect.height)));
      const resolution = uniforms.iResolution.value as Float32Array;
      resolution[0] = gl.drawingBufferWidth;
      resolution[1] = gl.drawingBufferHeight;
      renderer.render({ scene: mesh });
    };
    const resizeObserver = new ResizeObserver(setSize);
    resizeObserver.observe(container);
    setSize();

    const currentMouse: [number, number] = [0.5, 0.5];
    const targetMouse: [number, number] = [0.5, 0.5];
    let currentActive = 0;
    let targetActive = 0;
    const onMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetMouse[0] = (event.clientX - rect.left) / rect.width;
      targetMouse[1] = 1 - (event.clientY - rect.top) / rect.height;
      targetActive = 1;
    };
    const onMouseEnter = () => { targetActive = 1; };
    const onMouseLeave = () => { targetActive = 0; };
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseenter', onMouseEnter);
    canvas.addEventListener('mouseleave', onMouseLeave);

    const loop = (time: number) => {
      if (reducedMotionRef.current || !isVisible || !isPageVisible) { raf = 0; return; }
      uniforms.iTime.value = time * 0.001;
      currentMouse[0] += 0.05 * (targetMouse[0] - currentMouse[0]);
      currentMouse[1] += 0.05 * (targetMouse[1] - currentMouse[1]);
      const mouse = uniforms.uMouse.value as Float32Array;
      mouse[0] = currentMouse[0];
      mouse[1] = currentMouse[1];
      currentActive += 0.05 * (targetActive - currentActive);
      uniforms.uMouseActive.value = currentActive;
      uniforms.uEnableMouse.value = mouseRef.current.enabled ? 1 : 0;
      uniforms.uMouseStrength.value = mouseRef.current.strength;
      renderer.render({ scene: mesh });
      raf = requestAnimationFrame(loop);
    };
    const tryStart = () => {
      if (!reducedMotionRef.current && isVisible && isPageVisible && raf === 0) raf = requestAnimationFrame(loop);
    };
    const tryStop = () => {
      if (raf !== 0) { cancelAnimationFrame(raf); raf = 0; }
    };
    ctxMap.set(container, { program: { uniforms } });

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
      if (isVisible) tryStart();
      else tryStop();
    }, { threshold: 0 });
    intersectionObserver.observe(container);
    const onMotionChange = () => {
      reducedMotionRef.current = motionQuery.matches;
      if (reducedMotionRef.current) tryStop();
      else tryStart();
    };
    const onVisibilityChange = () => {
      isPageVisible = !document.hidden;
      if (isPageVisible) tryStart();
      else tryStop();
    };
    motionQuery.addEventListener?.('change', onMotionChange);
    document.addEventListener('visibilitychange', onVisibilityChange);
    tryStart();

    return () => {
      tryStop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      motionQuery.removeEventListener?.('change', onMotionChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseenter', onMouseEnter);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      ctxMap.delete(container);
      try { container.removeChild(canvas); } catch { /* canvas may already be detached */ }
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [brightness, falloff, fanMode, frequency, glow, grain, grainIntensity, lightMode, mirror, mouseInteraction, mouseStrength, opacity, position, spread, taper, threadCount, thickness, speed, shimmer]);

  useEffect(() => {
    const container = containerRef.current;
    const context = container ? ctxMap.get(container) : undefined;
    if (!context) return;
    const uniforms = context.program.uniforms;
    const setColor = (name: string, color: string) => {
      const rgb = hexToRgb(color);
      const value = uniforms[name]?.value as Float32Array;
      value[0] = rgb[0]; value[1] = rgb[1]; value[2] = rgb[2];
    };
    setColor('uColor1', color1); setColor('uColor2', color2); setColor('uColor3', color3); setColor('uBackgroundColor', backgroundColor);
    uniforms.uSpeed.value = speed; uniforms.uThreadCount.value = Math.round(threadCount); uniforms.uFrequency.value = frequency; uniforms.uSpread.value = spread;
    uniforms.uTaper.value = taper; uniforms.uPosition.value = position; uniforms.uFanMode.value = FAN_MODE[fanMode] ?? 0; uniforms.uGlow.value = glow;
    uniforms.uFalloff.value = falloff; uniforms.uThickness.value = thickness; uniforms.uBrightness.value = brightness; uniforms.uOpacity.value = opacity;
    uniforms.uMirror.value = mirror ? 1 : 0; uniforms.uShimmer.value = shimmer ? 1 : 0; uniforms.uGrain.value = grain ? 1 : 0; uniforms.uGrainIntensity.value = grainIntensity;
    uniforms.uLightMode.value = lightMode; uniforms.uMouseStrength.value = mouseStrength; uniforms.uEnableMouse.value = mouseInteraction ? 1 : 0;
    mouseRef.current = { enabled: mouseInteraction, strength: mouseStrength };
  }, [backgroundColor, brightness, color1, color2, color3, fanMode, falloff, frequency, glow, grain, grainIntensity, lightMode, mirror, mouseInteraction, mouseStrength, opacity, position, shimmer, spread, taper, threadCount, thickness, speed]);

  return <div ref={containerRef} className={`web-threads-container ${className}`.trim()} aria-hidden="true" />;
};
