// Turns Supabase/Postgres errors into short, friendly messages.
// Raw details only go to the browser console, never into the UI.

type MaybeError = { code?: string; message?: string; status?: number } | null | undefined;

export const GENERIC_ERROR = "Something went wrong. Please try again.";

export function friendlyError(error: MaybeError, fallback = GENERIC_ERROR): string {
  if (!error) return fallback;
  console.error("[StoryBank]", error);
  const msg = (error.message ?? "").toLowerCase();

  if (error.code === "23505") return "That already exists.";
  if (error.code === "42501" || error.status === 401 || error.status === 403 || msg.includes("jwt"))
    return "Your session has expired. Please log in again.";
  if (msg.includes("failed to fetch") || msg.includes("network"))
    return "You seem to be offline. Check your connection and try again.";
  return fallback;
}

// Supabase Auth messages for sign-up / login
export function friendlyAuthError(error: MaybeError): string {
  if (!error) return GENERIC_ERROR;
  console.error("[StoryBank auth]", error);
  const msg = (error.message ?? "").toLowerCase();

  if (msg.includes("invalid login credentials")) return "Wrong email or password.";
  if (msg.includes("already registered") || msg.includes("already exists"))
    return "An account with this email already exists. Try logging in.";
  if (msg.includes("password") && (msg.includes("at least") || msg.includes("weak") || msg.includes("short")))
    return "Please choose a stronger password (at least 6 characters).";
  if (msg.includes("email") && (msg.includes("invalid") || msg.includes("format")))
    return "Please enter a valid email address.";
  if (msg.includes("rate limit") || error.status === 429)
    return "Too many attempts. Please wait a minute and try again.";
  if (msg.includes("failed to fetch") || msg.includes("network"))
    return "You seem to be offline. Check your connection and try again.";
  return GENERIC_ERROR;
}
