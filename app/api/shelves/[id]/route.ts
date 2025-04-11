import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Get the shelf ID from the URL parameters
    const { id: idStr } = await context.params
    const shelfId = parseInt(idStr, 10)
    
    if (isNaN(shelfId)) {
      return NextResponse.json({ error: 'Invalid shelf ID' }, { status: 400 })
    }

    // Check if the shelf exists
    const shelf = await prisma.shelf.findUnique({
      where: { id: shelfId },
      include: {
        slots: {
          include: {
            box: true
          }
        }
      }
    })
    
    if (!shelf) {
      return NextResponse.json({ error: 'Shelf not found' }, { status: 404 })
    }

    // Get all box IDs from the shelf slots
    const boxIds = shelf.slots
      .filter(slot => slot.box !== null)
      .map(slot => slot.box!.id)

    // Begin a transaction to ensure all operations complete or none do
    const result = await prisma.$transaction(async (tx) => {
      // First delete all boxes associated with this shelf
      if (boxIds.length > 0) {
        await tx.box.deleteMany({
          where: {
            id: {
              in: boxIds
            }
          }
        })
      }

      // Then delete the shelf (which will cascade delete the slots due to onDelete: Cascade in schema)
      const deletedShelf = await tx.shelf.delete({
        where: { id: shelfId }
      })

      return {
        deletedShelf,
        deletedBoxCount: boxIds.length
      }
    })

    return NextResponse.json({
      message: `Shelf deleted successfully along with ${result.deletedBoxCount} boxes`,
      deletedShelf: result.deletedShelf
    })
    
  } catch (error) {
    console.error('Error deleting shelf:', error)
    return NextResponse.json(
      { error: 'Failed to delete shelf', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}