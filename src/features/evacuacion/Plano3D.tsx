import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Box } from '@mui/material';
import { PlanEvacuacion } from '@definition/evacuacion';
import {
  COLORES,
  EXTINTORES_GEO,
  PILARES,
  ZONAS,
  SALON_OUTLINE,
  PAREDES_INTERNAS,
  SALA_B_WALL,
  ASIENTOS,
} from './data';
import DetalleSeleccion, { Seleccion } from './DetalleSeleccion';

type Props = {
  plan: PlanEvacuacion;
  seleccion: Seleccion;
  onSelect: (seleccion: Seleccion) => void;
};

// viewBox: 0 0 180 78.65
const SCALE = 0.1;
const wx = (svgX: number) => (svgX - 90) * SCALE;
const wz = (svgY: number) => (svgY - 39.325) * SCALE;
const ww = (w: number) => w * SCALE;

const ISO = { radius: 14, theta: Math.PI / 4, phi: Math.PI / 3.4 };

const keyToSeleccion = (key: string): Seleccion => {
  if (key.startsWith('zona:')) return { tipo: 'zona', equipoId: key.slice('zona:'.length) };
  if (key.startsWith('ext:')) return { tipo: 'extintor', id: Number(key.slice('ext:'.length)) };
  return null;
};

const seleccionToKey = (seleccion: Seleccion): string | null => {
  if (!seleccion) return null;
  return seleccion.tipo === 'zona' ? `zona:${seleccion.equipoId}` : `ext:${seleccion.id}`;
};

const crearSpriteEtiqueta = (texto: string, color: string): THREE.Sprite => {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;
  
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 12, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 56px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(texto, size / 2, size / 2 + 4);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.6, 0.6, 0.6);
  return sprite;
};

const Plano3D = ({ plan, seleccion, onSelect }: Props) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const apiRef = useRef<{ resetView: () => void; highlight: (key: string | null) => void } | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let width = mount.clientWidth || 600;
    let height = mount.clientHeight || 400;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORES.fondo2D);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    const target = new THREE.Vector3(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.outline = 'none';
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.display = 'block';
    mount.appendChild(renderer.domElement);

    // Luces suaves (Apple Clay Style)
    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambient);

    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(4, 12, 8);
    dir.castShadow = true;
    dir.shadow.mapSize.width = 2048;
    dir.shadow.mapSize.height = 2048;
    dir.shadow.camera.near = 0.5;
    dir.shadow.camera.far = 50;
    dir.shadow.camera.left = -15;
    dir.shadow.camera.right = 15;
    dir.shadow.camera.top = 10;
    dir.shadow.camera.bottom = -10;
    dir.shadow.bias = -0.001;
    scene.add(dir);

    // Suelo
    const floorGeo = new THREE.PlaneGeometry(18.0, 7.865);
    const floorMat = new THREE.MeshStandardMaterial({ 
      color: COLORES.suelo3D,
      roughness: 1,
      metalness: 0
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.001;
    floor.receiveShadow = true;
    scene.add(floor);

    // Materiales Premium Clay
    const wallMat = new THREE.MeshStandardMaterial({ 
      color: COLORES.pared3D,
      roughness: 0.9,
      metalness: 0
    });
    const pilarMat = new THREE.MeshStandardMaterial({ 
      color: '#94A3B8',
      roughness: 0.9,
      metalness: 0
    });
    const seatMat = new THREE.MeshStandardMaterial({ 
      color: '#E2E8F0',
      roughness: 0.9,
      metalness: 0
    });

    const raycastTargets: THREE.Object3D[] = [];
    const emissiveMap = new Map<string, THREE.MeshStandardMaterial[]>();

    const wallH = 0.4;
    const t = 0.1;

    const addWallCenter = (cx: number, cz: number, w: number, d: number) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wallMat);
      mesh.position.set(cx, wallH / 2, cz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
    };

    const addWallSegment = (x1: number, y1: number, x2: number, y2: number, thickness = t, height = wallH) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      const cx = (x1 + x2) / 2;
      const cz = (y1 + y2) / 2;
      const angle = Math.atan2(dy, dx);
      
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(ww(len), height, thickness), wallMat);
      mesh.position.set(wx(cx), height / 2, wz(cz));
      mesh.rotation.y = -angle;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
    };

    // 1. Paredes Exteriores Dinámicas
    for (let i = 0; i < SALON_OUTLINE.length - 1; i++) {
      const p1 = SALON_OUTLINE[i];
      const p2 = SALON_OUTLINE[i + 1];
      addWallSegment(p1[0], p1[1], p2[0], p2[1]);
    }

    // 2. Paredes Internas Dinámicas
    PAREDES_INTERNAS.forEach(w => {
      addWallCenter(wx(w.x + w.w / 2), wz(w.y + w.h / 2), ww(w.w), ww(w.h));
    });

    // Tabique de Sala B
    for (let i = 0; i < SALA_B_WALL.length - 1; i++) {
      const p1 = SALA_B_WALL[i];
      const p2 = SALA_B_WALL[i + 1];
      addWallSegment(p1[0], p1[1], p2[0], p2[1], t * 0.8, wallH * 0.95);
    }

    // Pilares
    PILARES.forEach(p => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(ww(p.w), wallH * 1.5, ww(p.h)), pilarMat);
      mesh.position.set(wx(p.x + p.w / 2), (wallH * 1.5) / 2, wz(p.y + p.h / 2));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
    });

    // Zonas Pastel Transparentes
    for (const zona of ZONAS) {
      const mat = new THREE.MeshStandardMaterial({
        color: zona.color,
        transparent: true,
        opacity: 0.15,
        depthWrite: false,
      });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(ww(zona.w), ww(zona.h)), mat);
      plane.rotation.x = -Math.PI / 2;
      plane.position.set(wx(zona.x + zona.w / 2), 0.02, wz(zona.y + zona.h / 2));
      const key = `zona:${zona.equipoId}`;
      plane.userData.evacKey = key;
      scene.add(plane);
      raycastTargets.push(plane);
      emissiveMap.set(key, [mat]);
    }

    // Asientos
    const seatGeo = new THREE.BoxGeometry(0.14, 0.12, 0.14);
    ASIENTOS.forEach((seat) => {
      const mesh = new THREE.Mesh(seatGeo, seatMat);
      mesh.position.set(wx(seat.x), 0.06, wz(seat.y));
      if (seat.y > 50 && seat.x > 135) {
        mesh.rotation.y = Math.PI / 2;
      }
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
    });

    // Plataforma
    const platShape = new THREE.Shape();
    platShape.moveTo(wx(157.18), -wz(30.72));
    platShape.lineTo(wx(157.18), -wz(0));
    platShape.lineTo(wx(180.0), -wz(0));
    platShape.lineTo(wx(180.0), -wz(37.36));
    platShape.lineTo(wx(162.66), -wz(37.36));
    platShape.lineTo(wx(157.18), -wz(30.72));
    
    const platGeo = new THREE.ExtrudeGeometry(platShape, { depth: 0.15, bevelEnabled: false });
    const platform = new THREE.Mesh(platGeo, new THREE.MeshStandardMaterial({ 
      color: '#F8FAFC', roughness: 0.9, metalness: 0 
    }));
    platform.rotation.x = Math.PI / 2;
    platform.position.y = 0.15;
    platform.receiveShadow = true;
    platform.castShadow = true;
    scene.add(platform);

    // Extintores
    const cylGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.3, 16);
    for (const ext of EXTINTORES_GEO) {
      const mat = new THREE.MeshStandardMaterial({
        color: COLORES.extintor,
        roughness: 0.4,
        metalness: 0.1,
      });
      const cyl = new THREE.Mesh(cylGeo, mat);
      cyl.position.set(wx(ext.x), 0.15, wz(ext.y));
      cyl.castShadow = true;
      const key = `ext:${ext.id}`;
      cyl.userData.evacKey = key;
      scene.add(cyl);
      raycastTargets.push(cyl);

      const sprite = crearSpriteEtiqueta(ext.esCO2 ? 'CO₂' : String(ext.id), COLORES.extintor);
      sprite.position.set(wx(ext.x), 0.6, wz(ext.y));
      scene.add(sprite);
    }

    // Camara Cine-Entrance (Empieza alto y lejos)
    const current = { radius: ISO.radius + 15, theta: ISO.theta - Math.PI / 4, phi: 0.1 };
    const desired = { ...ISO };

    const applyCamera = () => {
      const { radius, theta, phi } = current;
      camera.position.set(
        target.x + radius * Math.sin(phi) * Math.cos(theta),
        target.y + radius * Math.cos(phi),
        target.z + radius * Math.sin(phi) * Math.sin(theta)
      );
      camera.lookAt(target);
    };

    const clampPhi = (p: number) => Math.max(0.2, Math.min(Math.PI / 2 - 0.05, p));

    const dom = renderer.domElement;
    const pointers = new Map<number, { x: number; y: number }>();
    let lastX = 0, lastY = 0, moved = false, downX = 0, downY = 0, pinchDist = 0;

    const onPointerDown = (e: PointerEvent) => {
      dom.setPointerCapture?.(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      lastX = e.clientX; lastY = e.clientY; downX = e.clientX; downY = e.clientY;
      moved = false;
      if (pointers.size === 2) {
        const pts = [...pointers.values()];
        pinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size >= 2) {
        const pts = [...pointers.values()];
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        if (pinchDist > 0) {
          const factor = pinchDist / dist;
          desired.radius = Math.max(4, Math.min(30, desired.radius * factor));
        }
        pinchDist = dist;
        moved = true;
        return;
      }
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 5) moved = true;
      desired.theta -= dx * 0.008;
      desired.phi = clampPhi(desired.phi - dy * 0.008);
    };

    const onPointerUp = (e: PointerEvent) => {
      const wasMoved = moved;
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchDist = 0;
      dom.releasePointerCapture?.(e.pointerId);

      if (!wasMoved && pointers.size === 0) {
        const rect = dom.getBoundingClientRect();
        const ndc = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(ndc, camera);
        const hits = raycaster.intersectObjects(raycastTargets, false);
        if (hits.length > 0) {
          const key = hits[0].object.userData.evacKey as string | undefined;
          if (key) onSelectRef.current(keyToSeleccion(key));
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      desired.radius = Math.max(4, Math.min(30, desired.radius + e.deltaY * 0.01));
    };

    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('pointercancel', onPointerUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    let highlightedKey: string | null = null;
    const highlight = (key: string | null) => {
      if (highlightedKey === key) return;
      if (highlightedKey) emissiveMap.get(highlightedKey)?.forEach(m => (m.opacity = 0.15));
      highlightedKey = key;
      if (key) emissiveMap.get(key)?.forEach(m => (m.opacity = 0.6));
    };

    apiRef.current = { resetView: () => { desired.radius = ISO.radius; desired.theta = ISO.theta; desired.phi = ISO.phi; }, highlight };

    let raf = 0;
    const animate = () => {
      current.radius += (desired.radius - current.radius) * 0.05;
      current.theta += (desired.theta - current.theta) * 0.08;
      current.phi += (desired.phi - current.phi) * 0.08;
      applyCamera();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    const resizeObserver = new ResizeObserver(() => {
      if (!mount) return;
      width = mount.clientWidth || width; height = mount.clientHeight || height;
      camera.aspect = width / height; camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    resizeObserver.observe(mount);

    return () => {
      cancelAnimationFrame(raf); resizeObserver.disconnect();
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('pointercancel', onPointerUp);
      dom.removeEventListener('wheel', onWheel);
      apiRef.current = null;
      scene.traverse((obj: THREE.Object3D) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose());
          else mesh.material.dispose();
        }
        const sprite = obj as THREE.Sprite;
        if (sprite.isSprite && sprite.material?.map) sprite.material.map.dispose();
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    apiRef.current?.highlight(seleccionToKey(seleccion));
  }, [seleccion]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%', borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.05)', backgroundColor: COLORES.fondo2D }}>
      <Box ref={mountRef} sx={{ width: '100%', height: '100%' }} />
      <Box onClick={() => apiRef.current?.resetView()} sx={{ position: 'absolute', top: '16px', left: '16px', zIndex: 4, cursor: 'pointer', userSelect: 'none', padding: '8px 16px', borderRadius: '100px', fontSize: '13px', fontWeight: 700, color: '#475569', backgroundColor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.05)', transition: 'all 0.2s', '&:hover': { backgroundColor: 'rgba(255,255,255,0.95)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' } }}>⟳ Reset vista</Box>
      <DetalleSeleccion plan={plan} seleccion={seleccion} onClose={() => onSelect(null)} />
    </Box>
  );
};

export default Plano3D;
