import { Suspense } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <Image
        src="/logo-icon.png"
        alt="BarberWeb"
        width={72}
        height={72}
        className="mb-8 h-16 w-16 rounded-full"
        priority
      />
      <Container size="sm" className="py-0">
        <Card>
          <h1 className="font-display text-2xl font-semibold">Ingresar</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Acceso para negocios y barberos.
          </p>
          <Suspense>
            <LoginForm />
          </Suspense>
        </Card>
      </Container>
    </div>
  );
}
