/* eslint-disable */

// app/api/route.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

let currentHeading = 0

async function getNodePositions() {
  const nodes = await prisma.warehouseNode.findMany({
    include: { shelf: true }
  })

  const positions: Record<string, {
    coordinates: [number, number],
    shelfDetails?: {
      id: number,
      name: string,
      initialHeight: number,
      levelHeight: number,
      levels: number,
      tag: string,
      color: string | null
    }
  }> = {}

  for (const node of nodes) {
    positions[node.name] = {
      coordinates: [node.x, node.y],
      ...(node.shelf && {
        shelfDetails: {
          id: node.shelf.id,
          name: node.shelf.name,
          initialHeight: node.shelf.initialHeight,
          levelHeight: node.shelf.ShelfSlotHeight,
          levels: node.shelf.levels,
          tag: node.shelf.tag,
          color: node.shelf.color
        }
      })
    }
  }

  return positions
}

async function getWarehouseGraph() {
  const connections = await prisma.warehouseConnection.findMany({
    include: { nodeFrom: true, nodeTo: true }
  })

  const graph: Record<string, Array<[string, number]>> = {}
  for (const conn of connections) {
    if (!graph[conn.fromNode]) graph[conn.fromNode] = []
    graph[conn.fromNode].push([conn.toNode, conn.distance])
  }
  return graph
}

async function getShelfWithSlots(shelfId: number | null) {
  if (!shelfId) return null;
  
  const shelf = await prisma.shelf.findUnique({
    where: { id: shelfId },
    include: {
      slots: {
        include: {
          box: true
        },
        orderBy: {
          level: 'asc'
        }
      }
    }
  });
  
  if (!shelf) return null;
  
  // Calculate available and occupied slots
  const totalSlots = shelf.levels;
  const occupiedSlots = shelf.slots.filter(slot => slot.boxId !== null).length;
  const availableSlots = totalSlots - occupiedSlots;
  
  // Format the slot data
  const formattedSlots = shelf.slots.map(slot => ({
    id: slot.id,
    level: slot.level,
    isOccupied: slot.boxId !== null,
    box: slot.box ? {
      id: slot.box.id,
      tag: slot.box.tag,
      name: slot.box.name,
      dimensions: {
        width: slot.box.width,
        height: slot.box.height,
        depth: slot.box.depth
      },
      weight: slot.box.weight,
      color: slot.box.color
    } : null
  }));
  
  return {
    id: shelf.id,
    name: shelf.name,
    tag: shelf.tag,
    color: shelf.color,
    initialHeight: shelf.initialHeight,
    slotHeight: shelf.ShelfSlotHeight,
    levels: shelf.levels,
    capacity: {
      total: totalSlots,
      occupied: occupiedSlots,
      available: availableSlots,
      isFull: availableSlots === 0
    },
    slots: formattedSlots
  };
}

function getMovementInstruction(
  from: string,
  to: string,
  nodePositions: Record<string, { coordinates: [number, number], shelfDetails?: any }>
): string {
  const fromPos = nodePositions[from]?.coordinates
  const toPos = nodePositions[to]?.coordinates
  if (!fromPos || !toPos) return 'MOVE'

  const dx = toPos[0] - fromPos[0]
  const dy = toPos[1] - fromPos[1]

  let targetHeading: number
  if (Math.abs(dx) > Math.abs(dy)) {
    targetHeading = dx > 0 ? 0 : 180
  } else {
    targetHeading = dy < 0 ? 90 : 270
  }

  const turn = (targetHeading - currentHeading + 360) % 360
  let instr: string
  if (turn === 0) instr = 'MOVE_FORWARD'
  else if (turn === 90) instr = 'TURN_RIGHT_AND_MOVE'
  else if (turn === 180) instr = 'TURN_AROUND_AND_MOVE'
  else if (turn === 270) instr = 'TURN_LEFT_AND_MOVE'
  else if (turn < 45 || turn > 315) instr = 'MOVE_FORWARD'
  else if (turn < 135) instr = 'TURN_RIGHT_AND_MOVE'
  else if (turn < 225) instr = 'TURN_AROUND_AND_MOVE'
  else instr = 'TURN_LEFT_AND_MOVE'

  currentHeading = targetHeading
  return instr
}

function generateInstructions(
  path: string[],
  nodePositions: Record<string, { coordinates: [number, number], shelfDetails?: any }>,
  warehouseGraph: Record<string, Array<[string, number]>>
) {
  if (path.length < 2) return []
  currentHeading = 0

  const instructions: Array<{
    instruction: string,
    from: string,
    to: string,
    distance: number,
    shelfId: number | null
  }> = []

  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i]
    const to = path[i + 1]
    const instruction = getMovementInstruction(from, to, nodePositions)

    const edge = warehouseGraph[from]?.find(([n]) => n === to)
    const distance = edge ? edge[1] : 0
    
    const shelfId = nodePositions[to].shelfDetails?.id || null

    instructions.push({
      instruction,
      from,
      to,
      distance,
      shelfId
    })
  }

  return instructions
}

function dijkstra(
  start: string,
  goal: string,
  warehouseGraph: Record<string, Array<[string, number]>>
): [string[], number] {
  const distances = new Map<string, number>()
  const previous = new Map<string, string>()
  const queue = new Set<string>()

  for (const node of Object.keys(warehouseGraph)) {
    distances.set(node, Infinity)
    queue.add(node)
  }
  distances.set(start, 0)

  while (queue.size) {
    let currentNode = ''
    let minDist = Infinity
    for (const n of queue) {
      const d = distances.get(n) ?? Infinity
      if (d < minDist) {
        minDist = d
        currentNode = n
      }
    }
    if (!currentNode) break
    queue.delete(currentNode)
    if (currentNode === goal) break

    for (const [neighbor, weight] of warehouseGraph[currentNode] || []) {
      if (!queue.has(neighbor)) continue
      const alt = (distances.get(currentNode) ?? 0) + weight
      if (alt < (distances.get(neighbor) ?? Infinity)) {
        distances.set(neighbor, alt)
        previous.set(neighbor, currentNode)
      }
    }
  }

  const path: string[] = []
  let u = goal
  while (previous.has(u)) {
    path.unshift(u)
    u = previous.get(u)!
  }
  if (u === start) {
    path.unshift(start)
    return [path, distances.get(goal) ?? -1]
  }
  return [[], -1]
}

const requestSchema = z.object({
  name: z.string().min(1)
})

export async function POST(request: Request) {
  try {
    const { name: targetName } = requestSchema.parse(await request.json())

    const [nodePositions, warehouseGraph] = await Promise.all([
      getNodePositions(),
      getWarehouseGraph()
    ])

    const targetNode = await prisma.warehouseNode.findFirst({
      where: { name: targetName, isTag: true }
    })
    if (!targetNode) {
      return NextResponse.json(
        { error: `Tag node "${targetName}" not found.` },
        { status: 400 }
      )
    }

    const homeNode = await prisma.warehouseNode.findFirst({ where: { isHome: true } })
    if (!homeNode) {
      return NextResponse.json(
        { error: 'Home node not found.' },
        { status: 500 }
      )
    }

    const [path, distance] = dijkstra(homeNode.name, targetNode.name, warehouseGraph)
    if (path.length === 0) {
      return NextResponse.json(
        { error: 'No path found.' },
        { status: 404 }
      )
    }

    const instructions = generateInstructions(path, nodePositions, warehouseGraph)
    
    // Get shelf information at the destination node
    const destinationShelfId = nodePositions[targetNode.name]?.shelfDetails?.id || null;
    const destinationShelf = await getShelfWithSlots(destinationShelfId);
    
    // Find box with matching tag if exists
    const matchingBox = await prisma.box.findFirst({
      where: { tag: targetName },
      include: {
        slot: {
          include: {
            shelf: true
          }
        }
      }
    });

    // Get detailed shelf information for each node in the path
    const pathShelves = await Promise.all(
      path.map(async (nodeName) => {
        const shelfId = nodePositions[nodeName]?.shelfDetails?.id || null;
        if (shelfId) {
          return {
            nodeName,
            shelf: await getShelfWithSlots(shelfId)
          };
        }
        return { nodeName, shelf: null };
      })
    );

    const enhancedInstructions = await Promise.all(
      instructions.map(async (instruction) => {
        const shelf = instruction.shelfId ? 
          await getShelfWithSlots(instruction.shelfId) : null;
        
        return {
          ...instruction,
          shelf
        };
      })
    );

    return NextResponse.json({
      path,
      distance,
      instructions: enhancedInstructions,
      startNode: { 
        name: homeNode.name, 
        coordinates: nodePositions[homeNode.name].coordinates 
      },
      targetNode: { 
        name: targetNode.name, 
        coordinates: nodePositions[targetNode.name].coordinates,
        hasShelf: !!destinationShelfId,
      },
      destinationShelf: destinationShelf,
      matchingBox: matchingBox ? {
        id: matchingBox.id,
        tag: matchingBox.tag,
        name: matchingBox.name,
        dimensions: {
          width: matchingBox.width,
          height: matchingBox.height,
          depth: matchingBox.depth
        },
        weight: matchingBox.weight,
        color: matchingBox.color,
        location: matchingBox.slot ? {
          slotId: matchingBox.slot.id,
          level: matchingBox.slot.level,
          shelfId: matchingBox.slot.shelfId,
          shelfName: matchingBox.slot.shelf.name
        } : null
      } : null,
      pathShelves: pathShelves.filter(item => item.shelf !== null)
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: err.errors },
        { status: 400 }
      )
    }
    console.error(err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}