"use client";

import { useMemo, useRef } from "react";
import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { ShaderMaterial, SRGBColorSpace } from "three";

export default function SolarMaterial({ url }: { url: string }) {
  const material = useRef<ShaderMaterial>(null);
  const texture = useTexture(url, (loaded) => {
    loaded.colorSpace = SRGBColorSpace;
    loaded.needsUpdate = true;
  });
  const uniforms = useMemo(() => ({ uMap: { value: texture }, uTime: { value: 0 } }), [texture]);
  useFrame(() => { if (material.current) material.current.uniforms.uTime.value = performance.now() * 0.00018; });
  return <shaderMaterial ref={material} toneMapped={false} uniforms={uniforms}
    vertexShader={`
      varying vec2 vUv;
      varying vec3 vNormal;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `}
    fragmentShader={`
      uniform sampler2D uMap;
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vNormal;
      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
          mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      void main() {
        vec2 uv = vUv + vec2(uTime * 0.0015, sin(uTime * 0.7) * 0.001);
        vec3 source = texture2D(uMap, uv).rgb;
        float granulation = noise(vUv * 22.0 + uTime * 0.12);
        float flare = smoothstep(0.63, 0.98, noise(vUv * 8.0 - uTime * 0.04));
        float limb = pow(1.0 - max(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 0.0), 1.8);
        vec3 solarColor = source * vec3(1.55, 0.94, 0.46);
        solarColor += vec3(1.0, 0.18, 0.025) * granulation * 0.16;
        solarColor += vec3(1.0, 0.42, 0.08) * flare * 0.3;
        solarColor += vec3(1.0, 0.28, 0.04) * limb * 0.22;
        gl_FragColor = vec4(solarColor, 1.0);
      }
    `} />;
}
