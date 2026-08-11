import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/FormFields";
import { Alert, getErrorMessage } from "../../components/ui/Alert";
import { ArrowLeft, Trash2 } from "lucide-react";

interface LineItem {
  productId: string;
  productName: string;
  sku: string;
  unitPrice: number;
  quantity: number;
}

export default function ChallanCreatePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: customersData } = useQuery({
    queryKey: ["customers-search", customerSearch],
    queryFn: () => api.customers.list({ search: customerSearch, limit: "10", status: "ACTIVE" }),
    enabled: customerSearch.length >= 2,
  });

  const { data: productsData } = useQuery({
    queryKey: ["products-search", productSearch],
    queryFn: () => api.products.list({ search: productSearch, limit: "10" }),
    enabled: productSearch.length >= 2,
  });

  const create = useMutation({
    mutationFn: () =>
      api.challans.create({
        customerId,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      }),
    onSuccess: (challan) => {
      qc.invalidateQueries({ queryKey: ["challans"] });
      navigate(`/challans/${challan.id}`);
    },
    onError: (err) => setSubmitError(getErrorMessage(err)),
  });

  const addItem = (product: { id: string; name: string; sku: string; unitPrice: number }) => {
    const exists = items.find((i) => i.productId === product.id);
    if (exists) {
      setItems((prev) =>
        prev.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      );
    } else {
      setItems((prev) => [...prev, {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        unitPrice: Number(product.unitPrice),
        quantity: 1,
      }]);
    }
    setProductSearch("");
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) return;
    setItems((prev) => prev.map((i) => i.productId === productId ? { ...i, quantity: qty } : i));
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalValue = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const canSubmit = customerId && items.length > 0;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>Back</Button>
        <h1 className="page-title">Create Challan</h1>
      </div>

      {submitError && <Alert variant="error" message={submitError} />}

      {/* Step 1: Customer */}
      <div className="card p-6">
        <h2 className="section-title mb-4">1. Select Customer</h2>
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search customer name..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
            />
          </div>
          {customersData?.data?.length > 0 && !customerId && (
            <div className="relative">
              <div className="absolute z-10 top-0 left-0 w-72 bg-white rounded-lg border border-gray-200 shadow-lg">
                {customersData.data.map((c: { id: string; name: string; businessName?: string; mobile: string }) => (
                  <button
                    key={c.id}
                    onClick={() => { setCustomerId(c.id); setCustomerSearch(c.name); }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-50 last:border-0"
                  >
                    <p className="text-sm font-medium">{c.name}</p>
                    {c.businessName && <p className="text-xs text-gray-500">{c.businessName} · {c.mobile}</p>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {customerId && (
          <div className="mt-3 flex items-center gap-2">
            <span className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium">
              ✓ Customer selected
            </span>
            <Button variant="ghost" size="sm" onClick={() => { setCustomerId(""); setCustomerSearch(""); }}>
              Change
            </Button>
          </div>
        )}
      </div>

      {/* Step 2: Items */}
      <div className="card p-6">
        <h2 className="section-title mb-4">2. Add Items</h2>

        <div className="relative mb-4">
          <Input
            placeholder="Search product name or SKU..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
          />
          {productsData?.data?.length > 0 && productSearch.length >= 2 && (
            <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-white rounded-lg border border-gray-200 shadow-lg">
              {productsData.data.map((p: {
                id: string; name: string; sku: string; unitPrice: number; currentStock: number;
              }) => (
                <button
                  key={p.id}
                  onClick={() => addItem(p)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-50 last:border-0 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">₹{Number(p.unitPrice).toFixed(2)}</p>
                    <p className="text-xs text-gray-500">{p.currentStock} in stock</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Search and add products above</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.productId} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{item.productName}</p>
                  <p className="text-xs text-gray-500">{item.sku} · ₹{item.unitPrice.toFixed(2)}/unit</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQty(item.productId, item.quantity - 1)}
                    className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-sm flex items-center justify-center"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateQty(item.productId, parseInt(e.target.value) || 1)}
                    className="w-14 text-center border border-gray-300 rounded-lg py-1 text-sm font-medium"
                    min={1}
                  />
                  <button
                    onClick={() => updateQty(item.productId, item.quantity + 1)}
                    className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-sm flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
                <p className="w-24 text-right text-sm font-semibold text-gray-900">
                  ₹{(item.quantity * item.unitPrice).toFixed(2)}
                </p>
                <button
                  onClick={() => removeItem(item.productId)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}

            <div className="flex justify-end gap-8 pt-3 border-t border-gray-100 text-sm">
              <span className="text-gray-500">Total Units: <strong className="text-gray-900">{totalQty}</strong></span>
              <span className="text-gray-500">Total Value: <strong className="text-gray-900">₹{totalValue.toFixed(2)}</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
        <Button
          disabled={!canSubmit}
          loading={create.isPending}
          onClick={() => create.mutate()}
        >
          Create Draft Challan
        </Button>
      </div>
    </div>
  );
}
