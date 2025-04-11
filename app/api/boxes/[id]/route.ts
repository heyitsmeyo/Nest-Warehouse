import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const boxSchema = z.object({
  tag: z.enum(['TAG1', 'TAG2', 'TAG3']).optional(),
  color: z.string().min(1).max(50).optional(),
})

export async function GET(
  request: Request,
  // ① destructure params here
  context: { params: Promise<{ id: string }> }
) {
  try {
    // ② await the params promise
    const { id: idStr } = await context.params
    const id = parseInt(idStr, 10)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid box ID' }, { status: 400 })
    }

    const box = await prisma.box.findUnique({
      where: { id },
      include: { slot: true },
    })

    if (!box) {
      return NextResponse.json({ error: 'Box not found' }, { status: 404 })
    }

    return NextResponse.json(box)
  } catch (error) {
    console.error('Error fetching box:', error)
    return NextResponse.json({ error: 'Failed to fetch box' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await context.params
    const id = parseInt(idStr, 10)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid box ID' }, { status: 400 })
    }

    const body = await request.json()
    const validatedData = boxSchema.parse(body)

    const box = await prisma.box.update({
      where: { id },
      data: validatedData,
      include: { slot: true },
    })

    return NextResponse.json(box)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating box:', error)
    return NextResponse.json({ error: 'Failed to update box' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await context.params
    const id = parseInt(idStr, 10)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid box ID' }, { status: 400 })
    }

    await prisma.box.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting box:', error)
    return NextResponse.json({ error: 'Failed to delete box' }, { status: 500 })
  }
}
