import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import { createProductSchema, updateProductSchema, createStockMovementSchema } from "./schemas.js";
import * as controller from "./controller.js";

const router = Router();
router.use(authenticate);

router.get("/", authorize(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS), controller.list);
router.post("/", authorize(Role.ADMIN, Role.WAREHOUSE), validate(createProductSchema), controller.create);
router.get("/:id", authorize(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS), controller.getOne);
router.put("/:id", authorize(Role.ADMIN, Role.WAREHOUSE), validate(updateProductSchema), controller.update);
router.delete("/:id", authorize(Role.ADMIN), controller.remove);
router.get("/:id/stock-movements", authorize(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS), controller.getStockMovements);
router.post("/:id/stock-movements", authorize(Role.ADMIN, Role.WAREHOUSE), validate(createStockMovementSchema), controller.addStockMovement);

export default router;
