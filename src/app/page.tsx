import Link from "next/link";
import { Brand } from "@/components/ui/brand";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border px-4 py-5">
        <Brand />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-accent">
          Turnos para barberías
        </p>
        <h1 className="mt-4 max-w-2xl font-display text-4xl font-semibold leading-tight sm:text-5xl">
          Tus clientes reservan turno en segundos, sin crear cuenta.
        </h1>
        <p className="mt-4 max-w-lg text-fg-muted">
          Disponibilidad en tiempo real, confirmación y cancelación por email,
          y comisiones por barbero, todo en un solo lugar.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/barberias">
            <Button>Buscar barberías</Button>
          </Link>
          <Link href="/login">
            <Button variant="outline">Ingresar a mi negocio</Button>
          </Link>
        </div>
      </main>

      <footer className="border-t border-border px-4 py-4 text-center text-xs text-fg-muted">
        BarberWeb
      </footer>
    </div>
  );
}
