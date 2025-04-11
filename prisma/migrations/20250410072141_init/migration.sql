-- CreateEnum
CREATE TYPE "BoxTagType" AS ENUM ('Fragile', 'Heavy', 'Electronics', 'Perishable', 'Chemical');

-- CreateTable
CREATE TABLE "Box" (
    "id" SERIAL NOT NULL,
    "tag" "BoxTagType" NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Box_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shelf" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "initialHeight" DOUBLE PRECISION NOT NULL,
    "ShelfSlotHeight" DOUBLE PRECISION NOT NULL,
    "levels" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shelf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShelfSlot" (
    "id" SERIAL NOT NULL,
    "shelfId" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "boxId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShelfSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseNode" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "isHome" BOOLEAN NOT NULL DEFAULT false,
    "isTag" BOOLEAN NOT NULL DEFAULT false,
    "tagColor" TEXT,
    "shelfId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseConnection" (
    "id" TEXT NOT NULL,
    "fromNode" TEXT NOT NULL,
    "toNode" TEXT NOT NULL,
    "distance" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shelf_name_key" ON "Shelf"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ShelfSlot_boxId_key" ON "ShelfSlot"("boxId");

-- CreateIndex
CREATE INDEX "ShelfSlot_shelfId_idx" ON "ShelfSlot"("shelfId");

-- CreateIndex
CREATE INDEX "ShelfSlot_boxId_idx" ON "ShelfSlot"("boxId");

-- CreateIndex
CREATE UNIQUE INDEX "ShelfSlot_shelfId_level_key" ON "ShelfSlot"("shelfId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseNode_name_key" ON "WarehouseNode"("name");

-- CreateIndex
CREATE INDEX "WarehouseNode_shelfId_idx" ON "WarehouseNode"("shelfId");

-- CreateIndex
CREATE INDEX "WarehouseConnection_fromNode_idx" ON "WarehouseConnection"("fromNode");

-- CreateIndex
CREATE INDEX "WarehouseConnection_toNode_idx" ON "WarehouseConnection"("toNode");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseConnection_fromNode_toNode_key" ON "WarehouseConnection"("fromNode", "toNode");

-- AddForeignKey
ALTER TABLE "ShelfSlot" ADD CONSTRAINT "ShelfSlot_shelfId_fkey" FOREIGN KEY ("shelfId") REFERENCES "Shelf"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShelfSlot" ADD CONSTRAINT "ShelfSlot_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "Box"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseNode" ADD CONSTRAINT "WarehouseNode_shelfId_fkey" FOREIGN KEY ("shelfId") REFERENCES "Shelf"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseConnection" ADD CONSTRAINT "WarehouseConnection_fromNode_fkey" FOREIGN KEY ("fromNode") REFERENCES "WarehouseNode"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseConnection" ADD CONSTRAINT "WarehouseConnection_toNode_fkey" FOREIGN KEY ("toNode") REFERENCES "WarehouseNode"("name") ON DELETE RESTRICT ON UPDATE CASCADE;
