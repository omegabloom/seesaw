-- Seesaw: Shopify Integration Database Schema
-- Run this in your Supabase SQL Editor

-- =============================================================================
-- SHOPS TABLE - Connected Shopify stores
-- =============================================================================
CREATE TABLE IF NOT EXISTS shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_domain TEXT UNIQUE NOT NULL,  -- e.g., "my-shop.myshopify.com"
  shopify_shop_id BIGINT,            -- Shopify's internal shop ID
  access_token TEXT NOT NULL,        -- Offline access token (encrypted at rest)
  scope TEXT NOT NULL,               -- Granted OAuth scopes
  shop_name TEXT,                    -- Display name
  shop_email TEXT,
  currency TEXT DEFAULT 'USD',
  timezone TEXT,
  is_active BOOLEAN DEFAULT true,
  installed_at TIMESTAMPTZ DEFAULT now(),
  uninstalled_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_shops_domain ON shops(shop_domain);
CREATE INDEX idx_shops_active ON shops(is_active) WHERE is_active = true;

-- =============================================================================
-- SHOP_USERS TABLE - Links Supabase auth users to shops (multi-tenant)
-- =============================================================================
CREATE TABLE IF NOT EXISTS shop_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'member')),
  is_default BOOLEAN DEFAULT false,  -- Default shop for this user
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, shop_id)
);

CREATE INDEX idx_shop_users_user ON shop_users(user_id);
CREATE INDEX idx_shop_users_shop ON shop_users(shop_id);

-- =============================================================================
-- PRODUCTS TABLE - Synced from Shopify
-- =============================================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  shopify_product_id BIGINT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  vendor TEXT,
  product_type TEXT,
  handle TEXT,
  status TEXT DEFAULT 'active',  -- active, archived, draft
  tags TEXT[],
  images JSONB DEFAULT '[]',
  options JSONB DEFAULT '[]',
  variants JSONB DEFAULT '[]',
  created_at_shopify TIMESTAMPTZ,
  updated_at_shopify TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shop_id, shopify_product_id)
);

CREATE INDEX idx_products_shop ON products(shop_id);
CREATE INDEX idx_products_shopify_id ON products(shopify_product_id);
CREATE INDEX idx_products_status ON products(shop_id, status);

-- =============================================================================
-- CUSTOMERS TABLE - Synced from Shopify
-- =============================================================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  shopify_customer_id BIGINT NOT NULL,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  orders_count INTEGER DEFAULT 0,
  total_spent DECIMAL(12, 2) DEFAULT 0,
  currency TEXT,
  tags TEXT[],
  accepts_marketing BOOLEAN DEFAULT false,
  default_address JSONB,
  addresses JSONB DEFAULT '[]',
  created_at_shopify TIMESTAMPTZ,
  updated_at_shopify TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shop_id, shopify_customer_id)
);

CREATE INDEX idx_customers_shop ON customers(shop_id);
CREATE INDEX idx_customers_shopify_id ON customers(shopify_customer_id);
CREATE INDEX idx_customers_email ON customers(shop_id, email);

-- =============================================================================
-- ORDERS TABLE - Synced from Shopify
-- =============================================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  shopify_order_id BIGINT NOT NULL,
  order_number INTEGER,
  name TEXT,  -- e.g., "#1001"
  email TEXT,
  customer_id UUID REFERENCES customers(id),
  shopify_customer_id BIGINT,
  financial_status TEXT,  -- pending, paid, refunded, etc.
  fulfillment_status TEXT,  -- fulfilled, partial, unfulfilled
  total_price DECIMAL(12, 2),
  subtotal_price DECIMAL(12, 2),
  total_tax DECIMAL(12, 2),
  total_discounts DECIMAL(12, 2),
  currency TEXT,
  line_items JSONB DEFAULT '[]',
  shipping_address JSONB,
  billing_address JSONB,
  shipping_latitude DECIMAL(10, 7),  -- Latitude from Shopify shipping address
  shipping_longitude DECIMAL(10, 7), -- Longitude from Shopify shipping address
  discount_codes JSONB DEFAULT '[]',
  note TEXT,
  tags TEXT[],
  cancelled_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at_shopify TIMESTAMPTZ,
  updated_at_shopify TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shop_id, shopify_order_id)
);

CREATE INDEX idx_orders_shop ON orders(shop_id);
CREATE INDEX idx_orders_shopify_id ON orders(shopify_order_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_created ON orders(shop_id, created_at_shopify DESC);
CREATE INDEX idx_orders_financial ON orders(shop_id, financial_status);

-- =============================================================================
-- INVENTORY TABLE - Synced from Shopify (inventory levels per location)
-- =============================================================================
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  shopify_inventory_item_id BIGINT NOT NULL,
  shopify_variant_id BIGINT,
  sku TEXT,
  tracked BOOLEAN DEFAULT true,
  synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shop_id, shopify_inventory_item_id)
);

CREATE TABLE IF NOT EXISTS inventory_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE CASCADE,
  shopify_inventory_item_id BIGINT NOT NULL,
  shopify_location_id BIGINT NOT NULL,
  location_name TEXT,
  available INTEGER DEFAULT 0,
  synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shop_id, shopify_inventory_item_id, shopify_location_id)
);

CREATE INDEX idx_inventory_items_shop ON inventory_items(shop_id);
CREATE INDEX idx_inventory_levels_shop ON inventory_levels(shop_id);
CREATE INDEX idx_inventory_levels_item ON inventory_levels(inventory_item_id);

-- =============================================================================
-- LOCATIONS TABLE - Shopify locations
-- =============================================================================
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  shopify_location_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  address JSONB,
  is_active BOOLEAN DEFAULT true,
  synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(shop_id, shopify_location_id)
);

CREATE INDEX idx_locations_shop ON locations(shop_id);

-- =============================================================================
-- REALTIME_EVENTS TABLE - For broadcasting changes to connected clients
-- =============================================================================
CREATE TABLE IF NOT EXISTS realtime_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,  -- order_created, order_updated, product_updated, inventory_changed
  resource_type TEXT NOT NULL,  -- order, product, customer, inventory
  resource_id TEXT,  -- The UUID of the affected resource in our DB
  shopify_id BIGINT,  -- Original Shopify ID
  payload JSONB,  -- Summary data for the event
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_realtime_events_shop ON realtime_events(shop_id);
CREATE INDEX idx_realtime_events_created ON realtime_events(created_at DESC);

-- Note: Use a scheduled job (pg_cron or Supabase Edge Function) to clean up old events:
-- DELETE FROM realtime_events WHERE created_at < now() - interval '24 hours';

-- =============================================================================
-- SYNC_LOGS TABLE - Track sync operations
-- =============================================================================
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL,  -- initial, webhook, manual
  resource_type TEXT NOT NULL,  -- products, orders, customers, inventory
  status TEXT DEFAULT 'running',  -- running, completed, failed
  records_synced INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_sync_logs_shop ON sync_logs(shop_id);

-- =============================================================================
-- WEBHOOK_LOGS TABLE - Track incoming webhooks
-- =============================================================================
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES shops(id) ON DELETE SET NULL,
  shop_domain TEXT,
  topic TEXT NOT NULL,
  shopify_webhook_id TEXT,
  processed BOOLEAN DEFAULT false,
  error_message TEXT,
  payload JSONB,
  received_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_webhook_logs_shop ON webhook_logs(shop_id);
CREATE INDEX idx_webhook_logs_received ON webhook_logs(received_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE realtime_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's shop IDs
CREATE OR REPLACE FUNCTION get_user_shop_ids()
RETURNS SETOF UUID AS $$
  SELECT shop_id FROM shop_users WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Shops: Users can view/update shops they're connected to
CREATE POLICY "Users can view their shops"
ON shops FOR SELECT TO authenticated
USING (id IN (SELECT get_user_shop_ids()));

CREATE POLICY "Users can update their shops"
ON shops FOR UPDATE TO authenticated
USING (id IN (SELECT get_user_shop_ids()));

-- Shop users: Users can view their own connections
CREATE POLICY "Users can view their shop connections"
ON shop_users FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can manage their shop connections"
ON shop_users FOR ALL TO authenticated
USING (user_id = auth.uid());

-- Products: Users can access products from their shops
CREATE POLICY "Users can view products from their shops"
ON products FOR SELECT TO authenticated
USING (shop_id IN (SELECT get_user_shop_ids()));

-- Customers: Users can access customers from their shops
CREATE POLICY "Users can view customers from their shops"
ON customers FOR SELECT TO authenticated
USING (shop_id IN (SELECT get_user_shop_ids()));

-- Orders: Users can access orders from their shops
CREATE POLICY "Users can view orders from their shops"
ON orders FOR SELECT TO authenticated
USING (shop_id IN (SELECT get_user_shop_ids()));

-- Inventory: Users can access inventory from their shops
CREATE POLICY "Users can view inventory items from their shops"
ON inventory_items FOR SELECT TO authenticated
USING (shop_id IN (SELECT get_user_shop_ids()));

CREATE POLICY "Users can view inventory levels from their shops"
ON inventory_levels FOR SELECT TO authenticated
USING (shop_id IN (SELECT get_user_shop_ids()));

-- Locations: Users can access locations from their shops
CREATE POLICY "Users can view locations from their shops"
ON locations FOR SELECT TO authenticated
USING (shop_id IN (SELECT get_user_shop_ids()));

-- Realtime events: Users can access events from their shops
CREATE POLICY "Users can view realtime events from their shops"
ON realtime_events FOR SELECT TO authenticated
USING (shop_id IN (SELECT get_user_shop_ids()));

-- Sync logs: Users can view sync logs from their shops
CREATE POLICY "Users can view sync logs from their shops"
ON sync_logs FOR SELECT TO authenticated
USING (shop_id IN (SELECT get_user_shop_ids()));

-- =============================================================================
-- ENABLE REALTIME on realtime_events table
-- =============================================================================
-- Run this separately in Supabase Dashboard > Database > Replication
-- Or use: ALTER PUBLICATION supabase_realtime ADD TABLE realtime_events;

-- =============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_shops_updated_at
  BEFORE UPDATE ON shops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_levels_updated_at
  BEFORE UPDATE ON inventory_levels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
