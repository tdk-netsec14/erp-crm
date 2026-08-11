import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { Input } from "../../components/ui/FormFields";
import { Button } from "../../components/ui/Button";
import { Alert, getErrorMessage } from "../../components/ui/Alert";
import { Building2, Lock, Mail } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    try {
      await login(data.email, data.password);
      navigate("/");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 px-4">
      <div className="w-full max-w-md">
        {/* Logo / branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur mb-4">
            <Building2 size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">ERP / CRM Portal</h1>
          <p className="text-brand-300 text-sm">Wholesale & Distribution Operations</p>
        </div>

        {/* Login card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-white/20">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {error && <Alert variant="error" message={error} />}

            <div className="relative">
              <Mail size={16} className="absolute left-3 top-9 text-gray-400 pointer-events-none" />
              <Input
                {...register("email")}
                label="Email"
                type="email"
                placeholder="you@company.com"
                error={errors.email?.message}
                className="pl-9"
              />
            </div>

            <div className="relative">
              <Lock size={16} className="absolute left-3 top-9 text-gray-400 pointer-events-none" />
              <Input
                {...register("password")}
                label="Password"
                type="password"
                placeholder="••••••••"
                error={errors.password?.message}
                className="pl-9"
              />
            </div>

            <Button
              type="submit"
              className="w-full py-3 text-base"
              loading={isSubmitting}
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-white/20">
            <p className="text-xs text-white/60 text-center mb-3">Demo credentials</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-white/70">
              {[
                { role: "Admin", email: "admin@erp.local", pw: "Admin@123" },
                { role: "Sales", email: "sales@erp.local", pw: "Sales@123" },
                { role: "Warehouse", email: "warehouse@erp.local", pw: "Warehouse@123" },
                { role: "Accounts", email: "accounts@erp.local", pw: "Accounts@123" },
              ].map((c) => (
                <div key={c.role} className="bg-white/10 rounded-lg px-3 py-2">
                  <p className="font-semibold text-white">{c.role}</p>
                  <p className="opacity-80 truncate">{c.email}</p>
                  <p className="opacity-60">{c.pw}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
