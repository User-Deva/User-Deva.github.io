'use client'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'

// ─── Portfolio content – edit this ───────────────────────────────────────────
//
// `position.x` / `position.z` are world-space coordinates *relative to the
// .glb track*. After you load `track 1.glb` and see where the road actually
// runs, tweak each block's x/z so it sits where you want a player to drive
// through it. The block's y is computed at runtime from a downward raycast
// against the track mesh, so you don't have to set it.
const PORTFOLIO_BLOCKS = [
  {
    id: 'about',
    label: 'About',
    color: 0x6EE7B7,
    emissive: 0x1a5c45,
    position: { x: 6, z: -4 },
    content: {
      title: 'Hey, I\'m Devang',
      subtitle: 'Supply Chain Analyst',
      body: '4+ years across aerospace, e-commerce, and logistics — turning demand forecasts, ERP data, and Lean Six Sigma into measurable cost savings and OTIF gains.',
      tags: ['4+ years exp', 'Lean Six Sigma GB', 'Open to work'],
      cta: { label: 'Download Resume', href: '/DPRSC.pdf' },
    },
  },
  {
    id: 'projects',
    label: 'Case Studies',
    color: 0x818CF8,
    emissive: 0x1e1b4b,
    position: { x: -2, z: -14 },
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
    color: 0xFBBF24,
    emissive: 0x4a3200,
    position: { x: -8, z: 2 },
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
    color: 0x38BDF8,
    emissive: 0x0c2a3d,
    position: { x: 5, z: 6 },
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
    color: 0xF472B6,
    emissive: 0x3d0a20,
    position: { x: -4, z: -7 },
    content: {
      title: 'Let\'s Talk',
      subtitle: 'devangpatidar40@gmail.com',
      body: 'Open to Supply Chain Analyst, Demand Planning, and Operations roles — full-time or contract. Reach out about a role, a forecasting/inventory problem, or just to talk shop. I reply within 24 hours.',
      tags: ['Available now', 'Open to relocate', 'Full-time or contract'],
      cta: { label: 'Send Email', href: 'mailto:devangpatidar40@gmail.com' },
    },
  },
]
// ─────────────────────────────────────────────────────────────────────────────

interface PanelState {
  visible: boolean
  title: string
  subtitle: string
  body: string
  tags: string[]
  cta: { label: string; href: string }
  color: string
}

const DEFAULT_PANEL: PanelState = {
  visible: false,
  title: '',
  subtitle: '',
  body: '',
  tags: [],
  cta: { label: '', href: '' },
  color: '#6EE7B7',
}

export default function World() {
  const mountRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const frameRef = useRef<number>(0)
  const keysRef = useRef<Record<string, boolean>>({})
  const carRef = useRef({
    pos: new THREE.Vector3(0, 0, 0),
    angle: 0,
    speed: 0,
    turnSpeed: 0,
    wheelRot: 0,
  })
  const cubesRef = useRef<THREE.Mesh[]>([])
  const carGroupRef = useRef<THREE.Group | null>(null)
  const wheelsRef = useRef<Array<{ obj: THREE.Object3D; axis: THREE.Vector3 }>>([])
  const discoveredRef = useRef<Set<string>>(new Set())
  const panelOpenRef = useRef(false)

  const [panel, setPanel] = useState<PanelState>(DEFAULT_PANEL)
  const [discovered, setDiscovered] = useState(0)
  const [speed, setSpeed] = useState(0)
  const [started, setStarted] = useState(false)
  const [activeKeys, setActiveKeys] = useState({ w: false, a: false, s: false, d: false })

  const closePanel = useCallback(() => {
    setPanel(p => ({ ...p, visible: false }))
    panelOpenRef.current = false
  }, [])

  useEffect(() => {
    if (!started || !mountRef.current) return
    const mount = mountRef.current
    const W = mount.clientWidth
    const H = mount.clientHeight

    // ── Spawn ────────────────────────────────────────────────────────────────
    // The car spawns at world origin facing +z. The downward raycast against
    // track 1.glb on the first frame snaps the car onto the track surface.
    // If the .glb's road doesn't pass through (0,0,0), tweak SPAWN below.
    const SPAWN = { x: 0, z: 0, angleDeg: 0 }
    carRef.current.pos.set(SPAWN.x, 0, SPAWN.z)
    carRef.current.angle = SPAWN.angleDeg * Math.PI / 180
    carRef.current.speed = 0
    carRef.current.turnSpeed = 0

    // ── Renderer ─────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.25
    renderer.outputColorSpace = THREE.SRGBColorSpace
    mount.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // ── GLB asset loader ─────────────────────────────────────────────────────
    const gltfLoader = new GLTFLoader()
    let mounted = true

    type LoadOpts = {
      scale?: number
      rotY?: number
      yOffset?: number
      castShadow?: boolean
      receiveShadow?: boolean
    }
    const loadGLB = async (url: string, opts: LoadOpts = {}): Promise<THREE.Group | null> => {
      try {
        const gltf = await gltfLoader.loadAsync(url)
        if (!mounted) return null
        const group = gltf.scene
        const { scale = 1, rotY = 0, yOffset = 0, castShadow = true, receiveShadow = true } = opts
        group.scale.setScalar(scale)
        group.rotation.y = rotY
        group.position.y = yOffset
        group.traverse(o => {
          const m = o as THREE.Mesh
          if (m.isMesh) {
            m.castShadow = castShadow
            m.receiveShadow = receiveShadow
          }
        })
        return group
      } catch (err) {
        console.warn(`[World] failed to load GLB ${url}:`, err)
        return null
      }
    }

    // ── Scene (Mediterranean afternoon) ──────────────────────────────────────
    const scene = new THREE.Scene()
    const SKY_COLOR = 0xb6dcf2
    scene.background = new THREE.Color(SKY_COLOR)
    // Lower density so distant parts of the .glb track stay visible
    scene.fog = new THREE.FogExp2(SKY_COLOR, 0.004)
    sceneRef.current = scene

    // ── Camera ───────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 500)
    camera.position.set(0, 9, 12)
    cameraRef.current = camera

    // ── Lighting ─────────────────────────────────────────────────────────────
    scene.add(new THREE.HemisphereLight(0xfff2d8, 0x5a5048, 0.55))
    scene.add(new THREE.AmbientLight(0xfff0d8, 0.25))

    const sun = new THREE.DirectionalLight(0xfff8e0, 2.4)
    sun.position.set(40, 60, 30)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.near = 0.5
    sun.shadow.camera.far = 200
    sun.shadow.camera.left = -60; sun.shadow.camera.right = 60
    sun.shadow.camera.bottom = -60; sun.shadow.camera.top = 60
    sun.shadow.bias = -0.0005
    scene.add(sun)

    const skyFill = new THREE.DirectionalLight(0x88aacc, 0.45)
    skyFill.position.set(-30, 20, -20)
    scene.add(skyFill)

    const carLight = new THREE.PointLight(0xffe8c0, 0.35, 5)
    scene.add(carLight)

    // ── World assets (all .glb) ──────────────────────────────────────────────
    // Each `loadGLB` call below is a slot you can tweak. Set the file path,
    // scale, rotation, and position. Drop new files into /public and add
    // matching loadGLB(...) calls.

    // The track is captured into trackMesh so the animate() loop can raycast
    // against it for terrain follow + on/off-track friction.
    let trackMesh: THREE.Object3D | null = null

    // ▼▼▼ TRACK ▼▼▼ (the road surface)
    loadGLB('/burnout.glb', {
      scale: 10.0,
      rotY: 0,
      yOffset: 0,
      receiveShadow: true,
    }).then(m => {
      if (!m) return

      // Hide any static cars / vehicles / decorative rocks baked into the .glb.
      // Open DevTools → Console to see what was hidden. If the regex misses
      // some, add patterns; if it hides something you wanted, remove patterns.
      const HIDE_PATTERN = /car|vehicle|auto|sedan|hatchback|truck|van|bus|rock|stone|boulder/i
      const hidden: string[] = []
      m.traverse(o => {
        if ((o as THREE.Mesh).isMesh && HIDE_PATTERN.test(o.name)) {
          o.visible = false
          hidden.push(o.name)
        }
      })
      if (hidden.length > 0) console.log('[burnout.glb] hidden meshes:', hidden)
      else console.log('[burnout.glb] no meshes matched HIDE_PATTERN — to find names, log: m.traverse(o => o.name && console.log(o.name))')

      scene.add(m)
      trackMesh = m
      // After the track loads, re-snap each portfolio block onto the track
      // surface so they sit on the road instead of floating at y=1.
      const downcast = new THREE.Raycaster()
      const downDir = new THREE.Vector3(0, -1, 0)
      cubesRef.current.forEach(cube => {
        downcast.set(
          new THREE.Vector3(cube.position.x, cube.position.y + 200, cube.position.z),
          downDir,
        )
        const hits = downcast.intersectObject(m, true)
        if (hits.length > 0) {
          cube.position.y = hits[0].point.y + 1
          if (cube.userData.label) cube.userData.label.position.y = cube.position.y + 1.7
        }
      })
    })

    // ▼▼▼ BUILDING ▼▼▼ (single instance — clone in a forEach if you want many)
    loadGLB('/building.glb', {
      scale: 1.0,
      rotY: 0,
      yOffset: 0,
    }).then(m => {
      if (!m) return
      m.position.set(20, 0, -20) // tweak: where the building sits in the world
      scene.add(m)
    })

    // ▼▼▼ TREES ▼▼▼
    // Disabled — track 1.glb already contains foliage along the edges, and the
    // standalone trees.glb was anchored at world origin which made it overlap
    // the start/finish line as a giant "rock". Re-enable + reposition if you
    // want extra trees somewhere specific.
    // loadGLB('/trees.glb', { scale: 1.0, rotY: 0, yOffset: 0 }).then(m => {
    //   if (!m) return
    //   m.position.set(50, 0, 50) // somewhere clearly off the track
    //   scene.add(m)
    // })

    // ── Portfolio blocks (procedural neon cubes) ─────────────────────────────
    // These remain procedural — the glowing colored cubes are the discoverable
    // content markers. Their xz positions come from PORTFOLIO_BLOCKS at the top
    // of this file; their y is snapped to the track surface once track 1.glb
    // finishes loading (see the .then handler above).
    const cubes: THREE.Mesh[] = []
    PORTFOLIO_BLOCKS.forEach((block) => {
      const bx = block.position.x
      const bz = block.position.z
      const geo = new THREE.BoxGeometry(2, 2, 2)
      const mat = new THREE.MeshStandardMaterial({
        color: block.color,
        emissive: block.emissive,
        emissiveIntensity: 0.4,
        roughness: 0.25,
        metalness: 0.35,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(bx, 1, bz)
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.userData = { id: block.id, hit: false, block }
      scene.add(mesh)
      cubes.push(mesh)

      const glowLight = new THREE.PointLight(block.color, 0.6, 5)
      glowLight.position.set(bx, 0.3, bz)
      scene.add(glowLight)

      const labelCanvas = document.createElement('canvas')
      labelCanvas.width = 256; labelCanvas.height = 80
      const ctx = labelCanvas.getContext('2d')!
      ctx.clearRect(0, 0, 256, 80)
      ctx.font = 'bold 32px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillStyle = '#ffffff'
      ctx.shadowColor = `#${block.color.toString(16).padStart(6, '0')}`
      ctx.shadowBlur = 12
      ctx.fillText(block.label, 128, 52)
      const labelTex = new THREE.CanvasTexture(labelCanvas)
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(2.6, 0.8),
        new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, depthWrite: false, side: THREE.DoubleSide })
      )
      label.position.set(bx, 2.8, bz)
      scene.add(label)
      mesh.userData.label = label
    })
    cubesRef.current = cubes

    // ── Car (GTR.glb) ────────────────────────────────────────────────────────
    const carGroup = new THREE.Group()
    scene.add(carGroup)
    carGroupRef.current = carGroup

    // ▼▼▼ TWEAK CAR HERE ▼▼▼
    // scale  = visual size (1.0 default; smaller shrinks)
    // rotY   = facing direction; 0 means model's +z is forward
    // yOffset = lift/lower (use if wheels float or sink)
    loadGLB('/GTR.glb', {
      scale: 0.4,
      rotY: 0,
      yOffset: 0,
    }).then(model => {
      if (!model) return
      carGroup.add(model)
      // Wheel pivot setup: detect axle direction from bbox shortest dim,
      // recenter wheel geometry so rotation pivots around the wheel's center.
      const wheelMeshes: THREE.Mesh[] = []
      model.traverse(o => {
        const m = o as THREE.Mesh
        if (m.isMesh && /wheel|tire|tyre|rim/i.test(m.name)) wheelMeshes.push(m)
      })
      const wheelInfos: Array<{ obj: THREE.Object3D; axis: THREE.Vector3 }> = []
      wheelMeshes.forEach(w => {
        w.geometry.computeBoundingBox()
        const bbox = w.geometry.boundingBox!
        const center = new THREE.Vector3()
        bbox.getCenter(center)
        const dims = new THREE.Vector3()
        bbox.getSize(dims)
        const axis = new THREE.Vector3(1, 0, 0)
        if (dims.x <= dims.y && dims.x <= dims.z) axis.set(1, 0, 0)
        else if (dims.y <= dims.x && dims.y <= dims.z) axis.set(0, 1, 0)
        else axis.set(0, 0, 1)
        w.geometry.translate(-center.x, -center.y, -center.z)
        const compensation = center.clone()
          .applyQuaternion(w.quaternion)
          .multiply(w.scale)
        w.position.add(compensation)
        wheelInfos.push({ obj: w, axis })
      })
      wheelsRef.current = wheelInfos
    })

    // ── Input ────────────────────────────────────────────────────────────────
    // Lowercase single letters so caps-lock or shift still register (A→a etc.)
    const normKey = (k: string) => k.length === 1 ? k.toLowerCase() : k
    const onKeyDown = (e: KeyboardEvent) => { keysRef.current[normKey(e.key)] = true; e.preventDefault() }
    const onKeyUp = (e: KeyboardEvent) => { keysRef.current[normKey(e.key)] = false }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    const touchButtons: Record<string, string> = { 'btn-w': 'w', 'btn-a': 'a', 'btn-s': 's', 'btn-d': 'd' }
    Object.entries(touchButtons).forEach(([id, key]) => {
      const el = document.getElementById(id)
      if (!el) return
      el.addEventListener('touchstart', e => { e.preventDefault(); keysRef.current[key] = true }, { passive: false })
      el.addEventListener('touchend', e => { e.preventDefault(); keysRef.current[key] = false }, { passive: false })
    })

    // ── Animation loop ───────────────────────────────────────────────────────
    const CAR_MAX_SPEED = 0.20
    const CAR_ACCEL = 0.10
    const CAR_FRICTION = 0.95
    const CAR_TURN_FRICTION = 0.65
    // Safety bound — keeps the car from flying off into nothing if it somehow
    // drives outside the .glb track. Bump if your track is bigger than this.
    const BOUND = 100
    let bobT = 0
    let lastTime = performance.now()

    // Raycasting against track.glb each frame for terrain follow + on/off-track
    const raycaster = new THREE.Raycaster()
    const _down = new THREE.Vector3(0, -1, 0)
    const _rayOrigin = new THREE.Vector3()
    const _surfNormal = new THREE.Vector3(0, 1, 0)
    const _forward = new THREE.Vector3()
    const _projForward = new THREE.Vector3()
    const _right = new THREE.Vector3()
    const _basis = new THREE.Matrix4()
    const _targetQuat = new THREE.Quaternion()
    const _rollQuat = new THREE.Quaternion()
    const _Z_AXIS = new THREE.Vector3(0, 0, 1)
    // 0 = no terrain follow, 1 = snap instantly. 0.4 keeps the chassis tilt
    // smooth while making yaw (steering) feel responsive. Lower for slidier feel.
    const TERRAIN_FOLLOW_SLERP = 0.4

    function animate() {
      frameRef.current = requestAnimationFrame(animate)
      const now = performance.now()
      const dt = Math.min((now - lastTime) / 16.67, 3)
      lastTime = now

      const k = keysRef.current
      const fwd = !!(k['w'] || k['ArrowUp'])
      const bwd = !!(k['s'] || k['ArrowDown'])
      const lft = !!(k['a'] || k['ArrowLeft'])
      const rgt = !!(k['d'] || k['ArrowRight'])

      setActiveKeys({ w: fwd, a: lft, s: bwd, d: rgt })

      const car = carRef.current
      if (!panelOpenRef.current) {
        if (fwd) car.speed = Math.min(car.speed + CAR_ACCEL * dt, CAR_MAX_SPEED)
        else if (bwd) car.speed = Math.max(car.speed - CAR_ACCEL * dt, -CAR_MAX_SPEED * 0.55)
        car.speed *= Math.pow(CAR_FRICTION, dt)

        // Turn rate scales with speed but with a floor so steering still works
        // when crawling off-track or rolling slowly. Bump 0.5 lower for arcade-ier
        // feel, raise toward 0.0 for a more grounded "needs speed to turn" car.
        const speedFactor =Math.max(0.5, Math.abs(car.speed) / CAR_MAX_SPEED)
        const turnAmt = 0.048 * speedFactor * dt
        if (lft) car.turnSpeed += turnAmt
        if (rgt) car.turnSpeed -= turnAmt
        car.turnSpeed *= Math.pow(CAR_TURN_FRICTION, dt)
        if (Math.abs(car.speed) > 0.001) car.angle += car.turnSpeed * Math.sign(car.speed)

        const dx = Math.sin(car.angle) * car.speed
        const dz = Math.cos(car.angle) * car.speed
        const nextPos = car.pos.clone().add(new THREE.Vector3(dx * dt, 0, dz * dt))

        // Free movement; off-track friction is applied below based on raycast result.
        car.pos.copy(nextPos)
        car.pos.x = Math.max(-BOUND + 0.6, Math.min(BOUND - 0.6, car.pos.x))
        car.pos.z = Math.max(-BOUND + 0.6, Math.min(BOUND - 0.6, car.pos.z))
      }

      if (carGroupRef.current) {
        bobT += 0.12 * dt
        const bob = Math.abs(car.speed) > 0.005 ? Math.sin(bobT * 9) * 0.015 : 0
        const lean = car.turnSpeed * Math.sign(car.speed) * -6 * 0.06

        let surfaceY = 0
        let onTrack = false
        _surfNormal.set(0, 1, 0)

        if (trackMesh) {
          // Origin: well above the car — handles tall .glb terrain elevations.
          _rayOrigin.set(car.pos.x, car.pos.y + 50, car.pos.z)
          raycaster.set(_rayOrigin, _down)
          const hits = raycaster.intersectObject(trackMesh, true)
          if (hits.length > 0) {
            const hit = hits[0]
            surfaceY = hit.point.y
            onTrack = true
            if (hit.face) {
              _surfNormal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld).normalize()
            }
          }
        }

        // Off-track penalty (skipped while track.glb is still loading)
        if (trackMesh && !onTrack) {
          car.speed *= Math.pow(0.88, dt)
        }

        carGroupRef.current.position.set(car.pos.x, surfaceY + 0.05 + bob, car.pos.z)

        // Build target orientation: forward (yaw) projected onto surface plane,
        // up = surface normal, plus a roll for body lean during turns.
        _forward.set(Math.sin(car.angle), 0, Math.cos(car.angle))
        _projForward.copy(_forward).addScaledVector(_surfNormal, -_forward.dot(_surfNormal)).normalize()
        _right.crossVectors(_surfNormal, _projForward).normalize()
        _basis.makeBasis(_right, _surfNormal, _projForward)
        _targetQuat.setFromRotationMatrix(_basis)
        _rollQuat.setFromAxisAngle(_Z_AXIS, lean)
        _targetQuat.multiply(_rollQuat)
        carGroupRef.current.quaternion.slerp(_targetQuat, TERRAIN_FOLLOW_SLERP)

        // Spin wheels around their detected axles
        const wheelDelta = car.speed * dt * 3.5
        wheelsRef.current.forEach(({ obj, axis }) => obj.rotateOnAxis(axis, wheelDelta))
      }

      // Animate cubes & check discovery
      const now2 = Date.now()
      cubesRef.current.forEach(cube => {
        if (!cube.userData.hit) {
          cube.rotation.y += 0.012 * dt
          cube.position.y += Math.sin(now2 * 0.0018 + cube.position.x) * 0.001
        } else {
          cube.rotation.y += 0.003 * dt
        }
        if (cube.userData.label) {
          cube.userData.label.position.y = cube.position.y + 1.7
          cube.userData.label.lookAt(camera.position)
        }
        if (!panelOpenRef.current && !cube.userData.hit) {
          const dx = car.pos.x - cube.position.x
          const dz = car.pos.z - cube.position.z
          if (Math.sqrt(dx * dx + dz * dz) < 1.6) {
            cube.userData.hit = true
            car.speed *= -0.5
            const mat = cube.material as THREE.MeshStandardMaterial
            mat.emissiveIntensity = 1.2
            setTimeout(() => { mat.emissiveIntensity = 0.4 }, 400)

            const b = cube.userData.block as typeof PORTFOLIO_BLOCKS[0]
            discoveredRef.current.add(b.id)
            setDiscovered(discoveredRef.current.size)
            setPanel({
              visible: true,
              title: b.content.title,
              subtitle: b.content.subtitle,
              body: b.content.body,
              tags: b.content.tags,
              cta: b.content.cta,
              color: `#${b.color.toString(16).padStart(6, '0')}`,
            })
            panelOpenRef.current = true
          }
        }
      })

      // Camera follow (uses carGroup's actual y so camera tracks elevation)
      const camDist = 9
      const camHeight = 7
      const carWorldY = carGroupRef.current ? carGroupRef.current.position.y : 0
      const targetCamX = car.pos.x + Math.sin(car.angle) * -camDist
      const targetCamZ = car.pos.z + Math.cos(car.angle) * -camDist
      camera.position.x += (targetCamX - camera.position.x) * 0.07 * dt
      camera.position.y += (carWorldY + camHeight - camera.position.y) * 0.07 * dt
      camera.position.z += (targetCamZ - camera.position.z) * 0.07 * dt
      camera.lookAt(car.pos.x, carWorldY + 0.5, car.pos.z)

      setSpeed(Math.round(Math.abs(car.speed) * 1000))
      renderer.render(scene, camera)
    }

    animate()

    // ── Resize ───────────────────────────────────────────────────────────────
    const onResize = () => {
      if (!mount) return
      const w = mount.clientWidth, h = mount.clientHeight
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
    }
  }, [started])

  // ── Loading screen ──────────────────────────────────────────────────────────
  if (!started) {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        background: '#0a0a14',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2rem',
        fontFamily: "'Syne', sans-serif",
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#6EE7B7', fontSize: '0.75rem', letterSpacing: '0.2em', marginBottom: '1rem' }}>
            PORTFOLIO
          </p>
          <h1 style={{ color: '#fff', fontSize: 'clamp(2.5rem, 6vw, 5rem)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: '0.75rem' }}>
            Devang Patidar
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1rem', fontWeight: 300 }}>
            Drive the track. Hit the blocks. Discover the supply chain.
          </p>
        </div>
        <button
          onClick={() => setStarted(true)}
          style={{
            padding: '0.9rem 2.5rem',
            background: '#6EE7B7',
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            letterSpacing: '0.04em',
            cursor: 'pointer',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          Enter World
        </button>
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', letterSpacing: '0.08em' }}>
          WASD or ARROW KEYS to drive
        </p>
      </div>
    )
  }

  // ── Main world UI ────────────────────────────────────────────────────────────
  return (
    <div ref={mountRef} style={{ width: '100%', height: '100vh', position: 'relative', overflow: 'hidden', background: '#0a0a14' }}>

      {/* HUD — top left */}
      <div style={{ position: 'absolute', top: '1.25rem', left: '1.25rem', fontFamily: "'DM Sans', sans-serif", pointerEvents: 'none' }}>
        <p style={{ color: '#6EE7B7', fontSize: '0.65rem', letterSpacing: '0.2em', marginBottom: '0.2rem' }}>PORTFOLIO</p>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.1rem', fontWeight: 500, letterSpacing: '-0.02em' }}>Devang Patidar</p>
      </div>

      {/* HUD — top right */}
      <div style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', textAlign: 'right', fontFamily: "'DM Mono', monospace", pointerEvents: 'none' }}>
        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.65rem', letterSpacing: '0.08em' }}>
          {discovered}/{PORTFOLIO_BLOCKS.length} DISCOVERED
        </p>
        <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.6rem', marginTop: '2px' }}>
          SPD {speed}
        </p>
      </div>

      {/* Keyboard hints */}
      <div style={{ position: 'absolute', bottom: '1.25rem', right: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', pointerEvents: 'none' }}>
        {[
          { id: 'btn-w', label: 'W', active: activeKeys.w, style: {} },
        ].map(({ id, label, active }) => (
          <div key={id} id={id} style={{
            width: 26, height: 26, borderRadius: 5,
            border: `1px solid ${active ? 'rgba(110,231,183,0.7)' : 'rgba(255,255,255,0.12)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, color: active ? '#6EE7B7' : 'rgba(255,255,255,0.25)',
            fontFamily: 'monospace', background: active ? 'rgba(110,231,183,0.08)' : 'transparent',
            transition: 'all 0.1s',
          }}>{label}</div>
        ))}
        <div style={{ display: 'flex', gap: 3 }}>
          {[
            { id: 'btn-a', label: 'A', active: activeKeys.a },
            { id: 'btn-s', label: 'S', active: activeKeys.s },
            { id: 'btn-d', label: 'D', active: activeKeys.d },
          ].map(({ id, label, active }) => (
            <div key={id} id={id} style={{
              width: 26, height: 26, borderRadius: 5,
              border: `1px solid ${active ? 'rgba(110,231,183,0.7)' : 'rgba(255,255,255,0.12)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, color: active ? '#6EE7B7' : 'rgba(255,255,255,0.25)',
              fontFamily: 'monospace', background: active ? 'rgba(110,231,183,0.08)' : 'transparent',
              transition: 'all 0.1s',
            }}>{label}</div>
          ))}
        </div>
      </div>

      {/* Mobile controls */}
      <div style={{
        position: 'absolute', bottom: '1.25rem', left: '1.25rem',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      }}>
        <button id="btn-w" style={mobileBtn('#6EE7B7')} onTouchStart={() => (keysRef.current['w'] = true)} onTouchEnd={() => (keysRef.current['w'] = false)}>▲</button>
        <div style={{ display: 'flex', gap: 6 }}>
          <button id="btn-a" style={mobileBtn('#6EE7B7')} onTouchStart={() => (keysRef.current['a'] = true)} onTouchEnd={() => (keysRef.current['a'] = false)}>◀</button>
          <button id="btn-s" style={mobileBtn('#6EE7B7')} onTouchStart={() => (keysRef.current['s'] = true)} onTouchEnd={() => (keysRef.current['s'] = false)}>▼</button>
          <button id="btn-d" style={mobileBtn('#6EE7B7')} onTouchStart={() => (keysRef.current['d'] = true)} onTouchEnd={() => (keysRef.current['d'] = false)}>▶</button>
        </div>
      </div>

      {/* Content panel */}
      {panel.visible && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(6px)',
          animation: 'fadeIn 0.25s ease',
        }}>
          <div style={{
            background: 'rgba(10,10,20,0.95)',
            border: `1px solid ${panel.color}33`,
            borderTop: `3px solid ${panel.color}`,
            borderRadius: 16,
            padding: '2rem 2.25rem',
            maxWidth: 420,
            width: '90%',
            fontFamily: "'DM Sans', sans-serif",
            animation: 'slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <p style={{ color: panel.color, fontSize: '0.7rem', letterSpacing: '0.18em', marginBottom: '0.6rem', fontFamily: "'Syne', sans-serif" }}>
              {panel.subtitle.toUpperCase()}
            </p>
            <h2 style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.85rem', fontFamily: "'Syne', sans-serif", lineHeight: 1.15 }}>
              {panel.title}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.92rem', lineHeight: 1.7, marginBottom: '1.25rem' }}>
              {panel.body}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.5rem' }}>
              {panel.tags.map(tag => (
                <span key={tag} style={{
                  padding: '0.25rem 0.7rem',
                  background: `${panel.color}18`,
                  border: `1px solid ${panel.color}33`,
                  borderRadius: 100,
                  fontSize: '0.75rem',
                  color: panel.color,
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 500,
                }}>{tag}</span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <a
                href={panel.cta.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '0.65rem 1.4rem',
                  background: panel.color,
                  color: '#000',
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontSize: '0.85rem',
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                }}
              >
                {panel.cta.label}
              </a>
              <button
                onClick={closePanel}
                style={{
                  padding: '0.65rem 1.4rem',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.6)',
                  borderRadius: 8,
                  fontSize: '0.85rem',
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 500,
                  cursor: 'pointer',
                  letterSpacing: '0.02em',
                }}
              >
                Keep driving
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { transform:translateY(24px) scale(0.97); opacity:0 } to { transform:translateY(0) scale(1); opacity:1 } }
      `}</style>
    </div>
  )
}

function mobileBtn(color: string): React.CSSProperties {
  return {
    width: 44, height: 44, borderRadius: 10,
    border: `1px solid rgba(255,255,255,0.15)`,
    background: 'rgba(0,0,0,0.5)',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    userSelect: 'none', WebkitUserSelect: 'none',
  }
}
