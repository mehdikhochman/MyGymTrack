'use client';

import { useEffect, useRef } from 'react';
import type * as T from 'three';
import type { Move, Pose } from '@/lib/moves';

type Three = typeof T;

// Looping 3D demo of a movement: a jointed mannequin animated between the move's two key poses.
// three.js is loaded only when a demo is opened.
export default function Exercise3D({ move }: { move: Move }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    import('three').then((THREE) => {
      if (!cancelled && box.current) stop = play(THREE, box.current, move);
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [move]);
  return <div ref={box} className="demo3d" />;
}

const BASE_PITCH = { stand: 0, seated: 0, supine: -90, prone: 90 };
const BASE_POSE: Record<Move['base'], Pose> = { stand: {}, seated: { hip: 90, knee: 90 }, supine: {}, prone: {} };
const rad = (deg: number) => (deg * Math.PI) / 180;

function play(THREE: Three, el: HTMLDivElement, move: Move) {
  const width = el.clientWidth;
  const height = 240;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(width, height);
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 50);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x223, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(2, 4, 3);
  scene.add(sun);

  const body = new THREE.MeshStandardMaterial({ color: 0x4f8cff, roughness: 0.45 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xb8c0cc, roughness: 0.3, metalness: 0.6 });
  const pad = new THREE.MeshStandardMaterial({ color: 0x3a404c, roughness: 0.8 });

  // Skeleton: every joint is a Group; limbs hang down (-y) from their joint, the figure faces +z, its left is +x.
  const group = (parent: T.Object3D, x = 0, y = 0, z = 0) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    return g;
  };
  const limb = (joint: T.Object3D, length: number, radius: number) => {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length - 2 * radius, 6, 12), body);
    m.position.y = -length / 2;
    joint.add(m);
    return group(joint, 0, -length);
  };
  const root = group(scene);
  root.add(new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12).scale(1.1, 0.8, 0.8), body));
  const spine = group(root, 0, 0.05);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.32, 6, 12).scale(1.15, 1, 0.75), body);
  torso.position.y = 0.3;
  spine.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 16), body);
  head.position.y = 0.72;
  spine.add(head);

  const side = (s: 1 | -1) => {
    const shoulder = group(spine, 0.2 * s, 0.52);
    const elbow = limb(shoulder, 0.3, 0.05);
    const hand = limb(elbow, 0.28, 0.045);
    const hip = group(root, 0.1 * s, -0.05);
    const knee = limb(hip, 0.45, 0.07);
    const ankle = limb(knee, 0.43, 0.055);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.22), body);
    foot.position.set(0, -0.03, 0.07);
    ankle.add(foot);
    return { s, shoulder, elbow, hand, hip, knee, ankle, toe: group(ankle, 0, -0.06, 0.17) };
  };
  const sides = [side(1), side(-1)];
  const [L, R] = sides;

  // Props
  const props = move.props ?? [];
  const cylinder = (r: number, len: number, mat: T.Material) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 16), mat);
    m.rotation.z = Math.PI / 2; // along x
    return m;
  };
  const followHands: T.Object3D[] = [];
  if (props.includes('barbell')) {
    const bar = new THREE.Group();
    bar.add(cylinder(0.015, 1.6, metal));
    for (const x of [-0.7, 0.7]) bar.add(cylinder(0.2, 0.05, metal).translateY(x));
    scene.add(bar);
    followHands.push(bar);
  }
  if (props.includes('dumbbells')) {
    for (const s of sides) {
      const db = new THREE.Group();
      db.add(cylinder(0.015, 0.3, metal));
      for (const x of [-0.12, 0.12]) db.add(cylinder(0.06, 0.05, metal).translateY(x));
      s.hand.add(db);
    }
  }
  if (props.includes('bench')) {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.5, 0.08), pad);
    bench.position.set(0, 0.15, move.base === 'prone' ? 0.17 : -0.17);
    root.add(bench);
  }
  if (props.includes('seat')) {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.42), pad);
    seat.position.set(0, -0.14, 0.12);
    root.add(seat);
  }

  const v = new THREE.Vector3();
  const world = (objs: T.Object3D[]) => {
    const sum = new THREE.Vector3();
    for (const o of objs) sum.add(o.getWorldPosition(v));
    return sum.divideScalar(objs.length);
  };
  const anchors = { feet: [L.ankle, R.ankle], footL: [L.ankle], toes: [L.toe, R.toe], hands: [L.hand, R.hand] };

  function apply(p: Pose) {
    const get = (k: string, s: 1 | -1) => p[k + (s === 1 ? 'L' : 'R')] ?? p[k] ?? 0;
    root.rotation.x = rad(BASE_PITCH[move.base] + (p.body ?? 0));
    root.position.set(0, move.y ?? 0.99, 0);
    spine.rotation.x = rad(p.torso ?? 0);
    for (const { s, shoulder, elbow, hip, knee, ankle } of sides) {
      shoulder.rotation.set(-rad(get('shoulder', s)), -s * rad(get('adduct', s)), s * rad(get('armOut', s)));
      elbow.rotation.set(-rad(get('elbow', s)), 0, s * rad(get('elbowOut', s)));
      hip.rotation.x = -rad(get('hip', s));
      knee.rotation.x = rad(get('knee', s));
      // Standing: keep the sole flat on the floor; "ankle" then lifts the heel.
      const flat = move.base === 'stand' ? get('hip', s) - get('knee', s) - (p.body ?? 0) : 0;
      ankle.rotation.x = rad(get('ankle', s) + flat);
    }
    root.updateMatrixWorld(true);
  }

  const pose = (t: number): Pose => {
    const a = { ...BASE_POSE[move.base], ...move.a };
    const b = { ...BASE_POSE[move.base], ...move.b };
    const out: Pose = {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) out[k] = (a[k] ?? 0) + ((b[k] ?? 0) - (a[k] ?? 0)) * t;
    return out;
  };

  // The pinned point stays where it is in the first pose (feet on the floor, hands on the bar…).
  apply(pose(0));
  const pinned = move.pin && anchors[move.pin];
  const target = pinned ? world(pinned) : null;
  // Feet (and hands when lying face down) rest on the floor; hands otherwise hold a bar where they are.
  if (target && (move.pin !== 'hands' || move.base === 'prone')) target.y = move.pin === 'feet' || move.pin === 'footL' ? 0.06 : 0.02;
  const hands = world([L.hand, R.hand]);
  if (props.includes('pullbar')) {
    const bar = cylinder(0.02, 1.4, metal);
    bar.position.copy(hands);
    scene.add(bar);
  }
  if (props.includes('dipbars')) {
    for (const x of [-0.25, 0.25]) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 12), metal);
      bar.rotation.x = Math.PI / 2; // along z
      bar.position.set(x, hands.y, hands.z);
      scene.add(bar);
    }
  }

  // Place the figure at a point of the movement (0 = first pose, 1 = second pose).
  const place = (t: number) => {
    apply(pose(t));
    if (pinned && target) {
      root.position.add(target.clone().sub(world(pinned)));
      root.updateMatrixWorld(true);
    }
    for (const o of followHands) o.position.copy(world([L.hand, R.hand]));
  };

  // Frame the whole movement.
  const bounds = new THREE.Box3();
  for (const t of [0, 0.5, 1]) {
    place(t);
    bounds.expandByObject(scene);
  }
  const center = bounds.getCenter(new THREE.Vector3());
  const distance = 1.1 * bounds.getSize(new THREE.Vector3()).length() / (2 * Math.tan(rad(camera.fov / 2)));
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1.5, 48), new THREE.MeshStandardMaterial({ color: 0x1c1f26 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  let frame = 0;
  const start = performance.now();
  const tick = (now: number) => {
    const t = (now - start) / 1000;
    place((1 - Math.cos((t * 2 * Math.PI) / 2.6)) / 2);
    const angle = 0.7 + 0.35 * Math.sin(t * 0.35);
    camera.position.set(center.x + distance * Math.sin(angle), center.y + distance * 0.35, center.z + distance * Math.cos(angle));
    camera.lookAt(center);
    renderer.render(scene, camera);
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(frame);
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        o.material.dispose();
      }
    });
    renderer.dispose();
    renderer.domElement.remove();
  };
}
