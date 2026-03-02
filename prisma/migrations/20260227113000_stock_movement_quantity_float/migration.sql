ALTER TABLE "StockMovement"
ALTER COLUMN "quantity" TYPE DOUBLE PRECISION USING "quantity"::double precision;