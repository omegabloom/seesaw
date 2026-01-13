import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// City coordinates mapping
const cityCoords: Record<string, { lat: number; lng: number }> = {
  "New York": { lat: 40.7128, lng: -74.0060 },
  "Los Angeles": { lat: 34.0522, lng: -118.2437 },
  "Chicago": { lat: 41.8781, lng: -87.6298 },
  "Houston": { lat: 29.7604, lng: -95.3698 },
  "Phoenix": { lat: 33.4484, lng: -112.0740 },
  "Philadelphia": { lat: 39.9526, lng: -75.1652 },
  "San Antonio": { lat: 29.4241, lng: -98.4936 },
  "San Diego": { lat: 32.7157, lng: -117.1611 },
  "Dallas": { lat: 32.7767, lng: -96.7970 },
  "Austin": { lat: 30.2672, lng: -97.7431 },
  "Seattle": { lat: 47.6062, lng: -122.3321 },
  "Denver": { lat: 39.7392, lng: -104.9903 },
  "Boston": { lat: 42.3601, lng: -71.0589 },
  "Portland": { lat: 45.5152, lng: -122.6784 },
  "Miami": { lat: 25.7617, lng: -80.1918 },
  "Atlanta": { lat: 33.7490, lng: -84.3880 },
  "Minneapolis": { lat: 44.9778, lng: -93.2650 },
  "Detroit": { lat: 42.3314, lng: -83.0458 },
  "Nashville": { lat: 36.1627, lng: -86.7816 },
  "Las Vegas": { lat: 36.1699, lng: -115.1398 },
  "San Francisco": { lat: 37.7749, lng: -122.4194 },
  "Orlando": { lat: 28.5383, lng: -81.3792 },
  "Cleveland": { lat: 41.4993, lng: -81.6944 },
  "Kansas City": { lat: 39.0997, lng: -94.5786 },
  "Salt Lake City": { lat: 40.7608, lng: -111.8910 },
  "Toronto": { lat: 43.6532, lng: -79.3832 },
  "Vancouver": { lat: 49.2827, lng: -123.1207 },
  "London": { lat: 51.5074, lng: -0.1278 },
  "Paris": { lat: 48.8566, lng: 2.3522 },
  "Berlin": { lat: 52.5200, lng: 13.4050 },
  "Sydney": { lat: -33.8688, lng: 151.2093 },
  "Tokyo": { lat: 35.6762, lng: 139.6503 },
  "Singapore": { lat: 1.3521, lng: 103.8198 },
  "Amsterdam": { lat: 52.3676, lng: 4.9041 },
  "Stockholm": { lat: 59.3293, lng: 18.0686 },
};

// Random coordinates if city not found
function getRandomCoords() {
  const cities = Object.values(cityCoords);
  return cities[Math.floor(Math.random() * cities.length)];
}

export async function POST(request: NextRequest) {
  // Check authentication
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const adminClient = createAdminClient();
  
  // Find orders without coordinates
  const { data: orders, error: fetchError } = await adminClient
    .from("orders")
    .select("id, shipping_address")
    .is("shipping_latitude", null);
  
  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  
  if (!orders || orders.length === 0) {
    return NextResponse.json({ 
      success: true, 
      message: "No orders to update",
      updated: 0 
    });
  }
  
  let updated = 0;
  const errors: string[] = [];
  
  for (const order of orders) {
    const city = order.shipping_address?.city;
    const coords = city && cityCoords[city] ? cityCoords[city] : getRandomCoords();
    
    const { error: updateError } = await adminClient
      .from("orders")
      .update({
        shipping_latitude: coords.lat,
        shipping_longitude: coords.lng,
      })
      .eq("id", order.id);
    
    if (updateError) {
      errors.push(`Failed to update order ${order.id}: ${updateError.message}`);
    } else {
      updated++;
    }
  }
  
  return NextResponse.json({
    success: true,
    total: orders.length,
    updated,
    errors: errors.length > 0 ? errors : undefined,
  });
}
