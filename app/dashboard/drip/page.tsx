"use client";

import { DripCanvas } from "@/components/drip-canvas";
import { useRouter } from "next/navigation";

export default function DripPage() {
  const router = useRouter();

  return (
    <DripCanvas onClose={() => router.push("/dashboard")} />
  );
}
