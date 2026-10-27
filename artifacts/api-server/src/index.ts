import app from "./app";
import { logger } from "./lib/logger";
import { seedOkenovaServices } from "./lib/okenova-seed";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

if (!process.env.OKENOVA_OWNER_EMAIL?.trim()) {
  throw new Error(
    "OKENOVA_OWNER_EMAIL must be configured before the API server can start.",
  );
}

await seedOkenovaServices();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
