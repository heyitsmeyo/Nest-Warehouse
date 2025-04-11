/* eslint-disable */

"use client"

import type React from "react"

import { useState, useEffect } from "react"
import ReactFlow, {
  type Node,
  type Edge,
  Background,
  Controls,
  Position,
  useNodesState,
  useEdgesState,
} from "reactflow"
import "reactflow/dist/style.css"
import { z } from "zod"
import { Trash2 } from "lucide-react"

// Schema for warehouse data
const warehouseDataSchema = z
  .object({
    nodes: z.array(
      z.object({
        name: z.string(),
        x: z.number(),
        y: z.number(),
        isHome: z.boolean().optional(),
        isTag: z.boolean().optional(),
        tagColor: z.string().optional(),
        shelfId: z.number().optional(),
      }),
    ),
    connections: z.array(
      z.object({
        fromNode: z.string(),
        toNode: z.string(),
        distance: z.number(),
      }),
    ),
  })
  .optional()

// Schema for shelf data
const shelfSchema = z.object({
  name: z.string().min(1).max(50),
  initialHeight: z.number().positive(),
  ShelfSlotHeight: z.number().positive(),
  levels: z.number().int().min(1).max(10).optional(),
  locationId: z.string(),
  tag: z.string().min(1).max(50).optional(),
  color: z.string().min(1).max(50).optional(),
})

export default function ShelvesPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [data, setData] = useState<any>(null)
  const [shelves, setShelves] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [shelfForm, setShelfForm] = useState({
    name: "",
    initialHeight: 0,
    ShelfSlotHeight: 0,
    levels: 2,
    locationId: "",
    tag: "",
    color: "#4F46E5", // Default color
  })

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const [warehouseResponse, shelvesResponse] = await Promise.all([
          fetch("/api/warehouse/bulk"),
          fetch("/api/shelves"),
        ])

        if (!warehouseResponse.ok || !shelvesResponse.ok) {
          throw new Error("Failed to fetch data")
        }

        const [warehouseData, shelvesData] = await Promise.all([warehouseResponse.json(), shelvesResponse.json()])

        // Handle warehouse data
        if (!warehouseData || !warehouseData.nodes || !warehouseData.connections) {
          setData({ nodes: [], connections: [] })
        } else {
          try {
            const validatedData = warehouseDataSchema.parse(warehouseData)
            setData(validatedData)
          } catch (validationError) {
            console.error("Data validation error:", validationError)
            setData(warehouseData)
          }
        }

        // Set shelves data
        setShelves(shelvesData)
      } catch (err) {
        console.error("Error fetching data:", err)
        setError("Failed to load data")
        setData({ nodes: [], connections: [] })
        setShelves([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Update nodes and edges when data changes
  useEffect(() => {
    if (!data || !data.nodes || !data.connections) {
      setNodes([])
      setEdges([])
      return
    }

    const newNodes: Node[] = data.nodes.map((node: any) => {
      // Find if this node has shelves
      const nodeHasShelves = shelves.some((shelf) => shelf.locationId === node.name)

      return {
        id: node.name,
        position: { x: node.x * 100, y: -node.y * 100 },
        data: {
          label: node.name,
          hasShelves: nodeHasShelves || node.shelfId, // Pass this to custom renderer if needed
        },
        style: {
          width: nodeHasShelves || node.shelfId ? 80 : 60, // Make shelf nodes bigger
          height: nodeHasShelves || node.shelfId ? 80 : 60,
          borderRadius: nodeHasShelves || node.shelfId ? "0%" : "50%", // Square for shelves, circle for regular
          background:
            nodeHasShelves || node.shelfId
              ? "linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #EC4899 100%)"
              : "#3B82F6",
          color: "white",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: nodeHasShelves || node.shelfId ? "16px" : "14px", // Larger text for shelf nodes
          fontWeight: "bold",
          border:
            nodeHasShelves || node.shelfId
              ? "3px dashed #FDE68A" // Gold dashed border for shelves
              : "2px solid white",
          boxShadow:
            nodeHasShelves || node.shelfId
              ? "0 0 15px rgba(217, 119, 6, 0.5)" // Glow effect for shelves
              : "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        },
        // You could also add a shelf icon or marker
        sourcePosition: Position.Top,
        targetPosition: Position.Top,
      }
    })

    const newEdges: Edge[] = data.connections.map((connection: any) => ({
      id: `e${connection.fromNode}-${connection.toNode}`,
      source: connection.fromNode,
      target: connection.toNode,
      type: "straight",
      style: {
        stroke: "#3b82f6",
        strokeWidth: 2,
      },
      label: connection.distance.toString(),
      labelStyle: {
        fill: "#ffffff",
        fontSize: 12,
        fontWeight: "bold",
      },
      labelBgStyle: {
        fill: "#1e293b",
        opacity: 0.8,
      },
      labelBgPadding: [4, 4],
      labelBgBorderRadius: 4,
    }))

    setNodes(newNodes)
    setEdges(newEdges)
  }, [data, setNodes, setEdges, shelves])

  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id)
    setShelfForm((prev) => ({
      ...prev,
      locationId: node.id,
    }))
  }

  const handleShelfSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const validatedData = shelfSchema.parse(shelfForm)
      const response = await fetch("/api/shelves", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validatedData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create shelf")
      }

      const newShelf = await response.json()
      setShelves((prev) => [...prev, newShelf])
      alert("Shelf created successfully!")
      setShelfForm({
        name: "",
        initialHeight: 0,
        ShelfSlotHeight: 0,
        levels: 2,
        locationId: "",
        tag: "",
        color: "#4F46E5",
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        alert("Invalid shelf data: " + error.errors.map((e) => e.message).join(", "))
      } else {
        alert(error instanceof Error ? error.message : "Failed to create shelf")
      }
    }
  }

  const handleDeleteShelf = async (shelfId: number) => {
    if (!confirm("Are you sure you want to delete this shelf?")) {
      return
    }

    try {
      const response = await fetch(`/api/shelves/${shelfId}/remove`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete shelf")
      }

      // Remove the shelf from the local state
      setShelves((prev) => prev.filter((shelf) => shelf.id !== shelfId))
      alert("Shelf deleted successfully!")
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete shelf")
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-red-500 bg-red-950/20 p-4 rounded-lg border border-red-800">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shelves Management</h1>
          <p className="text-zinc-400 mt-1">Create and manage warehouse shelves</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-12rem)]">
        {/* Left panel - Shelf Form and List */}
        <div className="w-full lg:w-1/3 overflow-y-auto bg-zinc-900 rounded-lg border border-zinc-800 p-4">
          <h2 className="text-xl font-bold mb-4">Create Shelf</h2>
          <form onSubmit={handleShelfSubmit} className="space-y-4 mb-8">
            <div>
              <label className="block text-sm font-medium mb-1">Shelf Name</label>
              <input
                type="text"
                value={shelfForm.name}
                onChange={(e) => setShelfForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-100"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Initial Height (cm)</label>
              <input
                type="number"
                value={shelfForm.initialHeight}
                onChange={(e) => setShelfForm((prev) => ({ ...prev, initialHeight: Number(e.target.value) }))}
                className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-100"
                required
                min="0"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Shelf Slot Height (cm)</label>
              <input
                type="number"
                value={shelfForm.ShelfSlotHeight}
                onChange={(e) => setShelfForm((prev) => ({ ...prev, ShelfSlotHeight: Number(e.target.value) }))}
                className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-100"
                required
                min="0"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Number of Levels</label>
              <input
                type="number"
                value={shelfForm.levels}
                onChange={(e) => setShelfForm((prev) => ({ ...prev, levels: Number(e.target.value) }))}
                className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-100"
                min="1"
                max="10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Selected Location</label>
              <input
                type="text"
                value={selectedNode || "No location selected"}
                className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-100"
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tag</label>
              <input
                type="text"
                value={shelfForm.tag}
                onChange={(e) => setShelfForm((prev) => ({ ...prev, tag: e.target.value }))}
                className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-100"
                placeholder="Optional tag name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={shelfForm.color}
                  onChange={(e) => setShelfForm((prev) => ({ ...prev, color: e.target.value }))}
                  className="h-10 w-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={shelfForm.color}
                  onChange={(e) => setShelfForm((prev) => ({ ...prev, color: e.target.value }))}
                  className="flex-1 p-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-100"
                  placeholder="#4F46E5"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded transition-colors"
              disabled={!selectedNode}
            >
              Create Shelf
            </button>
          </form>

          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Existing Shelves</h2>
            <div className="space-y-4">
              {shelves.length === 0 ? (
                <div className="bg-zinc-800/50 p-4 rounded-lg text-center text-zinc-400">No shelves created yet</div>
              ) : (
                shelves.map((shelf) => (
                  <div key={shelf.id} className="bg-zinc-800 p-4 rounded-lg border border-zinc-700">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex justify-between items-center">
                          <h3 className="font-semibold text-lg">{shelf.name}</h3>
                          <button
                            onClick={() => handleDeleteShelf(shelf.id)}
                            className="text-red-400 hover:text-red-300 p-1 transition-colors"
                            title="Delete shelf"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                        <p className="text-zinc-300">Location: {shelf.location?.name || "Unknown"}</p>
                        <p className="text-zinc-300">Height: {shelf.initialHeight}cm</p>
                        <p className="text-zinc-300">Slot Height: {shelf.ShelfSlotHeight}cm</p>
                        <p className="text-zinc-300">Levels: {shelf.levels}</p>
                        {shelf.tag && (
                          <div className="flex items-center mt-2">
                            <div
                              className="w-4 h-4 rounded-full mr-2"
                              style={{ backgroundColor: shelf.color || "#4F46E5" }}
                            />
                            <span className="text-zinc-300">{shelf.tag}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-zinc-400">{shelf.slots?.length || 0} slots</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right panel - Graph Visualization */}
        <div className="w-full lg:w-2/3 h-full bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            fitView
            defaultEdgeOptions={{
              type: "straight",
              style: {
                stroke: "#3b82f6",
                strokeWidth: 2,
              },
              labelStyle: {
                fill: "#ffffff",
                fontSize: 12,
                fontWeight: "bold",
              },
              labelBgStyle: {
                fill: "#1e293b",
                opacity: 0.8,
              },
              labelBgPadding: [4, 4],
              labelBgBorderRadius: 4,
            }}
            minZoom={0.1}
            maxZoom={4}
            defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#27272a" gap={16} />
            <Controls
              className="bg-zinc-800 text-white p-2 rounded-lg shadow-lg"
              style={{
                backgroundColor: "#18181b",
                border: "1px solid #3f3f46",
              }}
            />
          </ReactFlow>
        </div>
      </div>
    </div>
  )
}
