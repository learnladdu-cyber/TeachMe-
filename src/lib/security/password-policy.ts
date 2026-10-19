const MIN_LENGTH = 10;
const MAX_LENGTH = 200;

// A small blocklist of the most commonly breached passwords. In production,
// extend this with a full breach corpus (e.g. HaveIBeenPwned range API).
const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "passw0rd",
  "p@ssw0rd",
  "1234567890",
  "123456789",
  "12345678",
  "qwerty123",
  "qwertyuiop",
  "letmein123",
  "welcome123",
  "admin123",
  "administrator",
  "iloveyou123",
  "monkey123",
  "dragon123",
  "football123",
  "baseball123",
  "abc123456",
  "changeme123",
  "helpdesk123",
  "helpdeskflow",
  "sunshine123",
  "princess123",
  "trustno1",
  "master123",
  "shadow123",
  "superman123",
  "starwars123",
  "whatever123",
  "computer123",
  "michael123",
  "jennifer123",
  "0000000000",
  "1111111111",
]);

export type PasswordContext = { email?: string | null; name?: string | null };

export function passwordProblems(
  password: string,
  context: PasswordContext = {},
): string[] {
  const problems: string[] = [];
  const lower = password.toLowerCase();

  if (password.length < MIN_LENGTH) {
    problems.push(`Use at least ${MIN_LENGTH} characters.`);
  }
  if (password.length > MAX_LENGTH) {
    problems.push(`Use at most ${MAX_LENGTH} characters.`);
  }

  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) =>
    re.test(password),
  ).length;
  if (classes < 3) {
    problems.push("Mix upper case, lower case, numbers and symbols.");
  }

  if (COMMON_PASSWORDS.has(lower)) {
    problems.push("This password is too common.");
  }

  if (/(.)\1{3,}/.test(password)) {
    problems.push("Avoid repeating the same character four or more times.");
  }

  if (/^(?:1234|abcd|qwer|asdf|zxcv)/i.test(password)) {
    problems.push("Avoid predictable keyboard sequences.");
  }

  const local = context.email?.split("@")[0]?.toLowerCase();
  if (local && local.length >= 3 && lower.includes(local)) {
    problems.push("Do not include your email address.");
  }

  const namePart = context.name?.toLowerCase().replace(/[^a-z]/g, "");
  if (namePart && namePart.length >= 3 && lower.replace(/[^a-z]/g, "").includes(namePart)) {
    problems.push("Do not include your name.");
  }

  return problems;
}

export function isPasswordAcceptable(password: string, context: PasswordContext = {}): boolean {
  return passwordProblems(password, context).length === 0;
}

export const PASSWORD_MIN_LENGTH = MIN_LENGTH;
