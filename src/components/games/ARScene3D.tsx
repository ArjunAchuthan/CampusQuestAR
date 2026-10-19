import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

export type CheckpointGameType = 'pipe' | 'wires' | 'mirror' | 'drone' | 'cargo' | 'pulse' | 'toss'
export type SceneState = {
  pipeTurns: number[]
  wireSource: string | null
  wires: Record<string, string>
  mirrors: number[]
  droneProgress: number
  cargoSource: number | null
  cargoDocked: boolean[]
  pulseProgress: number
  pulseStep: number
  pulseMode: 'intro' | 'watch' | 'input'
  tossProgress: number
  lastToss: { lane: number; power: number; hit: boolean; missType: 'short' | 'overpowered' | 'wrong-ring' | null } | null
  done: boolean
}

type Props = {
  gameType: CheckpointGameType
  locationIndex: number
  screenSpace?: boolean
  anchored: boolean
  state: SceneState
  onAction: (action: string) => void
  onARState: (state: 'checking' | 'unsupported' | 'ready' | 'searching' | 'placed' | 'error', message?: string) => void
  onARPlaced: (placed: boolean) => void
  startARRef: React.MutableRefObject<(() => Promise<void>) | null>
}

type SceneBundle = { scene: THREE.Scene; camera: THREE.PerspectiveCamera; interactives: THREE.Group }

const gameColors = ['#17d9ff', '#ff526f', '#a4ff35', '#ff9c31', '#b274ff', '#30efaa', '#ff49cf']
const wireColors: Record<string, number> = { coral: 0xff4565, blue: 0x24c9ff, gold: 0xffd535, lime: 0x9bff48 }
const cargoColors = [0x24c9ff, 0xff4565, 0xffd535, 0x9bff48]
const droneSequence = ['cyan', 'gold', 'coral']

function cargoShape(index: number) {
  if (index === 0) return new THREE.SphereGeometry(.28, 24, 18)
  if (index === 1) return new THREE.IcosahedronGeometry(.3, 1)
  if (index === 2) return new THREE.BoxGeometry(.48, .48, .48)
  return new THREE.DodecahedronGeometry(.3, 0)
}

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
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 128
  const context = canvas.getContext('2d')!
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.font = '900 60px system-ui, sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.shadowColor = color
  context.shadowBlur = 24
  context.fillStyle = color
  context.fillText(text, 256, 64)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }))
  sprite.scale.set(1.42, .36, 1)
  return sprite
}

function createBeacon(parent: THREE.Object3D, hueColor: number, anchored: boolean, verticalOffset: number) {
  const group = new THREE.Group()
  group.position.set(0, verticalOffset, 0)
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
  addMesh(group, new THREE.SphereGeometry(.09, 18, 14), material(0xffe95c), [-.82, .13, .35])
  addMesh(group, new THREE.SphereGeometry(.075, 18, 14), material(0xff4faf), [.79, -.18, -.15])
  const halo = new THREE.PointLight(hueColor, 4, 4)
  halo.position.set(0, .2, 1)
  group.add(halo)
  group.userData.update = (time: number) => {
    if (!anchored) {
      group.position.y = verticalOffset + Math.sin(time * 1.2) * .11
      group.rotation.y = Math.sin(time * .5) * .12
      orbit.rotation.z += .002
      orbit2.rotation.y += .0025
    }
  }
  group.traverse((child) => { if (child instanceof THREE.Mesh) child.userData.action = 'beacon' })
  return group
}

function makeScene(gameType: CheckpointGameType, locationIndex: number, anchored: boolean, state: SceneState): SceneBundle {
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
  const worldRoot = new THREE.Group()
  worldRoot.name = 'world-anchored-game'
  scene.add(worldRoot)
  worldRoot.add(gameGroup)
  const reticle = new THREE.Group()
  reticle.name = 'ar-surface-reticle'
  reticle.userData.arReticle = true
  reticle.visible = false
  const reticleRing = new THREE.Mesh(new THREE.RingGeometry(.075, .095, 40), new THREE.MeshBasicMaterial({ color: 0x70f5ff, transparent: true, opacity: .9, side: THREE.DoubleSide, depthWrite: false }))
  reticleRing.rotation.x = -Math.PI / 2
  reticle.add(reticleRing)
  const reticleDot = new THREE.Mesh(new THREE.CircleGeometry(.025, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }))
  reticleDot.rotation.x = -Math.PI / 2
  reticleDot.position.y = .002
  reticle.add(reticleDot)
  scene.add(reticle)
  const beacon = createBeacon(scene, new THREE.Color(gameColors[locationIndex]).getHex(), anchored, gameType === 'pipe' ? 1.8 : 1.4)
  worldRoot.add(beacon)
  // The beacon is a discovery target; once locked, keep the puzzle unobstructed.
  beacon.visible = !anchored

  if (anchored) {
    const floorGlow = new THREE.Mesh(new THREE.CircleGeometry(1.25, 48), new THREE.MeshBasicMaterial({ color: gameColors[locationIndex], transparent: true, opacity: .11, depthWrite: false, side: THREE.DoubleSide }))
    floorGlow.position.set(0, -1.72, -1.4)
    floorGlow.scale.set(1.7, .62, 1)
    floorGlow.rotation.x = -.08
    gameGroup.add(floorGlow)
  }

  if (anchored && gameType === 'pipe') {
    const pipeGroup = new THREE.Group()
    pipeGroup.position.y = -.85
    gameGroup.add(pipeGroup)
    const addSegment = (points: [number, number, number][], color: number, radius = .13) => {
      addTube(pipeGroup, points.map(([x, y, z]) => new THREE.Vector3(x, y, z - .17)), 0x071421, radius * 1.32)
      addTube(pipeGroup, points.map((point) => new THREE.Vector3(...point)), color, radius)
      addTube(pipeGroup, points.map(([x, y, z]) => new THREE.Vector3(x, y + .035, z + .12)), 0xffffff, .018)
    }
    const nodes: [number, number][] = [[-.94, -1.18], [-.94, -.24], [.02, -.24], [.02, .70]]
    const targets = [0, 2, 0, 2]
    const colors = [0xff45bd, 0x43eaff, 0xb7ff31, 0xffa735]
    const elbows = (turn: number) => {
      const angle = turn * Math.PI / 2
      return [[-.43, 0], [0, 0], [0, .43]].map(([x, y]) => [x * Math.cos(angle) - y * Math.sin(angle), x * Math.sin(angle) + y * Math.cos(angle)] as [number, number])
    }
    const addCoupler = (x: number, y: number, color: number) => {
      const collar = addMesh(pipeGroup, new THREE.TorusGeometry(.145, .035, 8, 24), material(color), [x, y, .11])
      collar.rotation.x = Math.PI / 2
      addMesh(pipeGroup, new THREE.CylinderGeometry(.14, .14, .13, 12), material(0x162a40, color), [x, y, .02])
    }
    const [firstX, firstY] = nodes[0]
    addMesh(pipeGroup, new THREE.CylinderGeometry(.22, .27, .2, 12), material(0x42f0b2), [firstX - .72, firstY, .06])
    addMesh(pipeGroup, new THREE.SphereGeometry(.1, 18, 14), material(0xc4ff70), [firstX - .72, firstY, .2])
    addSegment([[firstX - .61, firstY, .03], [firstX - .43, firstY, .03]], 0xffad35, .14)
    addCoupler(firstX - .43, firstY, 0xffad35)
    nodes.forEach(([x, y], index) => {
      const turn = state.pipeTurns[index]
      const points = elbows(turn).map(([px, py]) => new THREE.Vector3(x + px, y + py, .04))
      const action = `pipe:${index}`
      addTube(pipeGroup, points.map((point) => point.clone().add(new THREE.Vector3(0, 0, -.17))), 0x081524, .2)
      addTube(pipeGroup, points, colors[index], .15, action)
      addTube(pipeGroup, points.map((point) => point.clone().add(new THREE.Vector3(0, .035, .12))), 0xffffff, .022)
      addMesh(pipeGroup, new THREE.SphereGeometry(.17, 22, 18), material(colors[index]), [x, y, .08], action)
      const valveHandle = addMesh(pipeGroup, new THREE.BoxGeometry(.5, .065, .095), material(0xeaffff, colors[index]), [x, y, .31], action)
      valveHandle.rotation.z = turn * Math.PI / 2
      valveHandle.userData.update = (time: number) => { valveHandle.rotation.z = turn * Math.PI / 2 + Math.sin(time * 1.8 + index) * .025 }
      const valveGlow = new THREE.PointLight(colors[index], turn === targets[index] ? 1.8 : .7, 1.1)
      valveGlow.position.set(x, y, .55); pipeGroup.add(valveGlow)
      valveGlow.userData.update = (time: number) => { valveGlow.intensity = (turn === targets[index] ? 1.35 : .45) + (Math.sin(time * 4 + index) + 1) * .18 }
      addMesh(pipeGroup, new THREE.TorusGeometry(.27, .026, 8, 24), material(turn === targets[index] ? 0x9aff4c : colors[index]), [x, y, .07], action)
      addMesh(pipeGroup, new THREE.TorusGeometry(.34, .012, 6, 24), new THREE.MeshBasicMaterial({ color: 0xe8fbff, transparent: true, opacity: .5 }), [x, y, -.02])
      const step = makeText(String(index + 1))
      step.position.set(x, y + .39, .22)
      step.scale.set(.2, .2, 1)
      step.userData.action = action
      pipeGroup.add(step)
      elbows(turn).filter((_, pointIndex) => pointIndex !== 1).forEach(([px, py]) => addCoupler(x + px, y + py, colors[index]))
    })
    addSegment([[firstX, firstY + .43, .03], [firstX, nodes[1][1] - .43, .03]], 0x4be9ff, .105)
    addSegment([[nodes[1][0] + .43, nodes[1][1], .03], [nodes[2][0] - .43, nodes[2][1], .03]], 0x4be9ff, .105)
    addSegment([[nodes[2][0], nodes[2][1] + .43, .03], [nodes[3][0], nodes[3][1] - .43, .03]], 0x4be9ff, .105)
    addSegment([[nodes[3][0] + .43, nodes[3][1], .03], [nodes[3][0] + .78, nodes[3][1], .03]], 0xffd735, .13)
    addMesh(pipeGroup, new THREE.CylinderGeometry(.17, .21, .22, 10), material(0xffdf42), [nodes[3][0] + .84, nodes[3][1], .02])
    addMesh(pipeGroup, new THREE.SphereGeometry(.095, 16, 12), material(0xfff7ac), [nodes[3][0] + .84, nodes[3][1] + .15, .06])
    const firstBlocked = state.pipeTurns.findIndex((turn, index) => turn !== targets[index])
    const liveNodes = firstBlocked < 0 ? nodes : nodes.slice(0, firstBlocked + 1)
    const flowPoints = [new THREE.Vector3(firstX - .72, firstY, .18), ...liveNodes.map(([x, y]) => new THREE.Vector3(x, y, .18))]
    if (firstBlocked < 0) flowPoints.push(new THREE.Vector3(nodes[3][0] + .84, nodes[3][1], .18))
    const coolantPath = new THREE.CatmullRomCurve3(flowPoints)
    for (let i = 0; i < 3; i++) {
      const droplet = addMesh(pipeGroup, new THREE.SphereGeometry(.075, 16, 12), new THREE.MeshBasicMaterial({ color: i === 0 ? 0xffffff : 0x9affff, transparent: true, opacity: .92 }), [flowPoints[0].x, flowPoints[0].y, .2])
      droplet.userData.update = (time: number) => droplet.position.copy(coolantPath.getPoint((time * .16 + i / 3) % 1))
    }
    const flowLight = new THREE.PointLight(0x45eaff, 2.4, 1.8)
    pipeGroup.add(flowLight)
    flowLight.userData.update = (time: number) => flowLight.position.copy(coolantPath.getPoint((time * .16) % 1))
  }

  if (anchored && gameType === 'wires') {
    const rows = [.35, -.25, -.85, -1.45]
    const order = ['coral', 'blue', 'gold', 'lime']
    const targets: Record<string, number> = { coral: 2, blue: 0, gold: 3, lime: 1 }
    addMesh(gameGroup, new THREE.BoxGeometry(.13, 2.72, .22), material(0x14263b, 0x23637b), [-1.78, -.55, -.34])
    addMesh(gameGroup, new THREE.BoxGeometry(.13, 2.72, .22), material(0x14263b, 0x23637b), [1.78, -.55, -.34])
    order.forEach((color, sourceIndex) => {
      const y = rows[sourceIndex]
      const hex = wireColors[color]
      const sourceAction = `source:${color}`
      const source = addMesh(gameGroup, new THREE.SphereGeometry(.23, 24, 18), material(hex), [-1.52, y, .15], sourceAction, [1.3, .82, .8])
      source.userData.action = sourceAction
      source.userData.dragHome = source.position.clone()
      addMesh(gameGroup, new THREE.SphereGeometry(.32, 20, 12), new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: state.wireSource === color ? .52 : .13 }), [-1.52, y, .02])
      const sourceCollar = addMesh(gameGroup, new THREE.TorusGeometry(.2, .035, 8, 24), material(hex), [-1.52, y, .19], sourceAction)
      sourceCollar.userData.update = (time: number) => { sourceCollar.rotation.z = time * (state.wireSource === color ? 1.3 : .34); sourceCollar.scale.setScalar(state.wireSource === color ? 1.12 + Math.sin(time * 6) * .07 : 1) }
      const port = targets[color]
      const portY = rows[port]
      const portAction = `port:${port}`
      const plate = addMesh(gameGroup, new THREE.CylinderGeometry(.22, .27, .18, 12), material(0x162a40, hex), [1.52, portY, .12], portAction)
      plate.rotation.x = Math.PI / 2
      addMesh(gameGroup, new THREE.CylinderGeometry(.075, .11, .13, 10), material(0x9ab2c8, hex), [-1.78, y, .12], sourceAction, [1, 1, 1.6])
      const socket = addMesh(gameGroup, new THREE.TorusGeometry(.25, .045, 8, 24), material(state.wires[color] ? hex : 0xd8f7ff, hex), [1.52, portY, .24], portAction)
      socket.userData.action = portAction
      socket.userData.update = (time: number) => { socket.rotation.z = time * (state.wires[color] ? .62 : .2); if (state.wires[color]) socket.scale.setScalar(1 + Math.sin(time * 4) * .04) }
      if (state.wires[color]) {
        const wireCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(-1.28, y, .17), new THREE.Vector3(-.78, y + .16, .28), new THREE.Vector3(.18, portY - .1, .3), new THREE.Vector3(1.52, portY, .24)])
        addTube(gameGroup, wireCurve.getPoints(30), 0x071421, .065)
        addTube(gameGroup, wireCurve.getPoints(30), hex, .095)
        addTube(gameGroup, wireCurve.getPoints(30).map((point) => point.add(new THREE.Vector3(0, .035, .055))), 0xf4ffff, .022)
        const current = addMesh(gameGroup, new THREE.SphereGeometry(.055, 14, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }), [-1.28, y, .34])
        current.userData.update = (time: number) => current.position.copy(wireCurve.getPoint((time * .32 + sourceIndex * .22) % 1)).add(new THREE.Vector3(0, 0, .07))
        const currentGlow = new THREE.PointLight(hex, 1.5, .72)
        gameGroup.add(currentGlow)
        currentGlow.userData.update = (time: number) => currentGlow.position.copy(wireCurve.getPoint((time * .32 + sourceIndex * .22) % 1))
      } else {
        const slack = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-1.38, y, .13), new THREE.Vector3(-1.12, y + .2, .26),
          new THREE.Vector3(-.88, y + .1, .32), new THREE.Vector3(-.92, y - .11, .29),
          new THREE.Vector3(-1.18, y - .2, .2), new THREE.Vector3(-1.38, y, .13),
        ])
        addTube(gameGroup, slack.getPoints(26), 0x071421, .075)
        addTube(gameGroup, slack.getPoints(26), hex, .095)
        const looseTip = addMesh(gameGroup, new THREE.CylinderGeometry(.075, .1, .18, 10), material(0xe6f6ff, hex), [-.88, y + .1, .35], sourceAction)
        looseTip.rotation.x = Math.PI / 2
        const tipRing = addMesh(gameGroup, new THREE.TorusGeometry(.085, .018, 7, 18), material(hex), [-.88, y + .1, .45], sourceAction)
        tipRing.userData.update = (time: number) => { tipRing.rotation.z = time * .7 }
      }
    })
  }

  if (anchored && gameType === 'mirror') {
    const target = [1, 3, 2]
    const colors = [0x36e7ff, 0xffd342, 0xff52bd]
    const relays = [new THREE.Vector3(-1.16, -1.03, .3), new THREE.Vector3(0, -.42, .3), new THREE.Vector3(1.16, -1.03, .3)]
    const source = new THREE.Vector3(-1.98, -1.49, .22)
    const receiver = new THREE.Vector3(1.95, -.46, .28)
    const dimPath = [source, ...relays, receiver]

    // Dim guide rails show the full route; energized sections and the moving photon show where the
    // current mirror angles are actually sending the beam.
    for (let i = 0; i < dimPath.length - 1; i++) addTube(gameGroup, [dimPath[i], dimPath[i + 1]], 0x24465b, .045)
    const addBeam = (start: THREE.Vector3, end: THREE.Vector3, color: number, phase: number) => {
      const curve = new THREE.LineCurve3(start, end)
      addMesh(gameGroup, new THREE.TubeGeometry(curve, 28, .085, 10, false), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .32, blending: THREE.AdditiveBlending, depthWrite: false }), [0, 0, 0])
      addMesh(gameGroup, new THREE.TubeGeometry(curve, 28, .027, 8, false), new THREE.MeshBasicMaterial({ color: 0xf1ffff }), [0, 0, 0])
      const photon = addMesh(gameGroup, new THREE.SphereGeometry(.09, 18, 14), new THREE.MeshBasicMaterial({ color: 0xffffff }), [start.x, start.y, start.z + .04])
      photon.userData.update = (time: number) => photon.position.copy(curve.getPoint((time * .55 + phase) % 1)).add(new THREE.Vector3(0, 0, .04))
      const bloom = new THREE.PointLight(color, 1.6, 1.1)
      gameGroup.add(bloom)
      bloom.userData.update = (time: number) => bloom.position.copy(curve.getPoint((time * .55 + phase) % 1))
    }
    addBeam(source, relays[0], 0xffa13b, 0)
    let beamContinues = true
    for (let i = 0; i < relays.length; i++) {
      const point = relays[i]
      const nextPoint = i < relays.length - 1 ? relays[i + 1] : receiver
      const aligned = state.mirrors[i] === target[i]
      if (beamContinues && aligned) addBeam(point, nextPoint, colors[i], (i + 1) * .19)
      else if (beamContinues) {
        const direction = nextPoint.clone().sub(point).normalize()
        const reflectionDelta = (state.mirrors[i] - target[i]) * Math.PI / 2
        const spillEnd = point.clone().add(direction.applyAxisAngle(new THREE.Vector3(0, 0, 1), reflectionDelta).multiplyScalar(.78))
        addBeam(point, spillEnd, 0xff553d, (i + 1) * .19)
        const spark = addMesh(gameGroup, new THREE.IcosahedronGeometry(.13, 1), material(0xff512f), [point.x, point.y, .52])
        spark.userData.update = (time: number) => { spark.rotation.x += .035; spark.rotation.y -= .027; spark.scale.setScalar(.82 + Math.sin(time * 9 + i) * .16) }
        beamContinues = false
      }

      const x = point.x
      const y = point.y
      const action = `mirror:${i}`
      const isAligned = state.mirrors[i] === target[i]
      const ring = addMesh(gameGroup, new THREE.TorusGeometry(.43, .035, 10, 48), material(isAligned ? 0xa7ff48 : colors[i]), [x, y, .02])
      ring.rotation.x = -.16
      const prism = addMesh(gameGroup, new THREE.CylinderGeometry(.29, .29, .36, 3, 1), material(colors[i], colors[i]), [x, y, .32], action)
      prism.rotation.set(Math.PI / 2, 0, state.mirrors[i] * Math.PI / 4)
      prism.userData.action = action
      const facet = addMesh(gameGroup, new THREE.CircleGeometry(.205, 3), new THREE.MeshBasicMaterial({ color: 0xe8ffff, transparent: true, opacity: .72, side: THREE.DoubleSide }), [x, y, .53], action)
      facet.rotation.z = state.mirrors[i] * Math.PI / 4
      const axle = addMesh(gameGroup, new THREE.SphereGeometry(.105, 18, 14), material(0xffffff, colors[i]), [x, y, .58], action)
      const status = makeText(isAligned ? 'LOCKED' : `TURN ${state.mirrors[i] + 1}` , isAligned ? '#b4ff52' : '#ffffff')
      status.position.set(x, y + .62, .38); status.scale.set(.58, .15, 1); status.userData.action = action; gameGroup.add(status)
      const number = makeText(String(i + 1), '#ffffff')
      number.position.set(x, y - .62, .35); number.scale.set(.22, .17, 1); number.userData.action = action; gameGroup.add(number)
      prism.userData.update = (time: number) => { prism.rotation.x = Math.PI / 2 + Math.sin(time * 1.2 + i) * .035; axle.scale.setScalar(.92 + Math.sin(time * 3 + i) * .08) }
    }
    const receiverRing = addMesh(gameGroup, new THREE.TorusGeometry(.31, .055, 10, 40), material(beamContinues ? 0xa7ff48 : 0x46586a), [receiver.x, receiver.y, .16])
    receiverRing.userData.update = (time: number) => { receiverRing.rotation.z += .012; receiverRing.scale.setScalar(.95 + Math.sin(time * 2) * .045) }
    addMesh(gameGroup, new THREE.OctahedronGeometry(.18, 1), material(beamContinues ? 0xf4ffff : 0x63748a, beamContinues ? 0xa7ff48 : 0x26384d), [receiver.x, receiver.y, .2])
    const receiverLabel = makeText('RECEIVER', '#eafffc')
    receiverLabel.position.set(receiver.x, receiver.y - .46, .25); receiverLabel.scale.set(.68, .16, 1); gameGroup.add(receiverLabel)
  }

  if (anchored && gameType === 'drone') {
    const drones = [
      { color: 'cyan', hex: 0x24dfff, x: -1.22, y: -.54, phase: .4 },
      { color: 'gold', hex: 0xffd342, x: 0, y: -.83, phase: 2.1 },
      { color: 'coral', hex: 0xff526f, x: 1.22, y: -.54, phase: 4.2 },
      { color: 'red', hex: 0xff3428, x: 0, y: -1.55, phase: 5.2 },
    ]
    drones.forEach((drone, i) => {
      const group = new THREE.Group()
      group.position.set(drone.x, drone.y, .2)
      group.userData.action = `drone:${drone.color}`
      gameGroup.add(group)
      const marked = droneSequence.indexOf(drone.color)
      const tagged = marked >= 0 && state.droneProgress > marked
      const isTarget = marked === state.droneProgress
      const body = addMesh(group, new THREE.SphereGeometry(.3, 28, 22), material(drone.hex, drone.hex), [0, 0, 0], `drone:${drone.color}`, [1.15, .72, .9])
      body.userData.action = `drone:${drone.color}`
      const cockpit = addMesh(group, new THREE.SphereGeometry(.12, 18, 14), material(0xffffff, drone.hex), [0, .02, .25], `drone:${drone.color}`)
      cockpit.scale.set(1.18, .78, .62)
      const halo = addMesh(group, new THREE.TorusGeometry(isTarget ? .56 : .45, isTarget ? .035 : .022, 10, 40), material(tagged ? 0xa8ff45 : drone.hex), [0, 0, -.05], `drone:${drone.color}`)
      halo.userData.action = `drone:${drone.color}`
      halo.rotation.x = .18
      for (const side of [-1, 1]) {
        const wing = addMesh(group, new THREE.ConeGeometry(.15, .46, 4), material(drone.hex), [side * .42, -.04, -.08], `drone:${drone.color}`)
        wing.rotation.z = side * Math.PI / 2
        const engine = addMesh(group, new THREE.CylinderGeometry(.075, .12, .3, 10), material(0x263c56, drone.hex), [side * .22, -.29, -.12], `drone:${drone.color}`)
        engine.rotation.x = Math.PI / 2
        const flare = addMesh(group, new THREE.ConeGeometry(.075, .24, 8), new THREE.MeshBasicMaterial({ color: drone.hex, transparent: true, opacity: .75 }), [side * .22, -.48, -.12])
        flare.rotation.x = Math.PI
        flare.userData.update = (time: number) => { flare.scale.setScalar(.72 + (Math.sin(time * 13 + i + side) + 1) * .19) }
      }
      const trackingRing = addMesh(group, new THREE.TorusGeometry(.68, .012, 6, 48), new THREE.MeshBasicMaterial({ color: tagged ? 0xa8ff45 : drone.hex, transparent: true, opacity: isTarget ? .8 : .34 }), [0, 0, -.14], `drone:${drone.color}`)
      trackingRing.rotation.x = .55
      const tag = marked >= 0 ? makeText(String(marked + 1), '#ffffff') : makeText('×', '#ff6255')
      tag.position.set(0, .58, .08); tag.scale.set(.24, .22, 1); tag.userData.action = `drone:${drone.color}`; group.add(tag)
      const status = makeText(tagged ? 'TAGGED' : isTarget ? 'TARGET' : 'HOSTILE', tagged ? '#baff4c' : isTarget ? '#ffffff' : '#afc1d1')
      status.position.set(0, -.69, .06); status.scale.set(.65, .13, 1); status.userData.action = `drone:${drone.color}`; group.add(status)
      const touchHalo = addMesh(group, new THREE.SphereGeometry(.54, 20, 16), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), [0, 0, -.03], `drone:${drone.color}`)
      touchHalo.userData.action = `drone:${drone.color}`
      group.userData.update = (time: number) => {
        const idleX = drone.x + Math.sin(time * 1.1 + drone.phase) * .2
        const idleY = drone.y + Math.cos(time * 1.55 + drone.phase) * .1 + Math.sin(time * .55 + i) * .035
        if (drone.color === 'red') {
          const activeTargetColor = droneSequence[Math.min(state.droneProgress, droneSequence.length - 1)]
          const chaseTarget = drones.find((candidate) => candidate.color === activeTargetColor) ?? drones[0]
          const chaseX = chaseTarget.x + Math.sin(time * 1.1 + chaseTarget.phase) * .2
          const chaseY = chaseTarget.y + Math.cos(time * 1.55 + chaseTarget.phase) * .1 + .25
          const swoop = Math.max(0, Math.sin(time * 2.25))
          group.position.x = THREE.MathUtils.lerp(idleX, chaseX + .86, swoop)
          group.position.y = THREE.MathUtils.lerp(idleY, chaseY - .72, swoop)
        } else {
          group.position.x = idleX
          group.position.y = idleY
        }
        group.rotation.y = Math.sin(time * .9 + drone.phase) * .3
        group.rotation.z = Math.sin(time * 1.35 + drone.phase) * .08
        halo.rotation.z = time * (.7 + i * .08)
        trackingRing.rotation.z = -time * (.35 + i * .05)
        if (isTarget) halo.scale.setScalar(1 + (Math.sin(time * 5) + 1) * .055)
      }
      const progressLight = new THREE.PointLight(tagged ? 0xa8ff45 : drone.hex, isTarget ? 2.2 : tagged ? 1.6 : .45, 1.8)
      progressLight.position.set(0, 0, .4); group.add(progressLight)
    })
    const scanner = addMesh(gameGroup, new THREE.TorusGeometry(1.8, .012, 6, 64), new THREE.MeshBasicMaterial({ color: 0x6beaff, transparent: true, opacity: .22 }), [0, -1.1, -.36])
    scanner.userData.update = (time: number) => { scanner.rotation.z = time * .13; scanner.scale.setScalar(1 + Math.sin(time * 1.2) * .025) }
  }

  if (anchored && gameType === 'cargo') {
    const xs = [-1.2, -.4, .4, 1.2]
    const colors = ['CYAN', 'CORAL', 'GOLD', 'LIME']
    const dockForCore = [1, 3, 0, 2]
    const transferPoints = xs.map((x) => new THREE.Vector3(x, -.3, .28))
    const dockPoints = xs.map((x) => new THREE.Vector3(x, -1.42, .28))
    addMesh(gameGroup, new THREE.BoxGeometry(3.05, .12, .28), material(0x10243b, 0x1b6b92), [0, -.93, -.12])
    addMesh(gameGroup, new THREE.BoxGeometry(3.05, .12, .28), material(0x10243b, 0x1b6b92), [0, -.04, -.12])
    for (const x of xs) {
      addMesh(gameGroup, new THREE.CylinderGeometry(.045, .045, .72, 8), material(0x2a425e, 0x1d344c), [x, -.48, -.08])
      addMesh(gameGroup, new THREE.SphereGeometry(.08, 12, 10), material(0x9ceeff), [x, -.48, .04])
    }
    state.cargoDocked.forEach((docked, i) => {
      const y = -.3
      const action = `cargo:${i}`
      const selected = state.cargoSource === i
      const mesh = addMesh(gameGroup, cargoShape(i), material(cargoColors[i]), [xs[i], y + (selected ? .12 : 0), .3], action, selected ? 1.28 : 1)
      mesh.userData.action = action
      mesh.userData.dragHome = mesh.position.clone()
      mesh.rotation.set(.25 * (i + 1), .45 * i, .18 * i)
      const halo = addMesh(gameGroup, new THREE.TorusGeometry(selected ? .46 : .38, selected ? .035 : .024, 9, 36), material(cargoColors[i]), [xs[i], y, .12], action)
      halo.userData.action = action
      halo.userData.update = (time: number) => { halo.rotation.z = time * (selected ? 1.15 : .48); halo.scale.setScalar(1 + Math.sin(time * 3 + i) * .045) }
      mesh.userData.update = (time: number) => {
        mesh.rotation.x = .25 * (i + 1) + Math.sin(time * .8 + i) * .12
        mesh.rotation.y = .45 * i + time * (selected ? .9 : .34)
        if (!mesh.userData.isDragged && !selected) mesh.position.y = y + Math.sin(time * 2.2 + i) * .035
      }
      if (docked) mesh.visible = false
      const label = makeText(colors[i], '#ffffff')
      label.position.set(xs[i], y + .52, .34); label.scale.set(.5, .12, 1); label.userData.action = action; gameGroup.add(label)
      if (selected) {
        const destination = dockPoints[dockForCore[i]]
        const path = new THREE.QuadraticBezierCurve3(transferPoints[i], new THREE.Vector3((transferPoints[i].x + destination.x) / 2, -.56, .72), destination)
        addTube(gameGroup, path.getPoints(28), cargoColors[i], .045)
        const pull = addMesh(gameGroup, new THREE.SphereGeometry(.075, 16, 12), new THREE.MeshBasicMaterial({ color: 0xf5ffff }), [transferPoints[i].x, transferPoints[i].y, .5])
        pull.userData.update = (time: number) => pull.position.copy(path.getPoint((time * .45) % 1))
      }
    })
    const order = [2, 0, 3, 1]
    order.forEach((cargoIndex, dockIndex) => {
      const x = xs[dockIndex]
      const y = -1.42
      const color = cargoColors[cargoIndex]
      const action = `dock:${dockIndex}`
      const isDocked = state.cargoDocked[cargoIndex]
      const isDestination = state.cargoSource !== null && dockForCore[state.cargoSource] === dockIndex
      const dock = addMesh(gameGroup, new THREE.CylinderGeometry(.36, .42, .17, 10), new THREE.MeshStandardMaterial({ color: 0x132339, emissive: color, emissiveIntensity: isDocked ? .2 : .34, metalness: .56, roughness: .36 }), [x, y, .03])
      dock.rotation.x = Math.PI / 2
      const ring = addMesh(gameGroup, new THREE.TorusGeometry(isDestination ? .4 : .34, isDestination ? .07 : .045, 10, 36), material(isDestination ? 0xffffff : color), [x, y, .18], action)
      ring.userData.action = action
      ring.userData.update = (time: number) => { ring.rotation.z = time * (isDestination ? 1.2 : isDocked ? .65 : .3); ring.scale.setScalar(isDestination ? 1 + (Math.sin(time * 5) + 1) * .06 : isDocked ? 1 + Math.sin(time * 3) * .025 : 1) }
      for (const side of [-1, 1]) {
        const pylon = addMesh(gameGroup, new THREE.CylinderGeometry(.035, .06, .34, 8), material(0x38516b, isDestination ? 0xa8ff45 : color), [x + side * .25, y + .26, .08])
        pylon.userData.update = (time: number) => { pylon.scale.y = .85 + (Math.sin(time * 3 + dockIndex + side) + 1) * .12 }
      }
      addMesh(gameGroup, cargoShape(cargoIndex), material(color), [x, y, .2], action, .47)
      if (isDocked) {
        const lock = addMesh(gameGroup, new THREE.TorusGeometry(.105, .018, 7, 20), new THREE.MeshBasicMaterial({ color: 0xbaff69 }), [x + .22, y + .2, .43])
        lock.userData.update = (time: number) => { lock.rotation.z = -time * .8; lock.scale.setScalar(.9 + Math.sin(time * 4 + dockIndex) * .06) }
        addMesh(gameGroup, new THREE.SphereGeometry(.035, 10, 8), new THREE.MeshBasicMaterial({ color: 0xeaffce }), [x + .22, y + .2, .44])
      }
      const dockLabel = makeText(String(dockIndex + 1), '#ffffff')
      dockLabel.position.set(x, y - .42, .22); dockLabel.scale.set(.22, .18, 1); dockLabel.userData.action = action; gameGroup.add(dockLabel)
    })
  }

  if (anchored && gameType === 'pulse') {
    const colors = [0x35e8ff, 0xff5cc8, 0xb6ff3e, 0xffb332]
    const positions: [number, number][] = [[-1.22, -.9], [-.42, -.54], [.42, -.54], [1.22, -.9]]
    const corePosition = new THREE.Vector3(0, -1.43, .2)
    const route = new THREE.CatmullRomCurve3([
      new THREE.Vector3(positions[0][0], positions[0][1], .14),
      new THREE.Vector3(positions[1][0], positions[1][1], .14),
      new THREE.Vector3(positions[2][0], positions[2][1], .14),
      new THREE.Vector3(positions[3][0], positions[3][1], .14),
    ])
    addTube(gameGroup, route.getPoints(48), 0x183a55, .035)
    const core = addMesh(gameGroup, new THREE.DodecahedronGeometry(.36, 1), material(0xdafaff, 0x31dfff), [corePosition.x, corePosition.y, corePosition.z])
    core.userData.update = (time: number) => { core.rotation.x = time * .24; core.rotation.y = time * .42; core.scale.setScalar(1 + Math.sin(time * 2.5) * .045) }
    const coreCage = addMesh(gameGroup, new THREE.TorusGeometry(.55, .018, 8, 48), new THREE.MeshBasicMaterial({ color: 0x72efff, transparent: true, opacity: .76 }), [corePosition.x, corePosition.y, corePosition.z - .02])
    coreCage.rotation.x = .6
    coreCage.userData.update = (time: number) => { coreCage.rotation.z = time * .45; coreCage.rotation.x = .6 + Math.sin(time) * .12 }
    const memoryNodes = [
      new THREE.TorusKnotGeometry(.2, .052, 48, 7, 2, 3),
      new THREE.OctahedronGeometry(.26, 0),
      new THREE.IcosahedronGeometry(.23, 1),
      new THREE.DodecahedronGeometry(.24, 0),
    ]
    positions.forEach(([x, y], index) => {
      const action = `pulse:${index}`
      const active = state.pulseMode === 'watch' && state.pulseStep === index
      const group = new THREE.Group()
      group.position.set(x, y, .24)
      group.userData.action = action
      gameGroup.add(group)
      const node = addMesh(group, memoryNodes[index], material(active ? 0xffffff : colors[index], active ? 0xffffff : colors[index]), [0, 0, .12], action, active ? 1.42 : 1)
      node.userData.action = action
      const ring = addMesh(group, new THREE.TorusGeometry(active ? .47 : .36, active ? .045 : .025, 10, 36), new THREE.MeshBasicMaterial({ color: active ? 0xffffff : colors[index], transparent: true, opacity: active ? .98 : .7 }), [0, 0, -.02], action)
      ring.userData.action = action
      ring.userData.update = (time: number) => { ring.rotation.z = time * (active ? 1.55 : .38) * (index % 2 ? -1 : 1); ring.scale.setScalar(active ? 1 + Math.sin(time * 9) * .11 : 1 + Math.sin(time * 2.6 + index) * .035) }
      const actionZone = addMesh(group, new THREE.SphereGeometry(.5, 18, 14), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), [0, 0, .02], action)
      actionZone.userData.action = action
      node.userData.update = (time: number) => { node.rotation.x = time * (.4 + index * .07); node.rotation.y = -time * (.5 + index * .08); if (active) node.scale.setScalar(1.35 + Math.sin(time * 9) * .12) }
      group.userData.update = (time: number) => { group.position.y = y + Math.sin(time * 1.8 + index) * .035; group.rotation.z = Math.sin(time * .8 + index) * .035 }
      const label = makeText(String(index + 1), active ? '#ffffff' : '#eaffff')
      label.position.set(0, .48, .1); label.scale.set(.24, .18, 1); label.userData.action = action; group.add(label)
      if (active) {
        const beam = addTube(gameGroup, [corePosition.clone(), new THREE.Vector3(x, y, .28)], 0xffffff, .025)
        beam.userData.update = (time: number) => { beam.visible = Math.sin(time * 10) > -.2 }
        const pulseLight = new THREE.PointLight(colors[index], 3.8, 1.6)
        group.add(pulseLight)
        pulseLight.position.set(0, 0, .45)
      }
      const orbit = addMesh(group, new THREE.TorusGeometry(.58, .012, 6, 32), new THREE.MeshBasicMaterial({ color: colors[index], transparent: true, opacity: .46 }), [0, 0, -.14])
      orbit.rotation.x = .45 + index * .18
      orbit.userData.update = (time: number) => { orbit.rotation.z = time * (.28 + index * .08) }
    })
    for (let index = 0; index < 6; index++) {
      const angle = Math.PI * 2 * index / 6
      const marker = addMesh(gameGroup, new THREE.SphereGeometry(.045, 10, 8), new THREE.MeshBasicMaterial({ color: index < state.pulseProgress ? 0xbaff4c : 0x5b7386 }), [Math.cos(angle) * .42, corePosition.y + Math.sin(angle) * .42, .53])
      marker.userData.update = (time: number) => { if (index < state.pulseProgress) marker.scale.setScalar(.9 + Math.sin(time * 5 + index) * .16) }
    }
  }

  if (anchored && gameType === 'toss') {
    const laneX = [-1.18, 0, 1.18]
    const laneColors = [0x35e8ff, 0xb6ff3e, 0xff55c8]
    const hoopY = -.38
    const sequence = [2, 0, 1]
    laneX.forEach((x, index) => {
      const color = laneColors[index]
      const active = sequence[state.tossProgress] === index
      const hoop = new THREE.Group()
      hoop.position.set(x, hoopY, .08)
      hoop.userData.update = (time: number) => {
        hoop.position.x = x + Math.sin(time * .9 + index * 1.7) * .12
        hoop.position.y = hoopY + Math.sin(time * 1.25 + index) * .07
        hoop.rotation.y = Math.sin(time * 1.1 + index) * .18
        hoop.rotation.z += .004 + index * .001
        hoop.scale.setScalar(active ? 1.08 + Math.sin(time * 5) * .025 : 1)
      }
      gameGroup.add(hoop)
      const outer = addMesh(hoop, new THREE.TorusGeometry(.43, .065, 12, 48), material(color, color), [0, 0, 0])
      outer.rotation.x = .12 + index * .12
      addMesh(hoop, new THREE.TorusGeometry(.29, .018, 8, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .8 }), [0, 0, .03])
      for (let bead = 0; bead < 4; bead++) {
        const angle = bead * Math.PI / 2
        const mote = addMesh(hoop, new THREE.SphereGeometry(.055, 14, 12), material(0xffffff, color), [Math.cos(angle) * .52, Math.sin(angle) * .52, .05])
        mote.userData.update = (time: number) => { mote.position.x = Math.cos(angle + time * 1.5) * .52; mote.position.y = Math.sin(angle + time * 1.5) * .52 }
      }
      const label = makeText(`RING ${index + 1}`, '#ffffff')
      label.position.set(0, -.58, .05); label.scale.set(.58, .15, 1); hoop.add(label)
    })

    const orbStart = new THREE.Vector3(0, -1.34, .38)
    const orb = addMesh(gameGroup, new THREE.IcosahedronGeometry(.2, 1), material(0xf4ffff, 0x4cecff), [orbStart.x, orbStart.y, orbStart.z], 'throw:orb')
    orb.userData.action = 'throw:orb'
    orb.userData.dragHome = orb.position.clone()
    orb.userData.update = (time: number) => { if (!orb.userData.isDragged) { orb.rotation.x = time * .48; orb.rotation.y = time * .7; orb.scale.setScalar(1 + Math.sin(time * 4) * .045) } }
    const orbHalo = addMesh(gameGroup, new THREE.TorusGeometry(.27, .018, 8, 36), new THREE.MeshBasicMaterial({ color: 0x9fffff, transparent: true, opacity: .8 }), [orbStart.x, orbStart.y, orbStart.z + .02])
    orbHalo.userData.update = (time: number) => { orbHalo.rotation.z = -time * .7; orbHalo.scale.setScalar(1 + Math.sin(time * 3) * .06) }
    const sequenceText = makeText(state.done ? 'ALL RINGS CLEARED' : `NEXT RING ${sequence[state.tossProgress] + 1}  ·  ${state.tossProgress + 1} / 3`, '#ffffff')
    sequenceText.position.set(0, -1.82, .25); sequenceText.scale.set(.9, .18, 1); gameGroup.add(sequenceText)
    const prompt = makeText(state.done ? 'SEQUENCE COMPLETE' : 'DRAG ORB UP · RELEASE TO TOSS', '#aafff5')
    prompt.position.set(0, -2.08, .25); prompt.scale.set(1.15, .16, 1); gameGroup.add(prompt)

    if (state.lastToss) {
      const start = orbStart.clone().add(new THREE.Vector3(0, 0, .03))
      const hoopCenter = new THREE.Vector3(laneX[state.lastToss.lane], hoopY, .18)
      const target = hoopCenter.clone()
      if (state.lastToss.missType === 'short') {
        target.copy(start).lerp(hoopCenter, .62).add(new THREE.Vector3(0, -.16, .02))
      } else if (state.lastToss.missType === 'overpowered') {
        target.y += .66
      } else if (state.lastToss.missType === 'wrong-ring') {
        target.x += state.lastToss.lane === 2 ? .72 : -.72
        target.y += .04
      }
      const arcHeight = state.lastToss.missType === 'overpowered' ? .68 : state.lastToss.missType === 'wrong-ring' ? .76 : .42
      const control = start.clone().lerp(target, .5).add(new THREE.Vector3(0, arcHeight + Math.min(state.lastToss.power, 1) * .12, .28))
      const flight = new THREE.QuadraticBezierCurve3(start, control, target)
      const thrownOrb = addMesh(gameGroup, new THREE.IcosahedronGeometry(.115, 1), material(0xffffff, state.lastToss.hit ? 0x5dfff1 : 0xff526f), [start.x, start.y, start.z])
      let startedAt: number | null = null
      thrownOrb.userData.update = (time: number) => {
        startedAt ??= time
        const progress = Math.min((time - startedAt) / 1.3, 1)
        thrownOrb.position.copy(flight.getPoint(progress))
        thrownOrb.visible = progress < 1
      }
    }
  }

  if (state.done) {
    for (let i = 0; i < 24; i++) {
      const color = [0x35eeff, 0xffd938, 0xff55ba, 0xa8ff35][i % 4]
      const burst = addMesh(scene, new THREE.IcosahedronGeometry(.07 + Math.random() * .05, 0), material(color), [(Math.random() - .5) * 4.2, (Math.random() - .5) * 4.2, Math.random() * 1.6])
      burst.userData.update = (time: number) => { burst.position.y += Math.sin(time * 5 + i) * .001 }
    }
  }

  return { scene, camera, interactives: gameGroup }
}

function disposeScene(scene: THREE.Scene) {
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
      object.geometry.dispose()
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      materials.forEach((item) => {
        if ('map' in item && item.map) item.map.dispose()
        item.dispose()
      })
    } else if (object instanceof THREE.Sprite) {
      object.material.map?.dispose()
      object.material.dispose()
    }
  })
}

export function ARScene3D({ gameType, locationIndex, screenSpace = false, anchored, state, onAction, onARState, onARPlaced, startARRef }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const bundleRef = useRef<SceneBundle | null>(null)
  const actionRef = useRef(onAction)
  const stateRef = useRef(state)
  const dragActionRef = useRef<string | null>(null)
  const arStateRef = useRef(onARState)
  const arPlacedRef = useRef(onARPlaced)
  const xrPlacementMatrixRef = useRef<Float32Array | null>(null)
  arStateRef.current = onARState
  arPlacedRef.current = onARPlaced
  actionRef.current = onAction
  stateRef.current = state

  // Keep the WebGL renderer and its canvas mounted for the full game. State changes swap only scene objects,
  // avoiding a renderer teardown/recreate cycle for every tap on a mesh.
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
    rendererRef.current = renderer
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
    renderer.setSize(host.clientWidth, host.clientHeight, false)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.25
    renderer.setClearColor(0x000000, 0)
    renderer.xr.enabled = !screenSpace
    if (!screenSpace) {
      // Three.js defaults to `local-floor`; use `local` because some AR providers only grant that space.
      renderer.xr.setReferenceSpaceType('local')
    }
    renderer.domElement.setAttribute('aria-label', 'Interactive 3D checkpoint game')
    renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;touch-action:none;pointer-events:auto;'
    host.appendChild(renderer.domElement)

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    const hitAction = (event: PointerEvent, excludeAction?: string) => {
      const bundle = bundleRef.current
      if (!bundle) return null
      const rect = renderer.domElement.getBoundingClientRect()
      if (!rect.width || !rect.height) return null
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, renderer.xr.isPresenting ? renderer.xr.getCamera() : bundle.camera)
      const hit = raycaster.intersectObjects(bundle.scene.children, true).find((entry) => {
        const action = entry.object.userData.action as string | undefined
        if (!action || action === excludeAction) return false
        return !excludeAction || action.startsWith('port:') || action.startsWith('dock:')
      })
      return hit?.object.userData.action as string | undefined
    }
    const restoreDraggedObject = () => {
      const action = dragActionRef.current
      const bundle = bundleRef.current
      if (!action || !bundle) return
      bundle.interactives.traverse((object) => {
        if (object instanceof THREE.Mesh && object.userData.action === action && object.userData.dragHome) {
          object.position.copy(object.userData.dragHome as THREE.Vector3)
          object.userData.isDragged = false
        }
      })
    }
    const onPointerMove = (event: PointerEvent) => {
      const action = dragActionRef.current
      const bundle = bundleRef.current
      if (!action || !bundle) return
      const rect = renderer.domElement.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, renderer.xr.isPresenting ? renderer.xr.getCamera() : bundle.camera)
      const draggedMeshes: THREE.Mesh[] = []
      bundle.interactives.traverse((object) => {
        if (object instanceof THREE.Mesh && object.userData.action === action && object.userData.dragHome) draggedMeshes.push(object)
      })
      const objectPosition = new THREE.Vector3()
      draggedMeshes[0]?.getWorldPosition(objectPosition)
      const cameraNormal = new THREE.Vector3()
      ;(renderer.xr.isPresenting ? renderer.xr.getCamera() : bundle.camera).getWorldDirection(cameraNormal)
      const dragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(cameraNormal, objectPosition)
      const worldPoint = raycaster.ray.intersectPlane(dragPlane, new THREE.Vector3())
      if (!worldPoint) return
      bundle.interactives.traverse((object) => {
        if (object instanceof THREE.Mesh && object.userData.action === action && object.userData.dragHome) {
          object.userData.isDragged = true
          object.position.copy(object.parent ? object.parent.worldToLocal(worldPoint.clone()) : worldPoint)
          object.position.z = .62
        }
      })
    }
    const onPointerDown = (event: PointerEvent) => {
      event.preventDefault()
      const action = hitAction(event)
      if (action?.startsWith('source:') || action?.startsWith('cargo:') || action === 'throw:orb') {
        dragActionRef.current = action
        renderer.domElement.setPointerCapture(event.pointerId)
        actionRef.current(action)
      }
    }
    const onPointerUp = (event: PointerEvent) => {
      event.preventDefault()
      if (dragActionRef.current) {
        const draggedAction = dragActionRef.current
        if (draggedAction === 'throw:orb') {
          let deltaX = 0
          let deltaY = 0
          bundleRef.current?.interactives.traverse((object) => {
            if (object instanceof THREE.Mesh && object.userData.action === draggedAction && object.userData.dragHome) {
              const home = object.userData.dragHome as THREE.Vector3
              deltaX = object.position.x - home.x
              deltaY = object.position.y - home.y
            }
          })
          restoreDraggedObject()
          actionRef.current(`throw:release:${deltaX.toFixed(3)}:${deltaY.toFixed(3)}`)
          dragActionRef.current = null
          return
        }
        const target = hitAction(event, draggedAction)
        restoreDraggedObject()
        if (target?.startsWith('port:') || target?.startsWith('dock:')) actionRef.current(target)
        dragActionRef.current = null
        return
      }
      const target = hitAction(event)
      if (target) actionRef.current(target)
    }
    const onPointerCancel = () => { restoreDraggedObject(); dragActionRef.current = null }
    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointermove', onPointerMove)
    renderer.domElement.addEventListener('pointerup', onPointerUp)
    renderer.domElement.addEventListener('pointercancel', onPointerCancel)
    const resize = new ResizeObserver(() => {
      if (!host.clientWidth || !host.clientHeight) return
      const bundle = bundleRef.current
      if (bundle) {
        bundle.camera.aspect = host.clientWidth / host.clientHeight
        bundle.camera.updateProjectionMatrix()
      }
      renderer.setSize(host.clientWidth, host.clientHeight, false)
    })
    resize.observe(host)
    const clock = new THREE.Clock()
    let frame = 0
    const render = () => {
      const bundle = bundleRef.current
      if (!bundle) return
      const time = clock.getElapsedTime()
      bundle.scene.traverse((object) => {
        const update = object.userData.update as ((time: number) => void) | undefined
        update?.(time)
      })
      renderer.render(bundle.scene, bundle.camera)
    }
    renderer.setAnimationLoop(render)

    let hitTestSource: any = null
    let xrReferenceSpace: any = null
    let xrSession: any = null
    let latestHitMatrix: Float32Array | null = null
    let latestHitResult: any = null
    let xrAnchor: any = null
    let placedInAR = false
    let stableHitFrames = 0
    let previousHitPosition: THREE.Vector3 | null = null

    const placeAtHit = (matrixValues: ArrayLike<number>, hitResult: any) => {
      if (placedInAR || !bundleRef.current) return
      applyPlacementPose(matrixValues)
      placedInAR = true
      if (hitResult?.createAnchor) {
        void hitResult.createAnchor().then((anchor: any) => {
          if (xrSession) xrAnchor = anchor
          else anchor.delete?.()
        }).catch(() => { /* local reference-space pose remains the fallback */ })
      }
      arPlacedRef.current(true)
      arStateRef.current('placed')
    }

    const applyPlacementPose = (matrixValues: ArrayLike<number>) => {
      const root = bundleRef.current?.scene.getObjectByName('world-anchored-game')
      if (!root) return
      const values = Array.from(matrixValues, Number)
      const hitMatrix = new THREE.Matrix4().fromArray(values)
      hitMatrix.multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2))
      hitMatrix.setPosition(
        hitMatrix.elements[12] + values[4] * .12,
        hitMatrix.elements[13] + values[5] * .12,
        hitMatrix.elements[14] + values[6] * .12,
      )
      xrPlacementMatrixRef.current = new Float32Array(hitMatrix.elements)
      hitMatrix.decompose(root.position, root.quaternion, root.scale)
      root.scale.multiplyScalar(.38)
      root.updateMatrix()
      root.matrixAutoUpdate = false
      root.visible = true
    }

    const startAR = async () => {
      const xr = (navigator as Navigator & { xr?: any }).xr
      if (!xr) {
        arStateRef.current('unsupported', 'World-locked AR is unavailable in this browser or device.')
        return
      }
      arStateRef.current('searching', 'Move your phone slowly to scan for a floor or table surface.')
      try {
        // requestSession must be called directly from the player's tap to preserve browser user activation.
        const sessionPromise = xr.requestSession('immersive-ar', {
          requiredFeatures: ['hit-test'],
          optionalFeatures: ['local-floor', 'anchors', 'dom-overlay'],
          domOverlay: { root: document.body },
        })
        const session = await sessionPromise
        xrSession = session
        await renderer.xr.setSession(session)
        if (session.environmentBlendMode && session.environmentBlendMode !== 'alpha-blend') {
          await session.end()
          xrSession = null
          arStateRef.current('unsupported', 'This AR provider cannot show camera passthrough. The live camera preview is still available.')
          return
        }
        xrReferenceSpace = renderer.xr.getReferenceSpace() ?? await session.requestReferenceSpace('local')
        const viewerSpace = await session.requestReferenceSpace('viewer')
        hitTestSource = await session.requestHitTestSource({ space: viewerSpace })
        // Release the preview camera only after the browser has successfully entered passthrough AR.
        const bundle = bundleRef.current
        if (bundle) {
          bundle.scene.background = null
          const root = bundle.scene.getObjectByName('world-anchored-game')
          if (root) root.visible = false
          bundle.scene.traverse((object) => {
            if (object.userData.arReticle) object.visible = true
          })
        }
        session.addEventListener('select', (event: any) => {
          if (placedInAR || !latestHitMatrix || !bundleRef.current) return
          placeAtHit(latestHitMatrix, latestHitResult)
        })
        session.addEventListener('end', () => {
          hitTestSource?.cancel?.()
          hitTestSource = null
          xrAnchor?.delete?.()
          xrAnchor = null
          latestHitResult = null
          xrSession = null
          xrPlacementMatrixRef.current = null
          if (placedInAR) {
            placedInAR = false
            arPlacedRef.current(false)
          }
          arStateRef.current('ready')
        })
      } catch (error) {
        console.warn('Could not start world-tracked AR:', error)
        const failedSession = xrSession ?? renderer.xr.getSession()
        xrSession = null
        try {
          if (failedSession && failedSession.state !== 'ended') await failedSession.end()
        } catch { /* continue with the screen-space camera fallback */ }
        renderer.setAnimationLoop(render)
        arStateRef.current('error', 'World AR could not start automatically. Keep the live camera open and tap once to retry surface scanning.')
      }
    }
    startARRef.current = startAR
    void (async () => {
      if (screenSpace) {
        arStateRef.current('placed', 'Camera overlay mode active.')
        return
      }
      const xr = (navigator as Navigator & { xr?: any }).xr
      try {
        if (xr && await xr.isSessionSupported('immersive-ar')) arStateRef.current('ready')
        else arStateRef.current('unsupported', 'This browser does not support world-locked AR; screen-space preview is active.')
      } catch {
        arStateRef.current('unsupported', 'This browser does not support world-locked AR; screen-space preview is active.')
      }
    })()

    const onXRFrame = (_time: number, frameData: any) => {
      const session = frameData?.session
      if (!session || !hitTestSource) return
      if (placedInAR && xrAnchor) {
        const anchorPose = frameData.getPose(xrAnchor.anchorSpace, xrReferenceSpace)
        if (anchorPose) applyPlacementPose(anchorPose.transform.matrix)
        return
      }
      if (placedInAR) return
      const results = frameData.getHitTestResults(hitTestSource)
      if (results.length > 0) {
        latestHitResult = results[0]
        const pose = results[0].getPose(xrReferenceSpace)
        if (pose) {
          latestHitMatrix = new Float32Array(pose.transform.matrix)
          const hitPosition = new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().fromArray(latestHitMatrix))
          if (previousHitPosition && previousHitPosition.distanceTo(hitPosition) < .035) stableHitFrames += 1
          else stableHitFrames = 0
          previousHitPosition = hitPosition
          const reticle = bundleRef.current?.scene.getObjectByName('ar-surface-reticle')
          if (reticle) {
            reticle.matrix.fromArray(latestHitMatrix)
            reticle.matrixAutoUpdate = false
            reticle.visible = true
          }
          // Once a surface pose stays steady, lock the miniature game to that real-world point automatically.
          if (stableHitFrames >= 40) placeAtHit(latestHitMatrix, latestHitResult)
        }
      } else {
        latestHitMatrix = null
        latestHitResult = null
        previousHitPosition = null
        stableHitFrames = 0
        const reticle = bundleRef.current?.scene.getObjectByName('ar-surface-reticle')
        if (reticle) reticle.visible = false
      }
    }
    renderer.xr.addEventListener('sessionstart', () => renderer.setAnimationLoop((time, xrFrame) => {
      onXRFrame(time, xrFrame)
      render()
    }))
    renderer.xr.addEventListener('sessionend', () => renderer.setAnimationLoop(render))

    return () => {
      renderer.setAnimationLoop(null)
      if (xrSession) void xrSession.end()
      startARRef.current = null
      resize.disconnect()
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
      renderer.domElement.removeEventListener('pointerup', onPointerUp)
      renderer.domElement.removeEventListener('pointercancel', onPointerCancel)
      dragActionRef.current = null
      if (bundleRef.current) disposeScene(bundleRef.current.scene)
      bundleRef.current = null
      renderer.dispose()
      renderer.domElement.remove()
      rendererRef.current = null
    }
  }, [screenSpace])

  useEffect(() => {
    const next = makeScene(gameType, locationIndex, anchored, stateRef.current)
    const savedPose = xrPlacementMatrixRef.current
    if (savedPose) {
      const root = next.scene.getObjectByName('world-anchored-game')
      if (root) {
        new THREE.Matrix4().fromArray(savedPose).decompose(root.position, root.quaternion, root.scale)
        root.scale.multiplyScalar(.38)
        root.updateMatrix()
        root.matrixAutoUpdate = false
        root.visible = true
      }
    }
    const previous = bundleRef.current
    bundleRef.current = next
    const host = hostRef.current
    const renderer = rendererRef.current
    if (host && renderer && host.clientWidth && host.clientHeight) {
      next.camera.aspect = host.clientWidth / host.clientHeight
      next.camera.updateProjectionMatrix()
    }
    if (previous) disposeScene(previous.scene)
  }, [gameType, locationIndex, anchored, state])

  return <div ref={hostRef} aria-label="3D AR checkpoint scene" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }} />
}
