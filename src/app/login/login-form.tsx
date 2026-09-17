"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Field, Input, Label, Select } from "@/components/ui/field";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/panel";

  const [tipo, setTipo] = useState<"barbero" | "negocio">("barbero");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        tipo,
        redirect: false,
      });

      if (!res || res.error) {
        setError("Email o contraseña incorrectos");
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
      <Field>
        <Label>Tipo de cuenta</Label>
        <Select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as "barbero" | "negocio")}
        >
          <option value="barbero">Barbero</option>
          <option value="negocio">Negocio</option>
        </Select>
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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button type="submit" disabled={enviando} className="mt-2 w-full">
        {enviando ? "Ingresando..." : "Ingresar"}
      </Button>
    </form>
  );
}
