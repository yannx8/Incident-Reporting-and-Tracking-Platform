CREATE TYPE "SiteBoundaryType" AS ENUM ('CIRCLE', 'POLYGON');

ALTER TABLE "Site"
  ADD COLUMN "boundaryType" "SiteBoundaryType" NOT NULL DEFAULT 'CIRCLE',
  ADD COLUMN "radiusMeters" DOUBLE PRECISION,
  ADD COLUMN "boundaryGeoJson" JSONB;
