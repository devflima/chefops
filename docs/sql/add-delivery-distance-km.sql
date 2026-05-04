ALTER TABLE orders
ADD COLUMN IF NOT EXISTS delivery_distance_km numeric;
