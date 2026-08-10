import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { loginSchema, refreshSchema, logoutSchema } from "./schemas.js";
import { loginController, refreshController, logoutController } from "./controller.js";

const router = Router();

router.post("/login", validate(loginSchema), loginController);
router.post("/refresh", validate(refreshSchema), refreshController);
router.post("/logout", validate(logoutSchema), logoutController);

export default router;
