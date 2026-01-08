"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

export interface Shop {
  id: string;
  shop_domain: string;
  shop_name: string | null;
  shop_email: string | null;
  currency: string;
  is_active: boolean;
  role?: string;
  is_default?: boolean;
}

interface ShopContextType {
  shops: Shop[];
  currentShop: Shop | null;
  setCurrentShop: (shop: Shop) => void;
  isLoading: boolean;
  refetchShops: () => Promise<void>;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export function ShopProvider({ children }: { children: ReactNode }) {
  const [shops, setShops] = useState<Shop[]>([]);
  const [currentShop, setCurrentShopState] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchShops = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setShops([]);
        setCurrentShopState(null);
        return;
      }

      const { data: shopUsers, error } = await supabase
        .from("shop_users")
        .select(
          `
          shop_id,
          role,
          is_default,
          shops (
            id,
            shop_domain,
            shop_name,
            shop_email,
            currency,
            is_active
          )
        `
        )
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching shops:", error);
        return;
      }

      const userShops = (shopUsers || [])
        .filter((su: any) => su.shops?.is_active)
        .map((su: any) => ({
          ...su.shops,
          role: su.role,
          is_default: su.is_default,
        }));

      setShops(userShops);

      // Set current shop to default or first available
      const defaultShop = userShops.find((s: Shop) => s.is_default) || userShops[0];
      if (defaultShop && !currentShop) {
        setCurrentShopState(defaultShop);
      }
    } catch (error) {
      console.error("Error in fetchShops:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  const setCurrentShop = (shop: Shop) => {
    setCurrentShopState(shop);
    // Optionally persist selection
    localStorage.setItem("currentShopId", shop.id);
  };

  return (
    <ShopContext.Provider
      value={{
        shops,
        currentShop,
        setCurrentShop,
        isLoading,
        refetchShops: fetchShops,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
}

export function useShop() {
  const context = useContext(ShopContext);
  if (context === undefined) {
    throw new Error("useShop must be used within a ShopProvider");
  }
  return context;
}
