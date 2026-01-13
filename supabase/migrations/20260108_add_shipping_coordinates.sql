-- Add shipping latitude/longitude columns to orders table
-- These columns store the geocoded location from Shopify shipping addresses

ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_latitude DECIMAL(10, 7);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_longitude DECIMAL(10, 7);

-- Create an index for geospatial queries if needed in the future
CREATE INDEX IF NOT EXISTS idx_orders_shipping_coords ON orders(shop_id, shipping_latitude, shipping_longitude)
WHERE shipping_latitude IS NOT NULL AND shipping_longitude IS NOT NULL;

COMMENT ON COLUMN orders.shipping_latitude IS 'Latitude from Shopify shipping address (geocoded by Shopify)';
COMMENT ON COLUMN orders.shipping_longitude IS 'Longitude from Shopify shipping address (geocoded by Shopify)';
