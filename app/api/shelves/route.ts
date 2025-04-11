import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

const shelfSchema = z.object({
  name: z.string().min(1).max(50),
  initialHeight: z.number().positive(),
  ShelfSlotHeight: z.number().positive(),
  levels: z.number().int().min(1).max(10).optional(),
  locationId: z.string(),
  tag: z.string().min(1).max(50),
  color: z.string().min(1).max(50).optional(),
})

export async function GET() {
  try {
    const shelves = await prisma.shelf.findMany({
      include: {
        location: true,
        slots: {
          include: {
            box: true,
          },
        },
      },
    })
    return NextResponse.json(shelves)
  } catch (error) {
    console.error('Error fetching shelves:', error)
    return NextResponse.json(
      { error: 'Failed to fetch shelves' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validatedData = shelfSchema.parse(body)

    // First, check if the location exists
    const location = await prisma.warehouseNode.findUnique({
      where: { name: validatedData.locationId },
    })

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    const shelf = await prisma.shelf.create({
      data: {
        name: validatedData.name,
        initialHeight: validatedData.initialHeight,
        ShelfSlotHeight: validatedData.ShelfSlotHeight,
        levels: validatedData.levels || 2,
        tag: validatedData.tag,
        color: validatedData.color,
        location: {
          connect: { name: validatedData.locationId }
        },
        slots: {
          create: Array.from({ length: validatedData.levels || 2 }, (_, i) => ({
            level: i + 1,
          })),
        },
      },
      include: {
        location: true,
        slots: {
          include: {
            box: true,
          },
        },
      },
    })

    return NextResponse.json(shelf, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Shelf name already exists' },
          { status: 400 }
        )
      }
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Location not found' },
          { status: 404 }
        )
      }
    }
    console.error('Error creating shelf:', error)
    return NextResponse.json(
      { error: 'Failed to create shelf' },
      { status: 500 }
    )
  }
} 