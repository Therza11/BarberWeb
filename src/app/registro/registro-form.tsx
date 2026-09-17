"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Field, Input, Label } from "@/components/ui/field";

export function RegistroForm() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [telefono, setTelefono] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);

    try {
      const res = await fetch("/api/negocios/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, email, password, telefono }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "No se pudo crear el negocio");
        return;
      }

      const signInRes = await signIn("credentials", {
        email,
        password,
        tipo: "negocio",
        redirect: false,
      });

      if (!signInRes || signInRes.error) {
        router.push("/login");
        return;
      }

      router.push("/panel/negocio");
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
      <Field>
        <Label>Nombre del negocio</Label>
        <Input required value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </Field>

      <Field>
        <Label>Teléfono (opcional)</Label>
        <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} />
      </Field>

      <Field>
        <Label>Email</Label>
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>

      <Field>
        <Label>Contraseña</Label>
        <Input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button type="submit" disabled={enviando} className="mt-2 w-full">
        {enviando ? "Creando..." : "Crear cuenta"}
      </Button>

      <p className="text-center text-sm text-fg-muted">
        ¿Ya tenés cuenta?{" "}
        <a href="/login" className="text-accent">
          Ingresar
        </a>
      </p>
    </form>
  );
}
