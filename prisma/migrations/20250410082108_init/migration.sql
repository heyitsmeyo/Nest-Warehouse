/*
  Warnings:

  - You are about to drop the column `tag` on the `Box` table. All the data in the column will be lost.
  - Added the required column `tagId` to the `Box` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Box" DROP COLUMN "tag",
ADD COLUMN     "tagId" INTEGER NOT NULL;

-- DropEnum
DROP TYPE "BoxTagType";

-- CreateTable
CREATE TABLE "BoxTagType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "BoxTagType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BoxTagType_name_key" ON "BoxTagType"("name");

-- AddForeignKey
ALTER TABLE "Box" ADD CONSTRAINT "Box_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "BoxTagType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
