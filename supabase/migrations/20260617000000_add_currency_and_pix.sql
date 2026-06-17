-- Add currency column to products
ALTER TABLE products ADD COLUMN currency text NOT NULL DEFAULT 'MZN';

-- Add currency and Pix columns to orders
ALTER TABLE orders ADD COLUMN currency text NOT NULL DEFAULT 'MZN';
ALTER TABLE orders ADD COLUMN pix_qr_code text;
ALTER TABLE orders ADD COLUMN pix_copia_cola text;
ALTER TABLE orders ADD COLUMN payment_id text;

-- Add currency column to withdrawals
ALTER TABLE withdrawals ADD COLUMN currency text NOT NULL DEFAULT 'MZN';
