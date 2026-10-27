import { db, okenovaServices } from "@workspace/db";

const initialServices = [
  {
    name: "Graphic design",
    category: "Brand & design",
    description:
      "Logos, flyers, social graphics, and visual identity for growing businesses.",
    priceLabel: "Quote on request",
    available: true,
    sortOrder: 1,
  },
  {
    name: "Photo editing",
    category: "Photo & media",
    description:
      "Retouching, color correction, and polished product photography.",
    priceLabel: "Quote on request",
    available: true,
    sortOrder: 2,
  },
  {
    name: "Phone repairs",
    category: "Device support",
    description:
      "Screen, charging, and software support for everyday devices.",
    priceLabel: "Quote on request",
    available: true,
    sortOrder: 3,
  },
];

export async function seedOkenovaServices(): Promise<void> {
  await db
    .insert(okenovaServices)
    .values(initialServices)
    .onConflictDoNothing({ target: okenovaServices.name });
}
