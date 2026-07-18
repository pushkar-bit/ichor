"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  sampleLogoCloud,
  sampleKangarooCloud,
  sampleKangarooLeapCloud,
  sampleHumanCloud,
  sampleScatterCloud,
  pointsToFloat32,
} from "@/lib/landing/particles";

gsap.registerPlugin(ScrollTrigger);

const PRIMARY = new THREE.Color("#ae93f4"); // momentum
const ACCENT = new THREE.Color("#fda2de"); // afterrun

// Scroll-progress (0..1 across the whole #scroll-track) boundaries for each act of the
// sequence: logo -> kangaroo -> hop -> hop (-> human mid-hop) -> run.
const P_LOGO_END = 0.2;
const P_JUMP1_END = 0.38;
const P_JUMP2_END = 0.58;
const P_RUN_END = 0.94;

const HOP1_AMPLITUDE = 0.55;
const HOP2_AMPLITUDE = 0.7;
const HOP_FORWARD_1 = 0.16;
const HOP_FORWARD_2 = 0.2;
const RUN_DRIFT = 0.3;
const RUN_BOB_AMPLITUDE = 0.07;
const RUN_BOB_CYCLES = 5;

// Real 3D motion for the jumps: depth travel (leaps toward camera, not just up), a forward
// tumble/pitch through the hop, and — on the transformation jump specifically — one full turn
// so the kangaroo->human morph reads as a genuine 3D spin rather than a flat crossfade.
const HOP1_Z_AMPLITUDE = 0.55;
const HOP1_TUMBLE = 0.32;
const HOP2_Z_AMPLITUDE = 0.75;
const HOP2_TUMBLE = 0.45;
const HOP2_SPIN_TURNS = 1;

// The run itself keeps that 3D-ness going rather than flattening back onto a fixed plane once
// the jump ends: a steady forward lean (toward camera, pitched down) plus a subtle
// per-footfall oscillation on top of it.
const RUN_LEAN_Z = 0.15;
const RUN_LEAN_X = 0.1;
const RUN_Z_AMPLITUDE = 0.06;
const RUN_TUMBLE_AMPLITUDE = 0.035;

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

const VERTEX_SHADER = /* glsl */ `
  uniform float uGenesis;
  uniform float uShapeMorph;
  uniform float uPoseBlend;
  uniform float uHopY;
  uniform float uHopSquashX;
  uniform float uHopSquashY;
  uniform float uDriftX;
  uniform float uRunBob;
  uniform float uRunCycle;
  uniform float uTime;
  uniform float uPixelRatio;
  attribute vec3 aScatter;
  attribute vec3 aLogo;
  attribute vec3 aKangaroo;
  attribute vec3 aKangarooLeap;
  attribute vec3 aHuman;
  attribute vec3 aHumanB;
  attribute vec3 aColor;
  attribute float aRand;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // The kangaroo's pose itself changes through the hop — grounded/standing silhouette at
    // takeoff and landing, tucked-leg leap silhouette (sampled from an actual mid-air render)
    // at the apex — not just a flat shape translating up and down.
    vec3 kangarooPose = mix(aKangaroo, aKangarooLeap, uPoseBlend);
    vec3 shapeA = mix(aLogo, kangarooPose, clamp(uShapeMorph, 0.0, 1.0));
    float humanBlend = clamp(uShapeMorph - 1.0, 0.0, 1.0);
    // Alternate stride: the running human crossfades between two mirrored leg/arm poses
    // (uRunCycle oscillates 0..1..0) so legs actually cycle through the stride instead of one
    // frozen pose just bobbing in place.
    vec3 humanPose = mix(aHuman, aHumanB, uRunCycle);
    vec3 shaped = mix(shapeA, humanPose, humanBlend);
    vec3 pos = mix(aScatter, shaped, uGenesis);

    // Volumetric bulge through the transformation: particles push outward in depth as the
    // kangaroo dissolves into the human and pull back in as it resolves, so the morph reads as
    // particles passing through 3D space rather than sliding along a flat line between shapes.
    float bulge = sin(humanBlend * 3.14159265) * (0.1 + aRand * 0.4);
    pos.z += bulge;

    pos.x += sin(uTime * 0.6 + aRand * 6.2831) * 0.012;
    pos.y += cos(uTime * 0.5 + aRand * 6.2831) * 0.012;

    pos.x *= uHopSquashX;
    pos.y *= uHopSquashY;
    pos.y += uHopY + uRunBob;
    pos.x += uDriftX;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float depthBoost = 1.0 + pos.z * 0.5;
    gl_PointSize = (2.0 + aRand * 2.0) * depthBoost * uPixelRatio * (6.0 / -mvPosition.z);

    vColor = aColor;
    vAlpha = 0.5 + aRand * 0.5;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform float uFade;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv);
    float alpha = smoothstep(0.5, 0.0, d) * vAlpha * uFade;
    if (alpha < 0.015) discard;
    gl_FragColor = vec4(vColor, alpha);
  }
`;

/**
 * Fixed-position WebGL canvas behind the whole landing page: generates as a particle sphere,
 * assembles into the ICHOR mark, then morphs logo -> kangaroo -> two hops -> running human as
 * the user scrolls #scroll-track. See lib/landing/particles.ts for how each shape is sampled.
 */
export default function ParticleField() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    // Lower than the original prototype's 9000/6000 — that count caused severe scroll jank
    // (verified: Lenis's RAF-driven scroll position barely progressed under sustained
    // rendering load) on non-dedicated-GPU hardware. Still dense enough to read clearly at
    // the additive-blending glow this shader uses.
    const PARTICLE_COUNT = coarsePointer ? 3000 : 4500;

    let disposed = false;
    let frameId = 0;
    const ctxCleanups: Array<() => void> = [];

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setClearColor(new THREE.Color("#000000"), 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.z = 4.4;

    const setSize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    setSize();

    const uniforms = {
      uGenesis: { value: 0 },
      uShapeMorph: { value: 0 },
      uPoseBlend: { value: 0 },
      uHopY: { value: 0 },
      uHopSquashX: { value: 1 },
      uHopSquashY: { value: 1 },
      uDriftX: { value: 0 },
      uRunBob: { value: 0 },
      uRunCycle: { value: 0 },
      uFade: { value: 1 },
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
    };

    const geometry = new THREE.BufferGeometry();
    const scatter = sampleScatterCloud(PARTICLE_COUNT);
    const scatterBuf = pointsToFloat32(scatter);

    const rand = new Float32Array(PARTICLE_COUNT);
    const color = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      rand[i] = Math.random();
      const c = PRIMARY.clone().lerp(ACCENT, Math.random() < 0.3 ? Math.random() * 0.8 : 0);
      color[i * 3] = c.r;
      color[i * 3 + 1] = c.g;
      color[i * 3 + 2] = c.b;
    }

    // Placeholder shapes (all scatter) until the real clouds are sampled — harmless since
    // uGenesis stays 0 until then, so rendered position is always aScatter regardless of what
    // these buffers hold.
    geometry.setAttribute("position", new THREE.BufferAttribute(scatterBuf.slice(), 3));
    geometry.setAttribute("aScatter", new THREE.BufferAttribute(scatterBuf, 3));
    geometry.setAttribute("aLogo", new THREE.BufferAttribute(scatterBuf.slice(), 3));
    geometry.setAttribute("aKangaroo", new THREE.BufferAttribute(scatterBuf.slice(), 3));
    geometry.setAttribute("aKangarooLeap", new THREE.BufferAttribute(scatterBuf.slice(), 3));
    geometry.setAttribute("aHuman", new THREE.BufferAttribute(scatterBuf.slice(), 3));
    geometry.setAttribute("aHumanB", new THREE.BufferAttribute(scatterBuf.slice(), 3));
    geometry.setAttribute("aColor", new THREE.BufferAttribute(color, 3));
    geometry.setAttribute("aRand", new THREE.BufferAttribute(rand, 1));

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const mouse = { x: 0, y: 0 };
    const targetRot = { x: 0, y: 0 };
    const onMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    if (!reducedMotion) window.addEventListener("mousemove", onMouseMove);

    // Jump depth/tumble/spin — rigid Object3D transforms (not shader uniforms) so the whole
    // cloud genuinely moves and turns in 3D space rather than just interpolating flat
    // per-particle positions.
    const hop3D = { z: 0, tumbleX: 0, spinY: 0 };

    const clock = new THREE.Clock();
    let idleRotation = 0;

    const renderLoop = () => {
      const dt = clock.getDelta();
      uniforms.uTime.value += dt;

      if (!reducedMotion) {
        idleRotation += dt * 0.06;
        targetRot.x += (mouse.y * 0.18 - targetRot.x) * 0.04;
        targetRot.y += (mouse.x * 0.28 - targetRot.y) * 0.04;
        points.rotation.y = idleRotation + targetRot.y + hop3D.spinY;
        points.rotation.x = targetRot.x + hop3D.tumbleX;
        points.position.z = hop3D.z;
      }

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(renderLoop);
    };

    const applyProgress = (progress: number) => {
      let shapeMorph = 0;
      let poseBlend = 0;
      let hopY = 0;
      let squashX = 1;
      let squashY = 1;
      let driftX = 0;
      let runBob = 0;
      let runCycle = 0;
      let hopZ = 0;
      let tumbleX = 0;
      let spinY = 0;

      if (progress < P_LOGO_END) {
        shapeMorph = smoothstep(0, P_LOGO_END, progress);
      } else if (progress < P_JUMP1_END) {
        shapeMorph = 1;
        const t = (progress - P_LOGO_END) / (P_JUMP1_END - P_LOGO_END);
        const arc = 4 * t * (1 - t);
        hopY = HOP1_AMPLITUDE * arc;
        squashY = 1 + 0.15 * Math.sin(t * Math.PI);
        squashX = 1 - 0.08 * Math.sin(t * Math.PI);
        driftX = HOP_FORWARD_1 * t;
        // Leap toward camera and pitch forward through the air, so the hop reads as travel
        // through 3D space, not a flat vertical bounce.
        hopZ = HOP1_Z_AMPLITUDE * Math.sin(t * Math.PI);
        tumbleX = HOP1_TUMBLE * Math.sin(t * Math.PI);
        // Grounded pose at takeoff/landing, real tucked-leg leap pose at the apex — the
        // animal's body actually changes shape mid-air.
        poseBlend = Math.sin(t * Math.PI);
      } else if (progress < P_JUMP2_END) {
        const t = (progress - P_JUMP1_END) / (P_JUMP2_END - P_JUMP1_END);
        shapeMorph = 1 + smoothstep(0.35, 1.0, t);
        hopY = HOP2_AMPLITUDE * 4 * t * (1 - t);
        squashY = 1 + 0.15 * Math.sin(t * Math.PI);
        squashX = 1 - 0.08 * Math.sin(t * Math.PI);
        driftX = HOP_FORWARD_1 + HOP_FORWARD_2 * t;
        hopZ = HOP2_Z_AMPLITUDE * Math.sin(t * Math.PI);
        tumbleX = HOP2_TUMBLE * Math.sin(t * Math.PI);
        poseBlend = Math.sin(t * Math.PI);
        // One full turn across the jump — the kangaroo->human morph (which happens in the
        // back half of this same window) lands mid-spin, so the transformation itself plays
        // out as real 3D rotation.
        spinY = t * Math.PI * 2 * HOP2_SPIN_TURNS;
      } else if (progress < P_RUN_END) {
        shapeMorph = 2;
        const t = (progress - P_JUMP2_END) / (P_RUN_END - P_JUMP2_END);
        const phase = t * RUN_BOB_CYCLES * Math.PI;
        runBob = Math.abs(Math.sin(phase)) * RUN_BOB_AMPLITUDE;
        // Legs swap once per full gait cycle (two footfalls/bounces), so this runs at half
        // runBob's frequency — real running biomechanics.
        runCycle = 0.5 + 0.5 * Math.sin(phase);
        driftX = HOP_FORWARD_1 + HOP_FORWARD_2 + RUN_DRIFT * t;
        // Constant forward lean plus a small per-footfall pitch/depth oscillation, so the run
        // keeps the jump's 3D travel going instead of flattening onto a fixed plane once the
        // legs start cycling.
        hopZ = RUN_LEAN_Z + RUN_Z_AMPLITUDE * Math.sin(phase);
        tumbleX = RUN_LEAN_X + RUN_TUMBLE_AMPLITUDE * Math.sin(phase * 2);
      } else {
        shapeMorph = 2;
        driftX = HOP_FORWARD_1 + HOP_FORWARD_2 + RUN_DRIFT;
        runCycle = 0.5;
        hopZ = RUN_LEAN_Z;
        tumbleX = RUN_LEAN_X;
      }

      uniforms.uShapeMorph.value = shapeMorph;
      uniforms.uPoseBlend.value = poseBlend;
      uniforms.uHopY.value = hopY;
      uniforms.uHopSquashX.value = squashX;
      uniforms.uHopSquashY.value = squashY;
      uniforms.uDriftX.value = driftX;
      uniforms.uRunBob.value = runBob;
      uniforms.uRunCycle.value = runCycle;
      hop3D.z = hopZ;
      hop3D.tumbleX = tumbleX;
      hop3D.spinY = spinY;
    };

    if (reducedMotion) {
      uniforms.uGenesis.value = 1;
      renderer.render(scene, camera);
    } else {
      frameId = requestAnimationFrame(renderLoop);
    }

    // Sample the real shapes, then wire genesis + the scroll timeline.
    Promise.all([sampleLogoCloud(PARTICLE_COUNT), sampleKangarooCloud(PARTICLE_COUNT), sampleKangarooLeapCloud(PARTICLE_COUNT)]).then(
      ([logo, kangaroo, kangarooLeap]) => {
        if (disposed) return;
        const human = sampleHumanCloud(PARTICLE_COUNT);
        const humanB = sampleHumanCloud(PARTICLE_COUNT, true);

        const logoBuf = pointsToFloat32(logo);
        geometry.setAttribute("position", new THREE.BufferAttribute(logoBuf.slice(), 3));
        geometry.setAttribute("aLogo", new THREE.BufferAttribute(logoBuf, 3));
        geometry.setAttribute("aKangaroo", new THREE.BufferAttribute(pointsToFloat32(kangaroo), 3));
        geometry.setAttribute("aKangarooLeap", new THREE.BufferAttribute(pointsToFloat32(kangarooLeap), 3));
        geometry.setAttribute("aHuman", new THREE.BufferAttribute(pointsToFloat32(human), 3));
        geometry.setAttribute("aHumanB", new THREE.BufferAttribute(pointsToFloat32(humanB), 3));

        if (reducedMotion) {
          renderer.render(scene, camera);
          return;
        }

        const genesisTween = gsap.to(uniforms.uGenesis, {
          value: 1,
          duration: 2,
          ease: "power2.out",
          delay: 0.3,
        });
        ctxCleanups.push(() => genesisTween.kill());

        applyProgress(0);
        const trigger = ScrollTrigger.create({
          trigger: "#scroll-track",
          start: "top top",
          // "bottom top" (not "bottom bottom") so 0..1 spans the track's full height —
          // "bottom bottom" would end one viewport-height early.
          end: "bottom top",
          scrub: 0.8,
          onUpdate: (self) => applyProgress(self.progress),
        });
        ctxCleanups.push(() => trigger.kill());

        const fadeTween = gsap.to(uniforms.uFade, {
          value: 0.4,
          ease: "none",
          scrollTrigger: {
            trigger: "#join",
            start: "top 85%",
            end: "top 35%",
            scrub: 0.8,
          },
        });
        ctxCleanups.push(() => {
          fadeTween.scrollTrigger?.kill();
          fadeTween.kill();
        });
      },
    );

    const onResize = () => {
      setSize();
      uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setPixelRatio(uniforms.uPixelRatio.value);
    };
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      ctxCleanups.forEach((fn) => fn());
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="fixed inset-0 z-0" aria-hidden="true" />;
}
