import { Request, Response } from "express";
import * as dashboardService from "./service.js";

export async function getMetrics(_req: Request, res: Response) {
  res.json(await dashboardService.getDashboardMetrics());
}
