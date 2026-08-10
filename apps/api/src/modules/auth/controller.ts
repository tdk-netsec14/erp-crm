import { Request, Response } from "express";
import * as authService from "./service.js";
import type { LoginInput, RefreshInput, LogoutInput } from "./schemas.js";

export async function loginController(req: Request, res: Response) {
  const result = await authService.login(req.body as LoginInput);
  res.json(result);
}

export async function refreshController(req: Request, res: Response) {
  const result = await authService.refresh(req.body as RefreshInput);
  res.json(result);
}

export async function logoutController(req: Request, res: Response) {
  await authService.logout(req.body as LogoutInput);
  res.status(204).send();
}
