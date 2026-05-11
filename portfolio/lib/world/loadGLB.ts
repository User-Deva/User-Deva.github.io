import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export interface LoadOpts {
  scale?: number
  rotY?: number
  position?: { x?: number; y?: number; z?: number }
  castShadow?: boolean
  receiveShadow?: boolean
}

export interface LoadProgress {
  url: string
  loaded: number
  total: number
}

export type ProgressHandler = (p: LoadProgress) => void

const sharedLoader = new GLTFLoader()

export function loadGLB(
  url: string,
  opts: LoadOpts = {},
  onProgress?: ProgressHandler,
): Promise<THREE.Group> {
  const {
    scale = 1,
    rotY = 0,
    position = {},
    castShadow = true,
    receiveShadow = true,
  } = opts
  return new Promise((resolve, reject) => {
    sharedLoader.load(
      url,
      gltf => {
        const group = gltf.scene
        group.scale.setScalar(scale)
        group.rotation.y = rotY
        group.position.set(position.x ?? 0, position.y ?? 0, position.z ?? 0)
        group.traverse(o => {
          const m = o as THREE.Mesh
          if (m.isMesh) {
            m.castShadow = castShadow
            m.receiveShadow = receiveShadow
            const mat = m.material as THREE.Material | undefined
            if (mat) mat.side = THREE.FrontSide
          }
        })
        resolve(group)
      },
      e => onProgress?.({ url, loaded: e.loaded, total: e.total || 0 }),
      err => reject(err),
    )
  })
}

export function disposeGroup(group: THREE.Object3D) {
  group.traverse(o => {
    const m = o as THREE.Mesh
    if (m.isMesh) {
      m.geometry?.dispose()
      const mat = m.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(mat)) mat.forEach(x => x.dispose())
      else mat?.dispose()
    }
  })
}
