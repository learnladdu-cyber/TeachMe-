import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { RegisterForm } from "@/components/RegisterForm";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const session = await getSession();
  if (session) redirect("/app");

  return (
    <>
      <h1>Create your organization</h1>
      <p className="sub">
        You become the organization admin. Your team and customers join the same tenant.
      </p>
      <RegisterForm />
      <p className="auth-alt">
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </>
  );
}
