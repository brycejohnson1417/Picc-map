-- CreateTable
CREATE TABLE "SpatialGeocodeCache" (
    "id" TEXT NOT NULL,
    "addressNormalized" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "formattedAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpatialGeocodeCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SpatialGeocodeCache_addressNormalized_key" ON "SpatialGeocodeCache"("addressNormalized");
