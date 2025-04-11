import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

const nodeSchema = z.object({
  name: z.string(),
  x: z.number(),
  y: z.number(),
  isHome: z.boolean().optional(),
  isTag: z.boolean().optional(),
  tagColor: z.string().optional(),
  shelfId: z.number().optional(),
})

const connectionSchema = z.object({
  fromNode: z.string(),
  toNode: z.string(),
  distance: z.number(),
})

const bulkSchema = z.object({
  nodes: z.array(nodeSchema),
  connections: z.array(connectionSchema),
})

// Helper function to process in batches
async function processInBatches<T>(items: T[], batchSize: number, processFn: (batch: T[]) => Promise<void>) {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    await processFn(batch)
  }
}

// GET - Retrieve all nodes and connections
export async function GET() {
  try {
    // Add a timeout for the database operations
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Database operation timed out')), 10000)
    })

    const dbPromise = Promise.all([
      prisma.warehouseNode.findMany({
        include: {
          shelf: true,
        },
      }),
      prisma.warehouseConnection.findMany(),
    ])

    const [nodes, connections] = await Promise.race([dbPromise, timeoutPromise])

    // Transform the data to match the expected format
    const transformedData = {
      nodes: nodes.map(node => ({
        name: node.name,
        x: node.x,
        y: node.y,
        isHome: node.isHome,
        isTag: node.isTag,
        tagColor: node.tagColor,
     

      })),
      connections: connections.map(conn => ({
        fromNode: conn.fromNode,
        toNode: conn.toNode,
        distance: conn.distance
      }))
    }

    return NextResponse.json(transformedData)
  } catch (error: unknown) {
    console.error('Error fetching warehouse data:', error)
    
    // Return empty arrays if there's a database connection error
    if (
      error instanceof Prisma.PrismaClientKnownRequestError && 
      error.code === 'P1001' || 
      error instanceof Error && 
      error.message === 'Database operation timed out'
    ) {
      return NextResponse.json({
        nodes: [],
        connections: [],
        error: 'Database connection error. Please try again later.'
      }, { status: 503 })
    }

    return NextResponse.json(
      { error: 'Failed to fetch warehouse data' },
      { status: 500 }
    )
  }
}

// POST - Create multiple nodes and edges at once
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const validatedData = bulkSchema.parse(data);

    // Use a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // First delete all existing nodes and connections
      await tx.warehouseConnection.deleteMany();
      await tx.warehouseNode.deleteMany();

      // Create nodes in batches
      await processInBatches(validatedData.nodes, 10, async (batch) => {
        await tx.warehouseNode.createMany({
          data: batch.map(node => ({
            name: node.name,
            x: node.x,
            y: node.y,
            isHome: node.isHome,
            isTag: node.isTag,
            tagColor: node.tagColor,
            shelf: node.shelfId ? {
              connect: { id: node.shelfId }
            } : undefined
          }))
        });
      });

      // Create connections in batches
      await processInBatches(validatedData.connections, 10, async (batch) => {
        await tx.warehouseConnection.createMany({
          data: batch.map(connection => ({
            fromNode: connection.fromNode,
            toNode: connection.toNode,
            distance: connection.distance
          }))
        });
      });

      return { success: true };
    }, {
      timeout: 10000, // 10 second timeout for the transaction
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in POST /api/warehouse/bulk:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data format', details: error.errors },
        { status: 400 }
      );
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Duplicate node name detected' },
          { status: 400 }
        );
      }
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Shelf not found. Please create the shelf first.' },
          { status: 400 }
        );
      }
    }
    return NextResponse.json(
      { error: 'Failed to process warehouse data' },
      { status: 500 }
    );
  }
}

// PUT - Update multiple nodes and edges at once
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const validatedData = bulkSchema.parse(body)

    const result = await prisma.$transaction(async (tx) => {
      // Update nodes in batches
      await processInBatches(validatedData.nodes, 10, async (batch) => {
        for (const node of batch) {
          await tx.warehouseNode.update({
            where: { name: node.name },
            data: {
              x: node.x,
              y: node.y,
              isHome: node.isHome,
              isTag: node.isTag,
              tagColor: node.tagColor,
              shelf: node.shelfId ? {
                connect: { id: node.shelfId }
              } : undefined,
            },
          })
        }
      })

      // Update connections in batches
      await processInBatches(validatedData.connections, 10, async (batch) => {
        for (const conn of batch) {
          await tx.warehouseConnection.update({
            where: {
              fromNode_toNode: {
                fromNode: conn.fromNode,
                toNode: conn.toNode,
              },
            },
            data: {
              distance: conn.distance,
            },
          })
        }
      })

      return { success: true }
    }, {
      timeout: 30000,
      maxWait: 30000,
      isolationLevel: 'Serializable',
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error in bulk update:', error)
    return NextResponse.json(
      { error: 'Failed to process bulk update' },
      { status: 500 }
    )
  }
}

// DELETE - Delete all nodes and edges
export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const validatedData = bulkSchema.parse(body)

    const result = await prisma.$transaction(async (tx) => {
      // Delete connections first (due to foreign key constraints)
      await processInBatches(validatedData.connections, 10, async (batch) => {
        for (const conn of batch) {
          await tx.warehouseConnection.delete({
            where: {
              fromNode_toNode: {
                fromNode: conn.fromNode,
                toNode: conn.toNode,
              },
            },
          })
        }
      })

      // Then delete nodes
      await processInBatches(validatedData.nodes, 10, async (batch) => {
        for (const node of batch) {
          await tx.warehouseNode.delete({
            where: { name: node.name },
          })
        }
      })

      return { success: true }
    }, {
      timeout: 30000,
      maxWait: 30000,
      isolationLevel: 'Serializable',
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error in bulk delete:', error)
    return NextResponse.json(
      { error: 'Failed to process bulk delete' },
      { status: 500 }
    )
  }
}


