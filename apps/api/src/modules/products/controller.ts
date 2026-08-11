import { Request, Response } from "express";
import * as productService from "./service.js";
import type { CreateProductInput, UpdateProductInput, CreateStockMovementInput } from "./schemas.js";

export async function list(req: Request, res: Response) {
  res.json(await productService.listProducts(req.query as Record<string, string>));
}

export async function getOne(req: Request, res: Response) {
  res.json(await productService.getProduct(req.params.id as string));
}

export async function create(req: Request, res: Response) {
  const product = await productService.createProduct(req.body as CreateProductInput);
  res.status(201).json(product);
}

export async function update(req: Request, res: Response) {
  res.json(await productService.updateProduct(req.params.id as string, req.body as UpdateProductInput));
}

export async function remove(req: Request, res: Response) {
  res.json(await productService.deleteProduct(req.params.id as string));
}

export async function addStockMovement(req: Request, res: Response) {
  const movement = await productService.createStockMovement(
    req.params.id as string,
    req.body as CreateStockMovementInput,
    req.user!.id
  );
  res.status(201).json(movement);
}

export async function getStockMovements(req: Request, res: Response) {
  res.json(await productService.listStockMovements(req.params.id as string, req.query as Record<string, string>));
}
