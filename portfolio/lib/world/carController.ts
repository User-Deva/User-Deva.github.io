import * as THREE from 'three'

export interface CarState {
  pos: THREE.Vector3
  lastValidPos: THREE.Vector3
  angle: number
  speed: number
  turnSpeed: number
  surfaceY: number
  surfaceNormal: THREE.Vector3
  onRoad: boolean
}

export interface CarConfig {
  maxSpeed: number
  reverseSpeedScale: number
  accel: number
  friction: number
  turnFriction: number
  turnAmount: number
  offRoadFriction: number
  edgePushBack: number
}

export const DEFAULT_CAR_CONFIG: CarConfig = {
  maxSpeed: 0.56,
  reverseSpeedScale: 0.4,
  accel: 0.022,
  friction: 0.985,
  turnFriction: 0.82,
  turnAmount: 0.040,
  offRoadFriction: 0.90,
  edgePushBack: 0.12,

}

export function createCarState(spawn: { x: number; y?: number; z: number; angle?: number }): CarState {
  const pos = new THREE.Vector3(spawn.x, spawn.y ?? 0, spawn.z)
  return {
    pos,
    lastValidPos: pos.clone(),
    angle: spawn.angle ?? 0,
    speed: 0,
    turnSpeed: 0,
    surfaceY: spawn.y ?? 0,
    surfaceNormal: new THREE.Vector3(1, 1, 0),
    onRoad: true,
  }
}

export interface DriveInput {
  fwd: boolean
  bwd: boolean
  lft: boolean
  rgt: boolean
  dt: number
  frozen: boolean
}

interface SurfaceProbe {
  hit: boolean
  y: number
  normal: THREE.Vector3
}

const _down = new THREE.Vector3(0, -1, 0)
const _rayOrigin = new THREE.Vector3()
const _candidate = new THREE.Vector3()
const _probe: SurfaceProbe = { hit: false, y: 0, normal: new THREE.Vector3(0, 1, 0) }
const _probeAlt: SurfaceProbe = { hit: false, y: 0, normal: new THREE.Vector3(0, 1, 0) }
const _raycaster = new THREE.Raycaster()

// Cast ray straight down at (x, z) against the supplied meshes only.
// Restricts work to road meshes — never the full scene — so per-frame cost stays bounded.
export function sampleSurface(
  x: number,
  z: number,
  yHint: number,
  meshes: THREE.Object3D[],
  out: SurfaceProbe = _probe,
): SurfaceProbe {
  _rayOrigin.set(x, yHint + 200, z)
  _raycaster.set(_rayOrigin, _down)
  _raycaster.far = 600
  const hits = _raycaster.intersectObjects(meshes, true)
  if (hits.length > 0) {
    // Prefer hit closest to the car's current Y (handles overpass / multi-level roads)
    let best = hits[0]
    let bestDist = Math.abs(best.point.y - yHint)
    for (let i = 1; i < hits.length; i++) {
      const d = Math.abs(hits[i].point.y - yHint)
      if (d < bestDist) {
        best = hits[i]
        bestDist = d
      }
    }
    out.hit = true
    out.y = best.point.y
    if (best.face) {
      out.normal.copy(best.face.normal)
        .transformDirection(best.object.matrixWorld)
        .normalize()
    } else {
      out.normal.set(0, 1, 0)
    }
  } else {
    out.hit = false
    out.normal.set(0, 1, 0)
  }
  return out
}

// Drive one tick. Movement is permitted only if the candidate next position
// rests on a road mesh. Off-road attempts decay speed and revert position.
export function updateCar(
  car: CarState,
  input: DriveInput,
  config: CarConfig,
  roadMeshes: THREE.Object3D[],
  bounds: THREE.Box3,
) {
  const { fwd, bwd, lft, rgt, dt, frozen } = input

  if (frozen) {
    // Even when frozen, keep the car settled on the road surface
    sampleSurface(car.pos.x, car.pos.z, car.pos.y, roadMeshes, _probe)
    if (_probe.hit) {
      car.surfaceY = _probe.y
      car.surfaceNormal.copy(_probe.normal)
    }
    car.speed *= Math.pow(0.85, dt)
    return
  }

  // Throttle / brake
  if (fwd) car.speed = Math.min(car.speed + config.accel * dt, config.maxSpeed)
  else if (bwd) car.speed = Math.max(car.speed - config.accel * dt, -config.maxSpeed * config.reverseSpeedScale)
  car.speed *= Math.pow(config.friction, dt)

  // Steering — minimum factor keeps the wheel responsive at low speeds
  // const speedFactor = Math.max(0.5, Math.abs(car.speed) / config.maxSpeed)
  // const turnAmt = config.turnAmount * speedFactor * dt
  // Steering — minimum factor keeps the wheel responsive at low speeds
  // Realistic steering:
// tighter at low speed, wider at high speed
  const normalizedSpeed = Math.min(
    Math.abs(car.speed) / config.maxSpeed,
    1
)

  const steeringScale =
    1.0 - normalizedSpeed * 0.65

  const turnAmt =
    config.turnAmount *
    steeringScale *
    dt
  if (lft) car.turnSpeed += turnAmt
  if (rgt) car.turnSpeed -= turnAmt
  car.turnSpeed *= Math.pow(config.turnFriction, dt)
  if (Math.abs(car.speed) > 0.001) car.angle += car.turnSpeed * Math.sign(car.speed)

  // Predicted next position
  const dx = Math.sin(car.angle) * car.speed * dt
  const dz = Math.cos(car.angle) * car.speed * dt
  _candidate.set(car.pos.x + dx, car.pos.y, car.pos.z + dz)

  // Test next position against road meshes
  sampleSurface(_candidate.x, _candidate.z, car.pos.y, roadMeshes, _probe)

  if (_probe.hit) {
    car.pos.set(_candidate.x, _probe.y, _candidate.z)
    car.lastValidPos.copy(car.pos)
    car.surfaceY = _probe.y
    car.surfaceNormal.copy(_probe.normal)
    car.onRoad = true
  } else {
    // Off-road: hold position, kill forward intent, soft push back toward last valid spot.
    car.onRoad = false
    car.speed *= Math.pow(config.offRoadFriction, dt)
    if (Math.abs(car.speed) < 0.005) car.speed = 0

    const back = _candidate
    back.subVectors(car.lastValidPos, car.pos).multiplyScalar(config.edgePushBack * dt)
    car.pos.add(back)

    // Re-sample current position so terrain Y stays sane while easing back onto the road
    sampleSurface(car.pos.x, car.pos.z, car.pos.y, roadMeshes, _probeAlt)
    if (_probeAlt.hit) {
      car.surfaceY = _probeAlt.y
      car.surfaceNormal.copy(_probeAlt.normal)
    }
  }

  // Hard world bounds — prevents the car from ever leaving the city footprint
  car.pos.x = Math.max(bounds.min.x + 1, Math.min(bounds.max.x - 1, car.pos.x))
  car.pos.z = Math.max(bounds.min.z + 1, Math.min(bounds.max.z - 1, car.pos.z))
}

// Build a quaternion that aligns the chassis: yaw from car.angle, up = surface normal,
// plus a small roll for body lean during turns.
const _forward = new THREE.Vector3()
const _projForward = new THREE.Vector3()
const _right = new THREE.Vector3()
const _basis = new THREE.Matrix4()
const _Z_AXIS = new THREE.Vector3(0, 0, 1)
const _rollQuat = new THREE.Quaternion()

export function computeChassisQuaternion(
  car: CarState,
  out: THREE.Quaternion,
  leanScale = 0.36,
) {
  _forward.set(Math.sin(car.angle), 0, Math.cos(car.angle))
  _projForward.copy(_forward)
    .addScaledVector(car.surfaceNormal, -_forward.dot(car.surfaceNormal))
    .normalize()
  _right.crossVectors(car.surfaceNormal, _projForward).normalize()
  _basis.makeBasis(_right, car.surfaceNormal, _projForward)
  out.setFromRotationMatrix(_basis)
  const lean = car.turnSpeed * Math.sign(car.speed) * -leanScale
  _rollQuat.setFromAxisAngle(_Z_AXIS, lean)
  out.multiply(_rollQuat)
}
