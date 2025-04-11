import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

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

// GET handler to fetch all boxes
export async function GET() {
  try {
    const boxes = await prisma.box.findMany({
      include: {
        slot: {
          include: {
            shelf: true,
          },
        },
      },
    })
    return NextResponse.json(boxes)
  } catch (error) {
    console.error('Error fetching boxes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch boxes' },
      { status: 500 }
    )
  }
}

// POST handler to create a new box
export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('Received box data:', body)

    // Validate the request body
    const validatedData = boxSchema.parse({
      ...body,
      width: Number(body.width),
      height: Number(body.height),
      depth: Number(body.depth),
      weight: Number(body.weight),
      shelfId: Number(body.shelfId),
      level: Number(body.level),
    })

    // Check if shelf exists and get its details
    const shelf = await prisma.shelf.findUnique({
      where: { id: validatedData.shelfId },
      include: {
        slots: true,
      },
    })

    if (!shelf) {
      return NextResponse.json(
        { error: 'Shelf not found' },
        { status: 404 }
      )
    }

    // Validate level is within shelf's range
    if (validatedData.level > shelf.levels) {
      return NextResponse.json(
        { error: `Invalid level. Shelf only has ${shelf.levels} levels.` },
        { status: 400 }
      )
    }

    // Check if slot at this level already exists and is occupied
    const existingSlot = shelf.slots.find(slot => slot.level === validatedData.level)
    if (existingSlot && existingSlot.boxId) {
      return NextResponse.json(
        { error: `Level ${validatedData.level} is already occupied` },
        { status: 400 }
      )
    }

    // Create or update the slot and box in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create or update the slot
      const slot = existingSlot 
        ? await tx.shelfSlot.update({
            where: { id: existingSlot.id },
            data: { level: validatedData.level },
          })
        : await tx.shelfSlot.create({
            data: {
              level: validatedData.level,
              shelf: { connect: { id: validatedData.shelfId } },
            },
          })

      // Create the box and connect it to the slot
      const box = await tx.box.create({
        data: {
          name: validatedData.name,
          width: validatedData.width,
          height: validatedData.height,
          depth: validatedData.depth,
          weight: validatedData.weight,
          color: validatedData.color,
          tag: validatedData.tag || '',
          slot: {
            connect: { id: slot.id }
          },
        },
        include: {
          slot: {
            include: {
              shelf: true,
            },
          },
        },
      })

      return box
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors)
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Box name already exists' },
          { status: 400 }
        )
      }
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Shelf or slot not found' },
          { status: 404 }
        )
      }
    }
    console.error('Error creating box:', error)
    return NextResponse.json(
      { error: 'Failed to create box' },
      { status: 500 }
    )
  }
} 