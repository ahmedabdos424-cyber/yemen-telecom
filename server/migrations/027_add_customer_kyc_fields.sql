-- 027_add_customer_kyc_fields.sql
-- Adds KYC fields (ID type + issue date) to the customers table.
-- Applies to both fresh schema (schema.sql) and existing databases.

ALTER TABLE customers ADD COLUMN IF NOT EXISTS id_type VARCHAR(50) DEFAULT '';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS id_issue_date VARCHAR(20) DEFAULT '';
