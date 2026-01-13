"use client";

import { RiseCanvas } from "@/components/rise-canvas";
import { useRouter } from "next/navigation";

export default function RisePage() {
  const router = useRouter();

  return (
    <RiseCanvas onClose={() => router.push("/dashboard")} />
  );
}
