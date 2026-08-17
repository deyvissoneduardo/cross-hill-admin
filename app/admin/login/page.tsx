import { redirect } from "next/navigation";

/** Compatibilidade com links antigos: o login administrativo agora fica em `/`. */
export default function LegacyAdminLoginPage() {
  redirect("/");
}
