import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function PanelIndexPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role === "BARBERO") redirect("/panel/barbero");
  redirect("/panel/negocio");
}
