import { Brand } from "@/components/ui/brand";
import { Container } from "@/components/ui/container";
import { DirectorioLista } from "./directorio-lista";

export default function BarberiasPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border px-4 py-5">
        <Brand />
      </header>

      <Container size="lg" className="flex-1">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-accent">
          Directorio
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold">
          Encontrá tu barbería
        </h1>
        <p className="mt-1 text-fg-muted">
          Buscá por ciudad y reservá turno directo, sin crear cuenta.
        </p>

        <DirectorioLista />
      </Container>
    </div>
  );
}
