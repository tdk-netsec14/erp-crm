import "express-async-errors"; // patches async errors to work with Express error handling
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import authRoutes from "./modules/auth/routes.js";
import customerRoutes from "./modules/customers/routes.js";
import productRoutes from "./modules/products/routes.js";
import challanRoutes from "./modules/challans/routes.js";
import dashboardRoutes from "./modules/dashboard/routes.js";

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/v1/auth", authRoutes);
app.use("/v1/customers", customerRoutes);
app.use("/v1/products", productRoutes);
app.use("/v1/challans", challanRoutes);
app.use("/v1/dashboard", dashboardRoutes);

app.use(errorHandler);

export default app;
