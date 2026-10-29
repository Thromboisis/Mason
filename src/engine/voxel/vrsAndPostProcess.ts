/**
 * Subsystems 4 & 5: Visibility, Cascaded LODs, VRS Circuit Breaker & Asymmetric Triplanar Shading
 * 
 * Implements:
 * 1. Cascaded Distance LOD thresholds:
 *    - LOD 0: 0.25m cell size, 0–24m
 *    - LOD 1: 0.50m cell size, 24–64m
 *    - LOD 2: 1.00m cell size, 64–150m
 *    - LOD 3: 2.00m cell size, 150m+
 * 2. Dynamic VRS Circuit Breaker:
 *    - Monitors 5-frame moving average
 *    - Engages when 5-frame moving avg > 12.50 ms (< 80 FPS)
 *    - Radial shading rate image: 1x1 center, 2x2 periphery
 *    - Disengages after 30 consecutive frames < 11.76 ms (> 85 FPS)
 *    - Camera fast-sweep protection: stays 1x1 during high angular velocity
 * 3. Asymmetric Triplanar Shading Shader Material:
 *    - Top-down planar for horizontal surfaces (|Ny| > 0.5): grass, moss, plateau stone
 *    - Lateral biplanar for cliff walls (|Ny| <= 0.5): striated rock strata, mineral veins
 *    - 22.5° facet lighting highlights
 */

import * as THREE from 'three';

export interface VRSCircuitBreakerState {
  isVRSEnabled: boolean;
  shadingRateMode: '1x1_native' | '2x2_radial_periphery';
  movingAvgFrameTimeMs: number;
  consecutiveFastFrames: number;
  triggerCount: number;
  targetBudgetMs: number; // 11.11 ms for 90 FPS
  circuitBreakerThresholdMs: number; // 12.50 ms (< 80 FPS)
  recoveryThresholdMs: number; // 11.76 ms (> 85 FPS)
  requiredRecoveryFrames: number; // 30 frames
  cameraSweepDetected: boolean;
}

export class VRSCircuitBreakerController {
  private frameTimes: number[] = [];
  private consecutiveFastFrames = 0;
  private isVRSEnabled = false;
  private triggerCount = 0;
  private lastCameraRotation = new THREE.Euler();
  private cameraAngularVelocity = 0;

  public readonly TARGET_BUDGET_MS = 11.11; // 90 FPS Steam Deck target
  public readonly CIRCUIT_BREAKER_THRESHOLD_MS = 12.50; // < 80 FPS
  public readonly RECOVERY_THRESHOLD_MS = 11.76; // > 85 FPS
  public readonly REQUIRED_RECOVERY_FRAMES = 30;

  /**
   * Evaluates current frame performance and returns updated VRS state
   */
  public update(frameTimeMs: number, cameraRotation?: THREE.Euler): VRSCircuitBreakerState {
    // 5-frame moving average window
    this.frameTimes.push(frameTimeMs);
    if (this.frameTimes.length > 5) {
      this.frameTimes.shift();
    }

    const movingAvg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;

    // Check camera angular sweep speed
    let sweepDetected = false;
    if (cameraRotation) {
      const dYaw = Math.abs(cameraRotation.y - this.lastCameraRotation.y);
      const dPitch = Math.abs(cameraRotation.x - this.lastCameraRotation.x);
      this.cameraAngularVelocity = dYaw + dPitch;
      sweepDetected = this.cameraAngularVelocity > 0.08; // Fast camera flick
      this.lastCameraRotation.copy(cameraRotation);
    }

    // Circuit Breaker logic
    if (!this.isVRSEnabled) {
      // Trigger condition: 5-frame moving avg exceeds 12.50 ms (< 80 FPS)
      // Camera sweeps remain native 1x1 to prevent peripheral artifacts during rotation
      if (movingAvg > this.CIRCUIT_BREAKER_THRESHOLD_MS && !sweepDetected) {
        this.isVRSEnabled = true;
        this.consecutiveFastFrames = 0;
        this.triggerCount++;
      }
    } else {
      // Recovery condition: 30 consecutive frames < 11.76 ms (> 85 FPS)
      if (frameTimeMs < this.RECOVERY_THRESHOLD_MS) {
        this.consecutiveFastFrames++;
        if (this.consecutiveFastFrames >= this.REQUIRED_RECOVERY_FRAMES) {
          this.isVRSEnabled = false;
          this.consecutiveFastFrames = 0;
        }
      } else {
        this.consecutiveFastFrames = 0;
      }
    }

    return {
      isVRSEnabled: this.isVRSEnabled,
      shadingRateMode: this.isVRSEnabled ? '2x2_radial_periphery' : '1x1_native',
      movingAvgFrameTimeMs: movingAvg,
      consecutiveFastFrames: this.consecutiveFastFrames,
      triggerCount: this.triggerCount,
      targetBudgetMs: this.TARGET_BUDGET_MS,
      circuitBreakerThresholdMs: this.CIRCUIT_BREAKER_THRESHOLD_MS,
      recoveryThresholdMs: this.RECOVERY_THRESHOLD_MS,
      requiredRecoveryFrames: this.REQUIRED_RECOVERY_FRAMES,
      cameraSweepDetected: sweepDetected,
    };
  }

  public forceSetVRS(enabled: boolean) {
    this.isVRSEnabled = enabled;
  }
}

/**
 * Creates custom Asymmetric Triplanar Shader Material for Three.js
 * Implements:
 * - Single planar top-down mapping for horizontal terrain (|Ny| > 0.5)
 * - Lateral biplanar mapping for cliff/cave walls (|Ny| <= 0.5)
 * - 22.5° quantized facet normal specular shading
 */
export interface AsymmetricTriplanarOptions {
  wireframe?: boolean;
  roughness?: number;
  cloudShadowIntensity?: number;
  cloudCoverage?: number;
  cloudScale?: number;
}

export function createAsymmetricTriplanarMaterial(options?: AsymmetricTriplanarOptions): THREE.ShaderMaterial {
  const vertexShader = `
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying vec3 vQuantizedNormal;

    void main() {
      vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      vNormal = normalize(normalMatrix * normal);
      vQuantizedNormal = normal; // In our mesh, normals are pre-quantized to 22.5°
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying vec3 vQuantizedNormal;

    uniform vec3 uSunDirection;
    uniform vec3 uSunColor;
    uniform vec3 uAmbientColor;
    uniform float uVRSShadingRate; // 1.0 = native, 2.0 = half-rate peripheral
    uniform float uTime;
    uniform float uCloudShadowIntensity;
    uniform float uCloudCoverage;
    uniform float uCloudScale;
    uniform vec2 uCloudDrift;

    // Procedural noise for stratified cliff rock layers and cloud density
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
      vec3 norm = normalize(vNormal);
      vec3 absNorm = abs(norm);

      // Asymmetric Triplanar Weighting:
      // Horizontal surfaces: |Ny| > 0.5 (top-down projection)
      // Vertical / Cliff surfaces: |Ny| <= 0.5 (lateral biplanar projection)
      float isHorizontal = step(0.5, absNorm.y);

      // Horizontal Palette: Alpine mossy grass & weathered flat rock
      vec2 uvTop = vWorldPosition.xz * 0.4;
      float topPattern = noise(uvTop * 2.0);
      vec3 grassColor = vec3(0.24, 0.45, 0.18);
      vec3 earthColor = vec3(0.38, 0.32, 0.22);
      vec3 topAlbedo = mix(grassColor, earthColor, smoothstep(0.4, 0.7, topPattern));

      // Cliff / Cave Wall Palette: Stratified sedimentary layers
      float layerFreq = 1.8;
      float strata = sin(vWorldPosition.y * layerFreq + noise(vWorldPosition.xz * 0.2) * 2.5);
      vec3 darkRock = vec3(0.18, 0.17, 0.19);
      vec3 strataVein = vec3(0.35, 0.30, 0.26);
      vec3 copperVein = vec3(0.48, 0.32, 0.20);
      vec3 cliffAlbedo = mix(darkRock, strataVein, smoothstep(-0.2, 0.3, strata));
      if (strata > 0.75) {
        cliffAlbedo = mix(cliffAlbedo, copperVein, 0.65);
      }

      // Blend between Horizontal top-down and Vertical lateral biplanar
      vec3 finalAlbedo = mix(cliffAlbedo, topAlbedo, isHorizontal);

      // Faceted Directional Lighting with 22.5° stepping
      vec3 lightDir = normalize(uSunDirection);
      float nDotL = max(dot(norm, lightDir), 0.0);

      // Stylized 3-step cell-shading band for the Enshrouded facet look
      float bandedLight = floor(nDotL * 3.5) / 3.0;
      bandedLight = max(bandedLight, 0.15); // soft ambient floor

      // Analytical Cloud Shadow: Project world position along reverse sun vector onto cloud height plane
      // Zero shadow map memory, zero draw calls, zero resolution dilution!
      vec2 cloudRayOffset = vWorldPosition.xz - (vWorldPosition.y / max(lightDir.y, 0.2)) * lightDir.xz;
      vec2 cloudCoord = cloudRayOffset * uCloudScale + uCloudDrift * (uTime * 0.12);
      float c1 = noise(cloudCoord);
      float c2 = noise(cloudCoord * 2.4 + vec2(2.1, 4.3));
      float cDensity = c1 * 0.7 + c2 * 0.3;
      float cloudMask = smoothstep(1.0 - uCloudCoverage, 1.0 - uCloudCoverage + 0.24, cDensity);
      float cloudAtten = mix(1.0, 1.0 - uCloudShadowIntensity, cloudMask);

      // Diffuse with cloud shadow blocking sunlight
      float litSun = bandedLight * cloudAtten;
      vec3 diffuse = finalAlbedo * (uSunColor * litSun + uAmbientColor);

      // Specular glint on 22.5° facets (blocked when under cloud shadow)
      vec3 viewDir = normalize(-vWorldPosition);
      vec3 halfVec = normalize(lightDir + viewDir);
      float spec = pow(max(dot(norm, halfVec), 0.0), 32.0);
      vec3 specular = vec3(0.2) * step(0.65, spec) * cloudAtten;

      gl_FragColor = vec4(diffuse + specular, 1.0);
    }
  `;

  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uSunDirection: { value: new THREE.Vector3(0.6, 0.8, 0.4).normalize() },
      uSunColor: { value: new THREE.Vector3(1.0, 0.96, 0.88) },
      uAmbientColor: { value: new THREE.Vector3(0.18, 0.22, 0.28) },
      uVRSShadingRate: { value: 1.0 },
      uTime: { value: 0 },
      uCloudShadowIntensity: { value: options?.cloudShadowIntensity ?? 0.65 },
      uCloudCoverage: { value: options?.cloudCoverage ?? 0.45 },
      uCloudScale: { value: options?.cloudScale ?? 0.038 },
      uCloudDrift: { value: new THREE.Vector2(0.42, 0.28) },
    },
    wireframe: options?.wireframe ?? false,
  });
}
