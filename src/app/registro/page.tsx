import { Brand } from "@/components/ui/brand";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { RegistroForm } from "./registro-form";

export default function RegistroPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <div className="mb-8">
        <Brand />
      </div>
      <Container size="sm" className="py-0">
        <Card>
          <h1 className="font-display text-2xl font-semibold">Registrá tu negocio</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Creá tu cuenta para empezar a recibir reservas online.
          </p>
          <RegistroForm />
        </Card>
      </Container>
    </div>
  );
}
