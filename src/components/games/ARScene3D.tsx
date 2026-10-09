import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

export type CheckpointGameType = 'pipe' | 'wires' | 'power' | 'memory' | 'sort' | 'filter' | 'reactor'
export type SceneState = {
  pipeTurns: number[]
  wireSource: string | null
  wires: Record<string, string>
  breakers: boolean[]
  memoryStarted: boolean
  memoryInput: string[]
  packets: number[]
  vents: boolean[]
  reactor: number[]
  done: boolean
}

type Props = {
  gameType: CheckpointGameType
  locationIndex: number
  anchored: boolean
  state: SceneState
  onAction: (action: string) => void
}

const gameColors = ['#17d9ff', '#ff526f', '#a4ff35', '#ff9c31', '#b274ff', '#30efaa', '#ff49cf']
const wireColors: Record<string, number> = { coral: 0xff4565, blue: 0x24c9ff, gold: 0xffd535 }
const packetColors = [0xffd347, 0x36ebff, 0xff5aa2, 0x9e6bff]

function material(color: number, emissive = color, opacity = 1) {
  return new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: .78, metalness: .28, roughness: .3, transparent: opacity < 1, opacity, side: THREE.DoubleSide })
}

function addMesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, mat: THREE.Material, position: [number, number, number], action?: string, scale?: number | [number, number, number]) {
  const mesh = new THREE.Mesh(geometry, mat)
  mesh.position.set(...position)
  if (typeof scale === 'number') mesh.scale.setScalar(scale)
  else if (scale) mesh.scale.set(...scale)
  if (action) mesh.userData.action = action
  parent.add(mesh)
  return mesh
}

function addTube(parent: THREE.Object3D, points: THREE.Vector3[], color: number, radius = .09, action?: string) {
  const curve = new THREE.CatmullRomCurve3(points)
  return addMesh(parent, new THREE.TubeGeometry(curve, Math.max(16, points.length * 9), radius, 10, false), material(color), [0, 0, 0], action)
}

function makeText(text: string, color = '#ffffff') {
  const textureCanvas = document.createElement('canvas')
  textureCanvas.width = 512
  textureCanvas.height = 128
  const context = textureCanvas.getContext('2d')!
  context.clearRect(0, 0, 512, 128)
  context.font = '900 60px system-ui, sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.shadowColor = color
  context.shadowBlur = 24
  context.fillStyle = color
  context.fillText(text, 256, 64)
  const texture = new THREE.CanvasTexture(textureCanvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }))
  sprite.scale.set(1.42, .36, 1)
  return sprite
}

function createBeacon(parent: THREE.Object3D, hueColor: number, anchored: boolean, onAction: (action: string) => void) {
  const group = new THREE.Group()
  group.position.set(0, 1.4, 0)
  group.userData.action = 'beacon'
  parent.add(group)
  const crystalMaterial = new THREE.MeshPhysicalMaterial({ color: hueColor, emissive: hueColor, emissiveIntensity: .3, roughness: .22, metalness: .22, transmission: .04, transparent: true, opacity: .98, flatShading: true })
  const crystal = addMesh(group, new THREE.OctahedronGeometry(.79, 0), crystalMaterial, [0, .18, 0], 'beacon')
  crystal.rotation.y = Math.PI / 4
  addMesh(group, new THREE.ConeGeometry(.31, .27, 6), material(0x6df6ff), [0, -.84, 0])
  const base = addMesh(group, new THREE.CylinderGeometry(.39, .5, .2, 6), material(0x152745, hueColor), [0, -1.03, 0])
  base.rotation.y = Math.PI / 6
  const upperBase = addMesh(group, new THREE.CylinderGeometry(.27, .36, .16, 6), material(hueColor), [0, -.87, 0])
  upperBase.rotation.y = Math.PI / 6
  const orbit = addMesh(group, new THREE.TorusGeometry(1.02, .018, 8, 100), new THREE.MeshBasicMaterial({ color: 0xb8ffff, transparent: true, opacity: .8 }), [0, -.05, 0])
  orbit.rotation.set(.42, -.3, -.35)
  const orbit2 = addMesh(group, new THREE.TorusGeometry(.87, .012, 8, 100), new THREE.MeshBasicMaterial({ color: hueColor, transparent: true, opacity: .88 }), [0, -.05, 0])
  orbit2.rotation.set(-.55, .4, .55)
  addMesh(group, new THREE.SphereGeometry(.09, 18, 14), material(0xffe95c), [-.82, .13, .35], undefined, 1)
  addMesh(group, new THREE.SphereGeometry(.075, 18, 14), material(0xff4faf), [.79, -.18, -.15])
  const halo = new THREE.PointLight(hueColor, 4, 4)
  halo.position.set(0, .2, 1)
  group.add(halo)
  group.userData.update = (time: number) => {
    if (!anchored) {
      group.position.y = 1.4 + Math.sin(time * 1.2) * .11
      group.rotation.y = Math.sin(time * .5) * .12
      orbit.rotation.z += .002
      orbit2.rotation.y += .0025
    }
  }
  group.traverse((child) => { if (child instanceof THREE.Mesh) child.userData.action = 'beacon' })
  return group
}

function makeScene(gameType: CheckpointGameType, locationIndex: number, anchored: boolean, state: SceneState, action: (action: string) => void) {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(44, 1, .1, 80)
  camera.position.set(0, .25, 9.2)
  camera.lookAt(0, -.1, 0)
  scene.add(new THREE.HemisphereLight(0x9ceeff, 0x10172e, 1.05))
  const key = new THREE.DirectionalLight(0xffffff, 1.35)
  key.position.set(-3, 6, 6)
  scene.add(key)
  const rim = new THREE.PointLight(new THREE.Color(gameColors[locationIndex]), 3.4, 12)
  rim.position.set(3, 1.7, 3)
  scene.add(rim)
  const gameGroup = new THREE.Group()
  gameGroup.position.y = .42
  scene.add(gameGroup)
  const beacon = createBeacon(scene, new THREE.Color(gameColors[locationIndex]).getHex(), anchored, action)

  // A faint projected ground ring gives each floating task depth over the real camera feed.
  if (anchored) {
    const floorGlow = new THREE.Mesh(new THREE.CircleGeometry(1.25, 48), new THREE.MeshBasicMaterial({ color: gameColors[locationIndex], transparent: true, opacity: .11, depthWrite: false, side: THREE.DoubleSide }))
    floorGlow.position.set(0, -1.72, -1.4)
    floorGlow.scale.set(1.7, .62, 1)
    floorGlow.rotation.x = -.08
    gameGroup.add(floorGlow)
  }

  if (anchored && gameType === 'pipe') {
    const tube = 0x4be9ff
    const shiny = material(tube)
    const addPipeSegment = (points: [number, number, number][], color: number, radius = .13) => {
      addTube(gameGroup, points.map((point) => new THREE.Vector3(point[0], point[1], point[2] - .17)), 0x071421, radius * 1.32)
      addTube(gameGroup, points.map((point) => new THREE.Vector3(...point)), color, radius)
      addTube(gameGroup, points.map((point) => new THREE.Vector3(point[0], point[1] + .035, point[2] + .12)), 0xffffff, .018)
    }
    // Beveled connector sockets and a coolant inlet.
    addMesh(gameGroup, new THREE.CylinderGeometry(.2, .24, .23, 12), material(0x42f0b2), [-1.92, -1.13, .05], undefined, [1, 1, 1])
    addMesh(gameGroup, new THREE.SphereGeometry(.1, 18, 14), material(0xc4ff70), [-1.92, -1.13, .2])
    addPipeSegment([[-1.82, -1.13, .03], [-1.2, -1.13, .03], [-.72, -1.13, .03]], 0xffad35, .14)
    const targets = [0, 1]
    const elbowPoints = (turns: number, index: number) => {
      const rotation = turns * Math.PI / 2
      const base = index === 0 ? [[-.42, 0], [0, 0], [0, -.42]] : [[-.42, 0], [0, 0], [0, .42]]
      return base.map(([x, y]) => [x * Math.cos(rotation) - y * Math.sin(rotation), x * Math.sin(rotation) + y * Math.cos(rotation)] as [number, number])
    }
    ;[0, 1].forEach((index) => {
      const turns = state.pipeTurns[index]
      const points = elbowPoints(turns, index)
      const x = -.72
      const y = index === 0 ? -1.13 : -2.04
      const verts = points.map(([px, py]) => new THREE.Vector3(x + px, y + py, .04))
      const color = index === 0 ? 0xff45bd : 0xb7ff31
      addTube(gameGroup, verts.map((point) => point.clone().add(new THREE.Vector3(0, 0, -.17))), 0x081524, .19)
      const pipe = addTube(gameGroup, verts, color, .145, `pipe:${index}`)
      addTube(gameGroup, verts.map((point) => point.clone().add(new THREE.Vector3(0, .035, .12))), 0xffffff, .023)
      pipe.userData.action = `pipe:${index}`
      const ring = addMesh(gameGroup, new THREE.TorusGeometry(.25, .025, 8, 20), material(turns === targets[index] ? 0x9aff4c : color), [x, y, .07], `pipe:${index}`)
      ring.userData.action = `pipe:${index}`
    })
    addPipeSegment([[-.72, -1.52, .03], [-.72, -1.66, .03]], tube, .12)
    addPipeSegment([[-.72, -2.04, .03], [-.25, -2.04, .03], [.32, -2.04, .03]], 0xffd735, .13)
    addMesh(gameGroup, new THREE.CylinderGeometry(.16, .2, .22, 10), material(0xffdf42), [.46, -2.04, .02], undefined, [1, 1, 1])
    addMesh(gameGroup, new THREE.SphereGeometry(.095, 16, 12), material(0xfff7ac), [.46, -1.9, .06])
  }

  if (anchored && gameType === 'wires') {
    const colors = ['coral', 'blue', 'gold']
    const rows = [.15, -.55, -.1 - .95]
    const targets: Record<string, string> = { coral: '2', blue: '3', gold: '1' }
    colors.forEach((wire, row) => {
      const y = rows[row]
      const col = wireColors[wire]
      const source = addMesh(gameGroup, new THREE.SphereGeometry(.22, 24, 18), material(col), [-1.18, y, .12], `source:${wire}`)
      source.scale.set(1.2, .75, .72)
      addMesh(gameGroup, new THREE.SphereGeometry(.29, 20, 12), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: state.wireSource === wire ? .62 : .18 }), [-1.18, y, -.06])
      const portIndex = Number(targets[wire]) - 1
      const targetY = rows[portIndex]
      const socket = addMesh(gameGroup, new THREE.CylinderGeometry(.19, .24, .12, 12), material(0xd2faff, col), [1.2, targetY, .13], `port:${portIndex + 1}`)
      socket.rotation.x = Math.PI / 2
      addMesh(gameGroup, new THREE.TorusGeometry(.24, .035, 8, 20), material(state.wires[wire] ? col : 0x76ebff), [1.2, targetY, .22], `port:${portIndex + 1}`)
      if (state.wires[wire]) {
        addTube(gameGroup, [new THREE.Vector3(-.95, y, .08), new THREE.Vector3(-.48, y + .1, .02), new THREE.Vector3(.25, targetY - .12, .02), new THREE.Vector3(1.2, targetY, .08)], col, .065)
        addTube(gameGroup, [new THREE.Vector3(-.95, y + .025, .13), new THREE.Vector3(-.4, y + .13, .08), new THREE.Vector3(.25, targetY - .08, .08), new THREE.Vector3(1.2, targetY + .03, .13)], 0xffffff, .012)
      }
    })
  }

  if (anchored && gameType === 'power') {
    state.breakers.forEach((on, index) => {
      const x = (index - 1) * 1.05
      addMesh(gameGroup, new THREE.BoxGeometry(.56, 1.02, .28), material(0x253f69, 0x102341), [x, -1.55, 0])
      const handle = addMesh(gameGroup, new THREE.BoxGeometry(.25, .44, .3), material(on ? 0xaaff40 : 0xff513e), [x, on ? -1.25 : -1.84, .24], `breaker:${index}`)
      handle.rotation.z = on ? -.25 : .25
      addMesh(gameGroup, new THREE.SphereGeometry(.12, 18, 12), material(on ? 0xc8ff6a : 0xff7755), [x, on ? -1.02 : -2.05, .32], `breaker:${index}`)
      const lamp = addMesh(gameGroup, new THREE.SphereGeometry(.12, 16, 12), new THREE.MeshBasicMaterial({ color: on ? 0x9eff31 : 0xff392c }), [x, -2.21, .22])
      const light = new THREE.PointLight(on ? 0x9eff31 : 0xff392c, on ? 1.4 : .5, 1.4)
      light.position.copy(lamp.position)
      gameGroup.add(light)
    })
  }

  if (anchored && gameType === 'memory') {
    const colors = [0x20d9ff, 0xffd739, 0xff456a]
    const names = ['CYAN', 'AMBER', 'RED', 'CYAN']
    const positions = [-1.12, 0, 1.12]
    names.forEach((name, i) => {
      const sprite = makeText(name, `#${colors[i % 3].toString(16).padStart(6, '0')}`)
      sprite.position.set(-.4 + i * .27, -.82, .1)
      sprite.scale.set(.44, .12, 1)
      gameGroup.add(sprite)
    })
    const play = addMesh(gameGroup, new THREE.IcosahedronGeometry(.17, 1), material(0xffffff, 0x7df7ff), [0, -.88, .2], 'memory:start')
    play.rotation.set(.4, .2, .1)
    const playLight = new THREE.PointLight(0x8efbff, .65, 1.1)
    playLight.position.set(0, -.75, .5); gameGroup.add(playLight)
    positions.forEach((x, index) => {
      const color = colors[index]
      const orb = addMesh(gameGroup, new THREE.SphereGeometry(.42, 32, 24), new THREE.MeshPhysicalMaterial({ color, emissive: color, emissiveIntensity: .8, roughness: .12, metalness: .12 }), [x, -1.64, .15], `pulse:${['blue', 'gold', 'coral'][index]}`)
      orb.scale.set(1, .9, .78)
      addMesh(gameGroup, new THREE.SphereGeometry(.48, 20, 12), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .12 }), [x, -1.64, .06])
      const light = new THREE.PointLight(color, .9, 1.8)
      light.position.set(x, -1.42, .55)
      gameGroup.add(light)
    })
  }

  if (anchored && gameType === 'sort') {
    ;[3, 1, 4, 2].forEach((number, index) => {
      const x = (index - 1.5) * .82
      const cube = addMesh(gameGroup, new THREE.BoxGeometry(.58, .58, .58), new THREE.MeshPhysicalMaterial({ color: packetColors[number - 1], emissive: packetColors[number - 1], emissiveIntensity: .75, metalness: .22, roughness: .24 }), [x, -1.58 + (index % 2) * .2, .12], `packet:${number}`)
      cube.rotation.set(.3 + index * .12, .35 + index * .2, .15)
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(cube.geometry), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .9 }))
      edges.position.copy(cube.position); edges.rotation.copy(cube.rotation); edges.userData.action = `packet:${number}`
      gameGroup.add(edges)
      const label = makeText(String(number), '#ffffff')
      label.position.set(x, -1.58 + (index % 2) * .2, .55)
      label.scale.set(.34, .31, 1)
      label.userData.action = `packet:${number}`
      gameGroup.add(label)
    })
  }

  if (anchored && gameType === 'filter') {
    const colors = [0x29dfff, 0xff7037, 0xb252ff, 0x39ffb0]
    state.vents.forEach((cleared, index) => {
      const x = (index % 2) * 1.05 - .52
      const y = Math.floor(index / 2) * -.87 - 1.18
      const crystal = addMesh(gameGroup, new THREE.DodecahedronGeometry(.42, 0), new THREE.MeshPhysicalMaterial({ color: cleared ? 0xbaff7b : colors[index], emissive: cleared ? 0x39fa83 : colors[index], emissiveIntensity: .7, metalness: .22, roughness: .23, transparent: cleared, opacity: cleared ? .28 : 1 }), [x, y, .16], `vent:${index}`)
      crystal.rotation.set(index * .25, index * .35, index * -.2)
      addMesh(gameGroup, new THREE.TorusGeometry(.48, .028, 8, 30), material(colors[index]), [x, y, 0], `vent:${index}`).rotation.x = .5
      if (!cleared) {
        const glow = new THREE.PointLight(colors[index], .8, 1.4)
        glow.position.set(x, y, .7); gameGroup.add(glow)
      }
    })
  }

  if (anchored && gameType === 'reactor') {
    const colors = [0x36e7ff, 0xff52bd, 0xb871ff]
    const targets = [30, 50, 80]
    state.reactor.forEach((value, index) => {
      const x = (index - 1) * 1.13
      addMesh(gameGroup, new THREE.TorusGeometry(.48, .065, 10, 64), material(colors[index]), [x, -1.62, .08])
      addMesh(gameGroup, new THREE.TorusGeometry(.33, .025, 8, 64), new THREE.MeshBasicMaterial({ color: 0x9affe0, transparent: true, opacity: .45 }), [x, -1.62, .12])
      const angle = (value / 100) * Math.PI * 1.5 - Math.PI * .75
      const knob = addMesh(gameGroup, new THREE.SphereGeometry(.14, 20, 16), material(0xffffff, colors[index]), [x + .42 * Math.cos(angle), -1.62 + .42 * Math.sin(angle), .26], `dial:${index}`)
      const markerAngle = (targets[index] / 100) * Math.PI * 1.5 - Math.PI * .75
      addMesh(gameGroup, new THREE.SphereGeometry(.065, 16, 12), material(0xa4ff39), [x + .42 * Math.cos(markerAngle), -1.62 + .42 * Math.sin(markerAngle), .25])
      const number = makeText(String(value), '#ffffff')
      number.position.set(x, -1.62, .28); number.scale.set(.45, .2, 1); number.userData.action = `dial:${index}`
      knob.userData.action = `dial:${index}`
    })
  }

  if (state.done) {
    for (let i = 0; i < 18; i++) {
      const color = [0x35eeff, 0xffd938, 0xff55ba, 0xa8ff35][i % 4]
      const burst = addMesh(scene, new THREE.IcosahedronGeometry(.07 + Math.random() * .05, 0), material(color), [(Math.random() - .5) * 4.2, (Math.random() - .5) * 4.2, Math.random() * 1.6], undefined)
      burst.userData.burst = i
    }
  }

  return { scene, camera, beacon, interactives: gameGroup }
}

export function ARScene3D({ gameType, locationIndex, anchored, state, onAction }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef(state)
  const actionRef = useRef(onAction)
  stateRef.current = state
  actionRef.current = onAction

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
    } catch (error) {
      console.error('WebGL is unavailable for the AR scene:', error)
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
    renderer.setSize(host.clientWidth, host.clientHeight, false)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.25
    renderer.setClearColor(0x000000, 0)
    renderer.domElement.setAttribute('aria-label', 'Interactive 3D checkpoint repair scene')
    renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:none;pointer-events:auto;'
    host.appendChild(renderer.domElement)

    const { scene, camera, beacon, interactives } = makeScene(gameType, locationIndex, anchored, stateRef.current, (action) => actionRef.current(action))
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    const click = (event: PointerEvent) => {
      if (event.type === 'pointermove') return
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObjects(scene.children, true)
      const hit = hits.find((entry) => entry.object.userData.action)
      if (hit) actionRef.current(hit.object.userData.action as string)
    }
    renderer.domElement.addEventListener('pointerdown', click)
    const resize = new ResizeObserver(() => {
      if (!host.clientWidth || !host.clientHeight) return
      camera.aspect = host.clientWidth / host.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(host.clientWidth, host.clientHeight, false)
    })
    resize.observe(host)
    const clock = new THREE.Clock()
    let frame = 0
    const render = () => {
      frame = requestAnimationFrame(render)
      const time = clock.getElapsedTime()
      const updateBeacon = beacon.userData.update as ((time: number) => void) | undefined
      updateBeacon?.(time)
      interactives.children.forEach((child, index) => {
        if (child instanceof THREE.Mesh && !child.userData.action && child.geometry instanceof THREE.DodecahedronGeometry) {
          child.rotation.x += .002 + index * .00002
          child.rotation.y += .004
        }
      })
      renderer.render(scene, camera)
    }
    render()

    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      renderer.domElement.removeEventListener('pointerdown', click)
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
          object.geometry.dispose()
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          materials.forEach((item) => {
            const texture = (item as THREE.SpriteMaterial).map
            texture?.dispose()
            item.dispose()
          })
        } else if (object instanceof THREE.Sprite) {
          object.material.map?.dispose(); object.material.dispose()
        }
      })
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [gameType, locationIndex, anchored, state])

  return <div ref={hostRef} aria-label="3D AR checkpoint scene" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }} />
}
