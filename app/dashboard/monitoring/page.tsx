/* eslint-disable */

"use client"

import { useState, useEffect, useRef } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { CuboidIcon as Cube, Eye, Layers, Network, Play, RotateCw, Target } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { gsap } from "gsap"

interface WarehouseNode {
  id: string
  name: string
  x: number
  y: number
  isHome: boolean
  isTag: boolean
  tagColor?: string
  shelf?: Shelf
}

interface WarehouseConnection {
  id: string
  fromNode: string
  toNode: string
  distance: number
  nodeFrom: WarehouseNode
  nodeTo: WarehouseNode
}

interface Shelf {
  id: number
  name: string
  initialHeight: number
  ShelfSlotHeight: number
  levels: number
  locationId: string
  tag: string
  color?: string
  slots: ShelfSlot[]
  location: {
    id: string
    name: string
    x: number
    y: number
    isHome: boolean
    isTag: boolean
    tagColor?: string
  }
}

interface ShelfSlot {
  id: number
  shelfId: number
  level: number
  box?: Box
  boxId?: number
}

interface Box {
  id: number
  name: string
  width: number
  height: number
  depth: number
  weight: number
  color: string
  tag: string
}

interface PathNode {
  name: string
  x: number
  y: number
  g: number
  h: number
  f: number
  parent?: PathNode
}

export default function WarehouseMonitoringPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nodes, setNodes] = useState<WarehouseNode[]>([])
  const [connections, setConnections] = useState<WarehouseConnection[]>([])
  const [shelves, setShelves] = useState<Shelf[]>([])
  const [boxes, setBoxes] = useState<Box[]>([])
  const [hasAnimated, setHasAnimated] = useState(false)

  // Robot simulation states
  const [targetNode, setTargetNode] = useState<string>("")
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationPath, setSimulationPath] = useState<string[]>([])
  const robotRef = useRef<THREE.Group | null>(null)
  const pathRef = useRef<THREE.Line | null>(null)

  // Visibility toggles
  const [showNodes, setShowNodes] = useState(false)
  const [showConnections, setShowConnections] = useState(true)
  const [showShelves, setShowShelves] = useState(true)
  const [showBoxes, setShowBoxes] = useState(true)

  // Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)

  // Object groups for easy visibility toggling
  const nodesGroupRef = useRef<THREE.Group | null>(null)
  const connectionsGroupRef = useRef<THREE.Group | null>(null)
  const shelvesGroupRef = useRef<THREE.Group | null>(null)
  const boxesGroupRef = useRef<THREE.Group | null>(null)
  const robotGroupRef = useRef<THREE.Group | null>(null)

  // Fetch warehouse data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const [warehouseResponse, shelvesResponse, boxesResponse] = await Promise.all([
          fetch("/api/warehouse/bulk"),
          fetch("/api/shelves"),
          fetch("/api/boxes"),
        ])

        if (!warehouseResponse.ok || !shelvesResponse.ok || !boxesResponse.ok) {
          throw new Error("Failed to fetch data")
        }

        const [warehouseData, shelvesData, boxesData] = await Promise.all([
          warehouseResponse.json(),
          shelvesResponse.json(),
          boxesResponse.json(),
        ])

        // Process warehouse data
        if (warehouseData.nodes && warehouseData.connections) {
          setNodes(warehouseData.nodes)
          setConnections(warehouseData.connections)
          console.log("Nodes loaded:", warehouseData.nodes.length)
        }

        // Process shelves and boxes
        setShelves(shelvesData)
        setBoxes(boxesData)
        console.log("Shelves loaded:", shelvesData.length)
        console.log("Boxes loaded:", boxesData.length)
      } catch (err) {
        console.error("Error fetching data:", err)
        setError("Failed to load warehouse data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current || isLoading || error) return

    // Setup scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x18181b) // zinc-900
    sceneRef.current = scene

    // Setup camera with improved parameters for smoother animation
    const camera = new THREE.PerspectiveCamera(
      35, // Slightly wider field of view for better scene visibility
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000, // Increased far plane for larger scenes
    )
    // Initial position will be set in the animation useEffect
    camera.position.set(0, 20, 0)
    // Make camera look at the center initially
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.shadowMap.enabled = true
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Setup controls with limits for top-down view
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.1 // Increased for smoother stops
    controls.rotateSpeed = 0.5 // Slower rotation for more stability
    controls.panSpeed = 0.7
    controls.zoomSpeed = 0.8

    // Restrict rotation to maintain a top-down perspective
    controls.minPolarAngle = 0 // Allow full top-down view (0 degrees from vertical)
    controls.maxPolarAngle = Math.PI / 4 // Restrict to 45 degrees from vertical

    // Add distance limits
    controls.minDistance = 10
    controls.maxDistance = 100

    // Enable controls immediately
    controls.enabled = true
    controlsRef.current = controls

    // Create object groups
    nodesGroupRef.current = new THREE.Group()
    connectionsGroupRef.current = new THREE.Group()
    shelvesGroupRef.current = new THREE.Group()
    boxesGroupRef.current = new THREE.Group()
    robotGroupRef.current = new THREE.Group()

    scene.add(nodesGroupRef.current)
    scene.add(connectionsGroupRef.current)
    scene.add(shelvesGroupRef.current)
    scene.add(boxesGroupRef.current)
    scene.add(robotGroupRef.current)

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    scene.add(ambientLight)

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(10, 20, 10)
    directionalLight.castShadow = true
    scene.add(directionalLight)

    // Add floor
    const floorGeometry = new THREE.PlaneGeometry(100, 100)
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x27272a, // zinc-800
      side: THREE.DoubleSide,
      roughness: 0.8,
    })
    const floor = new THREE.Mesh(floorGeometry, floorMaterial)
    floor.rotation.x = Math.PI / 2
    floor.receiveShadow = true
    scene.add(floor)

    // Add grid helper
    const gridHelper = new THREE.GridHelper(100, 100, 0x3f3f46, 0x3f3f46)
    scene.add(gridHelper)

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return
      const width = containerRef.current.clientWidth
      const height = containerRef.current.clientHeight

      if (cameraRef.current) {
        cameraRef.current.aspect = width / height
        cameraRef.current.updateProjectionMatrix()
      }

      if (rendererRef.current) {
        rendererRef.current.setSize(width, height)
      }
    }
    window.addEventListener("resize", handleResize)

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize)
      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement)
      }

      // Dispose of geometries and materials
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose()
          if (object.material instanceof THREE.Material) {
            object.material.dispose()
          } else if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose())
          }
        }
      })
    }
  }, [isLoading, error])

  // Position camera directly above the warehouse
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current || hasAnimated || nodes.length === 0) return

    // Calculate the center of all nodes
    let centerX = 0
    let centerZ = 0
    let minX = Number.POSITIVE_INFINITY,
      maxX = Number.NEGATIVE_INFINITY,
      minZ = Number.POSITIVE_INFINITY,
      maxZ = Number.NEGATIVE_INFINITY

    if (nodes.length > 0) {
      nodes.forEach((node) => {
        centerX += node.x
        centerZ -= node.y // Y in data is Z in Three.js with negative value

        // Track boundaries for better camera positioning
        minX = Math.min(minX, node.x)
        maxX = Math.max(maxX, node.x)
        minZ = Math.min(minZ, -node.y)
        maxZ = Math.max(maxZ, -node.y)
      })

      centerX /= nodes.length
      centerZ /= nodes.length
    }

    // Calculate scene size for better framing
    const sceneWidth = maxX - minX
    const sceneDepth = maxZ - minZ
    const sceneDiagonal = Math.sqrt(sceneWidth * sceneWidth + sceneDepth * sceneDepth)

    // Set camera position directly above the center at a fixed height
    const viewHeight = sceneDiagonal * 1.5 // Increased from 0.8 to 1.5 for a higher view
    cameraRef.current.position.set(centerX, viewHeight, centerZ)

    // Look directly down at the center
    cameraRef.current.lookAt(centerX, 0, centerZ)

    // Set the controls target to the center
    controlsRef.current.target.set(centerX, 0, centerZ)

    // Enable controls immediately
    controlsRef.current.enabled = true

    // Mark as animated so this doesn't run again
    setHasAnimated(true)
  }, [nodes, hasAnimated])

  // Render warehouse nodes
  useEffect(() => {
    if (!nodesGroupRef.current || !nodes.length) return

    // Clear previous nodes
    while (nodesGroupRef.current.children.length > 0) {
      const object = nodesGroupRef.current.children[0]
      nodesGroupRef.current.remove(object)
    }

    // Create nodes
    nodes.forEach((node) => {
      // Node sphere
      const geometry = new THREE.SphereGeometry(0.3, 32, 32)
      const material = new THREE.MeshStandardMaterial({
        color: node.isHome
          ? 0x10b981
          : node.isTag
            ? node.tagColor
              ? new THREE.Color(node.tagColor).getHex()
              : 0xf59e0b
            : 0x3b82f6,
        roughness: 0.7,
        metalness: 0.3,
      })
      const sphere = new THREE.Mesh(geometry, material)
      sphere.position.set(node.x, 0.3, -node.y)
      sphere.castShadow = true
      sphere.userData = { type: "node", id: node.id, name: node.name }

      // Node label - make it smaller
      const canvas = document.createElement("canvas")
      const context = canvas.getContext("2d")
      if (context) {
        canvas.width = 96 // Reduced from 128
        canvas.height = 48 // Reduced from 64
        context.fillStyle = "#18181b"
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.font = "bold 18px Arial" // Reduced from 24px
        context.fillStyle = "#ffffff"
        context.textAlign = "center"
        context.textBaseline = "middle"
        context.fillText(node.name, canvas.width / 2, canvas.height / 2)

        const texture = new THREE.CanvasTexture(canvas)
        const labelMaterial = new THREE.SpriteMaterial({ map: texture })
        const label = new THREE.Sprite(labelMaterial)
        label.position.set(0, 0.6, 0) // Reduced from 0.8
        label.scale.set(1.5, 0.75, 1) // Reduced from 2, 1, 1
        sphere.add(label)
      }

      if (nodesGroupRef.current) {
        nodesGroupRef.current.add(sphere)
        nodesGroupRef.current.visible = showNodes
      }
    })
  }, [nodes, showNodes])

  // Render connections
  useEffect(() => {
    if (!connectionsGroupRef.current || !connections.length || !nodes.length) return

    // Clear previous connections
    while (connectionsGroupRef.current.children.length > 0) {
      const object = connectionsGroupRef.current.children[0]
      connectionsGroupRef.current.remove(object)
    }

    // Create node map for quick lookup
    const nodeMap = new Map(nodes.map((node) => [node.name, node]))

    // Create connections
    connections.forEach((connection) => {
      const fromNode = nodeMap.get(connection.fromNode)
      const toNode = nodeMap.get(connection.toNode)

      if (fromNode && toNode) {
        const points = [new THREE.Vector3(fromNode.x, 0.1, -fromNode.y), new THREE.Vector3(toNode.x, 0.1, -toNode.y)]

        const geometry = new THREE.BufferGeometry().setFromPoints(points)
        const material = new THREE.LineBasicMaterial({
          color: 0x10b981,
          linewidth: 1, // Reduced from 2
        })
        const line = new THREE.Line(geometry, material)
        line.userData = {
          type: "connection",
          id: connection.id,
          fromNode: connection.fromNode,
          toNode: connection.toNode,
          distance: connection.distance,
        }

        // Add distance label at midpoint
        const midpoint = new THREE.Vector3((fromNode.x + toNode.x) / 2, 0.3, -(fromNode.y + toNode.y) / 2)

        const canvas = document.createElement("canvas")
        const context = canvas.getContext("2d")
        if (context) {
          canvas.width = 64
          canvas.height = 32
          context.fillStyle = "#18181b"
          context.fillRect(0, 0, canvas.width, canvas.height)
          context.font = "16px Arial"
          context.fillStyle = "#ffffff"
          context.textAlign = "center"
          context.textBaseline = "middle"
          context.fillText(connection.distance.toString(), canvas.width / 2, canvas.height / 2)

          const texture = new THREE.CanvasTexture(canvas)
          const labelMaterial = new THREE.SpriteMaterial({ map: texture })
          const label = new THREE.Sprite(labelMaterial)
          label.position.copy(midpoint)
          label.scale.set(1, 0.5, 1)

          if (connectionsGroupRef.current) {
            connectionsGroupRef.current.add(label)
            connectionsGroupRef.current.add(line)
            connectionsGroupRef.current.visible = showConnections
          }
        }
      }
    })
  }, [connections, nodes, showConnections])

  // Render shelves
  useEffect(() => {
    if (!shelvesGroupRef.current || !shelves.length || !nodes.length) return

    // Clear previous shelves
    while (shelvesGroupRef.current.children.length > 0) {
      const object = shelvesGroupRef.current.children[0]
      shelvesGroupRef.current.remove(object)
    }

    // Create shelves
    shelves.forEach((shelf) => {
      // Use shelf.location directly instead of looking up in nodeMap
      const node = shelf.location
      if (!node) return

      // Base shelf dimensions
      const width = 1.5
      const depth = 0.75
      const levelHeight = (shelf.ShelfSlotHeight / 100) * 5

      // Create shelf group
      const shelfGroup = new THREE.Group()
      shelfGroup.userData = { type: "shelf", id: shelf.id, name: shelf.name }

      // Determine if this shelf should be vertical based on y-coordinate
      // Shelves at y=0 or y=-12 will be horizontal, all others will be vertical
      const isVertical = node.y !== 0 && node.y !== -12

      // Create shelf levels
      for (let level = 1; level <= shelf.levels; level++) {
        // For vertical shelves, swap width and depth
        const levelGeometry = isVertical
          ? new THREE.BoxGeometry(depth, 0.15, width)
          : new THREE.BoxGeometry(width, 0.15, depth)

        const levelMaterial = new THREE.MeshStandardMaterial({
          color: 0x52525b,
          roughness: 0.7,
          metalness: 0.3,
        })
        const levelShelf = new THREE.Mesh(levelGeometry, levelMaterial)
        const levelY = level * levelHeight
        levelShelf.position.set(0, levelY, 0)
        levelShelf.castShadow = true
        levelShelf.receiveShadow = true
        shelfGroup.add(levelShelf)
      }

      // Add vertical supports from floor to roof
      const supportGeometry = new THREE.CylinderGeometry(0.05, 0.05, (shelf.levels + 1) * levelHeight, 8)
      const supportMaterial = new THREE.MeshStandardMaterial({
        color: 0x52525b,
        roughness: 0.7,
        metalness: 0.3,
      })

      // Four supports at corners - adjust positions based on orientation
      const positions = isVertical
        ? [
            [depth / 2 - 0.1, -width / 2 + 0.1],
            [depth / 2 - 0.1, width / 2 - 0.1],
            [-depth / 2 + 0.1, width / 2 - 0.1],
            [-depth / 2 + 0.1, -width / 2 + 0.1],
          ]
        : [
            [width / 2 - 0.1, -depth / 2 + 0.1],
            [width / 2 - 0.1, depth / 2 - 0.1],
            [-width / 2 + 0.1, depth / 2 - 0.1],
            [-width / 2 + 0.1, -depth / 2 + 0.1],
          ]

      positions.forEach(([x, z]) => {
        const support = new THREE.Mesh(supportGeometry, supportMaterial)
        support.position.set(x, ((shelf.levels + 1) * levelHeight) / 2, z)
        shelfGroup.add(support)
      })

      // Add roof
      const roofGeometry = isVertical
        ? new THREE.BoxGeometry(depth, 0.15, width)
        : new THREE.BoxGeometry(width, 0.15, depth)

      const roofMaterial = new THREE.MeshStandardMaterial({
        color: shelf.color ? new THREE.Color(shelf.color).getHex() : 0x71717a,
        roughness: 0.7,
        metalness: 0.3,
      })
      const roof = new THREE.Mesh(roofGeometry, roofMaterial)
      const roofY = (shelf.levels + 1) * levelHeight
      roof.position.set(0, roofY, 0)
      roof.castShadow = true
      roof.receiveShadow = true
      shelfGroup.add(roof)

      // Calculate offset based on y-coordinate
      const offsetDistance = 1.0 // Increased offset distance
      let offsetX = 0
      let offsetZ = 0

      if (node.y === 0) {
        // For shelves at y=0, push upward (negative Z in Three.js)
        offsetZ = -offsetDistance
      } else if (node.y === -12) {
        // For shelves at y=-12, push downward (positive Z in Three.js)
        offsetZ = offsetDistance
      } else {
        // For other shelves (vertical ones), offset in x direction
        offsetX = offsetDistance
      }

      // Position the entire shelf group with offset
      shelfGroup.position.set(node.x + offsetX, 0, -node.y + offsetZ)

      // Add shelf label
      const canvas = document.createElement("canvas")
      const context = canvas.getContext("2d")
      if (context) {
        canvas.width = 256
        canvas.height = 64
        context.fillStyle = "#18181b"
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.font = "bold 24px Arial"
        context.fillStyle = "#ffffff"
        context.textAlign = "center"
        context.textBaseline = "middle"
        context.fillText(shelf.name, canvas.width / 2, canvas.height / 2)

        const texture = new THREE.CanvasTexture(canvas)
        const labelMaterial = new THREE.SpriteMaterial({ map: texture })
        const label = new THREE.Sprite(labelMaterial)
        label.position.set(0, (shelf.levels + 1) * levelHeight + 0.5, 0)
        label.scale.set(3, 0.75, 1)
        shelfGroup.add(label)
      }

      if (shelvesGroupRef.current) {
        shelvesGroupRef.current.add(shelfGroup)
        shelvesGroupRef.current.visible = showShelves
      }
    })
  }, [shelves, showShelves])

  // Render boxes
  useEffect(() => {
    if (!boxesGroupRef.current || !boxes.length || !shelves.length || !nodes.length) return

    // Clear previous boxes
    while (boxesGroupRef.current.children.length > 0) {
      const object = boxesGroupRef.current.children[0]
      boxesGroupRef.current.remove(object)
    }

    // Create maps for quick lookups
    const nodeMap = new Map(nodes.map((node) => [node.id, node]))
    const shelfMap = new Map(shelves.map((shelf) => [shelf.id, shelf]))

    // Create a map of shelf slots
    const slotMap = new Map()
    shelves.forEach((shelf) => {
      if (shelf.slots) {
        shelf.slots.forEach((slot) => {
          if (slot.boxId) {
            slotMap.set(slot.boxId, { shelfId: shelf.id, level: slot.level })
          }
        })
      }
    })

    // Create boxes
    boxes.forEach((box) => {
      // Find the slot and shelf for this box
      const slotInfo = slotMap.get(box.id)
      if (!slotInfo) return

      const shelf = shelfMap.get(slotInfo.shelfId)
      if (!shelf) return

      const node = nodeMap.get(shelf.locationId)
      if (!node) return

      // Determine if this shelf is vertical based on y-coordinate
      const isVertical = node.y !== 0 && node.y !== -12

      // Convert dimensions from cm to meters
      const width = box.width / 100
      const height = box.height / 100
      const depth = box.depth / 100

      // Calculate position based on shelf and level
      const baseHeight = 0.3
      const levelHeight = (shelf.ShelfSlotHeight / 100) * 5
      const boxY = baseHeight + slotInfo.level * levelHeight - levelHeight / 2

      // Calculate offset based on y-coordinate (same as shelf offset)
      const offsetDistance = 1.0 // Increased offset distance
      let offsetX = 0
      let offsetZ = 0

      if (node.y === 0) {
        // For shelves at y=0, push upward (negative Z in Three.js)
        offsetZ = -offsetDistance
      } else if (node.y === -12) {
        // For shelves at y=-12, push downward (positive Z in Three.js)
        offsetZ = offsetDistance
      } else {
        // For other shelves (vertical ones), offset in x direction
        offsetX = offsetDistance
      }

      // Create box mesh with dimensions adjusted for orientation
      const geometry = isVertical
        ? new THREE.BoxGeometry(depth, height, width)
        : new THREE.BoxGeometry(width, height, depth)

      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(box.color).getHex(),
        roughness: 0.4,
        metalness: 0.6,
      })
      const boxMesh = new THREE.Mesh(geometry, material)

      // Position the box at the node location with offset
      boxMesh.position.set(node.x + offsetX, boxY, -node.y + offsetZ)

      boxMesh.castShadow = true
      boxMesh.receiveShadow = true
      boxMesh.userData = { type: "box", id: box.id, name: box.name }

      // Add box label
      const canvas = document.createElement("canvas")
      const context = canvas.getContext("2d")
      if (context) {
        canvas.width = 128
        canvas.height = 64
        context.fillStyle = "#18181b"
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.font = "bold 16px Arial"
        context.fillStyle = "#ffffff"
        context.textAlign = "center"
        context.textBaseline = "middle"
        context.fillText(box.name, canvas.width / 2, canvas.height / 2)

        const texture = new THREE.CanvasTexture(canvas)
        const labelMaterial = new THREE.SpriteMaterial({ map: texture })
        const label = new THREE.Sprite(labelMaterial)
        label.position.set(0, height / 2 + 0.2, 0)
        label.scale.set(1.5, 0.75, 1)
        boxMesh.add(label)
      }

      if (boxesGroupRef.current) {
        boxesGroupRef.current.add(boxMesh)
        boxesGroupRef.current.visible = showBoxes
      }
    })
  }, [boxes, shelves, nodes, showBoxes])

  // Create robot model
  useEffect(() => {
    if (!robotGroupRef.current || !sceneRef.current || nodes.length === 0) return

    // Clear previous robot
    while (robotGroupRef.current.children.length > 0) {
      const object = robotGroupRef.current.children[0]
      robotGroupRef.current.remove(object)
    }

    // Create robot group
    const robotGroup = new THREE.Group()
    robotRef.current = robotGroup

    // Create robot body - make it larger and more visible
    const bodyGeometry = new THREE.CylinderGeometry(0.7, 0.7, 0.4, 16)
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xff3e00, // Bright orange
      roughness: 0.3,
      metalness: 0.7,
      emissive: 0xff3e00,
      emissiveIntensity: 0.2,
    })
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    body.position.y = 0.2
    body.castShadow = true
    robotGroup.add(body)

    // Add a directional indicator (arrow)
    const arrowGeometry = new THREE.ConeGeometry(0.3, 0.6, 8)
    const arrowMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.7,
    })
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial)
    arrow.rotation.x = Math.PI / 2
    arrow.position.set(0, 0.2, 0.6)
    robotGroup.add(arrow)

    // Add a light on top
    const lightGeometry = new THREE.SphereGeometry(0.25, 16, 16)
    const lightMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 0.8,
      roughness: 0.1,
      metalness: 0.9,
    })
    const light = new THREE.Mesh(lightGeometry, lightMaterial)
    light.position.y = 0.5
    robotGroup.add(light)

    // Add wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16)
    const wheelMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.8,
      metalness: 0.2,
    })

    // Left wheel
    const leftWheel = new THREE.Mesh(wheelGeometry, wheelMaterial)
    leftWheel.rotation.z = Math.PI / 2
    leftWheel.position.set(0.5, 0, 0)
    robotGroup.add(leftWheel)

    // Right wheel
    const rightWheel = new THREE.Mesh(wheelGeometry, wheelMaterial)
    rightWheel.rotation.z = Math.PI / 2
    rightWheel.position.set(-0.5, 0, 0)
    robotGroup.add(rightWheel)

    // Find start node to position robot initially
    const startNode = nodes.find((node) => node.name === "Start")
    if (startNode) {
      robotGroup.position.set(startNode.x, 0.3, -startNode.y)
    } else {
      // If no start node, position at origin
      robotGroup.position.set(0, 0.3, 0)
    }

    // Add robot to scene
    robotGroupRef.current.add(robotGroup)

    // Make robot visible by default
    robotGroupRef.current.visible = true
  }, [nodes])

  // Update visibility when toggles change
  useEffect(() => {
    if (nodesGroupRef.current) nodesGroupRef.current.visible = showNodes
    if (connectionsGroupRef.current) connectionsGroupRef.current.visible = showConnections
    if (shelvesGroupRef.current) shelvesGroupRef.current.visible = showShelves
    if (boxesGroupRef.current) boxesGroupRef.current.visible = showBoxes
  }, [showNodes, showConnections, showShelves, showBoxes])

  // A* pathfinding algorithm
  const findPath = (startNodeName: string, endNodeName: string) => {
    // Create a map of node names to nodes for quick lookup
    const nodeMap = new Map(nodes.map((node) => [node.name, node]))

    // Create a map of connections for each node
    const connectionMap = new Map<string, { node: string; distance: number }[]>()

    connections.forEach((connection) => {
      if (!connectionMap.has(connection.fromNode)) {
        connectionMap.set(connection.fromNode, [])
      }
      if (!connectionMap.has(connection.toNode)) {
        connectionMap.set(connection.toNode, [])
      }

      // Add bidirectional connections
      connectionMap.get(connection.fromNode)?.push({
        node: connection.toNode,
        distance: connection.distance,
      })
      connectionMap.get(connection.toNode)?.push({
        node: connection.fromNode,
        distance: connection.distance,
      })
    })

    // Get start and end nodes
    const startNode = nodeMap.get(startNodeName)
    const endNode = nodeMap.get(endNodeName)

    if (!startNode || !endNode) {
      console.error("Start or end node not found")
      return []
    }

    // Initialize open and closed sets
    const openSet: PathNode[] = []
    const closedSet = new Set<string>()

    // Add start node to open set
    openSet.push({
      name: startNode.name,
      x: startNode.x,
      y: startNode.y,
      g: 0,
      h: Math.sqrt(Math.pow(endNode.x - startNode.x, 2) + Math.pow(endNode.y - startNode.y, 2)),
      f: Math.sqrt(Math.pow(endNode.x - startNode.x, 2) + Math.pow(endNode.y - startNode.y, 2)),
    })

    // A* algorithm
    while (openSet.length > 0) {
      // Find node with lowest f score
      openSet.sort((a, b) => a.f - b.f)
      const current = openSet.shift()!

      // If we reached the end node
      if (current.name === endNodeName) {
        // Reconstruct path
        const path: string[] = []
        let currentNode: PathNode | undefined = current

        while (currentNode) {
          path.unshift(currentNode.name)
          currentNode = currentNode.parent
        }

        return path
      }

      // Add current node to closed set
      closedSet.add(current.name)

      // Get neighbors
      const neighbors = connectionMap.get(current.name) || []

      for (const neighbor of neighbors) {
        // Skip if neighbor is in closed set
        if (closedSet.has(neighbor.node)) continue

        const neighborNode = nodeMap.get(neighbor.node)
        if (!neighborNode) continue

        // Calculate g score
        const gScore = current.g + neighbor.distance

        // Check if neighbor is in open set
        const openNeighbor = openSet.find((n) => n.name === neighbor.node)

        if (!openNeighbor) {
          // Add neighbor to open set
          const hScore = Math.sqrt(Math.pow(endNode.x - neighborNode.x, 2) + Math.pow(endNode.y - neighborNode.y, 2))
          openSet.push({
            name: neighborNode.name,
            x: neighborNode.x,
            y: neighborNode.y,
            g: gScore,
            h: hScore,
            f: gScore + hScore,
            parent: current,
          })
        } else if (gScore < openNeighbor.g) {
          // Update neighbor's scores
          openNeighbor.g = gScore
          openNeighbor.f = gScore + openNeighbor.h
          openNeighbor.parent = current
        }
      }
    }

    // No path found
    return []
  }

  // Start robot simulation
  const startSimulation = () => {
    if (!robotRef.current || !sceneRef.current || isSimulating || !targetNode) return

    // Find start node (named "Start")
    const startNode = nodes.find((node) => node.name === "Start")
    if (!startNode) {
      alert("Start node not found! Please ensure there is a node named 'Start'.")
      return
    }

    // Find target node
    const targetNodeObj = nodes.find((node) => node.name === targetNode)
    if (!targetNodeObj) {
      alert("Target node not found!")
      return
    }

    // Find path
    const path = findPath("Start", targetNode)
    if (path.length === 0) {
      alert("No path found to target node!")
      return
    }

    setSimulationPath(path)
    setIsSimulating(true)

    // Ensure robot is visible
    if (robotGroupRef.current) {
      robotGroupRef.current.visible = true
    }

    // Position robot at start
    if (robotRef.current) {
      robotRef.current.position.set(startNode.x, 0.3, -startNode.y)

      // If there's a next node, orient robot towards it
      if (path.length > 1) {
        const nextNodeName = path[1]
        const nextNode = nodes.find((n) => n.name === nextNodeName)
        if (nextNode) {
          const angle = Math.atan2(-(nextNode.y - startNode.y), nextNode.x - startNode.x)
          robotRef.current.rotation.y = angle
        }
      }
    }

    // Draw path
    drawPath(path)

    // Animate robot along path
    animateRobotAlongPath(path)
  }

  // Draw path
  const drawPath = (path: string[]) => {
    if (!sceneRef.current) return

    // Remove existing path
    if (pathRef.current && sceneRef.current.children.includes(pathRef.current)) {
      sceneRef.current.remove(pathRef.current)
    }

    // Create node map for quick lookup
    const nodeMap = new Map(nodes.map((node) => [node.name, node]))

    // Create path points
    const points: THREE.Vector3[] = []
    path.forEach((nodeName) => {
      const node = nodeMap.get(nodeName)
      if (node) {
        points.push(new THREE.Vector3(node.x, 0.5, -node.y))
      }
    })

    // Create path line
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const material = new THREE.LineBasicMaterial({
      color: 0xff3e00,
      linewidth: 3,
    })
    const line = new THREE.Line(geometry, material)
    pathRef.current = line
    sceneRef.current.add(line)
  }

  // Animate robot along path
  const animateRobotAlongPath = (path: string[]) => {
    if (!robotRef.current || path.length < 2) return

    // Create node map for quick lookup
    const nodeMap = new Map(nodes.map((node) => [node.name, node]))

    // Position robot at start
    const startNode = nodeMap.get(path[0])
    if (startNode && robotRef.current) {
      robotRef.current.position.set(startNode.x, 0.3, -startNode.y)
    }

    // Create timeline for animation
    const timeline = gsap.timeline({
      onComplete: () => {
        setIsSimulating(false)

        // Add a celebration effect when reaching the destination
        if (robotRef.current) {
          gsap.to(robotRef.current.position, {
            y: 1.0,
            duration: 0.5,
            yoyo: true,
            repeat: 1,
            ease: "power1.inOut",
          })

          gsap.to(robotRef.current.rotation, {
            y: robotRef.current.rotation.y + Math.PI * 2,
            duration: 1,
            ease: "power1.inOut",
          })
        }
      },
    })

    // Animate through each point in the path
    for (let i = 1; i < path.length; i++) {
      const currentNode = nodeMap.get(path[i - 1])
      const nextNode = nodeMap.get(path[i])

      if (currentNode && nextNode && robotRef.current) {
        // Calculate direction for robot to face
        const angle = Math.atan2(-(nextNode.y - currentNode.y), nextNode.x - currentNode.x)

        // Add to timeline
        timeline.to(robotRef.current.rotation, {
          y: angle,
          duration: 0.5,
          ease: "power1.inOut",
        })

        // Move to next node with a slight bounce effect
        timeline.to(robotRef.current.position, {
          x: nextNode.x,
          z: -nextNode.y,
          y: 0.3 + Math.random() * 0.2, // Add slight random bounce
          duration: 2.0, // Slower for better visibility
          ease: "power2.inOut",
        })
      }
    }
  }

  // Reset simulation
  const resetSimulation = () => {
    setIsSimulating(false)
    setSimulationPath([])

    // Hide robot
    if (robotGroupRef.current) {
      robotGroupRef.current.visible = false
    }

    // Remove path
    if (pathRef.current && sceneRef.current && sceneRef.current.children.includes(pathRef.current)) {
      sceneRef.current.remove(pathRef.current)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
        <Card className="w-full max-w-md border-red-800 bg-red-950/20">
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 text-white">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Warehouse Monitoring</h1>
        <p className="text-zinc-300 mt-1">3D visualization of warehouse layout and inventory</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Controls Panel */}
        <Card className="border-zinc-800 bg-zinc-900 text-white lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Eye className="h-5 w-5 text-emerald-500" />
              Visibility Controls
            </CardTitle>
            <CardDescription className="text-zinc-400">Toggle elements visibility</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Network className="h-5 w-5 text-blue-500" />
                <Label htmlFor="nodes-toggle" className="text-white">
                  Nodes
                </Label>
              </div>
              <Switch id="nodes-toggle" checked={showNodes} onCheckedChange={setShowNodes} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Network className="h-5 w-5 text-emerald-500" />
                <Label htmlFor="connections-toggle" className="text-white">
                  Connections
                </Label>
              </div>
              <Switch id="connections-toggle" checked={showConnections} onCheckedChange={setShowConnections} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="h-5 w-5 text-amber-500" />
                <Label htmlFor="shelves-toggle" className="text-white">
                  Shelves
                </Label>
              </div>
              <Switch id="shelves-toggle" checked={showShelves} onCheckedChange={setShowShelves} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Cube className="h-5 w-5 text-purple-500" />
                <Label htmlFor="boxes-toggle" className="text-white">
                  Boxes
                </Label>
              </div>
              <Switch id="boxes-toggle" checked={showBoxes} onCheckedChange={setShowBoxes} />
            </div>

            <Separator className="my-4 bg-zinc-800" />

            {/* Robot Simulation Controls */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <Target className="h-5 w-5 text-orange-500" />
                Robot Simulation
              </h3>

              <div className="space-y-2">
                <Label htmlFor="target-node">Target Node</Label>
                <Select value={targetNode} onValueChange={setTargetNode} disabled={isSimulating}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="Select target node" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {nodes.map((node) => (
                      <SelectItem key={node.name} value={node.name}>
                        {node.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                  onClick={startSimulation}
                  disabled={isSimulating || !targetNode}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Start
                </Button>
                <Button
                  className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white"
                  onClick={resetSimulation}
                  disabled={!isSimulating && simulationPath.length === 0}
                >
                  <RotateCw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              </div>

              {simulationPath.length > 0 && (
                <div className="bg-zinc-800 p-3 rounded-lg">
                  <div className="text-zinc-400 text-sm mb-1">Path</div>
                  <div className="text-sm text-white">{simulationPath.join(" → ")}</div>
                </div>
              )}
            </div>

            <Separator className="my-4 bg-zinc-800" />

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">Statistics</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-800 p-3 rounded-lg">
                  <div className="text-zinc-400 text-sm">Nodes</div>
                  <div className="text-xl font-bold text-white">{nodes.length}</div>
                </div>

                <div className="bg-zinc-800 p-3 rounded-lg">
                  <div className="text-zinc-400 text-sm">Connections</div>
                  <div className="text-xl font-bold text-white">{connections.length}</div>
                </div>

                <div className="bg-zinc-800 p-3 rounded-lg">
                  <div className="text-zinc-400 text-sm">Shelves</div>
                  <div className="text-xl font-bold text-white">{shelves.length}</div>
                </div>

                <div className="bg-zinc-800 p-3 rounded-lg">
                  <div className="text-zinc-400 text-sm">Boxes</div>
                  <div className="text-xl font-bold text-white">{boxes.length}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3D Visualization */}
        <Card className="border-zinc-800 bg-zinc-900 text-white lg:col-span-3 h-[calc(100vh-16rem)]">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-white">
              <Cube className="h-5 w-5 text-emerald-500" />
              Warehouse 3D View
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-[calc(100%-4rem)]">
            <div ref={containerRef} className="w-full h-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
