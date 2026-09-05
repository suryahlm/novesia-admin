export const ADMIN_COOKIE_NAME = "novesia_admin_session";
export const ADMIN_DEFAULT_PASSWORD = "Kjkszpjn7000#";

export function getAdminPassword(): string {
  const envPass = process.env.ADMIN_PASSWORD;
  if (
    envPass &&
    envPass !== "Novesia2026!" &&
    envPass !== "admin" &&
    envPass !== "Kjkszpjn7000"
  ) {
    return envPass;
  }
  return ADMIN_DEFAULT_PASSWORD;
}

export async function computeAdminToken(password: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${password}-novesia-admin-secret-2026`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function getExpectedAdminToken(): Promise<string> {
  return computeAdminToken(getAdminPassword());
}
