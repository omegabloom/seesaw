"use client";

import { useShop } from "@/lib/context/shop-context";
import { useResourceRealtime } from "@/lib/hooks/use-realtime";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw, User, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Customer {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  orders_count: number;
  total_spent: number;
  currency: string | null;
  tags: string[];
  accepts_marketing: boolean;
  created_at_shopify: string;
}

export default function CustomersPage() {
  const { currentShop } = useShop();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { events: customerEvents } = useResourceRealtime(
    currentShop?.id || null,
    "customer"
  );

  const fetchCustomers = async () => {
    if (!currentShop) return;

    setIsLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("shop_id", currentShop.id)
      .order("total_spent", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error fetching customers:", error);
    } else {
      setCustomers(data || []);
      setFilteredCustomers(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, [currentShop]);

  useEffect(() => {
    if (customerEvents.length > 0) {
      fetchCustomers();
    }
  }, [customerEvents]);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredCustomers(customers);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredCustomers(
        customers.filter(
          (customer) =>
            customer.email?.toLowerCase().includes(query) ||
            customer.first_name?.toLowerCase().includes(query) ||
            customer.last_name?.toLowerCase().includes(query) ||
            customer.phone?.includes(query)
        )
      );
    }
  }, [searchQuery, customers]);

  if (!currentShop) {
    return (
      <div className="text-muted-foreground">
        Select a store to view customers.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground">
            View customers from {currentShop.shop_name || currentShop.shop_domain}
          </p>
        </div>
        <Button variant="outline" onClick={fetchCustomers} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search customers by name, email, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {customerEvents.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          {customerEvents.length} customer update{customerEvents.length > 1 ? "s" : ""}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Customers</CardTitle>
          <CardDescription>
            {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? "s" : ""} found
            (sorted by lifetime value)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading customers...
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No customers found
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-muted rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="font-semibold">
                        {customer.first_name || customer.last_name
                          ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim()
                          : "Anonymous"}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {customer.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {customer.email}
                          </span>
                        )}
                        {customer.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {customer.phone}
                          </span>
                        )}
                      </div>
                      {customer.tags && customer.tags.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {customer.tags.slice(0, 3).map((tag, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: customer.currency || currentShop.currency || "USD",
                      }).format(customer.total_spent)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {customer.orders_count} order
                      {customer.orders_count !== 1 ? "s" : ""}
                    </div>
                    {customer.accepts_marketing && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        Marketing
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
