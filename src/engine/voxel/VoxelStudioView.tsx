/**
 * Interactive Voxel Engine Studio Viewport
 * 
 * Demonstrates:
 * 1. 0.25m LOD 0 Hermite SDF Surface Nets extraction
 * 2. 22.5° normal vector quantization (16-point compass faceted Enshrouded style)
 * 3. Watertight boundary skirts
 * 4. Real-time CSG analytical blasts (Sphere, Box, Cylinder, Capsule)
 * 5. 9-Frame Distributed CSG Edit Pipeline with 3 priority tiers & instant Frame 1 smoke/flash latency masking
 * 6. Micro-detail props with 0.25m / 22.5° snapping and terrain shielding with durability thresholds
 * 7. Pre-fractured debris physics when prop shields shatter under fatal blasts
 * 8. Dynamic Steam Deck 90 FPS (11.11 ms) VRS Circuit Breaker Controller (1x1 native vs 2x2 radial periphery)
 * 9. Stylized Asymmetric Triplanar Shader (top-down moss/grass vs lateral striated cliff strata)
 * 10. Direct SDF capsule walk controller
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { VoxelWorld } from './voxelWorld';
import {
  CSGBrushType,
  CSGOperation,
  CSGBrushEvent,
  VOXEL_SCALE,
  BASE_CELL_SIZE,
  NORMAL_SNAP_INTERVAL,
  VoxelMesh
} from './voxelTypes';
import { CSGDistributedPipeline } from './csgEditPipeline';
import {
  PropShieldSystem,
  PropType,
  PROP_CATALOG,
  PropInstance
} from './propShieldSystem';
import {
  VRSCircuitBreakerController,
  VRSCircuitBreakerState,
  createAsymmetricTriplanarMaterial
} from './vrsAndPostProcess';
import { voxelWasmBridge } from './wasmBridge';
import {
  Flame,
  Box,
  Sparkles,
  Layers,
  Compass,
  Sliders,
  Shield,
  Sword,
  Waves,
  Droplets,
  Sun,
  RotateCcw,
  Activity,
  User,
  Zap,
  Info,
  Package,
  Eye,
  Crosshair,
  Gauge,
  Cpu,
  Binary,
  Cloud,
  Wind
} from 'lucide-react';

interface VoxelStudioViewProps {
  onClose?: () => void;
}

export const VoxelStudioView: React.FC<VoxelStudioViewProps> = ({ onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Engine Subsystems
  const worldRef = useRef<VoxelWorld>(new VoxelWorld());
  const csgPipelineRef = useRef<CSGDistributedPipeline>(new CSGDistributedPipeline());
  const propSystemRef = useRef<PropShieldSystem>(new PropShieldSystem());
  const vrsControllerRef = useRef<VRSCircuitBreakerController>(new VRSCircuitBreakerController());

  // Three.js instances
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const chunkMeshMapRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const chunkMeshGroupRef = useRef<THREE.Group>(new THREE.Group());
  const propsGroupRef = useRef<THREE.Group>(new THREE.Group());
  const particlesGroupRef = useRef<THREE.Group>(new THREE.Group());
  const lightShaftsGroupRef = useRef<THREE.Group>(new THREE.Group());
  const lightShaftMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const foliageGroupRef = useRef<THREE.Group>(new THREE.Group());
  const foliageMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const cloudsGroupRef = useRef<THREE.Group>(new THREE.Group());
  const terrainMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const brushIndicatorMeshRef = useRef<THREE.Mesh | null>(null);
  const propPlacementPreviewRef = useRef<THREE.Group | null>(null);

  // Studio Mode: CSG Sculpting vs Micro-Detail Prop Placement
  const [activeMode, setActiveMode] = useState<'csg' | 'props'>('csg');

  // CSG Controls
  const [brushOp, setBrushOp] = useState<CSGOperation>('carve');
  const [brushShape, setBrushShape] = useState<CSGBrushType>('sphere');
  const [brushRadius, setBrushRadius] = useState<number>(2.25);
  const [brushHeight, setBrushHeight] = useState<number>(4.0);
  const [boxExtents, setBoxExtents] = useState<[number, number, number]>([2.0, 2.0, 2.0]);
  const [brushDamage, setBrushDamage] = useState<number>(60);

  // Prop Placement Controls
  const [selectedPropType, setSelectedPropType] = useState<PropType>('shield_totem');
  const [propYawAngle, setPropYawAngle] = useState<number>(0); // 0, 22.5, 45, ...

  // Engine Pipeline & Stylization Toggles
  const [useDistributedPipeline, setUseDistributedPipeline] = useState<boolean>(true);
  const [useAsymmetricTriplanar, setUseAsymmetricTriplanar] = useState<boolean>(true);
  const [useWasm, setUseWasm] = useState<boolean>(true);
  const [useCascadedLOD, setUseCascadedLOD] = useState<boolean>(true);
  const [quantizeNormals, setQuantizeNormals] = useState<boolean>(true);
  const [generateSkirts, setGenerateSkirts] = useState<boolean>(true);
  const [skirtDepthFactor, setSkirtDepthFactor] = useState<number>(1.25);
  const [highlightSkirts, setHighlightSkirts] = useState<boolean>(false);
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [cameraMode, setCameraMode] = useState<'third_person_rpg' | 'first_person' | 'orbit'>('third_person_rpg');
  const isWalkMode = cameraMode !== 'orbit';
  const [particleRenderMode, setParticleRenderMode] = useState<'3d_faceted_geometry' | 'masked_quad_cutout' | 'dithered_fade' | 'translucent_cards'>('3d_faceted_geometry');
  const [showVRSOverlay, setShowVRSOverlay] = useState<boolean>(false);
  const [simulateHeavyLoad, setSimulateHeavyLoad] = useState<boolean>(false);

  // Subsystem: Liquid / Cavern Water, Volumetric Light Shafts & Fog Simulation State
  const [showWaterPlane, setShowWaterPlane] = useState<boolean>(true);
  const [waterLevel, setWaterLevel] = useState<number>(0.35);
  const [showCavernFog, setShowCavernFog] = useState<boolean>(true);
  const [fogDensity, setFogDensity] = useState<number>(0.016);
  const [showLightShafts, setShowLightShafts] = useState<boolean>(true);
  const [lightShaftIntensity, setLightShaftIntensity] = useState<number>(0.42);

  // Subsystem: Static Chunked Foliage & GPU Vertex Wind Displacement
  const [showChunkedFoliage, setShowChunkedFoliage] = useState<boolean>(true);
  const [windStrength, setWindStrength] = useState<number>(0.35);
  const [windSpeed, setWindSpeed] = useState<number>(1.8);

  // Subsystem: Dynamic Sweeping Cloud Shadows & 3D Polygonal Sky Clouds
  const [showCloudShadows, setShowCloudShadows] = useState<boolean>(true);
  const [show3DClouds, setShow3DClouds] = useState<boolean>(true);
  const [cloudCoverage, setCloudCoverage] = useState<number>(0.45);
  const [cloudSpeed, setCloudSpeed] = useState<number>(1.2);
  const [cloudShadowIntensity, setCloudShadowIntensity] = useState<number>(0.65);

  // Deliberate RPG Combat State
  const [combatState, setCombatState] = useState({
    stamina: 100,
    maxStamina: 100,
    action: 'idle' as 'idle' | 'light_attack' | 'heavy_attack' | 'dodge_roll' | 'recovering',
    lockedTargetName: null as string | null,
    targetHp: null as number | null,
    targetMaxHp: null as number | null,
    poise: 100,
  });

  // Performance & VRS Telemetry state
  const [metrics, setMetrics] = useState({
    fps: 90,
    frameTimeMs: 11.1,
    chunkCount: 0,
    triangleCount: 0,
    vertexCount: 0,
    totalSkirtTriangles: 0,
    lastCsgDurationMs: 0,
    activeCSGJobs: 0,
    pipelineFrame: 1,
    scratchpadHits: 0,
    activeParticles: 0,
    activePropsCount: 0,
    isWasmActive: false,
    wasmBinarySize: 13000,
    wasmExtractUs: 0,
    wasmTerrainUs: 0,
    wasmRayUs: 0,
    wasmPhysicsUs: 0,
    wasmInvocations: 0,
    lodDistribution: { lod0: 0, lod1: 0, lod2: 0, lod3: 0 },
    particleOverdrawFactor: '1.0x (Zero Early-Z Overdraw)',
    waterPassMs: 0.12,
    fogPassMs: 0.04,
  });

  const [vrsState, setVrsState] = useState<VRSCircuitBreakerState>({
    isVRSEnabled: false,
    shadingRateMode: '1x1_native',
    movingAvgFrameTimeMs: 11.1,
    consecutiveFastFrames: 0,
    triggerCount: 0,
    targetBudgetMs: 11.11,
    circuitBreakerThresholdMs: 12.50,
    recoveryThresholdMs: 11.76,
    requiredRecoveryFrames: 30,
    cameraSweepDetected: false,
  });

  // Mouse & Orbit Camera state
  const isMouseDownRef = useRef(false);
  const isRightMouseDownRef = useRef(false);
  const mouseScreenPosRef = useRef({ x: 0, y: 0 });
  const cameraAngleRef = useRef({
    theta: Math.PI / 4,
    phi: Math.PI / 3.4,
    radius: 36,
    target: new THREE.Vector3(0, 0, 0)
  });

  // Third-person / First-person Walk state
  const playerRef = useRef({
    pos: new THREE.Vector3(0, 6, 8),
    vel: new THREE.Vector3(0, 0, 0),
    yaw: 0,
    pitch: -0.15,
    grounded: false
  });
  const keyStateRef = useRef<{ [key: string]: boolean }>({});

  // 3D Faceted Geometry Particle Mesh & RPG Warrior Avatar Refs
  const instancedShardsRef = useRef<THREE.InstancedMesh | null>(null);
  const playerMeshGroupRef = useRef<THREE.Group>(new THREE.Group());
  const swordMeshRef = useRef<THREE.Group | null>(null);
  const lockedTargetPropRef = useRef<PropInstance | null>(null);
  const combatActionTimerRef = useRef(0);
  const staminaRef = useRef(100);
  const hasDealtAttackDamageRef = useRef(false);
  const dodgeRollDirRef = useRef(new THREE.Vector3(0, 0, -1));
  const waterMeshRef = useRef<THREE.Mesh | null>(null);

  // Sync prop shields into voxel world
  const syncShieldsToWorld = () => {
    const world = worldRef.current;
    const shields = propSystemRef.current.getActiveShields();
    world.clearShields();
    for (const s of shields) {
      world.registerShield(s);
    }
  };

  // Build Three.js 3D meshes for props & shield bubbles
  const syncThreeProps = () => {
    const group = propsGroupRef.current;
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
    }

    const props = propSystemRef.current.getAllProps();
    for (const prop of props) {
      const def = PROP_CATALOG[prop.type];
      const propGroup = new THREE.Group();
      propGroup.position.set(prop.position[0], prop.position[1], prop.position[2]);
      propGroup.rotation.y = (prop.yawAngle * Math.PI) / 180;

      // Stylized solid mesh representation
      const [w, h, d] = def.dimensions;

      if (prop.type === 'geometric_canopy_tree') {
        // 100% Solid Geometric Tree: Brown low-poly trunk + 3 faceted canopy clusters (0 opacity masks!)
        const trunkGeom = new THREE.CylinderGeometry(0.2, 0.35, 1.8, 6);
        const trunkMat = new THREE.MeshStandardMaterial({
          color: 0x5c3a21,
          roughness: 0.8,
          flatShading: true,
        });
        const trunk = new THREE.Mesh(trunkGeom, trunkMat);
        trunk.position.y = 0.9;
        trunk.castShadow = true;
        propGroup.add(trunk);

        // 3 Layered geometric leaf polyhedra (no opacity masks, Early-Z 1.0x preserved!)
        const leafMat = new THREE.MeshStandardMaterial({
          color: 0x16a34a,
          emissive: 0x14532d,
          emissiveIntensity: 0.2,
          roughness: 0.5,
          flatShading: true,
          side: THREE.DoubleSide,
        });

        const canopyTiers = [
          { y: 2.1, rad: 1.15 },
          { y: 2.8, rad: 0.9 },
          { y: 3.4, rad: 0.65 },
        ];
        for (const tier of canopyTiers) {
          const tierGeom = new THREE.IcosahedronGeometry(tier.rad, 0); // 20-facet polyhedron
          const tierMesh = new THREE.Mesh(tierGeom, leafMat);
          tierMesh.position.y = tier.y;
          tierMesh.scale.set(1.0, 0.75, 1.0);
          tierMesh.castShadow = true;
          tierMesh.receiveShadow = true;
          propGroup.add(tierMesh);
        }
      } else {
        let meshGeom: THREE.BufferGeometry;

        if (prop.type === 'shield_totem' || prop.type === 'ancient_pillar') {
          meshGeom = new THREE.CylinderGeometry(w * 0.45, w * 0.55, h, 8);
        } else if (prop.type === 'crystal_cluster') {
          meshGeom = new THREE.ConeGeometry(w * 0.6, h, 6);
        } else {
          meshGeom = new THREE.BoxGeometry(w, h, d);
        }

        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(def.color),
          emissive: new THREE.Color(def.emissiveColor),
          emissiveIntensity: 0.35,
          roughness: 0.6,
          metalness: 0.2,
        });

        const bodyMesh = new THREE.Mesh(meshGeom, mat);
        bodyMesh.position.y = h * 0.5;
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        propGroup.add(bodyMesh);
      }

      // Shimmering Forcefield Shield Bubble
      if (prop.isShieldActive) {
        const shieldBubble = new THREE.Mesh(
          new THREE.SphereGeometry(def.shieldRadius, 20, 16),
          new THREE.MeshBasicMaterial({
            color: new THREE.Color(def.emissiveColor),
            wireframe: true,
            transparent: true,
            opacity: 0.28,
          })
        );
        shieldBubble.position.y = h * 0.5;
        propGroup.add(shieldBubble);
      }

      group.add(propGroup);
    }

    setMetrics(prev => ({ ...prev, activePropsCount: props.length }));
  };

  // Helper: Create material based on current shading style
  const getChunkMaterial = () => {
    if (useAsymmetricTriplanar) {
      if (!terrainMaterialRef.current || terrainMaterialRef.current.wireframe !== wireframe) {
        terrainMaterialRef.current = createAsymmetricTriplanarMaterial({
          wireframe,
          cloudShadowIntensity: showCloudShadows ? cloudShadowIntensity : 0.0,
          cloudCoverage,
        });
      }
      return terrainMaterialRef.current;
    }
    return new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.1,
      wireframe: wireframe,
      flatShading: quantizeNormals
    });
  };

  // Helper to synchronize single VoxelChunk into Three.js Scene
  const updateSingleThreeMesh = (chunkKey: string, m: VoxelMesh) => {
    const group = chunkMeshGroupRef.current;
    const meshMap = chunkMeshMapRef.current;

    // Remove existing mesh if present
    const existing = meshMap.get(chunkKey);
    if (existing) {
      existing.geometry.dispose();
      group.remove(existing);
      meshMap.delete(chunkKey);
    }

    if (!m || m.triangleCount === 0) return;

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(m.positions, 3));
    geom.setAttribute('normal', new THREE.BufferAttribute(m.normals, 3));
    geom.setAttribute('uv', new THREE.BufferAttribute(m.uvs, 2));

    const colors = new Float32Array(m.vertexCount * 3);
    const skirtStartIdx = m.skirtVertexCount ? (m.vertexCount - m.skirtVertexCount) : m.vertexCount;
    for (let i = 0; i < m.vertexCount; i++) {
      if (highlightSkirts && i >= skirtStartIdx) {
        // Highlight boundary skirt curtain vertices in vibrant cyan for Seam Inspector mode
        colors[i * 3] = 0.0;
        colors[i * 3 + 1] = 0.9;
        colors[i * 3 + 2] = 1.0;
        continue;
      }
      const matId = m.materialIds[i];
      const ny = m.normals[i * 3 + 1];

      let r = 0.45, g = 0.48, b = 0.44; // Stone gray
      if (matId === 3) {
        // Grass / Topsoil
        if (ny > 0.6) {
          r = 0.28; g = 0.58; b = 0.24; // Lush green
        } else {
          r = 0.42; g = 0.36; b = 0.26; // Cliff dirt
        }
      } else if (matId === 4) {
        // Basalt / Strata
        r = 0.22; g = 0.24; b = 0.27;
      } else if (matId === 6) {
        // Snow
        r = 0.88; g = 0.92; b = 0.96;
      }
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.setIndex(new THREE.BufferAttribute(m.indices, 1));
    geom.computeBoundingSphere();

    const mesh = new THREE.Mesh(geom, getChunkMaterial());
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    meshMap.set(chunkKey, mesh);
  };

  // Synchronize ALL VoxelWorld chunk meshes into Three.js Scene
  const syncThreeMeshes = () => {
    const world = worldRef.current;
    const group = chunkMeshGroupRef.current;
    const meshMap = chunkMeshMapRef.current;

    while (group.children.length > 0) {
      const child = group.children[0] as THREE.Mesh;
      if (child.geometry) child.geometry.dispose();
      group.remove(child);
    }
    meshMap.clear();

    const chunks = world.getAllChunks();
    for (const chunk of chunks) {
      if (!chunk.mesh || chunk.mesh.triangleCount === 0) continue;
      const key = `${chunk.cx}_${chunk.cy}_${chunk.cz}`;
      updateSingleThreeMesh(key, chunk.mesh);
    }

    const worldMetrics = world.getMetrics();
    setMetrics(prev => ({
      ...prev,
      chunkCount: worldMetrics.totalChunks,
      triangleCount: worldMetrics.totalTriangles,
      vertexCount: worldMetrics.totalVertices,
      totalSkirtTriangles: worldMetrics.totalSkirtTriangles,
    }));

    rebuildStaticChunkedFoliage();
  };

  // Rebuild Static Chunked Foliage Layer (Folded 3D chevron blades with 100% solid Early-Z and GPU Wind Displacement)
  const rebuildStaticChunkedFoliage = () => {
    const group = foliageGroupRef.current;
    while (group.children.length > 0) {
      const child = group.children[0] as THREE.Mesh;
      if (child.geometry) child.geometry.dispose();
      group.remove(child);
    }

    if (!showChunkedFoliage || !foliageMaterialRef.current) return;

    const world = worldRef.current;
    const chunks = world.getAllChunks();

    const positions: number[] = [];
    const colors: number[] = [];
    const heights: number[] = [];
    const indices: number[] = [];
    let vertexOffset = 0;

    for (const chunk of chunks) {
      const m = chunk.mesh;
      if (!m || m.vertexCount === 0) continue;

      for (let i = 0; i < m.vertexCount; i += 3) {
        if (m.materialIds[i] !== 3) continue; // Topsoil/grass
        const ny = m.normals[i * 3 + 1];
        if (ny < 0.68) continue; // Upward facing surface

        const px = m.positions[i * 3];
        const py = m.positions[i * 3 + 1];
        const pz = m.positions[i * 3 + 2];

        // Seeded random per tuft
        const seed = Math.sin(px * 12.9898 + pz * 78.233) * 43758.5453;
        const rand = seed - Math.floor(seed);
        const bladeHeight = 0.32 + rand * 0.38;
        const bladeWidth = 0.07 + rand * 0.04;
        const yaw = rand * Math.PI * 2;

        let cr = 0.22, cg = 0.68, cb = 0.18;
        if (rand > 0.88) {
          cr = 0.95; cg = 0.82; cb = 0.15; // Wildflower gold
        } else if (rand > 0.78) {
          cr = 0.25; cg = 0.85; cb = 0.95; // Wildflower cyan
        }

        const cosY = Math.cos(yaw);
        const sinY = Math.sin(yaw);

        // Folded 3D chevron blade (4 vertices, 2 triangles)
        positions.push(px - cosY * bladeWidth, py, pz - sinY * bladeWidth);
        colors.push(cr * 0.45, cg * 0.45, cb * 0.45);
        heights.push(0.0);

        positions.push(px + cosY * bladeWidth, py, pz + sinY * bladeWidth);
        colors.push(cr * 0.45, cg * 0.45, cb * 0.45);
        heights.push(0.0);

        positions.push(px - sinY * (bladeWidth * 0.5), py + bladeHeight * 0.5, pz + cosY * (bladeWidth * 0.5));
        colors.push(cr * 0.85, cg * 0.85, cb * 0.85);
        heights.push(0.5);

        positions.push(px, py + bladeHeight, pz);
        colors.push(cr * 1.25, cg * 1.25, cb * 1.25);
        heights.push(1.0);

        indices.push(
          vertexOffset, vertexOffset + 1, vertexOffset + 2,
          vertexOffset, vertexOffset + 2, vertexOffset + 3
        );
        vertexOffset += 4;
      }
    }

    if (positions.length === 0) return;

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geom.setAttribute('aHeight', new THREE.Float32BufferAttribute(heights, 1));
    geom.setIndex(indices);
    geom.computeVertexNormals();

    const foliageMesh = new THREE.Mesh(geom, foliageMaterialRef.current);
    foliageMesh.castShadow = true;
    foliageMesh.receiveShadow = true;
    group.add(foliageMesh);
  };

  // Initialize Voxel World & Procedural Landscape
  useEffect(() => {
    const world = worldRef.current;
    world.quantizeNormals = quantizeNormals;
    world.generateSkirts = generateSkirts;
    world.skirtDepthVoxels = skirtDepthFactor;

    syncShieldsToWorld();
    world.generateLandscape(-3, 3, -2, 2, -3, 3);

    const m = world.getMetrics();
    setMetrics(prev => ({
      ...prev,
      chunkCount: m.totalChunks,
      triangleCount: m.totalTriangles,
      vertexCount: m.totalVertices,
      totalSkirtTriangles: m.totalSkirtTriangles,
    }));
  }, []);

  // Update world options when toggles change
  useEffect(() => {
    const world = worldRef.current;
    world.quantizeNormals = quantizeNormals;
    world.generateSkirts = generateSkirts;
    world.skirtDepthVoxels = skirtDepthFactor;
    world.remeshAllChunks();
    syncThreeMeshes();
  }, [quantizeNormals, generateSkirts, skirtDepthFactor, highlightSkirts, useAsymmetricTriplanar, wireframe]);

  // Deliberate RPG Combat Mechanics
  const triggerDeliberateAttack = (type: 'light' | 'heavy') => {
    if (combatActionTimerRef.current > 0) return; // Attack commitment window: cannot spam cancel
    const cost = type === 'light' ? 18 : 35;
    if (staminaRef.current < cost) return; // Out of stamina!

    staminaRef.current -= cost;
    combatActionTimerRef.current = type === 'light' ? 0.38 : 0.72;
    hasDealtAttackDamageRef.current = false;
    setCombatState(prev => ({
      ...prev,
      stamina: Math.max(0, staminaRef.current),
      action: type === 'light' ? 'light_attack' : 'heavy_attack',
    }));
  };

  const triggerDodgeRoll = () => {
    if (combatActionTimerRef.current > 0) return;
    const cost = 22;
    if (staminaRef.current < cost) return;

    staminaRef.current -= cost;
    combatActionTimerRef.current = 0.45;

    // Roll along current input direction or player forward
    const p = playerRef.current;
    const keys = keyStateRef.current;
    const fwd = new THREE.Vector3(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
    const right = new THREE.Vector3(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
    const rollDir = new THREE.Vector3();
    if (keys['w']) rollDir.add(fwd);
    if (keys['s']) rollDir.sub(fwd);
    if (keys['a']) rollDir.sub(right);
    if (keys['d']) rollDir.add(right);

    if (rollDir.lengthSq() > 0) {
      rollDir.normalize();
    } else {
      rollDir.copy(fwd);
    }
    dodgeRollDirRef.current.copy(rollDir);

    setCombatState(prev => ({
      ...prev,
      stamina: Math.max(0, staminaRef.current),
      action: 'dodge_roll',
    }));
  };

  const toggleLockOn = () => {
    if (lockedTargetPropRef.current) {
      lockedTargetPropRef.current = null;
      setCombatState(prev => ({
        ...prev,
        lockedTargetName: null,
        targetHp: null,
        targetMaxHp: null,
      }));
      return;
    }

    const props = propSystemRef.current.getAllProps();
    if (props.length === 0) return;

    const p = playerRef.current;
    let closestProp: PropInstance | null = null;
    let closestDistSq = 20 * 20;

    for (const prop of props) {
      const dx = prop.position[0] - p.pos.x;
      const dy = prop.position[1] - p.pos.y;
      const dz = prop.position[2] - p.pos.z;
      const dSq = dx * dx + dy * dy + dz * dz;
      if (dSq < closestDistSq) {
        closestDistSq = dSq;
        closestProp = prop;
      }
    }

    if (closestProp) {
      lockedTargetPropRef.current = closestProp;
      const def = PROP_CATALOG[closestProp.type];
      setCombatState(prev => ({
        ...prev,
        lockedTargetName: def.name,
        targetHp: closestProp.currentDurability,
        targetMaxHp: def.maxDurability,
      }));
    }
  };

  // Main Three.js Scene Setup & Render Loop
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0c1017');
    scene.fog = new THREE.FogExp2('#0c1017', 0.015);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 500);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight('#a0b8d0', 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight('#fff4e0', 1.4);
    sunLight.position.set(30, 60, 25);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 150;
    sunLight.shadow.camera.left = -40;
    sunLight.shadow.camera.right = 40;
    sunLight.shadow.camera.top = 40;
    sunLight.shadow.camera.bottom = -40;
    scene.add(sunLight);

    // Ground Grid & Helpers
    const grid = new THREE.GridHelper(60, 60, '#334155', '#1e293b');
    grid.position.y = -8.0;
    scene.add(grid);

    // Groups
    scene.add(chunkMeshGroupRef.current);
    scene.add(propsGroupRef.current);
    scene.add(particlesGroupRef.current);
    scene.add(lightShaftsGroupRef.current);
    scene.add(foliageGroupRef.current);
    scene.add(cloudsGroupRef.current);

    // Subsystem: Real-Time Stylized Cavern Water Plane (Analytical Gerstner Waves)
    const waterGeom = new THREE.PlaneGeometry(60, 60, 48, 48);
    const waterMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColorDeep: { value: new THREE.Color('#0369a1') },
        uColorShallow: { value: new THREE.Color('#38bdf8') },
        uFoamColor: { value: new THREE.Color('#e0f2fe') },
        uOpacity: { value: 0.82 }
      },
      vertexShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying float vWaveHeight;
        void main() {
          vUv = uv;
          vec3 pos = position;
          // Analytical multi-directional Gerstner wave sum (1x overdraw, 0 bandwidth stalls)
          float w1 = sin(pos.x * 0.45 + uTime * 1.5) * 0.12;
          float w2 = cos(pos.y * 0.55 + uTime * 1.2) * 0.09;
          float w3 = sin((pos.x + pos.y) * 0.35 + uTime * 2.0) * 0.05;
          pos.z += w1 + w2 + w3;
          vWaveHeight = w1 + w2 + w3;
          vec4 worldPos = modelMatrix * vec4(pos, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uColorDeep;
        uniform vec3 uColorShallow;
        uniform vec3 uFoamColor;
        uniform float uOpacity;
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying float vWaveHeight;
        void main() {
          float crest = smoothstep(0.08, 0.22, vWaveHeight);
          vec3 waterCol = mix(uColorDeep, uColorShallow, clamp(vWaveHeight * 3.0 + 0.5, 0.0, 1.0));
          vec3 finalColor = mix(waterCol, uFoamColor, crest * 0.6);
          gl_FragColor = vec4(finalColor, uOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const waterMesh = new THREE.Mesh(waterGeom, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.y = waterLevel;
    waterMesh.visible = showWaterPlane;
    scene.add(waterMesh);
    waterMeshRef.current = waterMesh;

    // Subsystem: 90 FPS Mesh-Based Volumetric God Ray Shafts (Eliminates 3D Froxel Raymarching)
    // Modeled low-poly conical meshes with additive Fresnel soft-edge falloff and dust shimmer (<0.06 ms GPU time)
    const shaftGeom = new THREE.CylinderGeometry(0.3, 4.2, 22, 20, 1, true);
    shaftGeom.translate(0, -11, 0);

    const shaftMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: lightShaftIntensity },
        uColor: { value: new THREE.Color('#fef08a') }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPos;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPos = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uIntensity;
        uniform vec3 uColor;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPos;
        void main() {
          vec3 viewDir = normalize(vViewPos);
          float edgeFade = pow(1.0 - abs(dot(vNormal, viewDir)), 1.2);
          float lengthFade = smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.45, vUv.y);
          float shimmer = 0.85 + 0.15 * sin(vUv.y * 25.0 + uTime * 2.0);
          float alpha = edgeFade * lengthFade * shimmer * uIntensity;
          gl_FragColor = vec4(uColor * alpha, alpha);
        }
      `,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    lightShaftMaterialRef.current = shaftMat;

    const shaftOrigins = [
      { pos: new THREE.Vector3(6, 16, 4), rot: new THREE.Euler(0.2, 0.1, -0.25), scale: 1.0 },
      { pos: new THREE.Vector3(-4, 18, -2), rot: new THREE.Euler(-0.15, 0.2, 0.3), scale: 0.85 },
      { pos: new THREE.Vector3(12, 17, -8), rot: new THREE.Euler(0.1, -0.3, -0.2), scale: 1.15 }
    ];

    lightShaftsGroupRef.current.clear();
    for (const shaft of shaftOrigins) {
      const mesh = new THREE.Mesh(shaftGeom, shaftMat);
      mesh.position.copy(shaft.pos);
      mesh.rotation.copy(shaft.rot);
      mesh.scale.set(shaft.scale, shaft.scale, shaft.scale);
      lightShaftsGroupRef.current.add(mesh);
    }
    lightShaftsGroupRef.current.visible = showLightShafts;

    // Subsystem: Static Chunked Foliage with GPU Vertex Wind Displacement & Synchronized Cloud Shadows
    const foliageMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uWindSpeed: { value: windSpeed },
        uWindStrength: { value: windStrength },
        uCloudShadowIntensity: { value: showCloudShadows ? cloudShadowIntensity : 0.0 },
        uCloudCoverage: { value: cloudCoverage },
        uCloudScale: { value: 0.038 },
        uCloudDrift: { value: new THREE.Vector2(0.42, 0.28) },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uWindSpeed;
        uniform float uWindStrength;
        attribute float aHeight;
        varying vec3 vColor;
        varying vec3 vWorldPos;

        void main() {
          vColor = color;
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          
          // Traveling world-space wave displacement
          float wave = sin(uTime * uWindSpeed + (worldPos.x + worldPos.z) * 0.45);
          float gust = sin(uTime * (uWindSpeed * 0.4) + worldPos.x * 0.2) * 0.35;
          float sway = (wave + gust) * uWindStrength * aHeight;
          
          worldPos.x += sway * 0.7;
          worldPos.z += sway * 0.5;
          worldPos.y -= sway * sway * 0.2; // Conserves blade length during heavy gusts
          
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uCloudShadowIntensity;
        uniform float uCloudCoverage;
        uniform float uCloudScale;
        uniform vec2 uCloudDrift;
        varying vec3 vColor;
        varying vec3 vWorldPos;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i + vec2(0.0,0.0)), hash(i + vec2(1.0,0.0)), u.x),
                     mix(hash(i + vec2(0.0,1.0)), hash(i + vec2(1.0,1.0)), u.x), u.y);
        }

        void main() {
          vec3 lightDir = normalize(vec3(0.6, 0.8, 0.4));
          vec2 cloudRayOffset = vWorldPos.xz - (vWorldPos.y / max(lightDir.y, 0.2)) * lightDir.xz;
          vec2 cloudCoord = cloudRayOffset * uCloudScale + uCloudDrift * (uTime * 0.12);
          float c1 = noise(cloudCoord);
          float c2 = noise(cloudCoord * 2.4 + vec2(2.1, 4.3));
          float cDensity = c1 * 0.7 + c2 * 0.3;
          float cloudMask = smoothstep(1.0 - uCloudCoverage, 1.0 - uCloudCoverage + 0.24, cDensity);
          float cloudAtten = mix(1.0, 1.0 - uCloudShadowIntensity, cloudMask);

          vec3 shadowTint = vec3(0.38, 0.44, 0.48);
          vec3 shadedBlade = mix(vColor * shadowTint, vColor, cloudAtten);
          gl_FragColor = vec4(shadedBlade, 1.0); // 100% solid, zero discard, 1.0x Early-Z
        }
      `,
      side: THREE.DoubleSide,
      depthWrite: true,
      transparent: false,
    });
    foliageMaterialRef.current = foliageMat;
    rebuildStaticChunkedFoliage();

    // Subsystem: 3D Low-Poly Faceted Cloud Meshes in the Sky (100% Solid Early-Z, zero alpha overdraw)
    // Modeled from 20-sided faceted icosahedra with flat shading and soft ambient under-tinting
    const cloudsGroup = cloudsGroupRef.current;
    cloudsGroup.clear();
    const cloudClusterOrigins = [
      { x: -28, y: 34, z: -20, scale: 1.4 },
      { x: 5, y: 38, z: -15, scale: 1.9 },
      { x: 32, y: 36, z: -5, scale: 1.6 },
      { x: -18, y: 41, z: 12, scale: 2.1 },
      { x: 16, y: 35, z: 24, scale: 1.5 },
      { x: -35, y: 39, z: 28, scale: 1.7 },
      { x: 2, y: 43, z: -38, scale: 2.3 },
    ];

    const cloudPuffGeom = new THREE.IcosahedronGeometry(2.4, 0); // Faceted 20-gon crystalline puff
    const cloudMat = new THREE.MeshLambertMaterial({
      color: 0xf8fafc,
      flatShading: true,
      depthWrite: true,
      transparent: false,
    });

    for (const cluster of cloudClusterOrigins) {
      const clusterGroup = new THREE.Group();
      clusterGroup.position.set(cluster.x, cluster.y, cluster.z);
      clusterGroup.scale.set(cluster.scale, cluster.scale * 0.55, cluster.scale); // Naturally flat base

      const subPuffs = [
        { x: 0, y: 0, z: 0, r: 1.0 },
        { x: -1.6, y: -0.2, z: 0.4, r: 0.8 },
        { x: 1.7, y: -0.1, z: -0.3, r: 0.85 },
        { x: 0.6, y: 0.5, z: 0.5, r: 0.75 },
        { x: -0.8, y: 0.4, z: -0.6, r: 0.7 },
        { x: 2.4, y: -0.4, z: 0.8, r: 0.55 },
      ];

      for (const puff of subPuffs) {
        const pMesh = new THREE.Mesh(cloudPuffGeom, cloudMat);
        pMesh.position.set(puff.x, puff.y, puff.z);
        pMesh.scale.set(puff.r, puff.r, puff.r);
        pMesh.castShadow = false; // Preserves high-res CSM budget for terrain/player!
        clusterGroup.add(pMesh);
      }
      cloudsGroup.add(clusterGroup);
    }
    cloudsGroup.visible = show3DClouds;

    // RPG Third-Person Warrior Avatar
    const warriorAvatarGroup = new THREE.Group();
    // Torso with layered iron armor
    const torsoMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.68, 0.34),
      new THREE.MeshLambertMaterial({ color: 0x1e293b, flatShading: true })
    );
    torsoMesh.position.y = 0.85;
    warriorAvatarGroup.add(torsoMesh);

    // Pauldrons (Gold trimmed shoulder guards)
    const pauldronMat = new THREE.MeshLambertMaterial({ color: 0xd97706, flatShading: true });
    const leftPauldron = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.28), pauldronMat);
    leftPauldron.position.set(-0.36, 1.15, 0);
    warriorAvatarGroup.add(leftPauldron);
    const rightPauldron = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.28), pauldronMat);
    rightPauldron.position.set(0.36, 1.15, 0);
    warriorAvatarGroup.add(rightPauldron);

    // Helmet with cyan glowing visor
    const helmet = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.35, 0.32),
      new THREE.MeshLambertMaterial({ color: 0x334155, flatShading: true })
    );
    helmet.position.y = 1.35;
    warriorAvatarGroup.add(helmet);

    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.08, 0.06),
      new THREE.MeshBasicMaterial({ color: 0x06b6d4 })
    );
    visor.position.set(0, 1.35, -0.16);
    warriorAvatarGroup.add(visor);

    // Left Arm Shield
    const shieldGroup = new THREE.Group();
    shieldGroup.position.set(-0.44, 0.85, -0.12);
    const shieldPlate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.06, 10),
      new THREE.MeshLambertMaterial({ color: 0x0f172a, flatShading: true })
    );
    shieldPlate.rotation.x = Math.PI / 2;
    shieldGroup.add(shieldPlate);
    const shieldBoss = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 8),
      new THREE.MeshLambertMaterial({ color: 0x38bdf8, flatShading: true })
    );
    shieldBoss.position.z = -0.04;
    shieldGroup.add(shieldBoss);
    warriorAvatarGroup.add(shieldGroup);

    // Right Arm Greatsword
    const swordGroup = new THREE.Group();
    swordGroup.position.set(0.44, 0.8, -0.12);
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 1.05, 0.03),
      new THREE.MeshLambertMaterial({ color: 0xf1f5f9, flatShading: true })
    );
    blade.position.y = 0.5;
    swordGroup.add(blade);
    const guard = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.06, 0.07),
      new THREE.MeshLambertMaterial({ color: 0xf59e0b, flatShading: true })
    );
    guard.position.y = 0.02;
    swordGroup.add(guard);
    const pommel = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 6, 6),
      new THREE.MeshLambertMaterial({ color: 0xd97706, flatShading: true })
    );
    pommel.position.y = -0.16;
    swordGroup.add(pommel);
    warriorAvatarGroup.add(swordGroup);
    swordMeshRef.current = swordGroup;

    warriorAvatarGroup.visible = cameraMode === 'third_person_rpg';
    scene.add(warriorAvatarGroup);
    playerMeshGroupRef.current = warriorAvatarGroup;

    // CSG Brush Wireframe Cursor
    const brushIndicatorGeom = new THREE.SphereGeometry(1, 16, 16);
    const brushIndicatorMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.6
    });
    const brushIndicator = new THREE.Mesh(brushIndicatorGeom, brushIndicatorMat);
    brushIndicator.visible = false;
    scene.add(brushIndicator);
    brushIndicatorMeshRef.current = brushIndicator;

    // Prop Placement Preview Hologram
    const propPreviewGroup = new THREE.Group();
    propPreviewGroup.visible = false;
    const previewBox = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0x22d3ee, wireframe: true, transparent: true, opacity: 0.7 })
    );
    propPreviewGroup.add(previewBox);
    scene.add(propPreviewGroup);
    propPlacementPreviewRef.current = propPreviewGroup;

    // Initial meshes and props
    syncThreeMeshes();
    syncThreeProps();

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Keyboard handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keyStateRef.current[key] = true;

      if (key === 'q') {
        toggleLockOn();
      } else if (key === 'r') {
        if (cameraMode === 'third_person_rpg') {
          triggerDeliberateAttack('heavy');
        }
      } else if (e.key === ' ' && cameraMode === 'third_person_rpg') {
        triggerDodgeRoll();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keyStateRef.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Subsystem: 3D Faceted Geometry & Screen-Door Dithered Transparency Particle Engine
    const MAX_SHARD_PARTICLES = 1024;
    const shardGeom = new THREE.IcosahedronGeometry(0.18, 0); // 20 triangular facets
    const shardMat = new THREE.MeshLambertMaterial({
      flatShading: true,
      depthWrite: true, // Hardware Early-Z preserved!
      transparent: false,
    });
    if (particleRenderMode === 'dithered_fade') {
      shardMat.onBeforeCompile = (shader) => {
        shader.fragmentShader = `
          float getBayer4(vec2 p) {
            int x = int(mod(p.x, 4.0));
            int y = int(mod(p.y, 4.0));
            if (x == 0 && y == 0) return 0.0 / 16.0;
            if (x == 1 && y == 0) return 8.0 / 16.0;
            if (x == 2 && y == 0) return 2.0 / 16.0;
            if (x == 3 && y == 0) return 10.0 / 16.0;
            if (x == 0 && y == 1) return 12.0 / 16.0;
            if (x == 1 && y == 1) return 4.0 / 16.0;
            if (x == 2 && y == 1) return 14.0 / 16.0;
            if (x == 3 && y == 1) return 6.0 / 16.0;
            if (x == 0 && y == 2) return 3.0 / 16.0;
            if (x == 1 && y == 2) return 11.0 / 16.0;
            if (x == 2 && y == 2) return 1.0 / 16.0;
            if (x == 3 && y == 2) return 9.0 / 16.0;
            if (x == 0 && y == 3) return 15.0 / 16.0;
            if (x == 1 && y == 3) return 7.0 / 16.0;
            if (x == 2 && y == 3) return 13.0 / 16.0;
            return 5.0 / 16.0;
          }
        ` + shader.fragmentShader.replace(
          '#include <dithering_fragment>',
          `#include <dithering_fragment>
          #ifdef USE_COLOR
            // Screen-Door Transparency: discards pixels without disabling depthWrite
            // Early-Z stays active on Steam Deck, saving massive memory bandwidth
            float bayerThresh = getBayer4(gl_FragCoord.xy);
            float lum = (vColor.r + vColor.g + vColor.b) * 0.333;
            if (lum < bayerThresh * 0.85) discard;
          #endif
          `
        );
      };
    }
    const instancedShards = new THREE.InstancedMesh(shardGeom, shardMat, MAX_SHARD_PARTICLES);
    instancedShards.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    particlesGroupRef.current.add(instancedShards);
    instancedShardsRef.current = instancedShards;

    // Sprite Cards: Masked Cutout (No Blend) vs Alpha Blended Cards
    const particleGeom = new THREE.BufferGeometry();
    const particleMat = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      transparent: false,
      depthWrite: true,
      opacity: 1.0,
      alphaTest: 0.5,
    });
    const particlePoints = new THREE.Points(particleGeom, particleMat);
    particlesGroupRef.current.add(particlePoints);

    // Animation Loop
    let lastTime = performance.now();
    let frameCounter = 0;
    let fpsTimer = 0;
    let lodCheckTimer = 0;
    let animationFrameId: number;

    const animate = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(animate);

      const realDelta = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      // Heavy load simulation if toggled
      if (simulateHeavyLoad) {
        const startBurn = performance.now();
        while (performance.now() - startBurn < 14) {}
      }

      // Advance Cavern Water Plane & Analytical Wave Time
      if (waterMeshRef.current && showWaterPlane) {
        const mat = waterMeshRef.current.material as THREE.ShaderMaterial;
        if (mat.uniforms && mat.uniforms.uTime) {
          mat.uniforms.uTime.value = currentTime * 0.001;
        }
        waterMeshRef.current.position.y = waterLevel;
        waterMeshRef.current.visible = true;
      } else if (waterMeshRef.current) {
        waterMeshRef.current.visible = false;
      }

      // Advance Cavern Exponential Mist / Fog
      if (sceneRef.current) {
        if (showCavernFog) {
          if (!sceneRef.current.fog || (sceneRef.current.fog as THREE.FogExp2).density !== fogDensity) {
            sceneRef.current.fog = new THREE.FogExp2('#0c1017', fogDensity);
          }
        } else {
          sceneRef.current.fog = null;
        }
      }

      // Advance Cavern Volumetric God Ray Light Shafts
      if (lightShaftMaterialRef.current) {
        lightShaftMaterialRef.current.uniforms.uTime.value = currentTime * 0.001;
        lightShaftMaterialRef.current.uniforms.uIntensity.value = lightShaftIntensity;
      }
      if (lightShaftsGroupRef.current) {
        lightShaftsGroupRef.current.visible = showLightShafts;
      }

      // Advance Static Chunked Foliage & GPU Vertex Wind Displacement
      if (foliageMaterialRef.current) {
        foliageMaterialRef.current.uniforms.uTime.value = currentTime * 0.001;
        foliageMaterialRef.current.uniforms.uWindSpeed.value = windSpeed;
        foliageMaterialRef.current.uniforms.uWindStrength.value = windStrength;
      }
      if (foliageGroupRef.current) {
        foliageGroupRef.current.visible = showChunkedFoliage;
      }

      // Advance Dynamic Sweeping Cloud Shadows & 3D Polygonal Sky Clouds
      const cloudTime = currentTime * 0.001 * cloudSpeed;
      if (terrainMaterialRef.current && terrainMaterialRef.current.uniforms.uTime) {
        terrainMaterialRef.current.uniforms.uTime.value = cloudTime;
        terrainMaterialRef.current.uniforms.uCloudShadowIntensity.value = showCloudShadows ? cloudShadowIntensity : 0.0;
        terrainMaterialRef.current.uniforms.uCloudCoverage.value = cloudCoverage;
      }
      if (foliageMaterialRef.current && foliageMaterialRef.current.uniforms.uCloudShadowIntensity) {
        foliageMaterialRef.current.uniforms.uCloudShadowIntensity.value = showCloudShadows ? cloudShadowIntensity : 0.0;
        foliageMaterialRef.current.uniforms.uCloudCoverage.value = cloudCoverage;
      }
      if (cloudsGroupRef.current) {
        cloudsGroupRef.current.visible = show3DClouds;
        if (show3DClouds) {
          const driftStepX = 0.42 * cloudSpeed * realDelta * 2.5;
          const driftStepZ = 0.28 * cloudSpeed * realDelta * 2.5;
          for (const cluster of cloudsGroupRef.current.children) {
            cluster.position.x += driftStepX;
            cluster.position.z += driftStepZ;
            if (cluster.position.x > 55) cluster.position.x = -55;
            if (cluster.position.z > 55) cluster.position.z = -55;
          }
        }
      }

      const frameDurationMs = Math.max(0.1, performance.now() - currentTime + realDelta * 1000);

      // Advance VRS Circuit Breaker Controller
      const updatedVrs = vrsControllerRef.current.update(
        frameDurationMs,
        cameraRef.current?.rotation
      );
      setVrsState(updatedVrs);

      frameCounter++;
      fpsTimer += realDelta;
      if (fpsTimer >= 0.3) {
        const curFps = Math.round(frameCounter / fpsTimer);
        const curMs = Number(((fpsTimer / frameCounter) * 1000).toFixed(1));
        const pipeStats = csgPipelineRef.current.stats;
        const wasmTel = voxelWasmBridge.getTelemetry();

        let l0 = 0, l1 = 0, l2 = 0, l3 = 0;
        for (const chunk of worldRef.current.getAllChunks()) {
          const l = chunk.lod ?? 0;
          if (l === 0) l0++;
          else if (l === 1) l1++;
          else if (l === 2) l2++;
          else l3++;
        }

        setMetrics(prev => ({
          ...prev,
          fps: curFps,
          frameTimeMs: curMs,
          activeCSGJobs: pipeStats.activeJobsCount,
          pipelineFrame: pipeStats.currentPipelineFrame,
          scratchpadHits: pipeStats.zeroAllocScratchpadHitCount,
          activeParticles: (useWasm && wasmTel.activePhysicsParticles > 0)
            ? wasmTel.activePhysicsParticles
            : (pipeStats.latencyMaskParticlesCount + propSystemRef.current.debrisPieces.length),
          isWasmActive: wasmTel.isWasmActive,
          wasmBinarySize: wasmTel.binarySizeBytes,
          wasmExtractUs: wasmTel.lastMeshExtractionTimeUs,
          wasmTerrainUs: wasmTel.lastTerrainGenTimeUs,
          wasmRayUs: wasmTel.lastRaymarchTimeUs,
          wasmPhysicsUs: wasmTel.lastPhysicsTimeUs,
          wasmInvocations: wasmTel.totalWasmInvocations,
          lodDistribution: { lod0: l0, lod1: l1, lod2: l2, lod3: l3 },
          particleOverdrawFactor: particleRenderMode === '3d_faceted_geometry'
            ? '1.0x (100% Early-Z Opaque)'
            : particleRenderMode === 'masked_quad_cutout'
            ? '1.0x Depth (Late-Z Cutout / Helper Overdraw)'
            : particleRenderMode === 'dithered_fade'
            ? '1.0x (Bayer Dithered Early-Z)'
            : '>15x Translucent Blend Thrash',
        }));
        frameCounter = 0;
        fpsTimer = 0;
      }

      // Periodic Cascaded Distance LOD evaluation
      lodCheckTimer += realDelta;
      if (useCascadedLOD && lodCheckTimer >= 0.25 && cameraRef.current) {
        lodCheckTimer = 0;
        const changedLODKeys = worldRef.current.updateCascadedLODs(cameraRef.current.position);
        if (changedLODKeys.length > 0) {
          for (const key of changedLODKeys) {
            const [cx, cy, cz] = key.split('_').map(Number);
            const chunk = worldRef.current.getChunk(cx, cy, cz);
            if (chunk?.mesh) {
              updateSingleThreeMesh(key, chunk.mesh);
            }
          }
          const m = worldRef.current.getMetrics();
          setMetrics(prev => ({
            ...prev,
            chunkCount: m.totalChunks,
            triangleCount: m.totalTriangles,
            vertexCount: m.totalVertices,
            totalSkirtTriangles: m.totalSkirtTriangles,
          }));
        }
      }

      // Advance 9-Frame Distributed CSG Edit Pipeline
      if (useDistributedPipeline) {
        const swappedKeys = csgPipelineRef.current.advanceFrame(
          realDelta,
          worldRef.current.getAllChunksMap(),
          quantizeNormals,
          generateSkirts,
          (chunkKey, mesh) => {
            updateSingleThreeMesh(chunkKey, mesh);
          },
          skirtDepthFactor
        );
        if (swappedKeys.length > 0) {
          const m = worldRef.current.getMetrics();
          setMetrics(prev => ({
            ...prev,
            chunkCount: m.totalChunks,
            triangleCount: m.totalTriangles,
            vertexCount: m.totalVertices,
            totalSkirtTriangles: m.totalSkirtTriangles,
          }));
        }
      }

      // 3D Faceted Geometry Particle & Rigid Debris Physics in WebAssembly / JS
      const dummyMat = new THREE.Matrix4();
      const dummyCol = new THREE.Color();
      const dummyEul = new THREE.Euler();
      const dummyScl = new THREE.Vector3();

      if (useWasm && voxelWasmBridge.isReady()) {
        const wasmParticles = voxelWasmBridge.updatePhysicsParticles(realDelta, 9.8, true);
        const activeCount = wasmParticles.count;

        if ((particleRenderMode === '3d_faceted_geometry' || particleRenderMode === 'dithered_fade') && instancedShardsRef.current) {
          const mesh = instancedShardsRef.current;
          for (let i = 0; i < MAX_SHARD_PARTICLES; i++) {
            if (i < activeCount) {
              const px = wasmParticles.positions[i * 3];
              const py = wasmParticles.positions[i * 3 + 1];
              const pz = wasmParticles.positions[i * 3 + 2];
              const cr = wasmParticles.colors[i * 3];
              const cg = wasmParticles.colors[i * 3 + 1];
              const cb = wasmParticles.colors[i * 3 + 2];
              const scale = 0.22;
              dummyEul.set(px * 1.5 + currentTime * 0.003, py * 1.5, pz * 1.5);
              dummyMat.makeRotationFromEuler(dummyEul);
              dummyMat.setPosition(px, py, pz);
              dummyMat.scale(dummyScl.set(scale, scale, scale));
              mesh.setMatrixAt(i, dummyMat);
              mesh.setColorAt(i, dummyCol.setRGB(cr, cg, cb));
            } else {
              dummyMat.makeScale(0, 0, 0);
              mesh.setMatrixAt(i, dummyMat);
            }
          }
          mesh.instanceMatrix.needsUpdate = true;
          if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
          mesh.visible = true;
          particlePoints.visible = false;
        } else {
          // Translucent Point Cards
          if (activeCount > 0) {
            particleGeom.setAttribute('position', new THREE.BufferAttribute(wasmParticles.positions, 3));
            particleGeom.setAttribute('color', new THREE.BufferAttribute(wasmParticles.colors, 3));
            particlePoints.visible = true;
          } else {
            particlePoints.visible = false;
          }
          if (instancedShardsRef.current) instancedShardsRef.current.visible = false;
        }
      } else {
        // Fallback to JS physics
        propSystemRef.current.updateDebris(realDelta);
        const allParticles = [
          ...csgPipelineRef.current.particles.map(p => ({
            pos: p.position,
            color: p.color,
            life: p.life,
          })),
          ...propSystemRef.current.debrisPieces.map(d => ({
            pos: d.position,
            color: [0.85, 0.55, 0.25] as [number, number, number],
            life: d.life,
          })),
        ];

        if ((particleRenderMode === '3d_faceted_geometry' || particleRenderMode === 'dithered_fade') && instancedShardsRef.current) {
          const mesh = instancedShardsRef.current;
          for (let i = 0; i < MAX_SHARD_PARTICLES; i++) {
            if (i < allParticles.length) {
              const p = allParticles[i];
              const scale = Math.max(0.02, (1.0 - p.life) * 0.25);
              dummyEul.set(p.pos[0] * 2 + currentTime * 0.003, p.pos[1] * 2, p.pos[2] * 2);
              dummyMat.makeRotationFromEuler(dummyEul);
              dummyMat.setPosition(p.pos[0], p.pos[1], p.pos[2]);
              dummyMat.scale(dummyScl.set(scale, scale, scale));
              mesh.setMatrixAt(i, dummyMat);
              mesh.setColorAt(i, dummyCol.setRGB(p.color[0], p.color[1], p.color[2]));
            } else {
              dummyMat.makeScale(0, 0, 0);
              mesh.setMatrixAt(i, dummyMat);
            }
          }
          mesh.instanceMatrix.needsUpdate = true;
          if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
          mesh.visible = true;
          particlePoints.visible = false;
        } else {
          if (particleRenderMode === 'masked_quad_cutout') {
            if (particleMat.transparent || !particleMat.depthWrite || particleMat.alphaTest !== 0.5) {
              particleMat.transparent = false;
              particleMat.depthWrite = true;
              particleMat.alphaTest = 0.5;
              particleMat.opacity = 1.0;
              particleMat.needsUpdate = true;
            }
          } else {
            if (!particleMat.transparent || particleMat.depthWrite || particleMat.alphaTest !== 0.0) {
              particleMat.transparent = true;
              particleMat.depthWrite = false;
              particleMat.alphaTest = 0.0;
              particleMat.opacity = 0.85;
              particleMat.needsUpdate = true;
            }
          }

          if (allParticles.length > 0) {
            const posArray = new Float32Array(allParticles.length * 3);
            const colArray = new Float32Array(allParticles.length * 3);
            for (let i = 0; i < allParticles.length; i++) {
              const pt = allParticles[i];
              posArray[i * 3] = pt.pos[0];
              posArray[i * 3 + 1] = pt.pos[1];
              posArray[i * 3 + 2] = pt.pos[2];
              colArray[i * 3] = pt.color[0] * (1.0 - pt.life);
              colArray[i * 3 + 1] = pt.color[1] * (1.0 - pt.life);
              colArray[i * 3 + 2] = pt.color[2] * (1.0 - pt.life);
            }
            particleGeom.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
            particleGeom.setAttribute('color', new THREE.BufferAttribute(colArray, 3));
            particlePoints.visible = true;
          } else {
            particlePoints.visible = false;
          }
          if (instancedShardsRef.current) instancedShardsRef.current.visible = false;
        }
      }

      // Deliberate RPG Combat Mechanics & Stamina Regeneration
      const player = playerRef.current;
      const keys = keyStateRef.current;

      if (combatActionTimerRef.current > 0) {
        combatActionTimerRef.current -= realDelta;

        // Active melee weapon swing animation & hitbox check
        if (swordMeshRef.current) {
          const actionProgress = 1.0 - Math.max(0, combatActionTimerRef.current / 0.4);
          const swingAngle = Math.sin(actionProgress * Math.PI) * 1.6;
          swordMeshRef.current.rotation.x = swingAngle;
          swordMeshRef.current.rotation.y = swingAngle * 0.8;

          // Hitbox active window check (around peak swing)
          if (actionProgress >= 0.4 && actionProgress <= 0.7 && !hasDealtAttackDamageRef.current) {
            hasDealtAttackDamageRef.current = true;
            const pFwd = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
            const props = propSystemRef.current.getAllProps();
            for (const prop of props) {
              const pVec = new THREE.Vector3(
                prop.position[0] - player.pos.x,
                prop.position[1] - player.pos.y,
                prop.position[2] - player.pos.z
              );
              const dist = pVec.length();
              if (dist <= 2.8) {
                pVec.normalize();
                if (pVec.dot(pFwd) > 0.35) {
                  // Hit target prop!
                  const isHeavy = combatState.action === 'heavy_attack';
                  const damage = isHeavy ? 60 : 25;
                  propSystemRef.current.applyBlastDamage(prop.position, 1.5, damage);
                  syncShieldsToWorld();
                  syncThreeProps();

                  setCombatState(prev => ({
                    ...prev,
                    targetHp: Math.max(0, prop.currentDurability),
                    targetMaxHp: PROP_CATALOG[prop.type].maxDurability,
                  }));
                  break;
                }
              }
            }
          }
        }

        if (combatActionTimerRef.current <= 0) {
          combatActionTimerRef.current = 0;
          hasDealtAttackDamageRef.current = false;
          if (swordMeshRef.current) {
            swordMeshRef.current.rotation.set(0, 0, 0);
          }
          setCombatState(prev => ({ ...prev, action: 'idle' }));
        }
      } else {
        // Regenerate stamina when not attacking or dodging
        staminaRef.current = Math.min(100, staminaRef.current + realDelta * 26);
        setCombatState(prev => ({ ...prev, stamina: Math.round(staminaRef.current) }));
      }

      // Camera & Player Update
      const cam = cameraRef.current;
      const world = worldRef.current;

      if (cameraMode === 'third_person_rpg' && cam) {
        // Third-Person Adventure RPG Mode with Articulated Avatar & Terrain Occlusion Probing
        warriorAvatarGroup.visible = true;

        const moveSpeed = combatState.action === 'dodge_roll' ? 12.0 : 6.8;
        const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
        const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));

        const moveDir = new THREE.Vector3();
        if (combatState.action === 'dodge_roll') {
          moveDir.copy(dodgeRollDirRef.current);
        } else {
          if (keys['w']) moveDir.add(forward);
          if (keys['s']) moveDir.sub(forward);
          if (keys['a']) moveDir.sub(right);
          if (keys['d']) moveDir.add(right);
        }

        if (moveDir.lengthSq() > 0) {
          moveDir.normalize();
        }

        // Horizontal velocity with responsive damping
        const targetVelX = moveDir.x * moveSpeed;
        const targetVelZ = moveDir.z * moveSpeed;
        player.vel.x = player.vel.x * 0.72 + targetVelX * 0.28;
        player.vel.z = player.vel.z * 0.72 + targetVelZ * 0.28;

        // Jump impulse when grounded
        if (keys[' '] && player.grounded && combatState.action !== 'dodge_roll') {
          player.vel.y = 7.0;
          player.grounded = false;
        }

        // WebAssembly Swept Capsule KCC Resolution
        const capsuleRadius = 0.35;
        const capsuleHeight = 1.8;
        const capsuleResult = world.resolveCapsuleStep(
          [player.pos.x, player.pos.y, player.pos.z],
          [player.vel.x, player.vel.y, player.vel.z],
          capsuleRadius,
          capsuleHeight,
          realDelta,
          18.0
        );

        player.pos.set(capsuleResult.pos[0], capsuleResult.pos[1], capsuleResult.pos[2]);
        player.vel.set(capsuleResult.vel[0], capsuleResult.vel[1], capsuleResult.vel[2]);
        player.grounded = capsuleResult.isGrounded;

        // Synchronize warrior avatar position & rotation
        warriorAvatarGroup.position.copy(player.pos);

        if (lockedTargetPropRef.current) {
          // Locked on: Face target
          const tp = lockedTargetPropRef.current.position;
          const dx = tp[0] - player.pos.x;
          const dz = tp[2] - player.pos.z;
          player.yaw = Math.atan2(-dx, -dz);
          warriorAvatarGroup.rotation.y = player.yaw;
        } else if (moveDir.lengthSq() > 0.05 && combatState.action !== 'light_attack' && combatState.action !== 'heavy_attack') {
          // Smoothly face move direction
          const targetFacingYaw = Math.atan2(-moveDir.x, -moveDir.z);
          warriorAvatarGroup.rotation.y = targetFacingYaw;
        } else {
          warriorAvatarGroup.rotation.y = player.yaw;
        }

        // Dodge roll tuck rotation
        if (combatState.action === 'dodge_roll') {
          const rollPct = 1.0 - Math.max(0, combatActionTimerRef.current / 0.45);
          warriorAvatarGroup.rotation.x = rollPct * Math.PI * 2;
        } else {
          warriorAvatarGroup.rotation.x = 0;
        }

        // Spring-Arm Camera with Terrain Occlusion Probing (Zero Clipping!)
        const boomDist = 4.2;
        const shoulderOffset = 0.55;
        const headPos = player.pos.clone().add(new THREE.Vector3(0, 1.45, 0));

        const rightVec = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
        const lookDir = new THREE.Vector3(
          -Math.sin(player.yaw) * Math.cos(player.pitch),
          Math.sin(player.pitch),
          -Math.cos(player.yaw) * Math.cos(player.pitch)
        );
        const backDir = lookDir.clone().negate();
        const desiredCamPos = headPos.clone()
          .addScaledVector(backDir, boomDist)
          .addScaledVector(rightVec, shoulderOffset);

        // Probe line-of-sight from head to desired camera position using voxel raycasting
        const probeRay = desiredCamPos.clone().sub(headPos);
        const probeDist = probeRay.length();
        probeRay.normalize();

        const terrainHit = world.castRay(headPos.x, headPos.y, headPos.z, probeRay.x, probeRay.y, probeRay.z, probeDist);
        let actualDist = probeDist;
        if (terrainHit && terrainHit.distance < probeDist) {
          // Terrain obstacle in the way: smoothly pull camera forward before entering wall
          actualDist = Math.max(0.7, terrainHit.distance - 0.25);
        }

        const actualCamPos = headPos.clone().addScaledVector(probeRay, actualDist);
        cam.position.copy(actualCamPos);

        let lookTarget = headPos.clone().add(new THREE.Vector3(0, 0.2, 0));
        if (lockedTargetPropRef.current) {
          const tp = lockedTargetPropRef.current.position;
          const targetVec = new THREE.Vector3(tp[0], tp[1] + 1.1, tp[2]);
          lookTarget.lerp(targetVec, 0.35);
        }
        cam.lookAt(lookTarget);

      } else if (cameraMode === 'first_person' && cam) {
        warriorAvatarGroup.visible = false;
        const moveSpeed = 7.0;
        const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
        const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));

        const moveDir = new THREE.Vector3();
        if (keys['w']) moveDir.add(forward);
        if (keys['s']) moveDir.sub(forward);
        if (keys['a']) moveDir.sub(right);
        if (keys['d']) moveDir.add(right);

        if (moveDir.lengthSq() > 0) moveDir.normalize();

        const targetVelX = moveDir.x * moveSpeed;
        const targetVelZ = moveDir.z * moveSpeed;
        player.vel.x = player.vel.x * 0.7 + targetVelX * 0.3;
        player.vel.z = player.vel.z * 0.7 + targetVelZ * 0.3;

        if (keys[' '] && player.grounded) {
          player.vel.y = 7.2;
          player.grounded = false;
        }

        const capsuleResult = world.resolveCapsuleStep(
          [player.pos.x, player.pos.y, player.pos.z],
          [player.vel.x, player.vel.y, player.vel.z],
          0.35,
          1.8,
          realDelta,
          18.0
        );

        player.pos.set(capsuleResult.pos[0], capsuleResult.pos[1], capsuleResult.pos[2]);
        player.vel.set(capsuleResult.vel[0], capsuleResult.vel[1], capsuleResult.vel[2]);
        player.grounded = capsuleResult.isGrounded;

        cam.position.copy(player.pos);
        cam.position.y += 0.5;
        const lookDir = new THREE.Vector3(
          -Math.sin(player.yaw) * Math.cos(player.pitch),
          Math.sin(player.pitch),
          -Math.cos(player.yaw) * Math.cos(player.pitch)
        );
        cam.lookAt(cam.position.clone().add(lookDir));

      } else if (cam) {
        // Orbit Camera Mode
        warriorAvatarGroup.visible = false;
        const angle = cameraAngleRef.current;
        const cx = angle.target.x + angle.radius * Math.sin(angle.phi) * Math.sin(angle.theta);
        const cy = angle.target.y + angle.radius * Math.cos(angle.phi);
        const cz = angle.target.z + angle.radius * Math.sin(angle.phi) * Math.cos(angle.theta);

        cam.position.set(cx, cy, cz);
        cam.lookAt(angle.target);
      }

      if (rendererRef.current && sceneRef.current && cam) {
        rendererRef.current.render(sceneRef.current, cam);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      renderer.dispose();
    };
  }, [cameraMode, particleRenderMode, quantizeNormals, useDistributedPipeline, simulateHeavyLoad, useAsymmetricTriplanar, showWaterPlane, waterLevel, showCavernFog, fogDensity]);

  // Raycast to find 3D mouse position on voxel terrain
  const raycastMouseToVoxel = (clientX: number, clientY: number) => {
    if (!containerRef.current || !cameraRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), cameraRef.current);

    const origin = raycaster.ray.origin;
    const dir = raycaster.ray.direction;

    return worldRef.current.castRay(origin.x, origin.y, origin.z, dir.x, dir.y, dir.z, 150);
  };

  // Update brush / prop indicator wireframe
  const updateIndicators = (hitPoint: [number, number, number], normal: [number, number, number]) => {
    if (activeMode === 'csg') {
      if (propPlacementPreviewRef.current) propPlacementPreviewRef.current.visible = false;
      const indicator = brushIndicatorMeshRef.current;
      if (!indicator) return;

      indicator.visible = true;
      indicator.position.set(hitPoint[0], hitPoint[1], hitPoint[2]);

      if (brushShape === 'sphere') {
        indicator.scale.set(brushRadius, brushRadius, brushRadius);
      } else if (brushShape === 'box') {
        indicator.scale.set(boxExtents[0], boxExtents[1], boxExtents[2]);
      } else if (brushShape === 'cylinder' || brushShape === 'capsule') {
        indicator.scale.set(brushRadius, brushHeight * 0.5, brushRadius);
      }

      const mat = indicator.material as THREE.MeshBasicMaterial;
      if (brushOp === 'carve') {
        mat.color.setHex(0xef4444);
      } else if (brushOp === 'add') {
        mat.color.setHex(0x10b981);
      } else {
        mat.color.setHex(0x38bdf8);
      }
    } else {
      // Prop Placement Hologram Preview
      if (brushIndicatorMeshRef.current) brushIndicatorMeshRef.current.visible = false;
      const preview = propPlacementPreviewRef.current;
      if (!preview) return;

      // Snapped to 0.25 m and 22.5° yaw
      const snappedX = PropShieldSystem.snapPosition(hitPoint[0]);
      const snappedY = PropShieldSystem.snapPosition(hitPoint[1]);
      const snappedZ = PropShieldSystem.snapPosition(hitPoint[2]);
      const snappedYaw = PropShieldSystem.snapYaw(propYawAngle);

      preview.visible = true;
      preview.position.set(snappedX, snappedY, snappedZ);
      preview.rotation.y = (snappedYaw * Math.PI) / 180;

      const def = PROP_CATALOG[selectedPropType];
      preview.scale.set(def.dimensions[0], def.dimensions[1], def.dimensions[2]);
    }
  };

  // Execute CSG Blast / Carve with Shield Evaluation
  const triggerCSGStamp = (hitPoint: [number, number, number], hitNormal: [number, number, number]) => {
    const t0 = performance.now();
    const offset = brushOp === 'carve' ? -brushRadius * 0.2 : (brushOp === 'add' ? brushRadius * 0.4 : 0);
    const stampPos: [number, number, number] = [
      hitPoint[0] + hitNormal[0] * offset,
      hitPoint[1] + hitNormal[1] * offset,
      hitPoint[2] + hitNormal[2] * offset
    ];

    // Evaluate blast damage against active prop shields
    if (brushOp === 'carve') {
      const destroyedProps = propSystemRef.current.applyBlastDamage(
        stampPos,
        brushRadius,
        brushDamage
      );
      if (destroyedProps.length > 0) {
        syncShieldsToWorld();
        syncThreeProps();
      }
    }

    const activeShields = propSystemRef.current.getActiveShields();

    const brushEvent: CSGBrushEvent = {
      id: `csg_${Date.now()}`,
      type: brushShape,
      operation: brushOp,
      position: stampPos,
      radius: brushRadius,
      halfExtents: boxExtents,
      height: brushHeight,
      materialId: brushOp === 'add' ? 3 : 1,
      damage: brushDamage
    };

    if (useDistributedPipeline) {
      // 9-Frame Distributed Pipeline with instant Frame 1 smoke/flash latency masking
      const camPos: [number, number, number] = cameraRef.current
        ? [cameraRef.current.position.x, cameraRef.current.position.y, cameraRef.current.position.z]
        : [0, 10, 20];

      csgPipelineRef.current.dispatchCSGBlast(
        brushEvent,
        worldRef.current.getAllChunksMap(),
        camPos,
        activeShields
      );
    } else {
      // Synchronous immediate carve
      worldRef.current.applyCSGBrush(brushEvent);
      syncThreeMeshes();
    }

    const duration = Number((performance.now() - t0).toFixed(2));
    setMetrics(prev => ({
      ...prev,
      lastCsgDurationMs: duration
    }));
  };

  // Place Prop on Terrain
  const triggerPlaceProp = (hitPoint: [number, number, number]) => {
    propSystemRef.current.addProp(selectedPropType, hitPoint, propYawAngle);
    syncShieldsToWorld();
    syncThreeProps();
  };

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      isMouseDownRef.current = true;
      if (cameraMode === 'third_person_rpg') {
        triggerDeliberateAttack('light');
        return;
      }
      if (cameraMode === 'orbit') {
        const hit = raycastMouseToVoxel(e.clientX, e.clientY);
        if (hit) {
          if (activeMode === 'csg') {
            triggerCSGStamp(hit.point, hit.normal);
          } else {
            triggerPlaceProp(hit.point);
          }
        }
      }
    } else if (e.button === 2) {
      if (cameraMode === 'third_person_rpg') {
        triggerDeliberateAttack('heavy');
      }
      isRightMouseDownRef.current = true;
      mouseScreenPosRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (cameraMode === 'orbit') {
      const hit = raycastMouseToVoxel(e.clientX, e.clientY);
      if (hit) {
        updateIndicators(hit.point, hit.normal);
      } else {
        if (brushIndicatorMeshRef.current) brushIndicatorMeshRef.current.visible = false;
        if (propPlacementPreviewRef.current) propPlacementPreviewRef.current.visible = false;
      }
    }

    if (isRightMouseDownRef.current) {
      const dx = e.clientX - mouseScreenPosRef.current.x;
      const dy = e.clientY - mouseScreenPosRef.current.y;
      mouseScreenPosRef.current = { x: e.clientX, y: e.clientY };

      if (cameraMode === 'third_person_rpg') {
        const player = playerRef.current;
        player.yaw += dx * 0.005;
        player.pitch = Math.max(-Math.PI / 3.0, Math.min(Math.PI / 4.0, player.pitch - dy * 0.005));
      } else if (cameraMode === 'first_person') {
        const player = playerRef.current;
        player.yaw += dx * 0.005;
        player.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, player.pitch - dy * 0.005));
      } else {
        const angle = cameraAngleRef.current;
        angle.theta -= dx * 0.008;
        angle.phi = Math.max(0.1, Math.min(Math.PI / 2.05, angle.phi - dy * 0.008));
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button === 0) isMouseDownRef.current = false;
    if (e.button === 2) isRightMouseDownRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!isWalkMode) {
      const angle = cameraAngleRef.current;
      angle.radius = Math.max(8, Math.min(90, angle.radius + e.deltaY * 0.05));
    }
  };

  const handleResetWorld = () => {
    const world = worldRef.current;
    world.clear();
    csgPipelineRef.current.clear();
    propSystemRef.current.clear();
    // Re-seed default props
    propSystemRef.current.addProp('shield_totem', [0, 4.25, 0], 0);
    propSystemRef.current.addProp('ancient_pillar', [-4, 3.5, 4], 45);
    propSystemRef.current.addProp('crystal_cluster', [5, 2.5, -3], 67.5);
    propSystemRef.current.addProp('wooden_scaffold', [3.5, 1.25, 5], 90);
    syncShieldsToWorld();
    syncThreeProps();
    world.generateLandscape(-3, 3, -2, 2, -3, 3);
    syncThreeMeshes();
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 select-none overflow-hidden font-sans">
      {/* Top Toolbar */}
      <div className="h-14 px-4 bg-slate-900/90 border-b border-slate-800 backdrop-blur flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-100 text-sm tracking-wide">
                Smooth Voxel Engine
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                LOD 0 (0.25m)
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">
                Surface Nets + QEF
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                vrsState.isVRSEnabled
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                {vrsState.isVRSEnabled ? 'VRS Circuit Breaker: 2x2 Radial' : 'VRS: 1x1 Native'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              9-Frame Distributed CSG • Prop Shielding • 22.5° Quantization • Steam Deck 90 FPS
            </p>
          </div>
        </div>

        {/* Action Controls & Walk Toggle */}
        {/* Action Controls & Camera Modes */}
        <div className="flex items-center gap-2">
          {/* Camera & RPG Gameplay Mode Selector */}
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setCameraMode('third_person_rpg')}
              className={`px-3 py-1 text-xs font-medium rounded flex items-center gap-1.5 transition ${
                cameraMode === 'third_person_rpg'
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Third-Person Adventure RPG with warrior avatar, spring-arm terrain occlusion, and deliberate combat"
            >
              <Sword className="w-3.5 h-3.5 text-amber-300" />
              3rd-Person RPG
            </button>
            <button
              onClick={() => setCameraMode('first_person')}
              className={`px-2.5 py-1 text-xs font-medium rounded flex items-center gap-1.5 transition ${
                cameraMode === 'first_person'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="First-Person Walk with SDF capsule collision"
            >
              <User className="w-3.5 h-3.5" />
              1st-Person
            </button>
            <button
              onClick={() => setCameraMode('orbit')}
              className={`px-2.5 py-1 text-xs font-medium rounded flex items-center gap-1.5 transition ${
                cameraMode === 'orbit'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Orbit Camera for CSG sculpting and prop placement"
            >
              <Compass className="w-3.5 h-3.5" />
              Orbit
            </button>
          </div>

          {/* Mode Switcher (Visible in Orbit/CSG Editor Mode) */}
          {cameraMode === 'orbit' && (
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setActiveMode('csg')}
                className={`px-3 py-1 text-xs font-medium rounded flex items-center gap-1.5 transition ${
                  activeMode === 'csg'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                CSG Sculpt
              </button>
              <button
                onClick={() => setActiveMode('props')}
                className={`px-3 py-1 text-xs font-medium rounded flex items-center gap-1.5 transition ${
                  activeMode === 'props'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                Props & Shields ({metrics.activePropsCount})
              </button>
            </div>
          )}

          <button
            onClick={handleResetWorld}
            className="px-3 py-1.5 text-xs font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5"
            title="Re-seed procedural terrain with rolling hills & caves"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Main Viewport + HUD */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Left Floating Tool Palette */}
        <div className="absolute top-4 left-4 z-10 w-80 max-h-[calc(100%-2rem)] overflow-y-auto bg-slate-900/95 border border-slate-800/90 rounded-xl p-3.5 backdrop-blur-md shadow-2xl flex flex-col gap-3.5 custom-scrollbar">
          
          {/* CSG Sculpt Mode Panel */}
          {activeMode === 'csg' && (
            <>
              {/* Operation Selector */}
              <div>
                <label className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 mb-1.5 block">
                  CSG Operation
                </label>
                <div className="grid grid-cols-3 gap-1.5 bg-slate-950/70 p-1 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setBrushOp('carve')}
                    className={`py-1.5 text-xs font-medium rounded flex items-center justify-center gap-1 transition ${
                      brushOp === 'carve'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5" />
                    Carve
                  </button>
                  <button
                    onClick={() => setBrushOp('add')}
                    className={`py-1.5 text-xs font-medium rounded flex items-center justify-center gap-1 transition ${
                      brushOp === 'add'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Box className="w-3.5 h-3.5" />
                    Deposit
                  </button>
                  <button
                    onClick={() => setBrushOp('smooth')}
                    className={`py-1.5 text-xs font-medium rounded flex items-center justify-center gap-1 transition ${
                      brushOp === 'smooth'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Smooth
                  </button>
                </div>
              </div>

              {/* Analytical Shape Selector */}
              <div>
                <label className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 mb-1.5 block">
                  Analytical Brush Shape
                </label>
                <div className="grid grid-cols-4 gap-1.5 bg-slate-950/70 p-1 rounded-lg border border-slate-800">
                  {(['sphere', 'box', 'cylinder', 'capsule'] as CSGBrushType[]).map(shape => (
                    <button
                      key={shape}
                      onClick={() => setBrushShape(shape)}
                      className={`py-1 text-xs rounded transition text-center capitalize ${
                        brushShape === shape
                          ? 'bg-indigo-600 text-white font-medium'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {shape}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dimension & Damage Sliders */}
              <div className="space-y-2.5">
                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1">
                    <span>Brush Radius</span>
                    <span className="font-mono text-indigo-400">{brushRadius.toFixed(2)} m</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="6.0"
                    step="0.25"
                    value={brushRadius}
                    onChange={e => setBrushRadius(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1">
                    <span>Blast Damage (vs Shield HP)</span>
                    <span className="font-mono text-red-400">{brushDamage} HP</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    step="10"
                    value={brushDamage}
                    onChange={e => setBrushDamage(parseInt(e.target.value))}
                    className="w-full accent-red-500 cursor-pointer"
                  />
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Fatal hit shatters shield totem into debris and excavates terrain.
                  </div>
                </div>

                {(brushShape === 'cylinder' || brushShape === 'capsule') && (
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Height</span>
                      <span className="font-mono text-indigo-400">{brushHeight.toFixed(1)} m</span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="12.0"
                      step="0.5"
                      value={brushHeight}
                      onChange={e => setBrushHeight(parseFloat(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Prop Placement Mode Panel */}
          {activeMode === 'props' && (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 mb-1.5 block">
                  Select Micro-Detail Prop
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(Object.keys(PROP_CATALOG) as PropType[]).map(type => {
                    const def = PROP_CATALOG[type];
                    const isSelected = selectedPropType === type;
                    return (
                      <button
                        key={type}
                        onClick={() => setSelectedPropType(type)}
                        className={`p-2 rounded-lg border text-left flex flex-col transition ${
                          isSelected
                            ? 'bg-purple-900/40 border-purple-500/80 text-purple-200'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium leading-tight">{def.name}</span>
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: def.emissiveColor }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 mt-1">
                          Shield: {def.shieldRadius}m • {def.maxDurability} HP
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Snapping Controls */}
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Position Grid Snapping</span>
                  <span className="font-mono text-emerald-400 font-semibold">0.25 m (Base Cell)</span>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-300 mb-1">
                    <span>Rotation Yaw Snapping</span>
                    <span className="font-mono text-purple-400">{propYawAngle.toFixed(1)}° (16-Pt)</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="337.5"
                    step="22.5"
                    value={propYawAngle}
                    onChange={e => setPropYawAngle(parseFloat(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Particle FX Architecture Selector (Overdraw vs Early-Z) */}
          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-300">
                Particle FX Architecture
              </span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                particleRenderMode === '3d_faceted_geometry'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : particleRenderMode === 'masked_quad_cutout'
                  ? 'bg-sky-500/20 text-sky-300'
                  : particleRenderMode === 'dithered_fade'
                  ? 'bg-indigo-500/20 text-indigo-300'
                  : 'bg-amber-500/20 text-amber-300'
              }`}>
                {particleRenderMode === '3d_faceted_geometry'
                  ? '100% Early-Z'
                  : particleRenderMode === 'masked_quad_cutout'
                  ? 'Late-Z Cutout'
                  : particleRenderMode === 'dithered_fade'
                  ? 'Dithered 1.0x'
                  : 'Overdraw >15x'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setParticleRenderMode('3d_faceted_geometry')}
                className={`p-1.5 text-xs font-medium rounded text-left transition border ${
                  particleRenderMode === '3d_faceted_geometry'
                    ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200 shadow'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold text-emerald-300 flex items-center gap-1 text-[10px]">
                  <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                  3D Faceted Mesh
                </div>
                <div className="text-[8px] text-emerald-400/80 mt-0.5">Early-Z 1.0x • 0 Discard</div>
              </button>
              <button
                onClick={() => setParticleRenderMode('masked_quad_cutout')}
                className={`p-1.5 text-xs font-medium rounded text-left transition border ${
                  particleRenderMode === 'masked_quad_cutout'
                    ? 'bg-sky-950/60 border-sky-500/60 text-sky-200 shadow'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold text-sky-300 text-[10px]">Masked Cutout</div>
                <div className="text-[8px] text-sky-400/80 mt-0.5">Late-Z • Quad Overdraw</div>
              </button>
              <button
                onClick={() => setParticleRenderMode('dithered_fade')}
                className={`p-1.5 text-xs font-medium rounded text-left transition border ${
                  particleRenderMode === 'dithered_fade'
                    ? 'bg-indigo-950/60 border-indigo-500/60 text-indigo-200 shadow'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold text-indigo-300 text-[10px]">Bayer Dither</div>
                <div className="text-[8px] text-indigo-400/80 mt-0.5">Screen-Door Fade</div>
              </button>
              <button
                onClick={() => setParticleRenderMode('translucent_cards')}
                className={`p-1.5 text-xs font-medium rounded text-left transition border ${
                  particleRenderMode === 'translucent_cards'
                    ? 'bg-amber-950/60 border-amber-500/60 text-amber-200 shadow'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold text-amber-300 text-[10px]">Alpha Blend</div>
                <div className="text-[8px] text-amber-400/80 mt-0.5">&gt;15x Fillrate Thrash</div>
              </button>
            </div>
          </div>

          {/* Liquid & Cavern Mist Simulation Controls */}
          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold tracking-wider uppercase text-cyan-300 flex items-center gap-1.5 font-mono">
                <Waves className="w-3.5 h-3.5 text-cyan-400" />
                Liquid & Mist Simulation
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 font-mono">
                &lt;0.18ms • 1x Overdraw
              </span>
            </div>

            {/* Water Plane Toggle */}
            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer p-1 rounded hover:bg-slate-800/50">
              <span className="flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5 text-sky-400" />
                Cavern Pool (Gerstner Waves)
              </span>
              <input
                type="checkbox"
                checked={showWaterPlane}
                onChange={e => setShowWaterPlane(e.target.checked)}
                className="accent-cyan-400 cursor-pointer"
              />
            </label>

            {showWaterPlane && (
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Water Pool Height</span>
                  <span className="font-mono text-cyan-400">{waterLevel.toFixed(2)} m</span>
                </div>
                <input
                  type="range"
                  min="-4.0"
                  max="4.0"
                  step="0.25"
                  value={waterLevel}
                  onChange={e => setWaterLevel(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer h-1.5"
                />
              </div>
            )}

            {/* Cavern Mist / Fog Toggle */}
            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer p-1 rounded hover:bg-slate-800/50">
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full border border-purple-400 flex items-center justify-center text-[9px] text-purple-300">F</span>
                Cavern Height Mist (Fog)
              </span>
              <input
                type="checkbox"
                checked={showCavernFog}
                onChange={e => setShowCavernFog(e.target.checked)}
                className="accent-purple-400 cursor-pointer"
              />
            </label>

            {showCavernFog && (
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Fog Density</span>
                  <span className="font-mono text-purple-400">{fogDensity.toFixed(3)}</span>
                </div>
                <input
                  type="range"
                  min="0.005"
                  max="0.05"
                  step="0.005"
                  value={fogDensity}
                  onChange={e => setFogDensity(parseFloat(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer h-1.5"
                />
              </div>
            )}

            {/* Mesh-Based Volumetric God Ray Shafts Toggle (<0.06 ms) */}
            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer p-1 rounded hover:bg-slate-800/50">
              <span className="flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-300" />
                <span>God Rays (Mesh Shafts)</span>
              </span>
              <input
                type="checkbox"
                checked={showLightShafts}
                onChange={e => setShowLightShafts(e.target.checked)}
                className="accent-amber-400 cursor-pointer"
              />
            </label>

            {showLightShafts && (
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Ray Intensity (&lt;0.06ms)</span>
                  <span className="font-mono text-amber-300">{lightShaftIntensity.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={lightShaftIntensity}
                  onChange={e => setLightShaftIntensity(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer h-1.5"
                />
              </div>
            )}

            {/* Static Chunked Foliage & GPU Vertex Wind Displacement */}
            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer p-1 rounded hover:bg-slate-800/50">
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full border border-emerald-400 flex items-center justify-center text-[9px] text-emerald-300">🌿</span>
                <span>Chunked Foliage (GPU Wind)</span>
              </span>
              <input
                type="checkbox"
                checked={showChunkedFoliage}
                onChange={e => {
                  setShowChunkedFoliage(e.target.checked);
                  setTimeout(() => rebuildStaticChunkedFoliage(), 10);
                }}
                className="accent-emerald-400 cursor-pointer"
              />
            </label>

            {showChunkedFoliage && (
              <div className="space-y-1.5 pt-0.5">
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Wind Sway (GPU WPO)</span>
                    <span className="font-mono text-emerald-300">{windStrength.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.05"
                    value={windStrength}
                    onChange={e => setWindStrength(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer h-1.5"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Wind Speed</span>
                    <span className="font-mono text-emerald-300">{windSpeed.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="4.0"
                    step="0.25"
                    value={windSpeed}
                    onChange={e => setWindSpeed(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer h-1.5"
                  />
                </div>
              </div>
            )}

            {/* Dynamic Sweeping Cloud Shadows (Analytical Light Attenuation) */}
            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer p-1 rounded hover:bg-slate-800/50">
              <span className="flex items-center gap-1.5">
                <Cloud className="w-3.5 h-3.5 text-sky-400" />
                <span>Sweeping Cloud Shadows</span>
              </span>
              <input
                type="checkbox"
                checked={showCloudShadows}
                onChange={e => setShowCloudShadows(e.target.checked)}
                className="accent-sky-400 cursor-pointer"
              />
            </label>

            {/* 3D Polygonal Sky Clouds (100% Solid Early-Z) */}
            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer p-1 rounded hover:bg-slate-800/50">
              <span className="flex items-center gap-1.5">
                <Box className="w-3.5 h-3.5 text-indigo-300" />
                <span>3D Polygonal Sky Clouds</span>
              </span>
              <input
                type="checkbox"
                checked={show3DClouds}
                onChange={e => setShow3DClouds(e.target.checked)}
                className="accent-indigo-400 cursor-pointer"
              />
            </label>

            {showCloudShadows && (
              <div className="space-y-1.5 pt-0.5 bg-sky-950/20 p-2 rounded border border-sky-900/30">
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Shadow Darkness (0 CSM Dilution)</span>
                    <span className="font-mono text-sky-300">{(cloudShadowIntensity * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.85"
                    step="0.05"
                    value={cloudShadowIntensity}
                    onChange={e => setCloudShadowIntensity(parseFloat(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer h-1.5"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Cloud Coverage Front</span>
                    <span className="font-mono text-sky-300">{(cloudCoverage * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.8"
                    step="0.05"
                    value={cloudCoverage}
                    onChange={e => setCloudCoverage(parseFloat(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer h-1.5"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Drift Speed (Wind Match)</span>
                    <span className="font-mono text-sky-300">{cloudSpeed.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="3.0"
                    step="0.2"
                    value={cloudSpeed}
                    onChange={e => setCloudSpeed(parseFloat(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer h-1.5"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="h-px bg-slate-800" />

          {/* Engine & Pipeline Toggles */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 block mb-1">
              Engine Subsystems
            </label>

            {/* WebAssembly (WASM) Core Engine */}
            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer p-1.5 rounded hover:bg-slate-800/50 bg-cyan-950/20 border border-cyan-800/30">
              <div className="flex items-center gap-2">
                <Binary className="w-4 h-4 text-cyan-400" />
                <span className="font-medium text-cyan-200">WebAssembly (WASM) Core</span>
              </div>
              <input
                type="checkbox"
                checked={useWasm}
                onChange={e => {
                  setUseWasm(e.target.checked);
                  worldRef.current.useWasm = e.target.checked;
                  syncThreeMeshes();
                }}
                className="accent-cyan-400 cursor-pointer"
              />
            </label>

            {/* Cascaded Distance LODs (0.25m - 2.0m) */}
            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer p-1.5 rounded hover:bg-slate-800/50 bg-indigo-950/20 border border-indigo-800/30">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span className="font-medium text-indigo-200">Cascaded Distance LODs</span>
              </div>
              <input
                type="checkbox"
                checked={useCascadedLOD}
                onChange={e => {
                  setUseCascadedLOD(e.target.checked);
                  if (!e.target.checked) {
                    for (const chunk of worldRef.current.getAllChunks()) {
                      chunk.lod = 0;
                    }
                    worldRef.current.remeshAllDirtyChunks();
                    syncThreeMeshes();
                  }
                }}
                className="accent-indigo-400 cursor-pointer"
              />
            </label>

            {/* 9-Frame Distributed Pipeline */}
            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer p-1.5 rounded hover:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>9-Frame Distributed CSG</span>
              </div>
              <input
                type="checkbox"
                checked={useDistributedPipeline}
                onChange={e => setUseDistributedPipeline(e.target.checked)}
                className="accent-amber-500 cursor-pointer"
              />
            </label>

            {/* Asymmetric Triplanar Shading */}
            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer p-1.5 rounded hover:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-400" />
                <span>Asymmetric Triplanar Shading</span>
              </div>
              <input
                type="checkbox"
                checked={useAsymmetricTriplanar}
                onChange={e => setUseAsymmetricTriplanar(e.target.checked)}
                className="accent-emerald-500 cursor-pointer"
              />
            </label>

            {/* 22.5° Quantization */}
            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer p-1.5 rounded hover:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-sky-400" />
                <span>22.5° Normal Snap (Enshrouded)</span>
              </div>
              <input
                type="checkbox"
                checked={quantizeNormals}
                onChange={e => setQuantizeNormals(e.target.checked)}
                className="accent-sky-500 cursor-pointer"
              />
            </label>

            {/* Boundary Skirts */}
            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer p-1.5 rounded hover:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                <span>Boundary Skirts (Watertight)</span>
              </div>
              <input
                type="checkbox"
                checked={generateSkirts}
                onChange={e => setGenerateSkirts(e.target.checked)}
                className="accent-blue-500 cursor-pointer"
              />
            </label>

            {/* Skirt Depth & Seam Inspector Options */}
            {generateSkirts && (
              <div className="pl-6 pr-2 py-1.5 space-y-1.5 bg-blue-950/20 rounded border border-blue-900/30 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Extrusion Depth:</span>
                  <span className="font-mono text-blue-400 font-semibold">
                    {skirtDepthFactor.toFixed(2)}x ({((skirtDepthFactor * 0.25) * 100).toFixed(0)}cm)
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.25"
                  value={skirtDepthFactor}
                  onChange={e => setSkirtDepthFactor(parseFloat(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-700 rounded"
                />
                <label className="flex items-center justify-between cursor-pointer pt-0.5 text-slate-300">
                  <span className="text-[11px] text-cyan-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block shadow-sm shadow-cyan-400/50" />
                    Seam Inspector (Cyan Highlight)
                  </span>
                  <input
                    type="checkbox"
                    checked={highlightSkirts}
                    onChange={e => setHighlightSkirts(e.target.checked)}
                    className="accent-cyan-400 cursor-pointer"
                  />
                </label>
              </div>
            )}

            {/* Wireframe */}
            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer p-1.5 rounded hover:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-slate-400" />
                <span>Show Wireframe</span>
              </div>
              <input
                type="checkbox"
                checked={wireframe}
                onChange={e => setWireframe(e.target.checked)}
                className="accent-slate-400 cursor-pointer"
              />
            </label>

            {/* Radial VRS Heatmap Overlay */}
            <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer p-1.5 rounded hover:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-purple-400" />
                <span>Radial VRS 160x100 Map View</span>
              </div>
              <input
                type="checkbox"
                checked={showVRSOverlay}
                onChange={e => setShowVRSOverlay(e.target.checked)}
                className="accent-purple-500 cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Right Floating Performance & VRS HUD */}
        <div className="absolute top-4 right-4 z-10 w-72 bg-slate-900/95 border border-slate-800/90 rounded-xl p-3.5 backdrop-blur-md shadow-2xl flex flex-col gap-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              Steam Deck Van Gogh APU
            </span>
            <span className="text-[11px] font-mono text-emerald-400 font-medium">90 FPS Budget</span>
          </div>

          {/* FPS & Frame Time Gauge */}
          <div className="grid grid-cols-2 gap-2 bg-slate-950/70 p-2 rounded-lg border border-slate-800">
            <div>
              <div className="text-[10px] text-slate-400">Frame Time</div>
              <div className="text-base font-mono font-bold text-slate-100">
                {metrics.frameTimeMs} <span className="text-xs font-normal text-slate-400">ms</span>
              </div>
              <div className="text-[9px] text-slate-500">Target &le; 11.11 ms</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">FPS</div>
              <div className={`text-base font-mono font-bold ${metrics.fps >= 85 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {metrics.fps} <span className="text-xs font-normal text-slate-400">fps</span>
              </div>
              <div className="text-[9px] text-slate-500">1280x800 Native</div>
            </div>
          </div>

          {/* VRS Circuit Breaker Monitor */}
          <div className={`p-2 rounded-lg border text-xs ${
            vrsState.isVRSEnabled
              ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
              : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
          }`}>
            <div className="flex items-center justify-between font-semibold">
              <span className="flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5" />
                VRS Circuit Breaker:
              </span>
              <span className="font-mono text-[11px]">
                {vrsState.isVRSEnabled ? 'ACTIVE (2x2)' : 'STANDBY (1x1)'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
              <span>5-Frame Moving Avg:</span>
              <span className="font-mono text-slate-200">{vrsState.movingAvgFrameTimeMs.toFixed(2)} ms</span>
            </div>
            <div className="text-[10px] text-slate-400 flex justify-between">
              <span>Trip &gt; 12.5ms | Clear &lt; 11.7ms:</span>
              <span className="font-mono text-slate-300">
                {vrsState.isVRSEnabled ? `${vrsState.consecutiveFastFrames}/30 frames` : 'Normal'}
              </span>
            </div>
            <div className="mt-1 pt-1 border-t border-slate-800/60 text-[9px] text-slate-400 flex items-center justify-between">
              <span>Target: Vulkan 1.3 Hardware</span>
              <span className="text-amber-300 font-mono">VK_KHR_fragment_shading_rate</span>
            </div>
          </div>

          {/* Simulate Heavy Load Button */}
          <button
            onClick={() => setSimulateHeavyLoad(!simulateHeavyLoad)}
            className={`w-full py-1 text-xs rounded border transition flex items-center justify-center gap-1.5 ${
              simulateHeavyLoad
                ? 'bg-red-600/30 border-red-500 text-red-200 font-semibold'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            {simulateHeavyLoad ? 'Stop Stress Simulation' : 'Simulate Heavy Load (Trip VRS)'}
          </button>

          {/* Engine Counters */}
          <div className="space-y-1 text-xs text-slate-300">
            <div className="flex justify-between py-0.5 border-b border-slate-800/50">
              <span className="text-slate-400 flex items-center gap-1">
                <Binary className="w-3.5 h-3.5 text-cyan-400" />
                WASM Engine Core
              </span>
              <span className={`font-mono text-xs ${metrics.isWasmActive && useWasm ? 'text-cyan-400 font-semibold' : 'text-slate-500'}`}>
                {metrics.isWasmActive && useWasm ? 'Active (13 KB .wasm)' : 'TypeScript Fallback'}
              </span>
            </div>
            {metrics.isWasmActive && useWasm && (
              <div className="flex justify-between py-0.5 border-b border-slate-800/50 text-[10px]">
                <span className="text-slate-400">Mesh / SDF / FBM / Phys</span>
                <span className="font-mono text-cyan-300">
                  {metrics.wasmExtractUs > 0 ? `${metrics.wasmExtractUs}µs` : '<50µs'} / {metrics.wasmTerrainUs > 0 ? `${metrics.wasmTerrainUs}µs` : '<80µs'} / {metrics.wasmPhysicsUs > 0 ? `${metrics.wasmPhysicsUs}µs` : '<20µs'}
                </span>
              </div>
            )}
            <div className="flex justify-between py-0.5 border-b border-slate-800/50">
              <span className="text-slate-400 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                Cascaded LOD Mip
              </span>
              <span className="font-mono text-[11px] text-indigo-300">
                {useCascadedLOD
                  ? `L0:${metrics.lodDistribution.lod0} L1:${metrics.lodDistribution.lod1} L2:${metrics.lodDistribution.lod2} L3:${metrics.lodDistribution.lod3}`
                  : 'All LOD 0'}
              </span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/50">
              <span className="text-slate-400">Active Chunks (16³)</span>
              <span className="font-mono text-slate-200">{metrics.chunkCount}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/50">
              <span className="text-slate-400">Extracted Triangles</span>
              <span className="font-mono text-slate-200">{metrics.triangleCount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/50">
              <span className="text-slate-400">Watertight Skirt Tris</span>
              <span className="font-mono text-cyan-300">
                {generateSkirts ? (metrics.totalSkirtTriangles > 0 ? `${metrics.totalSkirtTriangles.toLocaleString()} tris` : 'Seals Active') : 'Disabled'}
              </span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/50">
              <span className="text-slate-400">Pipeline Frame / Jobs</span>
              <span className="font-mono text-amber-300">F{metrics.pipelineFrame} / {metrics.activeCSGJobs}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/50">
              <span className="text-slate-400">Zero-Alloc Scratchpads</span>
              <span className="font-mono text-emerald-400">{metrics.scratchpadHits} hits</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/50">
              <span className="text-slate-400">Particles (Smoke + Debris)</span>
              <span className="font-mono text-cyan-300">{metrics.activeParticles}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/50">
              <span className="text-slate-400">Particle Overdraw</span>
              <span className={`font-mono text-[10px] ${
                particleRenderMode === '3d_faceted_geometry' ? 'text-emerald-300' : 'text-amber-400 font-bold'
              }`}>
                {metrics.particleOverdrawFactor}
              </span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/50">
              <span className="text-slate-400">Cavern Water & Mist</span>
              <span className="font-mono text-[10px] text-cyan-300">
                {showWaterPlane ? `${metrics.waterPassMs}ms` : 'Off'} / {showCavernFog ? `${metrics.fogPassMs}ms` : 'Off'} (90 FPS Safe)
              </span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/50">
              <span className="text-slate-400">Sweeping Cloud Shadow</span>
              <span className="font-mono text-[10px] text-sky-300">
                {showCloudShadows ? '0.02ms (0 CSM Dilution)' : 'Disabled'}
              </span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-slate-400">CSG Meshing Duration</span>
              <span className="font-mono text-amber-300">{metrics.lastCsgDurationMs} ms</span>
            </div>
          </div>

          <div className="p-2 rounded bg-indigo-950/40 border border-indigo-800/40 text-[11px] text-indigo-200 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
            <span>
              {cameraMode === 'third_person_rpg'
                ? 'Deliberate RPG: Left-click to strike, Right-click for heavy stagger, Space to roll, Q to lock on target.'
                : activeMode === 'csg'
                ? 'Left-click terrain to stamp CSG blast. Right-click & drag to orbit.'
                : 'Left-click terrain to snap-place props (0.25m / 22.5°). Shield totems protect ground.'}
            </span>
          </div>
        </div>

        {/* WebGL Canvas Container */}
        <div
          ref={containerRef}
          className="w-full h-full relative cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onContextMenu={e => e.preventDefault()}
        >
          <canvas ref={canvasRef} className="w-full h-full block" />

          {/* Target Lock-On Banner */}
          {cameraMode === 'third_person_rpg' && combatState.lockedTargetName && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center gap-1 bg-slate-950/85 border border-amber-500/50 px-4 py-2 rounded-xl backdrop-blur shadow-2xl z-10">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
                <Crosshair className="w-4 h-4 text-amber-400" />
                <span>{combatState.lockedTargetName}</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {combatState.targetHp !== null && combatState.targetMaxHp !== null ? `${combatState.targetHp} / ${combatState.targetMaxHp} HP` : 'LOCKED'}
                </span>
              </div>
              {combatState.targetHp !== null && combatState.targetMaxHp !== null && (
                <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  <div
                    className="h-full bg-red-500 transition-all duration-150"
                    style={{ width: `${Math.min(100, Math.max(0, (combatState.targetHp / combatState.targetMaxHp) * 100))}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Third-Person Adventure RPG Stamina Bar & Combat Action Legend */}
          {cameraMode === 'third_person_rpg' && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center gap-2 z-10">
              {/* Action State Badge */}
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border shadow-lg ${
                  combatState.action === 'idle'
                    ? 'bg-slate-900/80 border-slate-700 text-slate-300'
                    : combatState.action === 'dodge_roll'
                    ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300'
                    : combatState.action === 'heavy_attack'
                    ? 'bg-amber-950/80 border-amber-500 text-amber-300 font-extrabold'
                    : 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                }`}>
                  {combatState.action === 'idle'
                    ? 'Guarded Stance'
                    : combatState.action === 'dodge_roll'
                    ? 'Dodge Roll (i-Frames)'
                    : combatState.action === 'heavy_attack'
                    ? 'Heavy Stagger Strike'
                    : 'Deliberate Strike'}
                </span>
              </div>

              {/* Stamina Gauge */}
              <div className="flex flex-col items-center bg-slate-950/90 border border-slate-800 px-4 py-2 rounded-xl backdrop-blur shadow-2xl">
                <div className="flex justify-between w-64 text-[10px] text-slate-400 font-mono mb-1">
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <Activity className="w-3 h-3" />
                    STAMINA
                  </span>
                  <span>{combatState.stamina} / {combatState.maxStamina}</span>
                </div>
                <div className="w-64 h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-700 relative">
                  <div
                    className={`h-full transition-all duration-75 rounded-full ${
                      combatState.stamina > 30
                        ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                        : 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                    }`}
                    style={{ width: `${combatState.stamina}%` }}
                  />
                </div>
              </div>

              {/* Combat Controls Legend */}
              <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800/80 px-3 py-1 rounded-lg text-[11px] font-mono text-slate-300 shadow">
                <span className="text-amber-400">[L-Click]</span> Strike (18)
                <span className="text-slate-600">•</span>
                <span className="text-amber-400">[R-Click / R]</span> Heavy (35)
                <span className="text-slate-600">•</span>
                <span className="text-cyan-400">[Space]</span> Dodge Roll (22)
                <span className="text-slate-600">•</span>
                <span className="text-purple-400">[Q]</span> Lock-On Target
              </div>
            </div>
          )}

          {/* First-Person Walk Mode Crosshair */}
          {cameraMode === 'first_person' && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full border border-white/80 bg-white/20" />
            </div>
          )}

          {/* Radial VRS Heatmap Visualizer Overlay */}
          {showVRSOverlay && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-[500px] h-[500px] rounded-full border-4 border-dashed border-purple-500/50 bg-purple-500/5 flex items-center justify-center text-center">
                <div className="w-[260px] h-[260px] rounded-full border-2 border-emerald-400/80 bg-emerald-500/10 flex items-center justify-center text-xs font-mono text-emerald-300">
                  Native 1x1 Foveal Center
                </div>
              </div>
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-950/80 px-3 py-1 rounded text-xs font-mono text-purple-300 border border-purple-500/40">
                160x100 Radial VRS Shading Rate Image (Periphery 2x2, Center 1x1)
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
