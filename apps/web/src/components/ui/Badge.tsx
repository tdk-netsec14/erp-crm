import React from "react";
import clsx from "clsx";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "neutral";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-brand-100 text-brand-800",
  success: "bg-green-100 text-green-800",
  warning: "bg-yellow-100 text-yellow-800",
  danger: "bg-red-100 text-red-800",
  info: "bg-blue-100 text-blue-800",
  neutral: "bg-gray-100 text-gray-700",
};

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

// Domain-specific badge helpers so status rendering is consistent across the app
export function CustomerStatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    ACTIVE: "success",
    LEAD: "warning",
    INACTIVE: "neutral",
  };
  return <Badge variant={map[status] ?? "neutral"}>{status}</Badge>;
}

export function ChallanStatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    DRAFT: "neutral",
    CONFIRMED: "success",
    CANCELLED: "danger",
  };
  return <Badge variant={map[status] ?? "neutral"}>{status}</Badge>;
}

export function RoleBadge({ role }: { role: string }) {
  const map: Record<string, BadgeVariant> = {
    ADMIN: "danger",
    SALES: "info",
    WAREHOUSE: "warning",
    ACCOUNTS: "success",
  };
  return <Badge variant={map[role] ?? "neutral"}>{role}</Badge>;
}

export function StockMovementTypeBadge({ type }: { type: string }) {
  return <Badge variant={type === "IN" ? "success" : "danger"}>{type}</Badge>;
}
