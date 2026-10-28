export type OkenovaRole = "customer" | "owner";

export function roleForVerifiedEmail(
  email: string | null | undefined,
  verified: boolean,
  configuredOwnerEmail: string | undefined,
): OkenovaRole {
  const configured = configuredOwnerEmail?.trim().toLowerCase();
  if (
    verified &&
    email &&
    configured &&
    email.trim().toLowerCase() === configured
  ) {
    return "owner";
  }
  return "customer";
}

export function canAccessConversation(
  role: OkenovaRole,
  requesterId: string,
  customerId: string,
): boolean {
  return role === "owner" || requesterId === customerId;
}
