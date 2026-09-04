/*
  Warnings:

  - Added the required column `category` to the `incidents` table without a default value. This is not possible if the table is not empty.
  - Added the required column `originalCategory` to the `incidents` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "incidents" ADD COLUMN     "category" TEXT NOT NULL,
ADD COLUMN     "originalCategory" TEXT NOT NULL;
