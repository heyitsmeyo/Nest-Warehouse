import { WebSocketServer, WebSocket } from 'ws'
import { NextResponse } from 'next/server'
import { IncomingMessage } from 'http'

// Store active robot connections
const robotConnections = new Map<string, WebSocket>()

// Store robot states
const robotStates = new Map<string, {
  position: string
  heading: number
  status: 'idle' | 'moving' | 'error'
  lastCommand?: string
  lastUpdate: Date
}>()

// Create a single WebSocket server instance
const wss = new WebSocketServer({ noServer: true })

export async function GET(request: Request) {
  if (!request.headers.get('upgrade')?.includes('websocket')) {
    return NextResponse.json({ error: 'Not a WebSocket request' }, { status: 400 })
  }

  // Convert Request to IncomingMessage
  const req = request as unknown as IncomingMessage
  
  // Handle WebSocket upgrade
  const ws = await new Promise<WebSocket>((resolve) => {
    wss.handleUpgrade(req, req.socket, Buffer.alloc(0), (ws) => {
      resolve(ws)
    })
  })

  // Handle new connection
  ws.on('open', () => {
    console.log('New robot connection')
  })

  // Handle messages
  ws.on('message', async (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString())
      console.log('Received message:', message)
      
      // Echo back the message (matching ESP32 behavior)
      ws.send(JSON.stringify(message))
      
      switch (message.type) {
        case 'register':
          // Register new robot
          const robotId = message.robotId
          robotConnections.set(robotId, ws)
          robotStates.set(robotId, {
            position: 'HOME',
            heading: 0,
            status: 'idle',
            lastUpdate: new Date()
          })
          ws.send(JSON.stringify({ type: 'registered', robotId }))
          break

        case 'status':
          // Update robot status
          const state = robotStates.get(message.robotId)
          if (state) {
            state.position = message.position
            state.heading = message.heading
            state.status = message.status
            state.lastUpdate = new Date()
          }
          break

        case 'command':
          // Forward command to specific robot
          const targetRobot = robotConnections.get(message.robotId)
          if (targetRobot) {
            targetRobot.send(JSON.stringify({
              type: 'command',
              command: message.command,
              params: message.params
            }))
          }
          break

        case 'emergency_stop':
          // Broadcast emergency stop to all robots
          robotConnections.forEach(robot => {
            robot.send(JSON.stringify({
              type: 'emergency_stop'
            }))
          })
          break
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error)
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }))
    }
  })

  // Handle disconnection
  ws.on('close', () => {
    // Find and remove the disconnected robot
    for (const [robotId, connection] of robotConnections.entries()) {
      if (connection === ws) {
        robotConnections.delete(robotId)
        robotStates.delete(robotId)
        console.log(`Robot ${robotId} disconnected`)
        break
      }
    }
  })

  return new NextResponse(null, { status: 101 })
} 