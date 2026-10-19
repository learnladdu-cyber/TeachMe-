import { getEmailRules, getSmtpSettings } from "@/lib/integrations/store";

// A compact, high-signal blocklist. Admin can extend via blocked domains.
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "10minutemail.com",
  "tempmail.com",
  "temp-mail.org",
  "throwawaymail.com",
  "yopmail.com",
  "trashmail.com",
  "getnada.com",
  "sharklasers.com",
  "dispostable.com",
  "maildrop.cc",
  "fakeinbox.com",
  "mailnesia.com",
  "tempr.email",
]);

export type SignupEmailCheck = { allowed: true } | { allowed: false; reason: string };

export async function checkSignupEmail(email: string): Promise<SignupEmailCheck> {
  const rules = await getEmailRules();
  const domain = email.split("@")[1]?.toLowerCase().trim() ?? "";
  if (!domain) return { allowed: false, reason: "Enter a valid email address." };

  const matches = (list: string[]) =>
    list.some((entry) => domain === entry || domain.endsWith(`.${entry}`));

  if (rules.allowedDomains.length > 0 && !matches(rules.allowedDomains)) {
    return { allowed: false, reason: "Sign-up is limited to approved email domains." };
  }
  if (matches(rules.blockedDomains)) {
    return { allowed: false, reason: "This email domain is not permitted." };
  }
  if (rules.blockDisposable && DISPOSABLE_DOMAINS.has(domain)) {
    return { allowed: false, reason: "Disposable email addresses are not allowed." };
  }
  return { allowed: true };
}

// Verification is only enforced when an SMTP transport is actually configured,
// otherwise accounts would be locked out with no way to verify.
export async function verificationRequired(): Promise<boolean> {
  const [rules, smtp] = await Promise.all([getEmailRules(), getSmtpSettings()]);
  return rules.requireVerification && smtp.configured;
}
