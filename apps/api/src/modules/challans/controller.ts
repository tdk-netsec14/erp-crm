import { Request, Response } from "express";
import * as challanService from "./service.js";
import type { CreateChallanInput, UpdateChallanInput } from "./schemas.js";

export async function list(req: Request, res: Response) {
  res.json(await challanService.listChallans(req.query as Record<string, string>));
}

export async function getOne(req: Request, res: Response) {
  res.json(await challanService.getChallan(req.params.id as string));
}

export async function create(req: Request, res: Response) {
  const challan = await challanService.createChallan(req.body as CreateChallanInput, req.user!.id);
  res.status(201).json(challan);
}

export async function update(req: Request, res: Response) {
  res.json(await challanService.updateChallan(req.params.id as string, req.body as UpdateChallanInput));
}

export async function confirm(req: Request, res: Response) {
  res.json(await challanService.confirmChallanAndDeductStock(req.params.id as string, req.user!.id));
}

export async function cancel(req: Request, res: Response) {
  res.json(await challanService.cancelChallan(req.params.id as string, req.user!.id));
}
