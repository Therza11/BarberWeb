"use client";

// Estrellas del sistema de resenas. Sin libreria de iconos en el proyecto:
// se usan los glyphs ★/☆ directamente, consistente con el resto del design
// system (minimalista, sin dependencias visuales extra).

export function StarsDisplay({
  promedio,
  cantidad,
  size = "text-sm",
}: {
  promedio: number | null;
  cantidad: number;
  size?: string;
}) {
  if (!promedio || cantidad === 0) {
    return <span className={`${size} text-fg-muted`}>Sin reseñas todavía</span>;
  }

  const llenas = Math.round(promedio);

  return (
    <span className={`inline-flex items-center gap-1 ${size}`}>
      <span className="text-accent" aria-hidden>
        {"★".repeat(llenas)}
        {"☆".repeat(5 - llenas)}
      </span>
      <span className="text-fg-muted">
        {promedio.toFixed(1)} ({cantidad})
      </span>
    </span>
  );
}

export function StarsInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (valor: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
          className={`text-2xl leading-none transition-colors ${
            n <= value ? "text-accent" : "text-border hover:text-accent/50"
          }`}
        >
          {n <= value ? "★" : "☆"}
        </button>
      ))}
    </div>
  );
}
