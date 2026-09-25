"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyLinkLine({ slug }: { slug: string }) {
  const [copiado, setCopiado] = useState(false);
  const ruta = `/reservar/${slug}`;

  async function copiar() {
    const url =
      typeof window !== "undefined" ? `${window.location.origin}${ruta}` : ruta;
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin permiso de portapapeles: el link sigue visible para copiar a mano.
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <a href={ruta} className="break-all font-mono text-xs text-accent underline">
        {ruta}
      </a>
      <Button type="button" variant="outline" onClick={copiar} className="text-xs">
        {copiado ? "¡Copiado!" : "Copiar link"}
      </Button>
    </div>
  );
}
