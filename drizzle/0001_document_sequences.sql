ALTER TABLE "quotes" ADD COLUMN "number_year" integer;
ALTER TABLE "quotes" ADD COLUMN "sequence" integer;

WITH numbered_quotes AS (
  SELECT
    id,
    COALESCE(
      NULLIF(substring(split_part(quote_number, '-', 2) FROM 1 FOR 4), '')::integer,
      EXTRACT(YEAR FROM COALESCE(created_at, NOW()))::integer
    ) AS year_value,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(
        NULLIF(substring(split_part(quote_number, '-', 2) FROM 1 FOR 4), '')::integer,
        EXTRACT(YEAR FROM COALESCE(created_at, NOW()))::integer
      )
      ORDER BY created_at, quote_number
    ) AS sequence_value
  FROM "quotes"
)
UPDATE "quotes" AS q
SET
  "number_year" = numbered_quotes.year_value,
  "sequence" = numbered_quotes.sequence_value
FROM numbered_quotes
WHERE numbered_quotes.id = q.id;

ALTER TABLE "quotes" ALTER COLUMN "number_year" SET NOT NULL;
ALTER TABLE "quotes" ALTER COLUMN "sequence" SET NOT NULL;

ALTER TABLE "invoices" ADD COLUMN "number_year" integer;
ALTER TABLE "invoices" ADD COLUMN "sequence" integer;

WITH numbered_invoices AS (
  SELECT
    id,
    COALESCE(
      NULLIF(substring(split_part(invoice_number, '-', 2) FROM 1 FOR 4), '')::integer,
      EXTRACT(YEAR FROM COALESCE(issued_at, created_at, NOW()))::integer
    ) AS year_value,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(
        NULLIF(substring(split_part(invoice_number, '-', 2) FROM 1 FOR 4), '')::integer,
        EXTRACT(YEAR FROM COALESCE(issued_at, created_at, NOW()))::integer
      )
      ORDER BY issued_at, created_at, invoice_number
    ) AS sequence_value
  FROM "invoices"
)
UPDATE "invoices" AS i
SET
  "number_year" = numbered_invoices.year_value,
  "sequence" = numbered_invoices.sequence_value
FROM numbered_invoices
WHERE numbered_invoices.id = i.id;

ALTER TABLE "invoices" ALTER COLUMN "number_year" SET NOT NULL;
ALTER TABLE "invoices" ALTER COLUMN "sequence" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "quotes_number_year_sequence_unique"
  ON "quotes" ("number_year", "sequence");
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_number_year_sequence_unique"
  ON "invoices" ("number_year", "sequence");
