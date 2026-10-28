import assert from "node:assert/strict";
import test from "node:test";
import {
  canAccessConversation,
  roleForVerifiedEmail,
} from "../src/lib/access-policy.ts";
import {
  CreateAnnouncementBody,
  CreateOrderBody,
  SendConversationMessageBody,
  UpdateOrderBody,
  UpdateServiceBody,
} from "../../../lib/api-zod/src/generated/api.ts";

test("owner role requires the configured, verified email", () => {
  assert.equal(
    roleForVerifiedEmail("owner@example.com", true, " OWNER@example.com "),
    "owner",
  );
  assert.equal(
    roleForVerifiedEmail("owner@example.com", false, "owner@example.com"),
    "customer",
  );
  assert.equal(
    roleForVerifiedEmail("other@example.com", true, "owner@example.com"),
    "customer",
  );
  assert.equal(roleForVerifiedEmail(null, true, "owner@example.com"), "customer");
});

test("customers can access only their own conversation", () => {
  assert.equal(canAccessConversation("customer", "customer-a", "customer-a"), true);
  assert.equal(canAccessConversation("customer", "customer-a", "customer-b"), false);
  assert.equal(canAccessConversation("owner", "business-owner", "customer-b"), true);
});

test("generated write schemas reject caller-controlled identity fields", () => {
  const serviceId = "d55e4f6a-a8aa-4ac5-834c-a020ab42d184";
  const identity = "31e26b5e-0136-4245-9f95-f13c85d08024";

  assert.equal(
    CreateOrderBody.strict().safeParse({
      serviceId,
      details: "Please create a logo.",
      customerId: identity,
    }).success,
    false,
  );
  assert.equal(
    SendConversationMessageBody.strict().safeParse({
      body: "Hello",
      senderId: identity,
      senderRole: "owner",
    }).success,
    false,
  );
  assert.equal(
    UpdateOrderBody.strict().safeParse({
      status: "completed",
      customerId: identity,
    }).success,
    false,
  );
  assert.equal(
    CreateAnnouncementBody.strict().safeParse({
      title: "Update",
      body: "A short update.",
      ownerId: identity,
    }).success,
    false,
  );
  assert.equal(
    UpdateServiceBody.strict().safeParse({
      available: false,
      role: "owner",
    }).success,
    false,
  );
});
