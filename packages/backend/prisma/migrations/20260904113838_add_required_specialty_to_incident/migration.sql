-- AlterTable
ALTER TABLE "incidents" ADD COLUMN     "requiredSpecialtyId" TEXT;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_requiredSpecialtyId_fkey" FOREIGN KEY ("requiredSpecialtyId") REFERENCES "specialties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
