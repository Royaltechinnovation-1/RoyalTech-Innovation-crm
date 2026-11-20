/** Official HR Google Workspace mailbox — only this account may open HR CRM. */
export const HR_GOOGLE_EMAIL = "hr@royaltechinnovation.co.in";

export const AUTH_PROVIDER_KEY = "royaltech-auth-provider-v1";

export type AuthProvider = "google" | "password";

export function isHrGoogleEmail(email: string | undefined | null) {
  return String(email || "")
    .trim()
    .toLowerCase() === HR_GOOGLE_EMAIL;
}

export function loadAuthProvider(): AuthProvider | null {
  try {
    const raw = sessionStorage.getItem(AUTH_PROVIDER_KEY);
    if (raw === "google" || raw === "password") return raw;
  } catch {
    /* ignore */
  }
  return null;
}

export function saveAuthProvider(provider: AuthProvider | null) {
  try {
    if (!provider) sessionStorage.removeItem(AUTH_PROVIDER_KEY);
    else sessionStorage.setItem(AUTH_PROVIDER_KEY, provider);
  } catch {
    /* ignore */
  }
}

export function decodeGoogleCredential(credential: string): {
  email?: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
} {
  try {
    const payload = credential.split(".")[1];
    if (!payload) return {};
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    return JSON.parse(atob(padded)) as {
      email?: string;
      name?: string;
      picture?: string;
      email_verified?: boolean;
    };
  } catch {
    return {};
  }
}

/**
 * HR CRM unlock:
 * - official HR mailbox + hr_admin role
 * - Super Admin (founder) — full company access including Messages
 * Google Sign-In can be re-enforced later; password login is allowed for now.
 */
export function canOpenHrCrm(opts: {
  email?: string | null;
  role?: string | null;
  authProvider?: AuthProvider | null;
}) {
  void opts.authProvider;
  if (opts.role === "founder") return true;
  return isHrGoogleEmail(opts.email) && opts.role === "hr_admin";
}

export function loadGoogleIdentityScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-gis="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Google script failed")));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleGis = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Google Sign-In"));
    document.head.appendChild(script);
  });
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            context?: string;
            login_uri?: string;
            native_callback?: (response: { credential: string }) => void;
            ux_mode?: "popup" | "redirect";
            itp_support?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: string;
              theme?: string;
              size?: string;
              text?: string;
              shape?: string;
              logo_alignment?: string;
              width?: number | string;
              locale?: string;
            },
          ) => void;
          prompt: (momentListener?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
          disableAutoSelect: () => void;
          cancel: () => void;
        };
      };
    };
  }
}
