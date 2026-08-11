import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { getMetrics } from "./controller.js";

const router = Router();
router.use(authenticate);

router.get("/", authorize(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS), getMetrics);

export default router;
