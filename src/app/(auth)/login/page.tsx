import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/app");

  return (
    <>
      <h1>Welcome back</h1>
      <p className="sub">Agents, admins and customers sign in from here.</p>
      <LoginForm />
      <p className="auth-alt">
        No account? <Link href="/register">Create an organization</Link>
      </p>
    </>
  );
}
