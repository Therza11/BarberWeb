import { auth } from "@/auth";
import { Brand } from "@/components/ui/brand";
import { LogoutButton } from "./logout-button";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-4">
        <Brand href="/panel" />
        <div className="flex items-center gap-4">
          {session?.user?.esIndependiente && (
            <a
              href={session.user.role === "NEGOCIO" ? "/panel/barbero" : "/panel/negocio"}
              className="text-sm text-accent"
            >
              {session.user.role === "NEGOCIO" ? "Ver mis turnos" : "Ver mi negocio"}
            </a>
          )}
          <span className="text-sm text-fg-muted">{session?.user?.name}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
