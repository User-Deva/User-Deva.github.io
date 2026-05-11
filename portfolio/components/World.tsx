'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { loadGLB, type LoadProgress } from '@/lib/world/loadGLB'
import { classifyCity, debugColorize, findSpawnOnRoad, type CityClassification } from '@/lib/world/surfaceClassifier'
import {
  createCarState,
  updateCar,
  computeChassisQuaternion,
  sampleSurface,
  DEFAULT_CAR_CONFIG,
  type CarState,
} from '@/lib/world/carController'


const MANUAL_ROAD_PATTERN = /road|street|asphalt|tarmac|highway|drive(?!way)?|lane|sidewalk|pavement|crosswalk|intersect|ground|terrain/i
const MANUAL_BUILDING_PATTERN = /building|house|wall|tower|skyscraper|roof|rooftop|facade|window|door|construction|shop|store|garage|column|pillar|block/i
const FORCE_ROAD_NAMES: string[] = []
const FORCE_BUILDING_NAMES: string[] = []
// ─────────────────────────────────────────────────────────────────────────────

// ─── Portfolio markers ───────────────────────────────────────────────────────
// Each block becomes a 3D model placed in the city. `model: 'urus'` reuses the
// loaded urus.glb; everything else clones model.glb. Positions are world-space
// XZ and get snapped onto the nearest road surface at startup.
type MarkerModel = 'urus' | 'model'
interface MarkerContent {
  title: string
  subtitle: string
  body: string
  tags: string[]
  cta: { label: string; href: string }
}
interface MarkerDef {
  id: string
  label: string
  model: MarkerModel
  scale: number
  color: number
  position: { x: number; z: number }
  content: MarkerContent
}

const PORTFOLIO_BLOCKS: MarkerDef[] = [
  {
    id: 'about',
    label: 'About',
    model: 'urus',
    scale: 0.8,
    color: 0x6ee7b7,
    position: { x: 20, z: 0 },
    content: {
      title: "Hey, I'm Devang",
      subtitle: 'Supply Chain Analyst',
      body: '4+ years across aerospace, e-commerce, and logistics — turning demand forecasts, ERP data, and Lean Six Sigma into measurable cost savings and OTIF gains.',
      tags: ['4+ years exp', 'Lean Six Sigma GB', 'Open to work'],
      cta: { label: 'Download Resume', href: '/DPRSC.pdf' },
    },
  },
  {
    id: 'projects',
    label: 'Case Studies',
    model: 'model',
    scale: 0.8,
    color: 0x818cf8,
    position: { x: 18, z: 0 },
    content: {
      title: 'Case Studies',
      subtitle: '$2.1M freight saved · 14% forecast lift',
      body: 'McCormick demand forecasting in Power BI + SQL, Flipkart Big Billion Days replenishment in Python, Adani inbound scheduling on SAP S/4HANA — measurable wins across the supply network.',
      tags: ['Power BI', 'SAP S/4HANA', 'Python', 'Tableau'],
      cta: { label: 'View on LinkedIn', href: 'https://linkedin.com/in/devangpatidar' },
    },
  },
  {
    id: 'skills',
    label: 'Skills',
    model: 'model',
    scale: 0.8,
    color: 0xfbbf24,
    position: { x: 16, z: 0 },
    content: {
      title: 'My Toolkit',
      subtitle: 'Forecast → Procure → Fulfill',
      body: 'Demand forecasting, inventory optimization, S&OP, and procurement strategy — backed by SQL, Power BI, Tableau, Python, and Lean Six Sigma. ERP-fluent on SAP S/4HANA and Oracle Cloud.',
      tags: ['SQL', 'Power BI', 'Tableau', 'Python', 'Lean Six Sigma'],
      cta: { label: 'See all skills', href: '#skills' },
    },
  },
  {
    id: 'experience',
    label: 'Experience',
    model: 'model',
    scale: 0.8,
    color: 0x38bdf8,
    position: { x: 14, z: 0 },
    content: {
      title: 'Work History',
      subtitle: 'McCormick · Flipkart · Adani',
      body: 'Currently Supply Chain Analyst at McCormick & Company (MD). Previously at Flipkart on Tier-1 fulfillment for 25K+ SKUs, and Adani Logistics on a 150K sq. ft. distribution hub.',
      tags: ['Aerospace/CPG', 'E-commerce', 'Logistics'],
      cta: { label: 'View LinkedIn', href: 'https://linkedin.com/in/devangpatidar' },
    },
  },
  {
    id: 'contact',
    label: 'Contact',
    model: 'model',
    scale: 0.8,
    color: 0xf472b6,
    position: { x: 16, z:0},
    content: {
      title: "Let's Talk",
      subtitle: 'devangpatidar40@gmail.com',
      body: 'Open to Supply Chain Analyst, Demand Planning, and Operations roles — full-time or contract. Reach out about a role, a forecasting/inventory problem, or just to talk shop. I reply within 24 hours.',
      tags: ['Available now', 'Open to relocate', 'Full-time or contract'],
      cta: { label: 'Send Email', href: 'mailto:devangpatidar40@gmail.com' },
    },
  },
]

const ASSETS = {
  city: '/citya.glb',
  sea: '/sea.glb',
  car: '/GTR.glb',
  urus: '/urus.glb',
  model: '/model.glb',
}

const PROXIMITY_RADIUS = 4

interface PanelState {
  visible: boolean
  marker: MarkerDef | null
}

interface MarkerInstance {
  def: MarkerDef
  group: THREE.Group
  worldPos: THREE.Vector3
  inRange: boolean
}

interface PromptUIState {
  visible: boolean
  screenX: number
  screenY: number
  label: string
  color: string
}

export default function World() {
  const mountRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<number>(0)
  const keysRef = useRef<Record<string, boolean>>({})
  const carRef = useRef<CarState | null>(null)
  const carGroupRef = useRef<THREE.Group | null>(null)
  const wheelsRef = useRef<Array<{ obj: THREE.Object3D; axis: THREE.Vector3 }>>([])
  const markersRef = useRef<MarkerInstance[]>([])
  const activeMarkerRef = useRef<MarkerInstance | null>(null)
  const panelOpenRef = useRef(false)
  const cityClassRef = useRef<CityClassification | null>(null)

  const [panel, setPanel] = useState<PanelState>({ visible: false, marker: null })
  const [discovered, setDiscovered] = useState<Set<string>>(new Set())
  const [speed, setSpeed] = useState(0)
  const [started, setStarted] = useState(false)
  const [loading, setLoading] = useState({ progress: 0, label: '' })
  const [activeKeys, setActiveKeys] = useState({ w: false, a: false, s: false, d: false })
  const [activeMarkerId, setActiveMarkerId] = useState<string | null>(null)
  const [prompt, setPromptState] = useState<PromptUIState>({
    visible: false, screenX: 0, screenY: 0, label: '', color: '#6ee7b7',
  })
  const [diag, setDiag] = useState({ onRoad: false, roadCount: 0, posX: 0, posZ: 0 })

  const closePanel = useCallback(() => {
    setPanel({ visible: false, marker: null })
    panelOpenRef.current = false
  }, [])

  useEffect(() => {
    if (!started || !mountRef.current) return
    const mount = mountRef.current
    const W = mount.clientWidth
    const H = mount.clientHeight
    let mounted = true

    // ── Renderer ─────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    renderer.outputColorSpace = THREE.SRGBColorSpace
    mount.appendChild(renderer.domElement)

    // ── Scene + camera + lighting ────────────────────────────────────────────
    const scene = new THREE.Scene()
    const SKY = 0xb6dcf2
    scene.background = new THREE.Color(SKY)
    scene.fog = new THREE.FogExp2(SKY, 0.0035)

    const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 1500)
    camera.position.set(0, 12, 16)

    scene.add(new THREE.HemisphereLight(0xfff2d8, 0x5a5048, 0.55))
    scene.add(new THREE.AmbientLight(0xfff0d8, 0.22))
    const sun = new THREE.DirectionalLight(0xfff8e0, 2.4)
    sun.position.set(60, 90, 40)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.near = 0.5
    sun.shadow.camera.far = 400
    sun.shadow.camera.left = -150
    sun.shadow.camera.right = 150
    sun.shadow.camera.top = 150
    sun.shadow.camera.bottom = -150
    sun.shadow.bias = -0.0005
    scene.add(sun)
    const skyFill = new THREE.DirectionalLight(0x88aacc, 0.4)
    skyFill.position.set(-40, 30, -30)
    scene.add(skyFill)

    // ── Track loading progress across many large GLBs ────────────────────────
    const stages = ['city', 'sea', 'car', 'urus', 'model']
    const stageProgress: Record<string, number> = {}
    const onProgress = (label: string) => (p: LoadProgress) => {
      if (p.total > 0) stageProgress[label] = p.loaded / p.total
      const total = stages.reduce((s, k) => s + (stageProgress[k] ?? 0), 0)
      setLoading({ progress: total / stages.length, label })
    }

    // ── World load + setup ───────────────────────────────────────────────────
    let cityRoot: THREE.Group | null = null
    let seaRoot: THREE.Group | null = null

    const debugRoads = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === 'roads'

    ;(async () => {
      try {
        const city = await loadGLB(ASSETS.city, { scale: 1, receiveShadow: true }, onProgress('city'))
        if (!mounted) return
        scene.add(city)
        cityRoot = city
        const classification = classifyCity(city, {
          roadPattern: MANUAL_ROAD_PATTERN,
          buildingPattern: MANUAL_BUILDING_PATTERN,
          forceRoadNames: FORCE_ROAD_NAMES,
          forceBuildingNames: FORCE_BUILDING_NAMES,
          logMeshTable: true,
        })
        cityClassRef.current = classification
        if (debugRoads) debugColorize(classification, true)

        // ── Sea: tile/scale a single .glb to span beyond the city footprint ─
        const sea = await loadGLB(ASSETS.sea, { receiveShadow: true }, onProgress('sea'))
        if (!mounted) return
        const cityBox = classification.bounds
        const cityCenter = new THREE.Vector3()
        cityBox.getCenter(cityCenter)
        const citySize = new THREE.Vector3()
        cityBox.getSize(citySize)
        // Scale sea to comfortably surround city (3x city span on each axis)
        const seaBox = new THREE.Box3().setFromObject(sea)
        const seaSize = new THREE.Vector3()
        seaBox.getSize(seaSize)
        const targetSpan = Math.max(citySize.x, citySize.z) * 3
        const scaleX = targetSpan / Math.max(seaSize.x, 0.001)
        const scaleZ = targetSpan / Math.max(seaSize.z, 0.001)
        const seaScale = Math.max(scaleX, scaleZ)
        sea.scale.set(seaScale, 1, seaScale)
        sea.position.set(cityCenter.x, cityBox.min.y - 0.6, cityCenter.z)
        scene.add(sea)
        seaRoot = sea

        // ── Car (GTR) ─────────────────────────────────────────────────────────
        const carGroup = new THREE.Group()
        scene.add(carGroup)
        carGroupRef.current = carGroup

        const carModel = await loadGLB(ASSETS.car, {}, onProgress('car'))
        if (!mounted) return
        // Auto-fit GTR to a target length of ~4 units so it stays visible
        // regardless of how the city was scaled. Without this, a fixed scale
        // can make the car invisible or oversized when the world changes.
        const TARGET_CAR_LENGTH = 6.0
        const carBox = new THREE.Box3().setFromObject(carModel)
        const carSize = new THREE.Vector3()
        carBox.getSize(carSize)
        const carLongest = Math.max(carSize.x, carSize.z, 0.001)
        const carFit = TARGET_CAR_LENGTH / carLongest
        carModel.scale.setScalar(carFit)
        // Re-center so the car's pivot is at the wheels, not floating mid-body
        carBox.setFromObject(carModel)
        const carCenter = new THREE.Vector3()
        carBox.getCenter(carCenter)
        carModel.position.x -= carCenter.x
        carModel.position.z -= carCenter.z
        carModel.position.y -= carBox.min.y
        console.log('[car] auto-fit scale:', carFit, 'native size:', carSize.toArray())
        carGroup.add(carModel)
        wheelsRef.current = setupWheels(carModel)

        // Spawn on a road. Try the first marker's preferred xz; fall back to road centroid.
        const spawnPref = PORTFOLIO_BLOCKS[0]?.position
        const spawn = findSpawnOnRoad(classification, spawnPref) ?? {
          x: cityCenter.x, y: cityBox.min.y, z: cityCenter.z,
        }
        carRef.current = createCarState({ x: spawn.x, y: spawn.y, z: spawn.z, angle: 0 })
        console.log('[car] spawn:', spawn, 'cityBounds:', {
          min: cityBox.min.toArray(),
          max: cityBox.max.toArray(),
        })

        // ── Portfolio markers (urus for About, model.glb cloned for the rest) ─
        const urus = await loadGLB(ASSETS.urus, {}, onProgress('urus'))
        if (!mounted) return
        const modelTpl = await loadGLB(ASSETS.model, {}, onProgress('model'))
        if (!mounted) return

        // Compute a normalized scale for each template so the marker has a
        // predictable footprint regardless of how the .glb was authored.
        const TARGET_MARKER_HEIGHT = 2.4
        const fitScale = (g: THREE.Group): number => {
          const bb = new THREE.Box3().setFromObject(g)
          const sz = new THREE.Vector3()
          bb.getSize(sz)
          const tallest = Math.max(sz.y, 0.001)
          return TARGET_MARKER_HEIGHT / tallest
        }
        const urusFit = fitScale(urus)
        const modelFit = fitScale(modelTpl)
        console.log('[markers] auto-fit scales:', { urus: urusFit, model: modelFit })

        const markers: MarkerInstance[] = []
        for (const def of PORTFOLIO_BLOCKS) {
          const tpl = def.model === 'urus' ? urus : modelTpl
          const fit = def.model === 'urus' ? urusFit : modelFit
          const clone = tpl.clone(true) as THREE.Group
          clone.scale.setScalar(fit * def.scale)

          // Snap onto a road. If the requested xz isn't on a road, find the
          // nearest road point so markers don't float in midair / land on roofs.
          let mx = def.position.x
          let mz = def.position.z
          const probe = { hit: false, y: 0, normal: new THREE.Vector3(0, 1, 0) }
          sampleSurface(mx, mz, cityBox.max.y, classification.roadMeshes, probe)
          if (!probe.hit) {
            const fallback = findSpawnOnRoad(classification, { x: mx, z: mz })
            if (fallback) {
              mx = fallback.x
              mz = fallback.z
              sampleSurface(mx, mz, cityBox.max.y, classification.roadMeshes, probe)
            }
          }
          const y = probe.hit ? probe.y + 0.02 : spawn.y
          clone.position.set(mx, y, mz)

          // Re-center so the model sits with its base on the road
          const cb = new THREE.Box3().setFromObject(clone)
          if (cb.min.y < y) clone.position.y += y - cb.min.y
          scene.add(clone)

          // Discovery glow ring beneath the model
          const ring = new THREE.Mesh(
            new THREE.RingGeometry(2, 2.4, 32),
            new THREE.MeshBasicMaterial({
              color: def.color,
              transparent: true,
              opacity: 0.55,
              side: THREE.DoubleSide,
              depthWrite: false,
            }),
          )
          ring.rotation.x = -Math.PI / 2
          ring.position.set(mx, y + 0.02, mz)
          scene.add(ring)

          markers.push({
            def,
            group: clone,
            worldPos: new THREE.Vector3(mx, y, mz),
            inRange: false,
          })
        }
        markersRef.current = markers

        setLoading({ progress: 1, label: 'ready' })
      } catch (err) {
        console.error('[World] load failed:', err)
      }
    })()

    // ── Input ────────────────────────────────────────────────────────────────
    const normKey = (k: string) => (k.length === 1 ? k.toLowerCase() : k)
    const onKeyDown = (e: KeyboardEvent) => {
      const k = normKey(e.key)
      keysRef.current[k] = true
      if (k === 'Enter') {
        if (panelOpenRef.current) {
          // pressing Enter again closes
          setPanel({ visible: false, marker: null })
          panelOpenRef.current = false
        } else if (activeMarkerRef.current) {
          const m = activeMarkerRef.current
          setPanel({ visible: true, marker: m.def })
          panelOpenRef.current = true
          setDiscovered(prev => {
            if (prev.has(m.def.id)) return prev
            const next = new Set(prev)
            next.add(m.def.id)
            return next
          })
        }
      } else if (k === 'Escape') {
        if (panelOpenRef.current) {
          setPanel({ visible: false, marker: null })
          panelOpenRef.current = false
        }
      } else if (k === 'r') {
        // Respawn: snap car onto a guaranteed road point. Useful if it ever
        // wedges off the navigable area while you're tuning road definitions.
        const klass = cityClassRef.current
        const car = carRef.current
        if (klass && car) {
          const sp = findSpawnOnRoad(klass, { x: car.pos.x, z: car.pos.z })
          if (sp) {
            car.pos.set(sp.x, sp.y, sp.z)
            car.lastValidPos.copy(car.pos)
            car.speed = 0
            car.turnSpeed = 0
            car.surfaceY = sp.y
            car.onRoad = true
            console.log('[respawn] →', sp)
          }
        }
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[normKey(e.key)] = false
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    // ── Animation loop ───────────────────────────────────────────────────────
    let lastTime = performance.now()
    let bobT = 0
    const targetQuat = new THREE.Quaternion()
    const tmpScreen = new THREE.Vector3()

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate)
      const now = performance.now()
      const dt = Math.min((now - lastTime) / 16.67, 3)
      lastTime = now

      const car = carRef.current
      const klass = cityClassRef.current
      if (!car || !klass) {
        renderer.render(scene, camera)
        return
      }

      const k = keysRef.current
      const fwd = !!(k['w'] || k['ArrowUp'])
      const bwd = !!(k['s'] || k['ArrowDown'])
      const lft = !!(k['a'] || k['ArrowLeft'])
      const rgt = !!(k['d'] || k['ArrowRight'])
      setActiveKeys(prev =>
        prev.w === fwd && prev.a === lft && prev.s === bwd && prev.d === rgt
          ? prev
          : { w: fwd, a: lft, s: bwd, d: rgt },
      )

      // Drive — frozen while panel is open
      updateCar(
        car,
        { fwd, bwd, lft, rgt, dt, frozen: panelOpenRef.current },
        DEFAULT_CAR_CONFIG,
        klass.roadMeshes,
        klass.bounds,
      )

      // Place + orient car
      if (carGroupRef.current) {
        bobT += 0.12 * dt
        const bob = Math.abs(car.speed) > 0.005 ? Math.sin(bobT * 9) * 0.012 : 0
        carGroupRef.current.position.set(car.pos.x, car.surfaceY + 0.05 + bob, car.pos.z)
        computeChassisQuaternion(car, targetQuat)
        carGroupRef.current.quaternion.slerp(targetQuat, 0.4)

        const wheelDelta = car.speed * dt * 3.5
        for (const w of wheelsRef.current) w.obj.rotateOnAxis(w.axis, wheelDelta)
      }

      // Camera follow
      const camDist = 11
      const camHeight = 7
      const targetCamX = car.pos.x + Math.sin(car.angle) * -camDist
      const targetCamZ = car.pos.z + Math.cos(car.angle) * -camDist
      camera.position.x += (targetCamX - camera.position.x) * 0.07 * dt
      camera.position.y += (car.surfaceY + camHeight - camera.position.y) * 0.07 * dt
      camera.position.z += (targetCamZ - camera.position.z) * 0.07 * dt
      camera.lookAt(car.pos.x, car.surfaceY + 0.5, car.pos.z)

      // Marker proximity → activeMarker + screen-projected ENTER prompt
      let nearest: MarkerInstance | null = null
      let nearestDist = Infinity
      for (const m of markersRef.current) {
        const dx = car.pos.x - m.worldPos.x
        const dz = car.pos.z - m.worldPos.z
        const d = Math.sqrt(dx * dx + dz * dz)
        m.inRange = d < PROXIMITY_RADIUS
        if (m.inRange && d < nearestDist) {
          nearest = m
          nearestDist = d
        }
        // Idle spin for visibility
        m.group.rotation.y += 0.003 * dt
      }
      activeMarkerRef.current = nearest
      const nearestId = nearest?.def.id ?? null
      setActiveMarkerId(prev => (prev === nearestId ? prev : nearestId))

      if (nearest && !panelOpenRef.current) {
        tmpScreen.set(nearest.worldPos.x, nearest.worldPos.y + 3, nearest.worldPos.z)
        tmpScreen.project(camera)
        const sx = (tmpScreen.x * 0.5 + 0.5) * mount.clientWidth
        const sy = (-tmpScreen.y * 0.5 + 0.5) * mount.clientHeight
        const onScreen = tmpScreen.z < 1
        setPromptState({
          visible: onScreen,
          screenX: sx,
          screenY: sy,
          label: nearest.def.label,
          color: `#${nearest.def.color.toString(16).padStart(6, '0')}`,
        })
      } else {
        setPromptState(p => (p.visible ? { ...p, visible: false } : p))
      }

      setSpeed(Math.round(Math.abs(car.speed) * 1000))
      setDiag(prev => {
        const next = {
          onRoad: car.onRoad,
          roadCount: klass.roadMeshes.length,
          posX: Math.round(car.pos.x * 10) / 10,
          posZ: Math.round(car.pos.z * 10) / 10,
        }
        if (
          prev.onRoad === next.onRoad &&
          prev.roadCount === next.roadCount &&
          prev.posX === next.posX &&
          prev.posZ === next.posZ
        ) return prev
        return next
      })
      renderer.render(scene, camera)
    }
    animate()

    // ── Resize ───────────────────────────────────────────────────────────────
    const onResize = () => {
      if (!mount) return
      const w = mount.clientWidth
      const h = mount.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    return () => {
      mounted = false
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
      // best-effort cleanup of large roots
      void cityRoot
      void seaRoot
    }
  }, [started])

  // ── Loading screen / start gate ─────────────────────────────────────────────
  if (!started) {
    return (
      <div style={startStyles.root}>
        <div style={{ textAlign: 'center' }}>
          <p style={startStyles.eyebrow}>PORTFOLIO</p>
          <h1 style={startStyles.title}>Devang Patidar</h1>
          <p style={startStyles.subtitle}>
            Drive the city. Find the markers. Discover the supply chain.
          </p>
        </div>
        <button
          onClick={() => setStarted(true)}
          style={startStyles.cta}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          Enter World
        </button>
        <p style={startStyles.hint}>WASD to drive · ENTER to interact · R to respawn on road</p>
      </div>
    )
  }

  const loadPct = Math.round(loading.progress * 100)

  return (
    <div ref={mountRef} style={{ width: '100%', height: '100vh', position: 'relative', overflow: 'hidden', background: '#0a0a14' }}>

      {/* HUD top-left */}
      <div style={{ position: 'absolute', top: '1.25rem', left: '1.25rem', fontFamily: "'DM Sans', sans-serif", pointerEvents: 'none' }}>
        <p style={{ color: '#6EE7B7', fontSize: '0.65rem', letterSpacing: '0.2em', marginBottom: '0.2rem' }}>PORTFOLIO</p>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.1rem', fontWeight: 500, letterSpacing: '-0.02em' }}>Devang Patidar</p>
      </div>

      {/* HUD top-right */}
      <div style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', textAlign: 'right', fontFamily: "'DM Mono', monospace", pointerEvents: 'none' }}>
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.65rem', letterSpacing: '0.08em' }}>
          {discovered.size}/{PORTFOLIO_BLOCKS.length} DISCOVERED
        </p>
        <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.6rem', marginTop: '2px' }}>SPD {speed}</p>
        <p style={{ color: diag.onRoad ? '#6ee7b7' : '#f87171', fontSize: '0.55rem', marginTop: '4px', letterSpacing: '0.06em' }}>
          {diag.onRoad ? '● ON ROAD' : '● OFF ROAD'} · {diag.roadCount} ROADS
        </p>
        <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.55rem', letterSpacing: '0.06em' }}>
          X {diag.posX} · Z {diag.posZ}
        </p>
      </div>

      {/* Loading bar (visible until city + assets are ready) */}
      {loadPct < 100 && (
        <div style={{
          position: 'absolute', bottom: '50%', left: '50%', transform: 'translate(-50%, 50%)',
          textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontFamily: "'DM Mono', monospace",
        }}>
          <p style={{ fontSize: '0.7rem', letterSpacing: '0.2em', marginBottom: '0.6rem' }}>
            LOADING WORLD · {loadPct}%
          </p>
          <div style={{ width: 240, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
            <div style={{ width: `${loadPct}%`, height: '100%', background: '#6EE7B7', borderRadius: 2, transition: 'width 0.18s' }} />
          </div>
          <p style={{ fontSize: '0.55rem', marginTop: '0.5rem', color: 'rgba(255,255,255,0.3)' }}>
            {loading.label}
          </p>
        </div>
      )}

      {/* Floating proximity prompt (screen-space, projected each frame) */}
      {prompt.visible && !panel.visible && (
        <div style={{
          position: 'absolute',
          left: prompt.screenX,
          top: prompt.screenY,
          transform: 'translate(-50%, -100%)',
          pointerEvents: 'none',
          fontFamily: "'Syne', sans-serif",
          textAlign: 'center',
          animation: 'pulse 1.6s ease-in-out infinite',
        }}>
          <div style={{
            background: 'rgba(0,0,0,0.7)',
            border: `1px solid ${prompt.color}66`,
            borderRadius: 6,
            padding: '0.4rem 0.7rem',
            color: '#fff',
            fontSize: '0.7rem',
            letterSpacing: '0.18em',
            fontWeight: 600,
          }}>
            <span style={{ color: prompt.color }}>● </span>
            {prompt.label.toUpperCase()} · PRESS <span style={{ color: prompt.color }}>ENTER</span>
          </div>
        </div>
      )}

      {/* Mobile controls */}
      <div style={{
        position: 'absolute', bottom: '1.25rem', left: '1.25rem',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      }}>
        <button style={mobileBtn()} onTouchStart={() => (keysRef.current['w'] = true)} onTouchEnd={() => (keysRef.current['w'] = false)}>▲</button>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={mobileBtn()} onTouchStart={() => (keysRef.current['a'] = true)} onTouchEnd={() => (keysRef.current['a'] = false)}>◀</button>
          <button style={mobileBtn()} onTouchStart={() => (keysRef.current['s'] = true)} onTouchEnd={() => (keysRef.current['s'] = false)}>▼</button>
          <button style={mobileBtn()} onTouchStart={() => (keysRef.current['d'] = true)} onTouchEnd={() => (keysRef.current['d'] = false)}>▶</button>
        </div>
        {activeMarkerId && !panel.visible && (
          <button
            style={{ ...mobileBtn(), width: 88, marginTop: 6, color: '#6EE7B7' }}
            onTouchStart={() => {
              const m = activeMarkerRef.current
              if (!m) return
              setPanel({ visible: true, marker: m.def })
              panelOpenRef.current = true
              setDiscovered(prev => {
                if (prev.has(m.def.id)) return prev
                const next = new Set(prev)
                next.add(m.def.id)
                return next
              })
            }}
          >
            ENTER
          </button>
        )}
      </div>

      {/* Keyboard indicators */}
      <div style={{ position: 'absolute', bottom: '1.25rem', right: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, pointerEvents: 'none' }}>
        <KeyCap label="W" active={activeKeys.w} />
        <div style={{ display: 'flex', gap: 3 }}>
          <KeyCap label="A" active={activeKeys.a} />
          <KeyCap label="S" active={activeKeys.s} />
          <KeyCap label="D" active={activeKeys.d} />
        </div>
      </div>

      {/* Content panel */}
      {panel.visible && panel.marker && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
          animation: 'fadeIn 0.25s ease',
        }}>
          {(() => {
            const color = `#${panel.marker.color.toString(16).padStart(6, '0')}`
            const c = panel.marker.content
            return (
              <div style={{
                background: 'rgba(10,10,20,0.95)',
                border: `1px solid ${color}33`,
                borderTop: `3px solid ${color}`,
                borderRadius: 16,
                padding: '2rem 2.25rem',
                maxWidth: 460,
                width: '90%',
                fontFamily: "'DM Sans', sans-serif",
                animation: 'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
              }}>
                <p style={{ color, fontSize: '0.7rem', letterSpacing: '0.18em', marginBottom: '0.6rem', fontFamily: "'Syne', sans-serif" }}>
                  {c.subtitle.toUpperCase()}
                </p>
                <h2 style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.85rem', fontFamily: "'Syne', sans-serif", lineHeight: 1.15 }}>
                  {c.title}
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.92rem', lineHeight: 1.7, marginBottom: '1.25rem' }}>
                  {c.body}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.5rem' }}>
                  {c.tags.map(tag => (
                    <span key={tag} style={{
                      padding: '0.25rem 0.7rem',
                      background: `${color}18`,
                      border: `1px solid ${color}33`,
                      borderRadius: 100,
                      fontSize: '0.75rem',
                      color,
                      fontFamily: "'Syne', sans-serif",
                      fontWeight: 500,
                    }}>{tag}</span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <a
                    href={c.cta.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '0.65rem 1.4rem', background: color, color: '#000',
                      borderRadius: 8, textDecoration: 'none', fontSize: '0.85rem',
                      fontFamily: "'Syne', sans-serif", fontWeight: 700, letterSpacing: '0.02em',
                    }}
                  >
                    {c.cta.label}
                  </a>
                  <button
                    onClick={closePanel}
                    style={{
                      padding: '0.65rem 1.4rem', background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)',
                      borderRadius: 8, fontSize: '0.85rem', fontFamily: "'Syne', sans-serif",
                      fontWeight: 500, cursor: 'pointer', letterSpacing: '0.02em',
                    }}
                  >
                    Keep driving
                  </button>
                </div>
                <p style={{ marginTop: '1rem', fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>
                  ESC OR ENTER TO RESUME
                </p>
              </div>
            )
          })()}
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { transform:translateY(24px) scale(0.97); opacity:0 } to { transform:translateY(0) scale(1); opacity:1 } }
        @keyframes pulse { 0%,100% { transform:translate(-50%,-100%) translateY(0) } 50% { transform:translate(-50%,-100%) translateY(-6px) } }
      `}</style>
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function setupWheels(model: THREE.Object3D): Array<{ obj: THREE.Object3D; axis: THREE.Vector3 }> {
  const wheelMeshes: THREE.Mesh[] = []
  model.traverse(o => {
    const m = o as THREE.Mesh
    if (m.isMesh && /wheel|tire|tyre|rim/i.test(m.name)) wheelMeshes.push(m)
  })
  const out: Array<{ obj: THREE.Object3D; axis: THREE.Vector3 }> = []
  for (const w of wheelMeshes) {
    w.geometry.computeBoundingBox()
    const bbox = w.geometry.boundingBox!
    const center = new THREE.Vector3()
    bbox.getCenter(center)
    const dims = new THREE.Vector3()
    bbox.getSize(dims)
    // Wheel axis = shortest local dimension
    const axis = new THREE.Vector3(1, 0, 0)
    if (dims.x <= dims.y && dims.x <= dims.z) axis.set(1, 0, 0)
    else if (dims.y <= dims.x && dims.y <= dims.z) axis.set(0, 1, 0)
    else axis.set(0, 0, 1)
    w.geometry.translate(-center.x, -center.y, -center.z)
    const compensation = center.clone().applyQuaternion(w.quaternion).multiply(w.scale)
    w.position.add(compensation)
    out.push({ obj: w, axis })
  }
  return out
}

function KeyCap({ label, active }: { label: string; active: boolean }) {
  return (
    <div style={{
      width: 26, height: 26, borderRadius: 5,
      border: `1px solid ${active ? 'rgba(110,231,183,0.7)' : 'rgba(255,255,255,0.12)'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, color: active ? '#6EE7B7' : 'rgba(255,255,255,0.25)',
      fontFamily: 'monospace', background: active ? 'rgba(110,231,183,0.08)' : 'transparent',
      transition: 'all 0.1s',
    }}>{label}</div>
  )
}

function mobileBtn(): React.CSSProperties {
  return {
    width: 44, height: 44, borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(0,0,0,0.5)',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    userSelect: 'none', WebkitUserSelect: 'none',
  }
}

const startStyles: Record<string, React.CSSProperties> = {
  root: {
    width: '100%', height: '100vh', background: '#0a0a14',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: '2rem', fontFamily: "'Syne', sans-serif",
  },
  eyebrow: { color: '#6EE7B7', fontSize: '0.75rem', letterSpacing: '0.2em', marginBottom: '1rem' },
  title: { color: '#fff', fontSize: 'clamp(2.5rem, 6vw, 5rem)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: '0.75rem' },
  subtitle: { color: 'rgba(255,255,255,0.4)', fontSize: '1rem', fontWeight: 300 },
  cta: {
    padding: '0.9rem 2.5rem', background: '#6EE7B7', color: '#000',
    border: 'none', borderRadius: 8, fontSize: '1rem',
    fontFamily: "'Syne', sans-serif", fontWeight: 700, letterSpacing: '0.04em',
    cursor: 'pointer', transition: 'transform 0.2s',
  },
  hint: { color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', letterSpacing: '0.08em' },
}
