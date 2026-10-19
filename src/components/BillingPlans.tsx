"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";

type Plan = {
  id: string;
  name: string;
  priceMonthly: number | null;
  currency: string;
  agentLimit: number | null;
  monthlyTickets: number | null;
  retentionDays: number | null;
  features: string[];
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadScript(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve(true);
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function money(plan: Plan): string {
  if (!plan.priceMonthly) return "Free";
  return `${plan.currency === "INR" ? "₹" : ""}${plan.priceMonthly.toLocaleString()}${plan.currency !== "INR" ? ` ${plan.currency}` : ""}/mo`;
}

export function BillingPlans({
  plans,
  currentPlanId,
  paymentsEnabled,
}: {
  plans: Plan[];
  currentPlanId: string | null;
  paymentsEnabled: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function upgrade(plan: Plan) {
    setBusy(plan.id);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/billing/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error?.message ?? "Could not start checkout.");
        setBusy(null);
        return;
      }
      const data = json.data;
      const ok = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
      if (!ok || !window.Razorpay) {
        setError("Could not load the payment checkout.");
        setBusy(null);
        return;
      }
      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        order_id: data.orderId,
        name: "HelpDeskFlow",
        description: `${plan.name} plan`,
        prefill: data.prefill,
        theme: { color: "#1b1533" },
        handler: async (response: Record<string, string>) => {
          const confirm = await fetch("/api/billing/razorpay/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          if (confirm.ok) {
            setMessage(`Payment successful — you're now on the ${plan.name} plan.`);
            router.refresh();
          } else {
            setError("Payment succeeded but we couldn't update your plan. Contact support.");
          }
          setBusy(null);
        },
        modal: { ondismiss: () => setBusy(null) },
      });
      rzp.open();
    } catch {
      setError("Something went wrong starting checkout.");
      setBusy(null);
    }
  }

  return (
    <div className="stack" style={{ gap: 18 }}>
      {message && (
        <div className="alert success">
          <Icon name="check" />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="alert error">
          <Icon name="alert" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid cols-2">
        {plans.map((plan) => {
          const current = plan.id === currentPlanId;
          return (
            <section className="card" key={plan.id}>
              <div className="card-head">
                <h2 style={{ margin: 0, fontSize: 17 }}>{plan.name}</h2>
                <span className="muted" style={{ fontWeight: 600 }}>
                  {money(plan)}
                </span>
              </div>
              <div className="stack" style={{ gap: 8, marginBottom: 16 }}>
                <div className="row between">
                  <span className="muted">Agents</span>
                  <span>{plan.agentLimit ?? "Unlimited"}</span>
                </div>
                <div className="row between">
                  <span className="muted">Monthly tickets</span>
                  <span>{plan.monthlyTickets?.toLocaleString() ?? "Unlimited"}</span>
                </div>
                <div className="row between">
                  <span className="muted">Retention</span>
                  <span>{plan.retentionDays ? `${plan.retentionDays} days` : "—"}</span>
                </div>
              </div>
              <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                {plan.features.map((f) => (
                  <span className="badge no-dot status-CLOSED" key={f}>
                    {f}
                  </span>
                ))}
              </div>
              {current ? (
                <button className="btn secondary block" type="button" disabled>
                  <Icon name="check" /> Current plan
                </button>
              ) : (
                <button
                  className="btn gold block"
                  type="button"
                  disabled={!paymentsEnabled || busy === plan.id || !plan.priceMonthly}
                  onClick={() => upgrade(plan)}
                  title={!paymentsEnabled ? "Online payments are currently disabled" : undefined}
                >
                  {busy === plan.id
                    ? "Opening checkout…"
                    : plan.priceMonthly
                      ? `Upgrade to ${plan.name}`
                      : "Free plan"}
                </button>
              )}
            </section>
          );
        })}
      </div>

      {!paymentsEnabled && (
        <p className="muted" style={{ fontSize: 13 }}>
          Online payments aren&apos;t enabled yet. Ask your platform administrator to configure Razorpay.
        </p>
      )}
    </div>
  );
}
