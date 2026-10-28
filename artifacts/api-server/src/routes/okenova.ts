import {
  GetCurrentUserResponse,
  ListAnnouncementsResponse,
  ListConversationMessagesParams,
  ListConversationMessagesResponse,
  ListConversationsResponse,
  ListOrdersResponse,
  ListServicesResponse,
  OpenConversationResponse,
  SendConversationMessageBody,
  SendConversationMessageParams,
  SendConversationMessageResponse,
  CreateAnnouncementBody,
  CreateAnnouncementResponse,
  CreateOrderBody,
  CreateOrderResponse,
  UpdateOrderBody,
  UpdateOrderParams,
  UpdateOrderResponse,
  UpdateServiceBody,
  UpdateServiceParams,
  UpdateServiceResponse,
} from "@workspace/api-zod";
import {
  db,
  okenovaAnnouncements,
  okenovaConversations,
  okenovaMessages,
  okenovaOrders,
  okenovaServices,
  okenovaUsers,
} from "@workspace/db";
import { getAuth } from "@clerk/express";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { Router, type IRouter, type Response } from "express";
import rateLimit from "express-rate-limit";
import { canAccessConversation } from "../lib/access-policy";
import { getOkenovaUser, requireOkenovaOwner, requireOkenovaUser } from "../lib/okenova-auth";

const router: IRouter = Router();

const userWriteLimit = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => getAuth(req).userId ?? "unauthenticated",
});

const messageWriteLimit = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => getAuth(req).userId ?? "unauthenticated",
});

function customerOnly(res: Response): boolean {
  const profile = getOkenovaUser(res);
  if (profile.role !== "customer") {
    res.status(403).json({ error: "Customer access required." });
    return false;
  }
  return true;
}

async function findAccessibleConversation(
  conversationId: string,
  role: "customer" | "owner",
  userId: string,
) {
  const [conversation] = await db
    .select()
    .from(okenovaConversations)
    .where(eq(okenovaConversations.id, conversationId))
    .limit(1);

  if (!conversation) return null;
  if (!canAccessConversation(role, userId, conversation.customerId)) return null;
  return conversation;
}

router.get("/me", requireOkenovaUser, async (_req, res): Promise<void> => {
  const profile = getOkenovaUser(res);
  res.json(
    GetCurrentUserResponse.parse({
      id: profile.id,
      role: profile.role,
      displayName: profile.displayName,
    }),
  );
});

router.get("/services", async (_req, res): Promise<void> => {
  const services = await db
    .select()
    .from(okenovaServices)
    .orderBy(asc(okenovaServices.sortOrder), asc(okenovaServices.name));

  res.json(
    ListServicesResponse.parse(
      services.map((service) => ({
        id: service.id,
        name: service.name,
        category: service.category,
        description: service.description,
        priceLabel: service.priceLabel,
        available: service.available,
      })),
    ),
  );
});

router.patch(
  "/services/:serviceId",
  requireOkenovaUser,
  requireOkenovaOwner,
  userWriteLimit,
  async (req, res): Promise<void> => {
    const params = UpdateServiceParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid service identifier." });
      return;
    }
    const parsed = UpdateServiceBody.strict().safeParse(req.body);
    if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
      res.status(400).json({ error: "Provide at least one valid service update." });
      return;
    }

    const [service] = await db
      .update(okenovaServices)
      .set(parsed.data)
      .where(eq(okenovaServices.id, params.data.serviceId))
      .returning();

    if (!service) {
      res.status(404).json({ error: "Service not found." });
      return;
    }

    res.json(
      UpdateServiceResponse.parse({
        id: service.id,
        name: service.name,
        category: service.category,
        description: service.description,
        priceLabel: service.priceLabel,
        available: service.available,
      }),
    );
  },
);

router.get("/conversations", requireOkenovaUser, async (_req, res): Promise<void> => {
  const profile = getOkenovaUser(res);
  const conversations = await db
    .select({
      id: okenovaConversations.id,
      customerId: okenovaConversations.customerId,
      customerName: okenovaUsers.displayName,
      createdAt: okenovaConversations.createdAt,
      updatedAt: okenovaConversations.updatedAt,
    })
    .from(okenovaConversations)
    .innerJoin(
      okenovaUsers,
      eq(okenovaConversations.customerId, okenovaUsers.id),
    )
    .where(
      profile.role === "owner"
        ? undefined
        : eq(okenovaConversations.customerId, profile.id),
    )
    .orderBy(desc(okenovaConversations.updatedAt));

  const conversationIds = conversations.map((conversation) => conversation.id);
  const recentMessages = conversationIds.length
    ? await db
        .select({
          conversationId: okenovaMessages.conversationId,
          body: okenovaMessages.body,
          createdAt: okenovaMessages.createdAt,
        })
        .from(okenovaMessages)
        .where(inArray(okenovaMessages.conversationId, conversationIds))
        .orderBy(desc(okenovaMessages.createdAt))
    : [];

  const lastMessageByConversation = new Map<string, string>();
  for (const message of recentMessages) {
    if (!lastMessageByConversation.has(message.conversationId)) {
      lastMessageByConversation.set(message.conversationId, message.body);
    }
  }

  res.json(
    ListConversationsResponse.parse(
      conversations.map((conversation) => ({
        ...conversation,
        lastMessage: lastMessageByConversation.get(conversation.id) ?? null,
      })),
    ),
  );
});

router.post(
  "/conversations",
  requireOkenovaUser,
  userWriteLimit,
  async (req, res): Promise<void> => {
    const profile = getOkenovaUser(res);
    if (profile.role !== "customer") {
      res.status(403).json({ error: "Customer access required." });
      return;
    }
    if (
      req.body !== undefined &&
      (!req.body ||
        typeof req.body !== "object" ||
        Array.isArray(req.body) ||
        Object.keys(req.body).length > 0)
    ) {
      res.status(400).json({ error: "This endpoint does not accept a request body." });
      return;
    }

    await db
      .insert(okenovaConversations)
      .values({ customerId: profile.id })
      .onConflictDoNothing({
        target: okenovaConversations.customerId,
      });

    const [conversation] = await db
      .select({
        id: okenovaConversations.id,
        customerId: okenovaConversations.customerId,
        customerName: okenovaUsers.displayName,
        createdAt: okenovaConversations.createdAt,
        updatedAt: okenovaConversations.updatedAt,
      })
      .from(okenovaConversations)
      .innerJoin(
        okenovaUsers,
        eq(okenovaConversations.customerId, okenovaUsers.id),
      )
      .where(eq(okenovaConversations.customerId, profile.id))
      .limit(1);

    if (!conversation) {
      res.status(500).json({ error: "Unable to open a conversation." });
      return;
    }

    res.json(
      OpenConversationResponse.parse({
        ...conversation,
        lastMessage: null,
      }),
    );
  },
);

router.get(
  "/conversations/:conversationId/messages",
  requireOkenovaUser,
  async (req, res): Promise<void> => {
    const params = ListConversationMessagesParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid conversation identifier." });
      return;
    }

    const profile = getOkenovaUser(res);
    const conversation = await findAccessibleConversation(
      params.data.conversationId,
      profile.role,
      profile.id,
    );
    if (!conversation) {
      res.status(404).json({ error: "Conversation not found." });
      return;
    }

    const messages = await db
      .select({
        id: okenovaMessages.id,
        conversationId: okenovaMessages.conversationId,
        senderId: okenovaMessages.senderId,
        senderRole: okenovaUsers.role,
        body: okenovaMessages.body,
        createdAt: okenovaMessages.createdAt,
      })
      .from(okenovaMessages)
      .innerJoin(okenovaUsers, eq(okenovaMessages.senderId, okenovaUsers.id))
      .where(eq(okenovaMessages.conversationId, conversation.id))
      .orderBy(asc(okenovaMessages.createdAt));

    res.json(ListConversationMessagesResponse.parse(messages));
  },
);

router.post(
  "/conversations/:conversationId/messages",
  requireOkenovaUser,
  messageWriteLimit,
  async (req, res): Promise<void> => {
    const params = SendConversationMessageParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid conversation identifier." });
      return;
    }
    const parsed = SendConversationMessageBody.strict().safeParse(req.body);
    const body = parsed.success ? parsed.data.body.trim() : "";
    if (!parsed.success || !body) {
      res.status(400).json({ error: "Message text is required." });
      return;
    }

    const profile = getOkenovaUser(res);
    const conversation = await findAccessibleConversation(
      params.data.conversationId,
      profile.role,
      profile.id,
    );
    if (!conversation) {
      res.status(404).json({ error: "Conversation not found." });
      return;
    }

    const message = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(okenovaMessages)
        .values({
          conversationId: conversation.id,
          senderId: profile.id,
          body,
        })
        .returning();

      await tx
        .update(okenovaConversations)
        .set({ updatedAt: new Date() })
        .where(eq(okenovaConversations.id, conversation.id));

      return created;
    });

    res.status(201).json(
      SendConversationMessageResponse.parse({
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        senderRole: profile.role,
        body: message.body,
        createdAt: message.createdAt,
      }),
    );
  },
);

router.get("/orders", requireOkenovaUser, async (_req, res): Promise<void> => {
  const profile = getOkenovaUser(res);
  const orders = await db
    .select({
      id: okenovaOrders.id,
      serviceId: okenovaOrders.serviceId,
      serviceName: okenovaServices.name,
      customerId: okenovaOrders.customerId,
      customerName: okenovaUsers.displayName,
      details: okenovaOrders.details,
      status: okenovaOrders.status,
      createdAt: okenovaOrders.createdAt,
    })
    .from(okenovaOrders)
    .innerJoin(okenovaServices, eq(okenovaOrders.serviceId, okenovaServices.id))
    .innerJoin(okenovaUsers, eq(okenovaOrders.customerId, okenovaUsers.id))
    .where(
      profile.role === "owner"
        ? undefined
        : eq(okenovaOrders.customerId, profile.id),
    )
    .orderBy(desc(okenovaOrders.createdAt));

  res.json(ListOrdersResponse.parse(orders));
});

router.post(
  "/orders",
  requireOkenovaUser,
  userWriteLimit,
  async (req, res): Promise<void> => {
    const profile = getOkenovaUser(res);
    if (!customerOnly(res)) return;

    const parsed = CreateOrderBody.strict().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid service request." });
      return;
    }

    const [service] = await db
      .select()
      .from(okenovaServices)
      .where(
        and(
          eq(okenovaServices.id, parsed.data.serviceId),
          eq(okenovaServices.available, true),
        ),
      )
      .limit(1);

    if (!service) {
      res.status(404).json({ error: "Service is not available." });
      return;
    }

    const [order] = await db
      .insert(okenovaOrders)
      .values({
        customerId: profile.id,
        serviceId: service.id,
        details: parsed.data.details.trim(),
      })
      .returning();

    res.status(201).json(
      CreateOrderResponse.parse({
        id: order.id,
        serviceId: order.serviceId,
        serviceName: service.name,
        customerId: profile.id,
        customerName: profile.displayName,
        details: order.details,
        status: order.status,
        createdAt: order.createdAt,
      }),
    );
  },
);

router.patch(
  "/orders/:orderId",
  requireOkenovaUser,
  requireOkenovaOwner,
  userWriteLimit,
  async (req, res): Promise<void> => {
    const params = UpdateOrderParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid order identifier." });
      return;
    }
    const parsed = UpdateOrderBody.strict().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid order status." });
      return;
    }

    const [order] = await db
      .update(okenovaOrders)
      .set({ status: parsed.data.status })
      .where(eq(okenovaOrders.id, params.data.orderId))
      .returning();

    if (!order) {
      res.status(404).json({ error: "Order not found." });
      return;
    }

    const [service] = await db
      .select({ name: okenovaServices.name })
      .from(okenovaServices)
      .where(eq(okenovaServices.id, order.serviceId))
      .limit(1);
    const [customer] = await db
      .select({ displayName: okenovaUsers.displayName })
      .from(okenovaUsers)
      .where(eq(okenovaUsers.id, order.customerId))
      .limit(1);

    res.json(
      UpdateOrderResponse.parse({
        id: order.id,
        serviceId: order.serviceId,
        serviceName: service?.name ?? "Service",
        customerId: order.customerId,
        customerName: customer?.displayName ?? null,
        details: order.details,
        status: order.status,
        createdAt: order.createdAt,
      }),
    );
  },
);

router.get("/announcements", async (_req, res): Promise<void> => {
  const announcements = await db
    .select({
      id: okenovaAnnouncements.id,
      title: okenovaAnnouncements.title,
      body: okenovaAnnouncements.body,
      publishedAt: okenovaAnnouncements.publishedAt,
    })
    .from(okenovaAnnouncements)
    .orderBy(desc(okenovaAnnouncements.publishedAt));

  res.json(ListAnnouncementsResponse.parse(announcements));
});

router.post(
  "/announcements",
  requireOkenovaUser,
  requireOkenovaOwner,
  userWriteLimit,
  async (req, res): Promise<void> => {
    const parsed = CreateAnnouncementBody.strict().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid announcement." });
      return;
    }
    const profile = getOkenovaUser(res);
    const [announcement] = await db
      .insert(okenovaAnnouncements)
      .values({
        ownerId: profile.id,
        title: parsed.data.title.trim(),
        body: parsed.data.body.trim(),
      })
      .returning();

    res.status(201).json(CreateAnnouncementResponse.parse(announcement));
  },
);

export default router;
