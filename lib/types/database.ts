// Database types for Supabase tables

export interface Shop {
  id: string;
  shop_domain: string;
  shopify_shop_id: number | null;
  access_token: string;
  scope: string;
  shop_name: string | null;
  shop_email: string | null;
  currency: string;
  timezone: string | null;
  is_active: boolean;
  installed_at: string;
  uninstalled_at: string | null;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShopUser {
  id: string;
  user_id: string;
  shop_id: string;
  role: "owner" | "admin" | "member";
  is_default: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  shop_id: string;
  shopify_product_id: number;
  title: string;
  description: string | null;
  vendor: string | null;
  product_type: string | null;
  handle: string | null;
  status: string;
  tags: string[];
  images: any[];
  options: any[];
  variants: any[];
  created_at_shopify: string | null;
  updated_at_shopify: string | null;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  shop_id: string;
  shopify_customer_id: number;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  orders_count: number;
  total_spent: number;
  currency: string | null;
  tags: string[];
  accepts_marketing: boolean;
  default_address: any;
  addresses: any[];
  created_at_shopify: string | null;
  updated_at_shopify: string | null;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  shop_id: string;
  shopify_order_id: number;
  order_number: number | null;
  name: string | null;
  email: string | null;
  customer_id: string | null;
  shopify_customer_id: number | null;
  financial_status: string | null;
  fulfillment_status: string | null;
  total_price: number;
  subtotal_price: number;
  total_tax: number;
  total_discounts: number;
  currency: string | null;
  line_items: any[];
  shipping_address: any;
  billing_address: any;
  shipping_latitude: number | null;
  shipping_longitude: number | null;
  discount_codes: any[];
  note: string | null;
  tags: string[];
  cancelled_at: string | null;
  closed_at: string | null;
  created_at_shopify: string | null;
  updated_at_shopify: string | null;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  shop_id: string;
  shopify_inventory_item_id: number;
  shopify_variant_id: number | null;
  sku: string | null;
  tracked: boolean;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryLevel {
  id: string;
  shop_id: string;
  inventory_item_id: string | null;
  shopify_inventory_item_id: number;
  shopify_location_id: number;
  location_name: string | null;
  available: number;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  shop_id: string;
  shopify_location_id: number;
  name: string;
  address: any;
  is_active: boolean;
  synced_at: string;
  created_at: string;
}

export interface RealtimeEvent {
  id: string;
  shop_id: string;
  event_type: string;
  resource_type: string;
  resource_id: string | null;
  shopify_id: number | null;
  payload: any;
  created_at: string;
}

export interface SyncLog {
  id: string;
  shop_id: string;
  sync_type: string;
  resource_type: string;
  status: "running" | "completed" | "failed";
  records_synced: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface WebhookLog {
  id: string;
  shop_id: string | null;
  shop_domain: string | null;
  topic: string;
  shopify_webhook_id: string | null;
  processed: boolean;
  error_message: string | null;
  payload: any;
  received_at: string;
}
