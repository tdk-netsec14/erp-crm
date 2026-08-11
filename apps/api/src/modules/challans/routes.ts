import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import { createChallanSchema, updateChallanSchema } from "./schemas.js";
import * as controller from "./controller.js";

const router = Router();
router.use(authenticate);

router.get("/", authorize(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS), controller.list);
router.post("/", authorize(Role.ADMIN, Role.SALES), validate(createChallanSchema), controller.create);
router.get("/:id", authorize(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS), controller.getOne);
router.put("/:id", authorize(Role.ADMIN, Role.SALES), validate(updateChallanSchema), controller.update);
router.post("/:id/confirm", authorize(Role.ADMIN, Role.SALES), controller.confirm);
router.post("/:id/cancel", authorize(Role.ADMIN, Role.SALES), controller.cancel);

export default router;
