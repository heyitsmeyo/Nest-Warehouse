-- AlterTable
ALTER TABLE "Shelf" ADD COLUMN     "tagId" INTEGER;

-- AddForeignKey
ALTER TABLE "Shelf" ADD CONSTRAINT "Shelf_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "BoxTagType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
