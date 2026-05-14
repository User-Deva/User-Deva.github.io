import * as THREE from 'three'

export type SurfaceKind = 'road' | 'building' | 'water' | 'helipad' | 'unknown'

export interface ClassifyOptions {
  // Override mesh-name regex. If supplied, takes precedence over the built-in pattern.
  roadPattern?: RegExp
  buildingPattern?: RegExp
  waterPattern?: RegExp
  helipadPattern?: RegExp
  // How close to bounds.min.y a mesh must sit to be considered "ground level".
  // Tightened from medianY → groundY+slack so building rooftops can't slip through.
  groundLevelSlack?: number
  // Max height for the geometric road fallback. Anything taller is treated as a wall/prop.
  maxRoadThickness?: number
  // Any user-supplied list of names that should be FORCED to road. Highest priority.
  forceRoadNames?: string[]
  // Any user-supplied list of names that should be FORCED to building/blocked.
  forceBuildingNames?: string[]
  // Print every mesh name + dims + classification to the console once. Useful for setup.
  logMeshTable?: boolean
}

export interface CityClassification {
  roadMeshes: THREE.Mesh[]
  buildingMeshes: THREE.Mesh[]
  waterMeshes: THREE.Mesh[]
  helipadMeshes: THREE.Mesh[]
  unknownMeshes: THREE.Mesh[]
  // Meshes flagged with a non-empty `statue` custom property in Blender.
  // World position of each is captured so they can act as info-box anchors.
  statues: Array<{ mesh: THREE.Mesh; worldPos: THREE.Vector3; name: string }>
  bounds: THREE.Box3
  groundY: number
  // For HUD / debug — which path classified each mesh
  reasons: WeakMap<THREE.Mesh, string>
}

const DEFAULT_ROAD_RE = /road|street|asphalt|tarmac|highway|drive(?!way)?|lane|sidewalk|pavement|crosswalk|intersect/i
const DEFAULT_BUILDING_RE = /building|house|wall|tower|skyscraper|roof|facade|window|door|construction|shop|store|garage|column|pillar/i
const DEFAULT_WATER_RE = /water|sea|ocean|lake|river|pond|pool|fountain/i
const DEFAULT_HELIPAD_RE = /heli(pad)?|landing.?pad/i
const PROP_RE = /tree|bush|plant|grass|lamp|light|sign|car|vehicle|bench|fence|hydrant|trash/i

const FLAT_NORMAL_THRESHOLD = 0.9
const FLAT_NORMAL_RATIO = 0.75
// Once we've identified roads via userData/regex, this is how close (in world Y)
// an unclassified mesh must sit to count as "same level as the road" for the
// geometric fallback. Generous because curbs / sidewalks are usually within 0.5.
const ROAD_LEVEL_BAND = 2.5

export function classifyCity(root: THREE.Object3D, options: ClassifyOptions = {}): CityClassification {
  const {
    roadPattern = DEFAULT_ROAD_RE,
    buildingPattern = DEFAULT_BUILDING_RE,
    waterPattern = DEFAULT_WATER_RE,
    helipadPattern = DEFAULT_HELIPAD_RE,
    groundLevelSlack = 1.5,
    maxRoadThickness = 1.0,
    forceRoadNames = [],
    forceBuildingNames = [],
    logMeshTable = false,
  } = options

  root.updateMatrixWorld(true)

  const all: THREE.Mesh[] = []
  root.traverse(o => {
    const m = o as THREE.Mesh
    if (m.isMesh && m.geometry) all.push(m)
  })

  const bounds = new THREE.Box3().setFromObject(root)
  const groundY = bounds.min.y

  const reasons = new WeakMap<THREE.Mesh, string>()
  const out: CityClassification = {
    roadMeshes: [],
    buildingMeshes: [],
    waterMeshes: [],
    helipadMeshes: [],
    unknownMeshes: [],
    statues: [],
    bounds,
    groundY,
    reasons,
  }

  // Scan for `statue = <anything>` custom-property nodes anywhere in the tree.
  // These are info-box anchors that get their world position captured.
  root.traverse(o => {
    const ud = o.userData ?? {}
    const raw = ud.statue ?? ''
    if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
      const box = new THREE.Box3().setFromObject(o)
      const center = new THREE.Vector3()
      box.getCenter(center)
      if (Number.isFinite(center.x) && Number.isFinite(center.y) && Number.isFinite(center.z)) {
        out.statues.push({
          mesh: o as THREE.Mesh,
          worldPos: center,
          name: o.name ?? 'statue',
        })
      }
    }
  })

  const tmpBox = new THREE.Box3()
  const dump: Array<{ name: string; kind: SurfaceKind; reason: string; minY: number; maxY: number; h: number; udSurface: string }> = []
  const tagCounts = { userData: 0, force: 0, name: 0, heuristic: 0, fallback: 0, unknown: 0 }

  // Pre-pass: derive the "road level" Y from any meshes the user already
  // tagged as road. This makes the geometric fallback robust against deep
  // underground geometry (which would otherwise pull groundY way too low).
  const taggedRoadYs: number[] = []
  for (const mesh of all) {
    if (readSurfaceTag(mesh) === 'road') {
      tmpBox.setFromObject(mesh)
      taggedRoadYs.push(tmpBox.min.y)
    }
  }
  let roadLevelY = groundY
  if (taggedRoadYs.length > 0) {
    taggedRoadYs.sort((a, b) => a - b)
    roadLevelY = taggedRoadYs[Math.floor(taggedRoadYs.length / 2)]
  }

  for (const mesh of all) {
    const name = mesh.name ?? ''
    const fullName = (name + ' ' + (mesh.parent?.name ?? '')).toLowerCase()

    // Read userData by walking up the parent chain — Blender custom properties
    // are typically attached to the Object node, while three.js exposes the
    // Mesh below it. Without the walk, tags on the parent are invisible.
    const udSurface = readSurfaceTag(mesh)

    tmpBox.setFromObject(mesh)
    const minY = tmpBox.min.y
    const maxY = tmpBox.max.y
    const h = maxY - minY
    let kind: SurfaceKind = 'unknown'
    let reason = ''

    // 1. Highest priority — explicit Blender custom properties (glTF "extras")
    if (udSurface === 'road') { kind = 'road'; reason = 'userData' }
    else if (udSurface === 'building') { kind = 'building'; reason = 'userData' }
    else if (udSurface === 'water') { kind = 'water'; reason = 'userData' }
    else if (udSurface === 'helipad') { kind = 'helipad'; reason = 'userData' }
    // 2. Caller-supplied force lists (exact name match, case-insensitive)
    else if (forceRoadNames.some(n => n.toLowerCase() === name.toLowerCase())) { kind = 'road'; reason = 'forceRoadNames' }
    else if (forceBuildingNames.some(n => n.toLowerCase() === name.toLowerCase())) { kind = 'building'; reason = 'forceBuildingNames' }
    // 3. Name patterns
    else if (helipadPattern.test(fullName)) { kind = 'helipad'; reason = 'name:helipad' }
    else if (waterPattern.test(fullName)) { kind = 'water'; reason = 'name:water' }
    else if (roadPattern.test(fullName)) { kind = 'road'; reason = 'name:road' }
    else if (buildingPattern.test(fullName) || PROP_RE.test(fullName)) { kind = 'building'; reason = 'name:building' }
    // 4. Geometric fallback: same-level-as-known-road + flat + thin → road.
    //    "Same level" = within ROAD_LEVEL_BAND of the median tagged-road Y.
    //    If no roads were tagged at all, fall back to bounds.min.y + slack.
    else {
      const atRoadLevel = taggedRoadYs.length > 0
        ? Math.abs(minY - roadLevelY) <= ROAD_LEVEL_BAND
        : minY <= groundY + groundLevelSlack
      const isThin = h <= maxRoadThickness
      if (atRoadLevel && isThin && isMostlyFlatUp(mesh)) {
        kind = 'road'
        reason = 'heuristic:flat-ground'
      } else {
        kind = 'unknown'
        reason = 'unclassified'
      }
    }

    mesh.userData.surface = kind
    reasons.set(mesh, reason)
    if (kind === 'road') out.roadMeshes.push(mesh)
    else if (kind === 'building') out.buildingMeshes.push(mesh)
    else if (kind === 'water') out.waterMeshes.push(mesh)
    else if (kind === 'helipad') out.helipadMeshes.push(mesh)
    else out.unknownMeshes.push(mesh)

    // Per-source tally so the user can confirm Blender userData actually flowed through
    if (reason === 'userData') tagCounts.userData++
    else if (reason.startsWith('force')) tagCounts.force++
    else if (reason.startsWith('name:')) tagCounts.name++
    else if (reason.startsWith('heuristic:')) tagCounts.heuristic++
    else if (reason === 'unclassified') tagCounts.unknown++

    if (logMeshTable) dump.push({ name, kind, reason, minY, maxY, h, udSurface: udSurface || '—' })
  }

  if (logMeshTable) {
    // eslint-disable-next-line no-console
    console.table(dump.sort((a, b) => a.minY - b.minY).slice(0, 200))
    console.log(
      `[surfaceClassifier] groundY=${groundY.toFixed(2)} roadLevelY=${roadLevelY.toFixed(2)} totalMeshes=${all.length}`,
    )
    console.log('[surfaceClassifier] counts:', {
      roads: out.roadMeshes.length,
      buildings: out.buildingMeshes.length,
      water: out.waterMeshes.length,
      helipads: out.helipadMeshes.length,
      unknown: out.unknownMeshes.length,
    })
    console.log('[surfaceClassifier] classified-by:', tagCounts)
    if (tagCounts.userData === 0) {
      console.warn(
        '[surfaceClassifier] No meshes were classified via userData. Either nothing in the .glb ' +
          'has a `surface` custom property, or the property is on a parent node that the loader ' +
          'is not exposing. Make sure you exported with "Custom Properties" enabled in the glTF panel.',
      )
    }
  }

  // Last-resort safety: if NOTHING was detected as road, promote anything sitting at
  // ground level to road so the car can at least drive somewhere. Logs a loud warning.
  if (out.roadMeshes.length === 0) {
    console.warn(
      '[surfaceClassifier] No roads detected. Falling back to ALL meshes near groundY. ' +
        'Set MANUAL_ROAD_PATTERN in World.tsx, or add `surface = "road"` custom properties in Blender.',
    )
    for (const mesh of all) {
      tmpBox.setFromObject(mesh)
      if (tmpBox.min.y <= groundY + groundLevelSlack && (tmpBox.max.y - tmpBox.min.y) < 2) {
        mesh.userData.surface = 'road'
        out.roadMeshes.push(mesh)
        reasons.set(mesh, 'fallback:groundProximity')
      }
    }
  }

  return out
}

// Walks up the parent chain looking for a `surface` custom property and
// resolves it. Tolerates the most common Blender quirks:
//   - "road" / "building" / "water" / "helipad" — the intended format
//   - "ROAD" / quoted "\"road\"" — case + stray quotes
//   - true / 1 / "1" / "1.0" — Blender's default Float/Bool property left at 1
//     (treated as "road" with a console.warn so the user knows to fix it)
//   - 2 / "2" / "2.0" — treated as "building" for a simple two-tier scheme
function readSurfaceTag(mesh: THREE.Mesh): string {
  let node: THREE.Object3D | null = mesh
  while (node) {
    const ud = node.userData ?? {}
    const raw = ud.surface ?? ud.kind ?? ud.type ?? ud.tag
    if (raw !== undefined && raw !== null && raw !== '') {
      const v = raw.toString().trim().toLowerCase().replace(/^["']|["']$/g, '')
      if (v === 'road' || v === 'asphalt' || v === 'street') return 'road'
      if (v === 'building' || v === 'wall' || v === 'block') return 'building'
      if (v === 'water' || v === 'sea') return 'water'
      if (v === 'helipad' || v === 'pad') return 'helipad'
      // Numeric fallback — Blender's default Float property
      const num = parseFloat(v)
      if (Number.isFinite(num)) {
        if (num === 1) {
          tagWarnOnce('numeric-1-road')
          return 'road'
        }
        if (num === 2) {
          tagWarnOnce('numeric-2-building')
          return 'building'
        }
      }
      if (v === 'true') {
        tagWarnOnce('boolean-true-road')
        return 'road'
      }
    }
    if (ud.road === true || ud.road === 1 || ud.road === '1') return 'road'
    if (ud.building === true || ud.building === 1 || ud.building === '1') return 'building'
    if (ud.water === true || ud.water === 1 || ud.water === '1') return 'water'
    if (ud.helipad === true || ud.helipad === 1 || ud.helipad === '1') return 'helipad'
    node = node.parent
  }
  return ''
}

const _warned = new Set<string>()
function tagWarnOnce(key: string) {
  if (_warned.has(key)) return
  _warned.add(key)
  if (key === 'numeric-1-road') {
    console.warn(
      '[surfaceClassifier] Interpreting `surface = 1` as "road". To fix in Blender:\n' +
        '  Object Properties → Custom Properties → click the gear icon next to `surface` → ' +
        'Edit Property → set Type to "String" → set value to "road". Re-export the glTF.',
    )
  } else if (key === 'numeric-2-building') {
    console.warn('[surfaceClassifier] Interpreting `surface = 2` as "building".')
  } else if (key === 'boolean-true-road') {
    console.warn('[surfaceClassifier] Interpreting `surface = true` as "road".')
  }
}

function isMostlyFlatUp(mesh: THREE.Mesh): boolean {
  const geom = mesh.geometry as THREE.BufferGeometry
  const normals = geom.attributes.normal as THREE.BufferAttribute | undefined
  if (!normals) return false
  const sample = Math.min(64, normals.count)
  if (sample === 0) return false
  const tmp = new THREE.Vector3()
  const m3 = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld)
  let upCount = 0
  for (let i = 0; i < sample; i++) {
    const idx = Math.floor((i / sample) * normals.count)
    tmp.set(normals.getX(idx), normals.getY(idx), normals.getZ(idx))
      .applyMatrix3(m3)
      .normalize()
    if (tmp.y > FLAT_NORMAL_THRESHOLD) upCount++
  }
  return upCount / sample > FLAT_NORMAL_RATIO
}

// Color road / building / water meshes to verify classification visually.
// Pass `false` to restore original materials (saved in userData.__origMat).
export function debugColorize(classification: CityClassification, enable: boolean) {
  const apply = (mesh: THREE.Mesh, hex: number) => {
    if (!mesh.material || Array.isArray(mesh.material)) return
    if (enable) {
      if (!mesh.userData.__origMat) mesh.userData.__origMat = mesh.material
      mesh.material = new THREE.MeshStandardMaterial({
        color: hex,
        emissive: hex,
        emissiveIntensity: 0.25,
        roughness: 0.7,
      })
    } else if (mesh.userData.__origMat) {
      mesh.material = mesh.userData.__origMat as THREE.Material
      delete mesh.userData.__origMat
    }
  }
  classification.roadMeshes.forEach(m => apply(m, 0x22c55e))
  classification.buildingMeshes.forEach(m => apply(m, 0xef4444))
  classification.waterMeshes.forEach(m => apply(m, 0x3b82f6))
  classification.helipadMeshes.forEach(m => apply(m, 0xfbbf24))
  classification.unknownMeshes.forEach(m => apply(m, 0x9ca3af))
}

// Find a spawn point that is GUARANTEED to be on a road. Tries the preferred
// xz first, then a grid sweep of the city bounds, then road-mesh centroids.
// Returns the world-space ground point.
export function findSpawnOnRoad(
  classification: CityClassification,
  preferred?: { x: number; z: number },
): { x: number; y: number; z: number } | null {
  if (classification.roadMeshes.length === 0) return null

  const raycaster = new THREE.Raycaster()
  const down = new THREE.Vector3(0, -1, 0)
  const origin = new THREE.Vector3()
  const probe = (x: number, z: number) => {
    origin.set(x, classification.bounds.max.y + 50, z)
    raycaster.set(origin, down)
    raycaster.far = (classification.bounds.max.y - classification.bounds.min.y) + 200
    const hits = raycaster.intersectObjects(classification.roadMeshes, true)
    return hits[0] ?? null
  }

  if (preferred) {
    const h = probe(preferred.x, preferred.z)
    if (h) return { x: preferred.x, y: h.point.y, z: preferred.z }
  }

  // Grid sweep — denser at center, looser at edges
  const b = classification.bounds
  const cx = (b.min.x + b.max.x) / 2
  const cz = (b.min.z + b.max.z) / 2
  const stepsX = Math.min(20, Math.max(8, Math.round((b.max.x - b.min.x) / 5)))
  const stepsZ = Math.min(20, Math.max(8, Math.round((b.max.z - b.min.z) / 5)))
  for (let r = 1; r < Math.max(stepsX, stepsZ); r++) {
    for (let i = -r; i <= r; i++) {
      const fx = cx + (i / stepsX) * (b.max.x - b.min.x) * 0.5
      for (const fz of [cz - (r / stepsZ) * (b.max.z - b.min.z) * 0.5, cz + (r / stepsZ) * (b.max.z - b.min.z) * 0.5]) {
        const h = probe(fx, fz)
        if (h) return { x: fx, y: h.point.y, z: fz }
      }
    }
  }

  // Last resort: road centroid sweep
  const tmp = new THREE.Box3()
  for (const m of classification.roadMeshes) {
    tmp.setFromObject(m)
    const mx = (tmp.min.x + tmp.max.x) / 2
    const mz = (tmp.min.z + tmp.max.z) / 2
    const h = probe(mx, mz)
    if (h) return { x: mx, y: h.point.y, z: mz }
  }
  return null
}
