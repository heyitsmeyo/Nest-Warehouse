import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE() {
  try {
    // Delete all connections first (due to foreign key constraints)
    await prisma.warehouseConnection.deleteMany()
    
    // Then delete all nodes
    await prisma.warehouseNode.deleteMany()
    
    return NextResponse.json({ message: 'Warehouse cleared successfully' })
  } catch (error) {
    console.error('Error clearing warehouse:', error)
    return NextResponse.json(
      { error: 'Failed to clear warehouse' },
      { status: 500 }
    )
  }
} 