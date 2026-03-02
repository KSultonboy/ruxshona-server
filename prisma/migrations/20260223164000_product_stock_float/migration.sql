ALTER TABLE "Product"
ALTER COLUMN "stock" TYPE DOUBLE PRECISION USING "stock"::double precision;
