import { getAuth, clerkClient } from "@clerk/express";
import { eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { db, okenovaUsers, type OkenovaUser } from "@workspace/db";
import { roleForVerifiedEmail } from "./access-policy";

async function getOrCreateProfile(clerkUserId: string): Promise<OkenovaUser> {
  const [existing] = await db
    .select()
    .from(okenovaUsers)
    .where(eq(okenovaUsers.clerkUserId, clerkUserId))
    .limit(1);

  if (existing) return existing;

  const clerkUser = await clerkClient.users.getUser(clerkUserId);
  const primaryEmail = clerkUser.emailAddresses.find(
    (address) => address.id === clerkUser.primaryEmailAddressId,
  );
  const ownerRole = roleForVerifiedEmail(
    primaryEmail?.emailAddress,
    primaryEmail?.verification?.status === "verified",
    process.env.OKENOVA_OWNER_EMAIL,
  );
  const role =
    ownerRole === "owner"
      ? ownerRole
      : clerkUser.publicMetadata.okenovaRole === "staff"
        ? "staff"
        : "customer";
  const displayName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    null;

  const [created] = await db
    .insert(okenovaUsers)
    .values({ clerkUserId, role, displayName })
    .onConflictDoNothing({ target: okenovaUsers.clerkUserId })
    .returning();

  if (created) return created;

  const [concurrentProfile] = await db
    .select()
    .from(okenovaUsers)
    .where(eq(okenovaUsers.clerkUserId, clerkUserId))
    .limit(1);

  if (!concurrentProfile) {
    throw new Error("Unable to create the authenticated app profile.");
  }

  return concurrentProfile;
}

export async function requireOkenovaUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  try {
    res.locals.okenovaUser = await getOrCreateProfile(userId);
    next();
  } catch (error) {
    req.log.error({ err: error }, "Unable to load authenticated app profile");
    next(error);
  }
}

export function requireOkenovaOwner(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const profile = res.locals.okenovaUser as OkenovaUser | undefined;
  if (!profile || profile.role !== "owner") {
    res.status(403).json({ error: "Owner access required." });
    return;
  }
  next();
}

export function getOkenovaUser(res: Response): OkenovaUser {
  const profile = res.locals.okenovaUser as OkenovaUser | undefined;
  if (!profile) {
    throw new Error("Authenticated profile middleware was not applied.");
  }
  return profile;
}
