import { Request, Response } from "express";
import * as customerService from "./service.js";
import type { CreateCustomerInput, UpdateCustomerInput, AddFollowUpInput } from "./schemas.js";

export async function list(req: Request, res: Response) {
  const result = await customerService.listCustomers(req.query as Record<string, string>);
  res.json(result);
}

export async function getOne(req: Request, res: Response) {
  const customer = await customerService.getCustomer(req.params.id as string);
  res.json(customer);
}

export async function create(req: Request, res: Response) {
  const customer = await customerService.createCustomer(req.body as CreateCustomerInput, req.user!.id);
  res.status(201).json(customer);
}

export async function update(req: Request, res: Response) {
  const customer = await customerService.updateCustomer(
    req.params.id as string,
    req.body as UpdateCustomerInput,
    req.user!.id,
    req.user!.role
  );
  res.json(customer);
}

export async function remove(req: Request, res: Response) {
  const result = await customerService.deleteCustomer(req.params.id as string, req.user!.role);
  res.json(result);
}

export async function getFollowUps(req: Request, res: Response) {
  const result = await customerService.listFollowUps(req.params.id as string, req.query as Record<string, string>);
  res.json(result);
}

export async function createFollowUp(req: Request, res: Response) {
  const followUp = await customerService.addFollowUp(
    req.params.id as string,
    req.body as AddFollowUpInput,
    req.user!.id
  );
  res.status(201).json(followUp);
}
