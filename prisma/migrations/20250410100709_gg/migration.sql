/*
  Warnings:

  - You are about to drop the column `shelfId` on the `WarehouseNode` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[locationId]` on the table `Shelf` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `locationId` to the `Shelf` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "WarehouseNode" DROP CONSTRAINT "WarehouseNode_shelfId_fkey";

-- DropIndex
DROP INDEX "WarehouseNode_shelfId_idx";

-- AlterTable
ALTER TABLE "Shelf" ADD COLUMN     "locationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "WarehouseNode" DROP COLUMN "shelfId";

-- CreateIndex
CREATE UNIQUE INDEX "Shelf_locationId_key" ON "Shelf"("locationId");

-- AddForeignKey
ALTER TABLE "Shelf" ADD CONSTRAINT "Shelf_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "WarehouseNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
