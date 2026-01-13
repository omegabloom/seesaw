// Mock data generators for development

const firstNames = [
  "Emma", "Liam", "Olivia", "Noah", "Ava", "Oliver", "Isabella", "James",
  "Sophia", "William", "Mia", "Benjamin", "Charlotte", "Lucas", "Amelia",
  "Henry", "Harper", "Alexander", "Evelyn", "Sebastian", "Luna", "Jack",
  "Camila", "Daniel", "Gianna", "Michael", "Abigail", "Owen", "Ella", "Ethan"
];

const lastNames = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
  "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez",
  "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
  "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez"
];

const cities = [
  { city: "New York", state: "NY", zip: "10001", lat: 40.7128, lng: -74.0060 },
  { city: "Los Angeles", state: "CA", zip: "90001", lat: 34.0522, lng: -118.2437 },
  { city: "Chicago", state: "IL", zip: "60601", lat: 41.8781, lng: -87.6298 },
  { city: "Houston", state: "TX", zip: "77001", lat: 29.7604, lng: -95.3698 },
  { city: "Phoenix", state: "AZ", zip: "85001", lat: 33.4484, lng: -112.0740 },
  { city: "Philadelphia", state: "PA", zip: "19101", lat: 39.9526, lng: -75.1652 },
  { city: "San Antonio", state: "TX", zip: "78201", lat: 29.4241, lng: -98.4936 },
  { city: "San Diego", state: "CA", zip: "92101", lat: 32.7157, lng: -117.1611 },
  { city: "Dallas", state: "TX", zip: "75201", lat: 32.7767, lng: -96.7970 },
  { city: "Austin", state: "TX", zip: "78701", lat: 30.2672, lng: -97.7431 },
  { city: "Seattle", state: "WA", zip: "98101", lat: 47.6062, lng: -122.3321 },
  { city: "Denver", state: "CO", zip: "80201", lat: 39.7392, lng: -104.9903 },
  { city: "Boston", state: "MA", zip: "02101", lat: 42.3601, lng: -71.0589 },
  { city: "Portland", state: "OR", zip: "97201", lat: 45.5152, lng: -122.6784 },
  { city: "Miami", state: "FL", zip: "33101", lat: 25.7617, lng: -80.1918 },
  { city: "Atlanta", state: "GA", zip: "30301", lat: 33.7490, lng: -84.3880 },
  { city: "Minneapolis", state: "MN", zip: "55401", lat: 44.9778, lng: -93.2650 },
  { city: "Detroit", state: "MI", zip: "48201", lat: 42.3314, lng: -83.0458 },
  { city: "Nashville", state: "TN", zip: "37201", lat: 36.1627, lng: -86.7816 },
  { city: "Las Vegas", state: "NV", zip: "89101", lat: 36.1699, lng: -115.1398 },
  { city: "San Francisco", state: "CA", zip: "94102", lat: 37.7749, lng: -122.4194 },
  { city: "Orlando", state: "FL", zip: "32801", lat: 28.5383, lng: -81.3792 },
  { city: "Cleveland", state: "OH", zip: "44101", lat: 41.4993, lng: -81.6944 },
  { city: "Kansas City", state: "MO", zip: "64101", lat: 39.0997, lng: -94.5786 },
  { city: "Salt Lake City", state: "UT", zip: "84101", lat: 40.7608, lng: -111.8910 },
  // International cities
  { city: "Toronto", state: "ON", zip: "M5V", lat: 43.6532, lng: -79.3832, country: "Canada", country_code: "CA" },
  { city: "Vancouver", state: "BC", zip: "V6B", lat: 49.2827, lng: -123.1207, country: "Canada", country_code: "CA" },
  { city: "London", state: "", zip: "SW1A", lat: 51.5074, lng: -0.1278, country: "United Kingdom", country_code: "GB" },
  { city: "Paris", state: "", zip: "75001", lat: 48.8566, lng: 2.3522, country: "France", country_code: "FR" },
  { city: "Berlin", state: "", zip: "10115", lat: 52.5200, lng: 13.4050, country: "Germany", country_code: "DE" },
  { city: "Sydney", state: "NSW", zip: "2000", lat: -33.8688, lng: 151.2093, country: "Australia", country_code: "AU" },
  { city: "Tokyo", state: "", zip: "100-0001", lat: 35.6762, lng: 139.6503, country: "Japan", country_code: "JP" },
  { city: "Singapore", state: "", zip: "018956", lat: 1.3521, lng: 103.8198, country: "Singapore", country_code: "SG" },
  { city: "Amsterdam", state: "", zip: "1012", lat: 52.3676, lng: 4.9041, country: "Netherlands", country_code: "NL" },
  { city: "Stockholm", state: "", zip: "111 29", lat: 59.3293, lng: 18.0686, country: "Sweden", country_code: "SE" },
];

const streets = [
  "Main St", "Oak Ave", "Maple Dr", "Cedar Ln", "Pine Rd", "Elm St",
  "Park Ave", "Lake Dr", "River Rd", "Hill St", "Forest Ave", "Valley Rd",
  "Sunset Blvd", "Broadway", "Market St", "Church St", "Washington Ave"
];

export function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomPrice(min: number, max: number): string {
  return (Math.random() * (max - min) + min).toFixed(2);
}

export function generateCustomerName() {
  return {
    firstName: randomFrom(firstNames),
    lastName: randomFrom(lastNames),
  };
}

export function generateEmail(firstName: string, lastName: string): string {
  const domains = ["gmail.com", "yahoo.com", "outlook.com", "icloud.com", "hotmail.com"];
  const num = randomInt(1, 999);
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${num}@${randomFrom(domains)}`;
}

export function generateAddress() {
  const location = randomFrom(cities);
  return {
    address1: `${randomInt(100, 9999)} ${randomFrom(streets)}`,
    address2: Math.random() > 0.7 ? `Apt ${randomInt(1, 500)}` : null,
    city: location.city,
    province: location.state,
    province_code: location.state,
    zip: location.zip,
    country: location.country || "United States",
    country_code: location.country_code || "US",
    latitude: location.lat,
    longitude: location.lng,
  };
}

export function generatePhone(): string {
  return `+1${randomInt(200, 999)}${randomInt(100, 999)}${randomInt(1000, 9999)}`;
}

// Product templates for line items
const productTemplates = [
  { title: "Classic T-Shirt", price: "29.99", sku: "TSH-001" },
  { title: "Premium Hoodie", price: "69.99", sku: "HOD-001" },
  { title: "Vintage Cap", price: "24.99", sku: "CAP-001" },
  { title: "Running Sneakers", price: "129.99", sku: "SNK-001" },
  { title: "Leather Wallet", price: "49.99", sku: "WAL-001" },
  { title: "Sunglasses", price: "89.99", sku: "SUN-001" },
  { title: "Backpack", price: "79.99", sku: "BAG-001" },
  { title: "Watch", price: "199.99", sku: "WCH-001" },
  { title: "Wireless Earbuds", price: "149.99", sku: "EAR-001" },
  { title: "Phone Case", price: "19.99", sku: "CAS-001" },
  { title: "Water Bottle", price: "34.99", sku: "BTL-001" },
  { title: "Yoga Mat", price: "44.99", sku: "YOG-001" },
  { title: "Desk Lamp", price: "59.99", sku: "LMP-001" },
  { title: "Notebook Set", price: "14.99", sku: "NTB-001" },
  { title: "Coffee Mug", price: "16.99", sku: "MUG-001" },
];

export function generateLineItems(count: number = randomInt(1, 4)) {
  const items = [];
  const usedProducts = new Set<number>();
  
  for (let i = 0; i < count; i++) {
    let productIndex: number;
    do {
      productIndex = randomInt(0, productTemplates.length - 1);
    } while (usedProducts.has(productIndex) && usedProducts.size < productTemplates.length);
    
    usedProducts.add(productIndex);
    const product = productTemplates[productIndex];
    const quantity = randomInt(1, 3);
    
    items.push({
      id: randomInt(1000000000, 9999999999),
      title: product.title,
      quantity: quantity,
      price: product.price,
      sku: product.sku,
      variant_title: randomFrom(["Small", "Medium", "Large", "One Size", null]),
      product_id: randomInt(1000000000, 9999999999),
      variant_id: randomInt(1000000000, 9999999999),
    });
  }
  
  return items;
}

export function calculateOrderTotals(lineItems: any[]) {
  const subtotal = lineItems.reduce((sum, item) => {
    return sum + (parseFloat(item.price) * item.quantity);
  }, 0);
  
  const taxRate = 0.08; // 8% tax
  const tax = subtotal * taxRate;
  const shipping = subtotal > 100 ? 0 : 9.99;
  const total = subtotal + tax + shipping;
  
  return {
    subtotal: subtotal.toFixed(2),
    tax: tax.toFixed(2),
    shipping: shipping.toFixed(2),
    total: total.toFixed(2),
  };
}

export type FinancialStatus = "pending" | "paid" | "refunded" | "partially_refunded";
export type FulfillmentStatus = "unfulfilled" | "fulfilled" | "partial" | null;

export function generateOrderStatuses(): { financial: FinancialStatus; fulfillment: FulfillmentStatus } {
  const financialWeights = [
    { status: "paid" as const, weight: 70 },
    { status: "pending" as const, weight: 15 },
    { status: "refunded" as const, weight: 10 },
    { status: "partially_refunded" as const, weight: 5 },
  ];
  
  const fulfillmentWeights = [
    { status: "fulfilled" as const, weight: 50 },
    { status: "unfulfilled" as const, weight: 35 },
    { status: "partial" as const, weight: 10 },
    { status: null, weight: 5 },
  ];
  
  const pickWeighted = <T>(weights: { status: T; weight: number }[]): T => {
    const total = weights.reduce((sum, w) => sum + w.weight, 0);
    let random = Math.random() * total;
    for (const w of weights) {
      random -= w.weight;
      if (random <= 0) return w.status;
    }
    return weights[0].status;
  };
  
  return {
    financial: pickWeighted(financialWeights),
    fulfillment: pickWeighted(fulfillmentWeights),
  };
}

export function generateMockOrder(shopId: string, orderNumber?: number) {
  const { firstName, lastName } = generateCustomerName();
  const email = generateEmail(firstName, lastName);
  const address = generateAddress();
  const lineItems = generateLineItems();
  const totals = calculateOrderTotals(lineItems);
  const statuses = generateOrderStatuses();
  
  // Generate a timestamp within the last 30 days, weighted towards recent
  const now = new Date();
  const daysAgo = Math.floor(Math.pow(Math.random(), 2) * 30); // Weighted towards recent
  const hoursAgo = randomInt(0, 23);
  const minutesAgo = randomInt(0, 59);
  const createdAt = new Date(now.getTime() - (daysAgo * 24 + hoursAgo) * 60 * 60 * 1000 - minutesAgo * 60 * 1000);
  
  const orderNum = orderNumber || randomInt(1000, 9999);
  
  return {
    shop_id: shopId,
    shopify_order_id: randomInt(1000000000000, 9999999999999),
    order_number: orderNum,
    name: `#${orderNum}`,
    email: email,
    financial_status: statuses.financial,
    fulfillment_status: statuses.fulfillment,
    total_price: parseFloat(totals.total),
    subtotal_price: parseFloat(totals.subtotal),
    total_tax: parseFloat(totals.tax),
    total_discounts: 0,
    currency: "USD",
    line_items: lineItems,
    shipping_address: {
      ...address,
      first_name: firstName,
      last_name: lastName,
      name: `${firstName} ${lastName}`,
      phone: generatePhone(),
    },
    billing_address: {
      ...address,
      first_name: firstName,
      last_name: lastName,
      name: `${firstName} ${lastName}`,
    },
    shipping_latitude: address.latitude,
    shipping_longitude: address.longitude,
    discount_codes: [],
    note: Math.random() > 0.8 ? "Please gift wrap this order" : null,
    tags: [],
    cancelled_at: statuses.financial === "refunded" ? createdAt.toISOString() : null,
    closed_at: statuses.fulfillment === "fulfilled" ? new Date(createdAt.getTime() + randomInt(1, 5) * 24 * 60 * 60 * 1000).toISOString() : null,
    created_at_shopify: createdAt.toISOString(),
    updated_at_shopify: createdAt.toISOString(),
    synced_at: new Date().toISOString(),
    // Extra display fields
    _customer_name: `${firstName} ${lastName}`,
    _item_count: lineItems.reduce((sum, item) => sum + item.quantity, 0),
  };
}

export function generateMockCustomer(shopId: string) {
  const { firstName, lastName } = generateCustomerName();
  const email = generateEmail(firstName, lastName);
  const address = generateAddress();
  
  return {
    shop_id: shopId,
    shopify_customer_id: randomInt(1000000000000, 9999999999999),
    email: email,
    first_name: firstName,
    last_name: lastName,
    phone: generatePhone(),
    orders_count: randomInt(0, 20),
    total_spent: parseFloat(randomPrice(0, 2000)),
    currency: "USD",
    tags: [],
    accepts_marketing: Math.random() > 0.5,
    default_address: {
      ...address,
      first_name: firstName,
      last_name: lastName,
    },
    addresses: [{
      ...address,
      first_name: firstName,
      last_name: lastName,
      default: true,
    }],
    created_at_shopify: new Date(Date.now() - randomInt(1, 365) * 24 * 60 * 60 * 1000).toISOString(),
    updated_at_shopify: new Date().toISOString(),
    synced_at: new Date().toISOString(),
  };
}

// Database product type
interface DBProduct {
  id: string;
  shopify_product_id: number;
  title: string;
  variants: any[] | null;
  images: any[] | null;
}

/**
 * Generate line items using REAL products from the database
 */
export function generateLineItemsFromProducts(products: DBProduct[], count: number = randomInt(1, 3)) {
  const items = [];
  const usedProducts = new Set<number>();
  const itemCount = Math.min(count, products.length);
  
  let primaryImage: string | null = null;
  
  for (let i = 0; i < itemCount; i++) {
    let productIndex: number;
    do {
      productIndex = randomInt(0, products.length - 1);
    } while (usedProducts.has(productIndex) && usedProducts.size < products.length);
    
    usedProducts.add(productIndex);
    const product = products[productIndex];
    const quantity = randomInt(1, 3);
    
    // Get variant info if available
    const variants = product.variants || [];
    const variant = variants.length > 0 ? randomFrom(variants) : null;
    const price = variant?.price || randomPrice(19.99, 149.99);
    
    // Get image - prefer variant image, fallback to product image
    const images = product.images || [];
    const productImage = images.length > 0 ? images[0]?.src : null;
    
    // Set primary image from first item
    if (i === 0 && productImage) {
      primaryImage = productImage;
    }
    
    items.push({
      id: randomInt(1000000000, 9999999999),
      title: product.title,
      quantity: quantity,
      price: typeof price === 'string' ? price : price.toString(),
      sku: variant?.sku || null,
      variant_title: variant?.title || null,
      product_id: product.shopify_product_id,
      variant_id: variant?.id || randomInt(1000000000, 9999999999),
      // Include image for display
      image: productImage,
    });
  }
  
  return { items, primaryImage };
}

/**
 * Generate a mock order using REAL products from the database
 */
export function generateMockOrderWithProducts(shopId: string, products: DBProduct[], orderNumber?: number) {
  const { firstName, lastName } = generateCustomerName();
  const email = generateEmail(firstName, lastName);
  const address = generateAddress();
  const { items: lineItems, primaryImage } = generateLineItemsFromProducts(products);
  const totals = calculateOrderTotals(lineItems);
  const statuses = generateOrderStatuses();
  
  // Generate a timestamp - for new orders, use "just now"
  const now = new Date();
  const secondsAgo = randomInt(0, 30); // Within last 30 seconds for dramatic effect
  const createdAt = new Date(now.getTime() - secondsAgo * 1000);
  
  const orderNum = orderNumber || randomInt(1000, 9999);
  
  return {
    shop_id: shopId,
    shopify_order_id: randomInt(1000000000000, 9999999999999),
    order_number: orderNum,
    name: `#${orderNum}`,
    email: email,
    financial_status: statuses.financial,
    fulfillment_status: statuses.fulfillment,
    total_price: parseFloat(totals.total),
    subtotal_price: parseFloat(totals.subtotal),
    total_tax: parseFloat(totals.tax),
    total_discounts: 0,
    currency: "USD",
    line_items: lineItems,
    shipping_address: {
      ...address,
      first_name: firstName,
      last_name: lastName,
      name: `${firstName} ${lastName}`,
      phone: generatePhone(),
    },
    billing_address: {
      ...address,
      first_name: firstName,
      last_name: lastName,
      name: `${firstName} ${lastName}`,
    },
    shipping_latitude: address.latitude,
    shipping_longitude: address.longitude,
    discount_codes: [],
    note: Math.random() > 0.9 ? "Please gift wrap this order" : null,
    tags: [],
    cancelled_at: null, // New orders aren't cancelled
    closed_at: null, // New orders aren't closed
    created_at_shopify: createdAt.toISOString(),
    updated_at_shopify: createdAt.toISOString(),
    synced_at: new Date().toISOString(),
    // Extra display fields (not stored in DB)
    _customer_name: `${firstName} ${lastName}`,
    _item_count: lineItems.reduce((sum, item) => sum + item.quantity, 0),
    _primary_image: primaryImage,
  };
}
