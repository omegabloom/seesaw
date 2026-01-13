import { LoginForm } from "@/components/login-form";
import Image from "next/image";
import Link from "next/link";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link href="/">
            <Image src="/seesaw_icon.png" alt="Seesaw" width={128} height={128} />
          </Link>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
