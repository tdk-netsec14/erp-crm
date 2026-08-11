import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { Input, Select } from "../../components/ui/FormFields";
import { Alert, getErrorMessage } from "../../components/ui/Alert";
import { ArrowLeft, Save } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Name required").max(200),
  sku: z.string().min(1, "SKU required").max(50),
  category: z.string().min(1, "Category required").max(100),
  unitPrice: z.coerce.number().positive("Must be positive"),
  currentStock: z.coerce.number().int().min(0, "Stock cannot be negative"),
  minStockAlert: z.coerce.number().int().min(0),
  location: z.string().min(1, "Location required").max(100),
});

type ProductForm = z.infer<typeof schema>;

const CATEGORY_OPTIONS = [
  { value: "Bearings", label: "Bearings" },
  { value: "Seals", label: "Seals" },
  { value: "Belts", label: "Belts" },
  { value: "Gaskets", label: "Gaskets" },
  { value: "Lubricants", label: "Lubricants" },
  { value: "Other", label: "Other" },
];

export default function ProductFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: existing, isLoading: existingLoading } = useQuery({
    queryKey: ["products", id],
    queryFn: () => api.products.get(id!),
    enabled: isEdit,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProductForm>({
    resolver: zodResolver(schema),
    defaultValues: { currentStock: 0, minStockAlert: 0 },
  });

  useEffect(() => {
    if (existing) {
      reset({
        ...existing,
        unitPrice: Number(existing.unitPrice),
      });
    }
  }, [existing, reset]);

  const mutation = useMutation({
    mutationFn: (data: ProductForm) =>
      isEdit
        ? api.products.update(id!, { ...data, currentStock: undefined })
        : api.products.create(data),
    onSuccess: (product) => {
      qc.invalidateQueries({ queryKey: ["products"] });
      navigate(`/products/${product.id}`);
    },
    onError: (err) => setSubmitError(getErrorMessage(err)),
  });

  if (isEdit && existingLoading) return <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>Back</Button>
        <h1 className="page-title">{isEdit ? "Edit Product" : "Add Product"}</h1>
      </div>

      {submitError && <Alert variant="error" message={submitError} className="mb-4" />}

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="card p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Input {...register("name")} label="Product Name *" placeholder="Industrial Bearings 6204" error={errors.name?.message} />
          <Input {...register("sku")} label="SKU *" placeholder="PROD-001" error={errors.sku?.message} disabled={isEdit} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select {...register("category")} label="Category *" options={CATEGORY_OPTIONS} error={errors.category?.message} />
          <Input {...register("unitPrice")} label="Unit Price (₹) *" type="number" step="0.01" placeholder="125.50" error={errors.unitPrice?.message} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {!isEdit && (
            <Input {...register("currentStock")} label="Initial Stock" type="number" min={0} placeholder="100" error={errors.currentStock?.message} />
          )}
          <Input {...register("minStockAlert")} label="Min Stock Alert" type="number" min={0} placeholder="20" error={errors.minStockAlert?.message} />
          <Input {...register("location")} label="Location *" placeholder="Rack A1" error={errors.location?.message} />
        </div>

        {isEdit && (
          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
            ℹ️ Stock quantity can only be changed via stock movements (use the "Stock Movement" button on the detail page). SKU cannot be edited after creation.
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" type="button" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" loading={isSubmitting || mutation.isPending} icon={<Save size={15} />}>
            {isEdit ? "Save Changes" : "Create Product"}
          </Button>
        </div>
      </form>
    </div>
  );
}
