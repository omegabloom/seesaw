import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { generateMockOrderWithProducts, generateMockCustomer } from "@/lib/seed/mock-data";

export async function POST(request: NextRequest) {
  // Check authentication
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const body = await request.json();
  const { shopId, type = "order", count = 1 } = body;
  
  if (!shopId) {
    return NextResponse.json({ error: "shopId is required" }, { status: 400 });
  }
  
  const adminClient = createAdminClient();
  
  // Verify user has access to this shop
  const { data: shopUser } = await adminClient
    .from("shop_users")
    .select("id")
    .eq("user_id", user.id)
    .eq("shop_id", shopId)
    .single();
  
  if (!shopUser) {
    return NextResponse.json({ error: "Access denied to this shop" }, { status: 403 });
  }
  
  // Fetch real products from the database for this shop
  const { data: products } = await adminClient
    .from("products")
    .select("id, shopify_product_id, title, variants, images")
    .eq("shop_id", shopId)
    .limit(50);
  
  if (!products || products.length === 0) {
    return NextResponse.json(
      { error: "No products found. Sync products first before generating mock orders." },
      { status: 400 }
    );
  }
  
  // Get the next order number
  const { data: lastOrder } = await adminClient
    .from("orders")
    .select("order_number")
    .eq("shop_id", shopId)
    .order("order_number", { ascending: false })
    .limit(1)
    .single();
  
  let nextOrderNumber = (lastOrder?.order_number || 1000) + 1;
  
  const results: any[] = [];
  
  try {
    for (let i = 0; i < Math.min(count, 100); i++) { // Max 100 at a time
      if (type === "order") {
        const orderData = generateMockOrderWithProducts(shopId, products, nextOrderNumber++);
        
        // Remove display fields before insert
        const { _customer_name, _item_count, _primary_image, ...insertData } = orderData;
        
        const { data: order, error } = await adminClient
          .from("orders")
          .insert(insertData)
          .select()
          .single();
        
        if (error) throw error;
        
        // Emit realtime event with image for the visual timeline and coordinates for globe
        await adminClient.from("realtime_events").insert({
          shop_id: shopId,
          event_type: "order_created",
          resource_type: "order",
          resource_id: order.id,
          shopify_id: order.shopify_order_id,
          payload: {
            order_number: order.order_number,
            name: order.name,
            total_price: order.total_price,
            financial_status: order.financial_status,
            fulfillment_status: order.fulfillment_status,
            customer_email: order.email,
            customer_name: _customer_name,
            line_items: order.line_items,
            primary_image: _primary_image,
            shipping_address: {
              ...order.shipping_address,
              latitude: order.shipping_latitude,
              longitude: order.shipping_longitude,
            },
            _mock: true,
          },
        });
        
        results.push({ ...order, _primary_image });
      } else if (type === "customer") {
        const customerData = generateMockCustomer(shopId);
        
        const { data: customer, error } = await adminClient
          .from("customers")
          .insert(customerData)
          .select()
          .single();
        
        if (error) throw error;
        
        // Emit realtime event
        await adminClient.from("realtime_events").insert({
          shop_id: shopId,
          event_type: "customer_created",
          resource_type: "customer",
          resource_id: customer.id,
          shopify_id: customer.shopify_customer_id,
          payload: {
            email: customer.email,
            name: `${customer.first_name} ${customer.last_name}`,
            _mock: true,
          },
        });
        
        results.push(customer);
      }
    }
    
    return NextResponse.json({
      success: true,
      created: results.length,
      data: results,
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Failed to create mock data", details: error },
      { status: 500 }
    );
  }
}
