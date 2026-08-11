import { AlertCircle, CheckCircle, Info, XCircle } from "lucide-react";
import clsx from "clsx";

type AlertVariant = "error" | "success" | "warning" | "info";

interface AlertProps {
  variant: AlertVariant;
  title?: string;
  message: string;
  className?: string;
}

const config: Record<AlertVariant, { icon: typeof AlertCircle; classes: string }> = {
  error: { icon: XCircle, classes: "bg-red-50 border-red-200 text-red-800" },
  success: { icon: CheckCircle, classes: "bg-green-50 border-green-200 text-green-800" },
  warning: { icon: AlertCircle, classes: "bg-yellow-50 border-yellow-200 text-yellow-800" },
  info: { icon: Info, classes: "bg-blue-50 border-blue-200 text-blue-800" },
};

export function Alert({ variant, title, message, className }: AlertProps) {
  const { icon: Icon, classes } = config[variant];
  return (
    <div className={clsx("flex gap-3 p-4 rounded-lg border", classes, className)}>
      <Icon size={18} className="flex-shrink-0 mt-0.5" />
      <div>
        {title && <p className="font-semibold text-sm mb-0.5">{title}</p>}
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
}

// Extracts a readable error message from an Axios error response
export function getErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "response" in error) {
    const resp = (error as { response?: { data?: { error?: { message?: string } } } }).response;
    return resp?.data?.error?.message ?? "An unexpected error occurred";
  }
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred";
}
