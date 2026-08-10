import { env } from "./config/env.js";
import app from "./app.js";
import { prisma } from "./lib/prisma.js";
import { logger } from "./lib/logger.js";

async function main() {
  try {
    await prisma.$connect();
    logger.info("Connected to database");
  } catch (err) {
    logger.error("Could not connect to database", { err });
    process.exit(1);
  }

  app.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT}`);
  });
}

main();
