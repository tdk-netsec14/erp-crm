import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { Input, Select, Textarea } from "../../components/ui/FormFields";
import { Alert, getErrorMessage } from "../../components/ui/Alert";
import { ArrowLeft, Save } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  mobile: z.string().min(10, "Enter a valid mobile number").max(15),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  businessName: z.string().max(150).optional().or(z.literal("")),
  gstNumber: z.string().max(20).optional().or(z.literal("")),
  type: z.enum(["RETAIL", "WHOLESALE", "DISTRIBUTOR"]),
  address: z.string().min(1, "Address is required").max(500),
  status: z.enum(["LEAD", "ACTIVE", "INACTIVE"]),
  followUpDate: z.string().optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

type CustomerForm = z.infer<typeof schema>;

const TYPE_OPTIONS = [
  { value: "RETAIL", label: "Retail" },
  { value: "WHOLESALE", label: "Wholesale" },
  { value: "DISTRIBUTOR", label: "Distributor" },
];

const STATUS_OPTIONS = [
  { value: "LEAD", label: "Lead" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

export default function CustomerFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: existing, isLoading: existingLoading } = useQuery({
    queryKey: ["customers", id],
    queryFn: () => api.customers.get(id!),
    enabled: isEdit,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CustomerForm>({
    resolver: zodResolver(schema),
    defaultValues: { status: "LEAD", type: "WHOLESALE" },
  });

  useEffect(() => {
    if (existing) {
      reset({
        ...existing,
        email: existing.email ?? "",
        businessName: existing.businessName ?? "",
        gstNumber: existing.gstNumber ?? "",
        notes: existing.notes ?? "",
        followUpDate: existing.followUpDate
          ? new Date(existing.followUpDate).toISOString().split("T")[0]
          : "",
      });
    }
  }, [existing, reset]);

  const mutation = useMutation({
    mutationFn: (data: CustomerForm) => {
      const payload = {
        ...data,
        email: data.email || null,
        businessName: data.businessName || null,
        gstNumber: data.gstNumber || null,
        notes: data.notes || null,
        followUpDate: data.followUpDate ? new Date(data.followUpDate).toISOString() : null,
      };
      return isEdit ? api.customers.update(id!, payload) : api.customers.create(payload);
    },
    onSuccess: (customer) => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      navigate(`/customers/${customer.id}`);
    },
    onError: (err) => setSubmitError(getErrorMessage(err)),
  });

  if (isEdit && existingLoading) {
    return <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />;
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>
          Back
        </Button>
        <h1 className="page-title">{isEdit ? "Edit Customer" : "Add Customer"}</h1>
      </div>

      {submitError && <Alert variant="error" message={submitError} className="mb-4" />}

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="card p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Input {...register("name")} label="Full Name *" placeholder="John Sharma" error={errors.name?.message} />
          <Input {...register("mobile")} label="Mobile *" placeholder="9876543210" error={errors.mobile?.message} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input {...register("email")} label="Email" type="email" placeholder="john@company.com" error={errors.email?.message} />
          <Input {...register("businessName")} label="Business Name" placeholder="Sharma Traders Pvt Ltd" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Select {...register("type")} label="Customer Type *" options={TYPE_OPTIONS} error={errors.type?.message} />
          <Select {...register("status")} label="Status *" options={STATUS_OPTIONS} error={errors.status?.message} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input {...register("gstNumber")} label="GST Number" placeholder="27AAPFU0939F1ZV" />
          <Input {...register("followUpDate")} label="Follow-up Date" type="date" />
        </div>
        <Textarea {...register("address")} label="Address *" placeholder="123 Market Street, Mumbai, MH 400001" error={errors.address?.message} />
        <Textarea {...register("notes")} label="Notes" placeholder="Key account notes..." rows={3} />

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" type="button" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" loading={isSubmitting || mutation.isPending} icon={<Save size={15} />}>
            {isEdit ? "Save Changes" : "Create Customer"}
          </Button>
        </div>
      </form>
    </div>
  );
}
