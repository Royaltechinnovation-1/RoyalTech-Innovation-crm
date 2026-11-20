export type LeadInput = {
  name: string;
  email: string;
  phone: string;
  message: string;
  service?: string;
  source: string;
};

export async function submitLead(input: LeadInput) {
  const apiBase =
    process.env.NEXT_PUBLIC_MAIN_SITE_URL || "http://localhost:3000";
  const response = await fetch(`${apiBase}/api/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = (await response.json().catch(() => null)) as {
    ok?: boolean;
    error?: string;
  } | null;

  if (!response.ok || !data?.ok) {
    throw new Error(data?.error || "Something went wrong. Please try again.");
  }
}
