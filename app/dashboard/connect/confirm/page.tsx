"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Store, Users, CheckCircle, ArrowRight, ArrowLeft } from "lucide-react";

export default function ConfirmConnectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shop = searchParams.get("shop");
  const shopName = searchParams.get("name");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!shop) {
      router.push("/dashboard/connect");
    }
  }, [shop, router]);

  const handleProceed = () => {
    setIsLoading(true);
    // Continue to OAuth with confirmation flag
    router.push(`/api/auth/shopify?shop=${encodeURIComponent(shop!)}&confirmed=true`);
  };

  const handleCancel = () => {
    router.push("/dashboard/connect");
  };

  if (!shop) {
    return null;
  }

  return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Store className="h-6 w-6 text-green-600" />
            <CardTitle>App Already Installed</CardTitle>
          </div>
          <CardDescription>
            This store already has Seesaw installed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-900">
                  {shopName || shop}
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Seesaw is already connected to this store.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">
                  You'll be added as a user
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Since you have admin access to this Shopify store, you can connect your Seesaw account to view the same data. This is useful for teams where multiple people need access.
                </p>
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>When you proceed:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Shopify will verify your admin access</li>
              <li>You'll be linked to the existing store data</li>
              <li>No duplicate data will be created</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
              disabled={isLoading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleProceed}
              className="flex-1"
              disabled={isLoading}
            >
              {isLoading ? (
                "Connecting..."
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
