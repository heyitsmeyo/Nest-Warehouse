/* eslint-disable */

"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { z } from "zod"
import { BoxIcon, Trash2, Package, Layers, Scale, Ruler } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

// Schema for box data
const boxSchema = z.object({
  name: z.string().min(1).max(50),
  width: z.number().positive(),
  height: z.number().positive(),
  depth: z.number().positive(),
  weight: z.number().positive(),
  color: z.string().min(1).max(50),
  shelfId: z.number().int(),
  level: z.number().int().min(1),
  tag: z.string().min(1).max(50).optional(),
})

export default function BoxesPage() {
  const [shelves, setShelves] = useState<any[]>([])
  const [boxes, setBoxes] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [boxForm, setBoxForm] = useState({
    name: "",
    width: 0,
    height: 0,
    depth: 0,
    weight: 0,
    color: "#10b981", // Default color - emerald-500
    shelfId: 0,
    level: 1,
    tag: "",
  })

  // Fetch shelves and boxes data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const [shelvesResponse, boxesResponse] = await Promise.all([fetch("/api/shelves"), fetch("/api/boxes")])

        if (!shelvesResponse.ok || !boxesResponse.ok) {
          throw new Error("Failed to fetch data")
        }

        const [shelvesData, boxesData] = await Promise.all([shelvesResponse.json(), boxesResponse.json()])

        setShelves(shelvesData)
        setBoxes(boxesData)
      } catch (err) {
        console.error("Error fetching data:", err)
        setError("Failed to load data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Validate form data
      const formData = {
        name: boxForm.name,
        width: boxForm.width,
        height: boxForm.height,
        depth: boxForm.depth,
        weight: boxForm.weight,
        color: boxForm.color,
        shelfId: boxForm.shelfId,
        level: boxForm.level,
        tag: boxForm.tag,
      }

      const response = await fetch("/api/boxes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create box")
      }

      const newBox = await response.json()
      setBoxes((prev) => [...prev, newBox])
      setBoxForm({
        name: "",
        width: 0,
        height: 0,
        depth: 0,
        weight: 0,
        color: "#10b981",
        shelfId: 0,
        level: 1,
        tag: "",
      })
      alert("Box created successfully!")
    } catch (error) {
      console.error("Error creating box:", error)
      alert(error instanceof Error ? error.message : "Failed to create box")
    }
  }

  const handleDeleteBox = async (boxId: number) => {
    if (!confirm("Are you sure you want to delete this box?")) {
      return
    }

    try {
      const response = await fetch(`/api/boxes/${boxId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete box")
      }

      setBoxes((prev) => prev.filter((box) => box.id !== boxId))
      alert("Box deleted successfully!")
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete box")
    }
  }

  // Get available levels for the selected shelf
  const selectedShelf = shelves.find((s) => s.id === boxForm.shelfId)
  const availableLevels = selectedShelf ? Array.from({ length: selectedShelf.levels }, (_, i) => i + 1) : []

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
        <h1 className="text-3xl font-bold tracking-tight text-white">Boxes Management</h1>
        <p className="text-zinc-300 mt-1">Create and manage warehouse boxes</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Create Box Form */}
        <div className="space-y-6">
          <Card className="border-zinc-800 bg-zinc-900 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Package className="h-5 w-5 text-emerald-500" />
                Create New Box
              </CardTitle>
              <CardDescription className="text-zinc-400">Fill in the details to create a new box</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-white">
                    Box Name
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={boxForm.name}
                    onChange={(e) => setBoxForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="bg-zinc-800 border-zinc-700 text-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="width" className="flex items-center gap-1 text-white">
                      <Ruler className="h-3.5 w-3.5" />
                      Width (cm)
                    </Label>
                    <Input
                      id="width"
                      type="number"
                      value={boxForm.width}
                      onChange={(e) => setBoxForm((prev) => ({ ...prev, width: Number(e.target.value) }))}
                      className="bg-zinc-800 border-zinc-700 text-white"
                      required
                      min="0"
                      step="0.1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="height" className="flex items-center gap-1 text-white">
                      <Ruler className="h-3.5 w-3.5" />
                      Height (cm)
                    </Label>
                    <Input
                      id="height"
                      type="number"
                      value={boxForm.height}
                      onChange={(e) => setBoxForm((prev) => ({ ...prev, height: Number(e.target.value) }))}
                      className="bg-zinc-800 border-zinc-700 text-white"
                      required
                      min="0"
                      step="0.1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="depth" className="flex items-center gap-1 text-white">
                      <Ruler className="h-3.5 w-3.5" />
                      Depth (cm)
                    </Label>
                    <Input
                      id="depth"
                      type="number"
                      value={boxForm.depth}
                      onChange={(e) => setBoxForm((prev) => ({ ...prev, depth: Number(e.target.value) }))}
                      className="bg-zinc-800 border-zinc-700 text-white"
                      required
                      min="0"
                      step="0.1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weight" className="flex items-center gap-1 text-white">
                      <Scale className="h-3.5 w-3.5" />
                      Weight (kg)
                    </Label>
                    <Input
                      id="weight"
                      type="number"
                      value={boxForm.weight}
                      onChange={(e) => setBoxForm((prev) => ({ ...prev, weight: Number(e.target.value) }))}
                      className="bg-zinc-800 border-zinc-700 text-white"
                      required
                      min="0"
                      step="0.1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="color" className="text-white">
                    Box Color
                  </Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={boxForm.color}
                      onChange={(e) => setBoxForm((prev) => ({ ...prev, color: e.target.value }))}
                      className="h-10 w-10 rounded cursor-pointer"
                    />
                    <Input
                      id="color"
                      type="text"
                      value={boxForm.color}
                      onChange={(e) => setBoxForm((prev) => ({ ...prev, color: e.target.value }))}
                      className="flex-1 bg-zinc-800 border-zinc-700 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shelf" className="text-white">
                    Select Shelf
                  </Label>
                  <select
                    id="shelf"
                    value={boxForm.shelfId}
                    onChange={(e) => setBoxForm((prev) => ({ ...prev, shelfId: Number(e.target.value) }))}
                    className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 text-white"
                    required
                  >
                    <option value="">Select a shelf</option>
                    {shelves.map((shelf) => (
                      <option key={shelf.id} value={shelf.id}>
                        {shelf.name} - {shelf.location?.name || "Unknown Location"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="level" className="text-white">
                    Select Level
                  </Label>
                  <select
                    id="level"
                    value={boxForm.level}
                    onChange={(e) => setBoxForm((prev) => ({ ...prev, level: Number(e.target.value) }))}
                    className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 text-white"
                    required
                    disabled={!boxForm.shelfId}
                  >
                    <option value="">Select a level</option>
                    {availableLevels.map((level) => (
                      <option key={level} value={level}>
                        Level {level}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tag" className="text-white">
                    Tag (Optional)
                  </Label>
                  <Input
                    id="tag"
                    type="text"
                    value={boxForm.tag}
                    onChange={(e) => setBoxForm((prev) => ({ ...prev, tag: e.target.value }))}
                    className="bg-zinc-800 border-zinc-700 text-white"
                    placeholder="Optional tag name"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={!boxForm.shelfId}
                >
                  <Package className="mr-2 h-4 w-4" />
                  Create Box
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Available Shelves */}
          <Card className="border-zinc-800 bg-zinc-900 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Layers className="h-5 w-5 text-emerald-500" />
                Available Shelves
              </CardTitle>
              <CardDescription className="text-zinc-400">Shelves where boxes can be placed</CardDescription>
            </CardHeader>
            <CardContent className="max-h-[300px] overflow-y-auto pr-2">
              <div className="space-y-4">
                {shelves.length === 0 ? (
                  <div className="bg-zinc-800/50 p-4 rounded-lg text-center text-zinc-300">
                    No shelves available. Create shelves first.
                  </div>
                ) : (
                  shelves.map((shelf) => (
                    <div key={shelf.id} className="bg-zinc-800 p-4 rounded-lg border border-zinc-700">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-lg text-white flex items-center gap-2">
                            {shelf.name}
                            {shelf.tag && (
                              <Badge
                                className="ml-2"
                                style={{
                                  backgroundColor: shelf.color || "#10b981",
                                  color: "white",
                                }}
                              >
                                {shelf.tag}
                              </Badge>
                            )}
                          </h3>
                          <Separator className="my-2 bg-zinc-700" />
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                            <p className="text-zinc-400">Location:</p>
                            <p className="text-zinc-300">{shelf.location?.name || "Unknown"}</p>

                            <p className="text-zinc-400">Height:</p>
                            <p className="text-zinc-300">{shelf.initialHeight}cm</p>

                            <p className="text-zinc-400">Levels:</p>
                            <p className="text-zinc-300">{shelf.levels}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Existing Boxes */}
        <Card className="border-zinc-800 bg-zinc-900 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <BoxIcon className="h-5 w-5 text-emerald-500" />
              Existing Boxes
            </CardTitle>
            <CardDescription className="text-zinc-400">All boxes in the warehouse</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[700px] overflow-y-auto pr-2">
            {boxes.length === 0 ? (
              <div className="bg-zinc-800/50 p-4 rounded-lg text-center text-zinc-300">
                No boxes created yet. Create your first box.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {boxes.map((box) => (
                  <div key={box.id} className="bg-zinc-800 p-4 rounded-lg border border-zinc-700">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-lg text-white">{box.name}</h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteBox(box.id)}
                        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-950/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div
                      className="w-full h-16 mt-2 rounded-md flex items-center justify-center"
                      style={{ backgroundColor: box.color || "#10b981" }}
                    >
                      <Package className="h-8 w-8 text-white" />
                    </div>

                    <Separator className="my-3 bg-zinc-700" />

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <p className="text-zinc-400">Shelf:</p>
                      <p className="text-zinc-300">{box.slot?.shelf?.name || "Unknown"}</p>

                      <p className="text-zinc-400">Level:</p>
                      <p className="text-zinc-300">{box.slot?.level || "Unknown"}</p>

                      <p className="text-zinc-400">Dimensions:</p>
                      <p className="text-zinc-300">
                        {box.width}x{box.height}x{box.depth} cm
                      </p>

                      <p className="text-zinc-400">Weight:</p>
                      <p className="text-zinc-300">{box.weight} kg</p>
                    </div>

                    {box.tag && (
                      <Badge
                        className="mt-3 w-full justify-center"
                        style={{
                          backgroundColor: box.color || "#10b981",
                          color: "white",
                        }}
                      >
                        {box.tag}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
