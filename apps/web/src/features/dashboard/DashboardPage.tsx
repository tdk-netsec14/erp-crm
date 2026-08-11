import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Alert } from "../../components/ui/Alert";
import { ChallanStatusBadge, CustomerStatusBadge } from "../../components/ui/Badge";
import { AlertTriangle, Users, FileText, Calendar, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

function StatCard({ icon: Icon, label, value, color }: {
  icon: typeof Users;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={22} className="text-white" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: api.dashboard.getMetrics,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <Alert variant="error" message="Failed to load dashboard metrics" />;
  }

  const { stats, lowStockProducts, recentChallans, followUpsDueToday } = data;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="text-sm text-gray-500">{new Date().toLocaleDateString("en-IN", { dateStyle: "full" })}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Active Customers" value={stats.activeCustomers} color="bg-brand-500" />
        <StatCard icon={FileText} label="Challans This Month" value={stats.confirmedChallansThisMonth} color="bg-green-500" />
        <StatCard icon={AlertTriangle} label="Low Stock Items" value={stats.lowStockCount} color="bg-red-500" />
        <StatCard icon={Calendar} label="Follow-ups Today" value={stats.followUpsDueTodayCount} color="bg-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low stock alerts */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-red-500" />
            <h2 className="section-title">Low Stock Alerts</h2>
          </div>
          {lowStockProducts.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">All products well-stocked</p>
          ) : (
            <div className="space-y-2">
              {lowStockProducts.map((p: {
                id: string; name: string; sku: string;
                currentStock: number; minStockAlert: number; location: string;
              }) => (
                <Link
                  key={p.id}
                  to={`/products/${p.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-red-50 hover:bg-red-100 transition-colors group"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 group-hover:text-brand-700">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.sku} · {p.location}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">{p.currentStock}</p>
                    <p className="text-xs text-gray-400">min {p.minStockAlert}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent challans */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-brand-500" />
            <h2 className="section-title">Recent Challans</h2>
          </div>
          {recentChallans.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No challans yet</p>
          ) : (
            <div className="space-y-2">
              {recentChallans.map((c: {
                id: string; challanNumber: string; status: string;
                customer: { name: string }; totalQuantity: number; createdAt: string;
              }) => (
                <Link
                  key={c.id}
                  to={`/challans/${c.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 group-hover:text-brand-700">{c.challanNumber}</p>
                    <p className="text-xs text-gray-500">{c.customer.name}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <ChallanStatusBadge status={c.status} />
                    <p className="text-xs text-gray-400">{c.totalQuantity} units</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Follow-ups due today */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={18} className="text-orange-500" />
            <h2 className="section-title">Follow-ups Today</h2>
          </div>
          {followUpsDueToday.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No follow-ups due today</p>
          ) : (
            <div className="space-y-2">
              {followUpsDueToday.map((c: {
                id: string; name: string; mobile: string;
                status: string; followUpDate: string;
              }) => (
                <Link
                  key={c.id}
                  to={`/customers/${c.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 group-hover:text-brand-700">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.mobile}</p>
                  </div>
                  <CustomerStatusBadge status={c.status} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
