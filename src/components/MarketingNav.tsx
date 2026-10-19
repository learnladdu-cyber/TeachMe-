import { getSession } from "@/lib/session";
import { MarketingNavClient } from "@/components/MarketingNavClient";

export async function MarketingNav() {
  const session = await getSession();

  return (
    <MarketingNavClient
      user={
        session
          ? { name: session.user.name, email: session.user.email }
          : null
      }
    />
  );
}
