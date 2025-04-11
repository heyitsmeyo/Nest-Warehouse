/*
  Warnings:

  - You are about to drop the column `tagId` on the `Box` table. All the data in the column will be lost.
  - You are about to drop the column `tagId` on the `Shelf` table. All the data in the column will be lost.
  - You are about to drop the `BoxTagType` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `depth` to the `Box` table without a default value. This is not possible if the table is not empty.
  - Added the required column `height` to the `Box` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Box` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tag` to the `Box` table without a default value. This is not possible if the table is not empty.
  - Added the required column `weight` to the `Box` table without a default value. This is not possible if the table is not empty.
  - Added the required column `width` to the `Box` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tag` to the `Shelf` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Box" DROP CONSTRAINT "Box_tagId_fkey";

-- DropForeignKey
ALTER TABLE "Shelf" DROP CONSTRAINT "Shelf_tagId_fkey";

-- AlterTable
ALTER TABLE "Box" DROP COLUMN "tagId",
ADD COLUMN     "depth" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "height" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "tag" TEXT NOT NULL,
ADD COLUMN     "weight" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "width" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "Shelf" DROP COLUMN "tagId",
ADD COLUMN     "color" TEXT,
ADD COLUMN     "tag" TEXT NOT NULL;

-- DropTable
DROP TABLE "BoxTagType";
