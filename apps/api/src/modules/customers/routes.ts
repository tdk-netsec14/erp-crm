import { Router } from "express";
import { Role } from "@prisma/client";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import { createCustomerSchema, updateCustomerSchema, addFollowUpSchema } from "./schemas.js";
import * as controller from "./controller.js";

const router = Router();
router.use(authenticate);

router.get("/", authorize(Role.ADMIN, Role.SALES, Role.ACCOUNTS), controller.list);
router.post("/", authorize(Role.ADMIN, Role.SALES), validate(createCustomerSchema), controller.create);
router.get("/:id", authorize(Role.ADMIN, Role.SALES, Role.ACCOUNTS), controller.getOne);
router.put("/:id", authorize(Role.ADMIN, Role.SALES), validate(updateCustomerSchema), controller.update);
router.delete("/:id", authorize(Role.ADMIN, Role.SALES), controller.remove);
router.get("/:id/follow-ups", authorize(Role.ADMIN, Role.SALES), controller.getFollowUps);
router.post("/:id/follow-ups", authorize(Role.ADMIN, Role.SALES), validate(addFollowUpSchema), controller.createFollowUp);

export default router;
