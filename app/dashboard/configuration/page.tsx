/* eslint-disable */

"use client"

import { useState, useEffect, useCallback } from "react"
import ReactFlow, {
  type Node,
  type Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Position,
} from "reactflow"
import Editor from "@monaco-editor/react"
import "reactflow/dist/style.css"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, Save, RefreshCw } from "lucide-react"

interface WarehouseNode {
  name: string
  x: number
  y: number
  isHome: boolean
  isTag: boolean
  tagColor?: string
}

interface WarehouseConnection {
  fromNode: string
  toNode: string
  distance: number
}

interface WarehouseData {
  nodes: WarehouseNode[]
  connections: WarehouseConnection[]
}

const defaultData: WarehouseData = {
  nodes: [],
  connections: [],
}

export default function WarehouseConfigurationPage() {
  const [data, setData] = useState<WarehouseData>(defaultData)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [editorValue, setEditorValue] = useState<string>(JSON.stringify(defaultData, null, 2))
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch("/api/warehouse/bulk")
      const warehouseData = await response.json()

      if (!response.ok) {
        if (response.status === 503) {
          setError("Database connection error. Please try again later.")
          console.error("Database connection error:", warehouseData.error)
          setData(defaultData)
          setEditorValue(JSON.stringify(defaultData, null, 2))
          return
        }
        throw new Error(warehouseData.error || "Failed to fetch data")
      }

      // Ensure we have valid data structure
      const transformedData: WarehouseData = {
        nodes: Array.isArray(warehouseData.nodes)
          ? warehouseData.nodes.map((node: any) => ({
              name: node.name || "",
              x: Number(node.x) || 0,
              y: Number(node.y) || 0,
              isHome: Boolean(node.isHome),
              isTag: Boolean(node.isTag),
              tagColor: node.tagColor || undefined,
            }))
          : [],
        connections: Array.isArray(warehouseData.connections)
          ? warehouseData.connections.map((conn: any) => ({
              fromNode: conn.fromNode || "",
              toNode: conn.toNode || "",
              distance: Number(conn.distance) || 0,
            }))
          : [],
      }

      setData(transformedData)
      setEditorValue(JSON.stringify(transformedData, null, 2))
    } catch (error) {
      console.error("Error fetching data:", error)
      setError(error instanceof Error ? error.message : "Failed to fetch data")
      setData(defaultData)
      setEditorValue(JSON.stringify(defaultData, null, 2))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (!data || !data.nodes || !data.connections) {
      setNodes([])
      setEdges([])
      return
    }

    const newNodes: Node[] = data.nodes.map((node) => ({
      id: node.name,
      position: { x: node.x * 100, y: -node.y * 100 },
      data: { label: node.name },
      style: {
        background: node.isHome ? "#10b981" : node.isTag ? node.tagColor || "#f59e0b" : "#3f3f46",
        color: "#ffffff",
        border: "2px solid #27272a",
        borderRadius: "50%",
        width: 60,
        height: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        fontSize: "14px",
        fontWeight: "bold",
      },
      sourcePosition: Position.Top,
      targetPosition: Position.Top,
    }))

    const newEdges: Edge[] = data.connections.map((connection) => ({
      id: `e${connection.fromNode}-${connection.toNode}`,
      source: connection.fromNode,
      target: connection.toNode,
      type: "straight",
      style: {
        stroke: "#10b981",
        strokeWidth: 2,
      },
      label: connection.distance.toString(),
      labelStyle: {
        fill: "#ffffff",
        fontSize: 12,
        fontWeight: "bold",
      },
      labelBgStyle: {
        fill: "#18181b",
        opacity: 0.8,
      },
      labelBgPadding: [4, 4],
      labelBgBorderRadius: 4,
    }))

    setNodes(newNodes)
    setEdges(newEdges)
  }, [data, setNodes, setEdges])

  const handleEditorChange = (value: string | undefined) => {
    if (value) {
      setEditorValue(value)
      try {
        const parsedData = JSON.parse(value)
        setData(parsedData)
      } catch (error) {
        console.error("Invalid JSON:", error)
      }
    }
  }

  const handleUpdate = async () => {
    try {
      setIsSaving(true)
      setError(null)

      const response = await fetch("/api/warehouse/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: editorValue,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update data")
      }

      await fetchData()
    } catch (error) {
      console.error("Error updating data:", error)
      setError(error instanceof Error ? error.message : "Failed to update data")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete all warehouse configuration data? This action cannot be undone.")) {
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch("/api/warehouse/bulk/clear", {
        method: "DELETE",
      })

      if (response.ok) {
        setData(defaultData)
        setEditorValue(JSON.stringify(defaultData, null, 2))
        await fetchData()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete data")
      }
    } catch (error) {
      console.error("Error deleting data:", error)
      setError(error instanceof Error ? error.message : "Failed to delete data")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Warehouse Configuration</h1>
        <p className="text-zinc-400 mt-1">Define and visualize your warehouse layout</p>
      </div>

      {error && (
        <Card className="border-red-800 bg-red-950/20">
          <CardContent className="pt-6">
            <p className="text-red-500">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-12rem)]">
        {/* Left panel - JSON Editor */}
        <Card className="border-zinc-800 bg-zinc-900 overflow-hidden">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xl text-white">Configuration Editor</CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={handleUpdate}
                disabled={isLoading || isSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                size="sm"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button onClick={handleDelete} disabled={isLoading} variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 h-[calc(100%-4rem)]">
            <Editor
              height="100%"
              defaultLanguage="json"
              value={editorValue}
              onChange={handleEditorChange}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: "on",
                roundedSelection: false,
                scrollBeyondLastLine: false,
                readOnly: isLoading,
              }}
              loading={
                <div className="flex items-center justify-center h-full bg-zinc-900">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
                </div>
              }
            />
          </CardContent>
        </Card>

        {/* Right panel - Graph Visualization */}
        <Card className="border-zinc-800 bg-zinc-900 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl text-white">Warehouse Layout</CardTitle>
          </CardHeader>
          <CardContent className="p-0 h-[calc(100%-4rem)]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
              </div>
            ) : (
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                fitView
                defaultEdgeOptions={{
                  type: "straight",
                  style: {
                    stroke: "#10b981",
                    strokeWidth: 2,
                  },
                  labelStyle: {
                    fill: "#ffffff",
                    fontSize: 12,
                    fontWeight: "bold",
                  },
                  labelBgStyle: {
                    fill: "#18181b",
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
