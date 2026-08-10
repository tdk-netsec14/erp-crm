import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { ForbiddenError } from "../lib/errors.js";

export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ForbiddenError("No authenticated user");
    }
    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(
        `Role ${req.user.role} is not permitted to access this resource`
      );
    }
    next();
  };
}
