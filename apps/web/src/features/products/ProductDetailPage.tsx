import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { Input, Select, Textarea } from "../../components/ui/FormFields";
import { StockMovementTypeBadge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { Alert, getErrorMessage } from "../../components/ui/Alert";
import { ArrowLeft, Edit, Plus, AlertTriangle } from "lucide-react";

const movementSchema = z.object({
  type: z.enum(["IN", "OUT"]),
  quantityChanged: z.coerce.number().int().positive("Must be a positive integer"),
  reason: z.string().min(1, "Reason is required").max(500),
});
type MovementForm = z.infer<typeof movementSchema>;

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movementError, setMovementError] = useState<string | null>(null);

  const { data: product, isLoading, error } = useQuery({
    queryKey: ["products", id],
    queryFn: () => api.products.get(id!),
    enabled: !!id,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<MovementForm>({
    resolver: zodResolver(movementSchema),
    defaultValues: { type: "IN" },
  });

  const addMovement = useMutation({
    mutationFn: (data: MovementForm) => api.products.addStockMovement(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products", id] });
      reset();
      setShowMovementModal(false);
    },
    onError: (err) => setMovementError(getErrorMessage(err)),
  });

  if (isLoading) return <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />;
  if (error || !product) return <Alert variant="error" message={error ? getErrorMessage(error) : "Product not found"} />;

  const isLowStock = product.currentStock < product.minStockAlert;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>Back</Button>
        <div className="flex-1">
          <h1 className="page-title">{product.name}</h1>
          <p className="text-gray-500 text-sm">{product.sku} · {product.category}</p>
        </div>
        {isLowStock && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-lg text-red-700 text-sm font-medium">
            <AlertTriangle size={15} />
            Low Stock
          </div>
        )}
        <Button variant="outline" icon={<Edit size={15} />} onClick={() => navigate(`/products/${id}/edit`)}>Edit</Button>
        <Button icon={<Plus size={15} />} onClick={() => setShowMovementModal(true)}>Stock Movement</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stock snapshot */}
        <div className="card p-6 space-y-4">
          <h2 className="section-title">Inventory</h2>
          <div className={`p-4 rounded-xl text-center ${isLowStock ? "bg-red-50" : "bg-green-50"}`}>
            <p className={`text-5xl font-bold ${isLowStock ? "text-red-600" : "text-green-700"}`}>
              {product.currentStock}
            </p>
            <p className="text-sm text-gray-500 mt-1">units in stock</p>
            {product.minStockAlert > 0 && (
              <p className="text-xs text-gray-400 mt-1">Alert below {product.minStockAlert}</p>
            )}
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Unit Price</span><span className="font-medium">₹{Number(product.unitPrice).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Location</span><span>{product.location}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Category</span><span>{product.category}</span></div>
          </div>
        </div>

        {/* Stock movement history */}
        <div className="lg:col-span-2 card p-6">
          <h2 className="section-title mb-4">Recent Stock Movements</h2>
          {product.recentMovements.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No stock movements yet.</p>
          ) : (
            <div className="space-y-2">
              {product.recentMovements.map((m: {
                id: string; type: string; quantityChanged: number;
                reason: string; createdBy: { name: string }; createdAt: string;
              }) => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  <StockMovementTypeBadge type={m.type} />
                  <span className={`font-bold ${m.type === "IN" ? "text-green-600" : "text-red-600"}`}>
                    {m.type === "IN" ? "+" : "-"}{m.quantityChanged}
                  </span>
                  <span className="flex-1 text-sm text-gray-700 truncate">{m.reason}</span>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{m.createdBy.name}</span>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {new Date(m.createdAt).toLocaleDateString("en-IN")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stock movement modal */}
      <Modal
        isOpen={showMovementModal}
        onClose={() => { setShowMovementModal(false); reset(); setMovementError(null); }}
        title="Record Stock Movement"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowMovementModal(false)}>Cancel</Button>
            <Button
              loading={isSubmitting || addMovement.isPending}
              onClick={handleSubmit((data) => addMovement.mutate(data))}
            >
              Record Movement
            </Button>
          </>
        }
      >
        {movementError && <Alert variant="error" message={movementError} className="mb-3" />}
        <div className="space-y-4">
          <Select
            {...register("type")}
            label="Movement Type *"
            options={[{ value: "IN", label: "Stock In" }, { value: "OUT", label: "Stock Out" }]}
            error={errors.type?.message}
          />
          <Input
            {...register("quantityChanged")}
            label="Quantity *"
            type="number"
            min={1}
            placeholder="10"
            error={errors.quantityChanged?.message}
          />
          <Textarea
            {...register("reason")}
            label="Reason *"
            placeholder="Manual adjustment, supplier delivery, damaged goods..."
            error={errors.reason?.message}
          />
        </div>
      </Modal>
    </div>
  );
}
