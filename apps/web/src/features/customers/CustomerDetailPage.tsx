import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { Textarea } from "../../components/ui/FormFields";
import { CustomerStatusBadge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { Alert, getErrorMessage } from "../../components/ui/Alert";
import { ArrowLeft, Edit, MessageSquarePlus, Calendar, Phone, Mail, MapPin, Building } from "lucide-react";

const followUpSchema = z.object({
  note: z.string().min(1, "Note is required").max(2000),
});
type FollowUpForm = z.infer<typeof followUpSchema>;

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpError, setFollowUpError] = useState<string | null>(null);

  const { data: customer, isLoading, error } = useQuery({
    queryKey: ["customers", id],
    queryFn: () => api.customers.get(id!),
    enabled: !!id,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FollowUpForm>({
    resolver: zodResolver(followUpSchema),
  });

  const addFollowUp = useMutation({
    mutationFn: (data: FollowUpForm) => api.customers.addFollowUp(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers", id] });
      reset();
      setShowFollowUpModal(false);
    },
    onError: (err) => setFollowUpError(getErrorMessage(err)),
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-100 w-48 rounded" />
        <div className="h-64 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  if (error || !customer) {
    return <Alert variant="error" message={error ? getErrorMessage(error) : "Customer not found"} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>
          Back
        </Button>
        <div className="flex-1">
          <h1 className="page-title">{customer.name}</h1>
          {customer.businessName && <p className="text-gray-500 text-sm">{customer.businessName}</p>}
        </div>
        <CustomerStatusBadge status={customer.status} />
        <Button
          variant="outline"
          icon={<Edit size={15} />}
          onClick={() => navigate(`/customers/${id}/edit`)}
        >
          Edit
        </Button>
        <Button
          icon={<MessageSquarePlus size={15} />}
          onClick={() => setShowFollowUpModal(true)}
        >
          Add Follow-up
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer info */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-6">
            <h2 className="section-title mb-4">Contact Information</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <InfoRow icon={Phone} label="Mobile" value={customer.mobile} />
              {customer.email && <InfoRow icon={Mail} label="Email" value={customer.email} />}
              <InfoRow icon={MapPin} label="Address" value={customer.address} className="col-span-2" />
              {customer.businessName && <InfoRow icon={Building} label="Business" value={customer.businessName} />}
              {customer.gstNumber && <InfoRow label="GST Number" value={customer.gstNumber} />}
              <InfoRow label="Type" value={customer.type} />
              {customer.followUpDate && (
                <InfoRow
                  icon={Calendar}
                  label="Follow-up Date"
                  value={new Date(customer.followUpDate).toLocaleDateString("en-IN", { dateStyle: "long" })}
                />
              )}
            </div>
            {customer.notes && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Notes</p>
                <p className="text-sm text-gray-700">{customer.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Meta info */}
        <div className="card p-5 text-sm text-gray-600 space-y-3 h-fit">
          <p className="font-semibold text-gray-900 mb-2">Record Info</p>
          <p><span className="text-gray-400">Created by:</span> {customer.createdBy?.name}</p>
          <p><span className="text-gray-400">Created:</span> {new Date(customer.createdAt).toLocaleDateString("en-IN")}</p>
          <p><span className="text-gray-400">Last updated:</span> {new Date(customer.updatedAt).toLocaleDateString("en-IN")}</p>
        </div>
      </div>

      {/* Follow-up log */}
      <div className="card p-6">
        <h2 className="section-title mb-4">Follow-up Log</h2>
        {customer.followUps.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No follow-ups recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {customer.followUps.map((fu: { id: string; note: string; createdBy: { name: string }; createdAt: string }) => (
              <div key={fu.id} className="flex gap-3 p-4 rounded-lg bg-gray-50">
                <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-sm flex-shrink-0">
                  {fu.createdBy.name[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-gray-900">{fu.createdBy.name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(fu.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                    </p>
                  </div>
                  <p className="text-sm text-gray-700">{fu.note}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Follow-up Modal */}
      <Modal
        isOpen={showFollowUpModal}
        onClose={() => { setShowFollowUpModal(false); reset(); setFollowUpError(null); }}
        title="Add Follow-up Note"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowFollowUpModal(false)}>Cancel</Button>
            <Button
              loading={isSubmitting || addFollowUp.isPending}
              onClick={handleSubmit((data) => addFollowUp.mutate(data))}
            >
              Save Note
            </Button>
          </>
        }
      >
        {followUpError && <Alert variant="error" message={followUpError} className="mb-3" />}
        <Textarea
          {...register("note")}
          label="Note"
          placeholder="Write your follow-up notes here..."
          rows={5}
          error={errors.note?.message}
        />
      </Modal>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, className }: {
  icon?: typeof Phone;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs text-gray-400 mb-0.5 font-medium">{label}</p>
      <div className="flex items-center gap-1.5 text-gray-900">
        {Icon && <Icon size={13} className="text-gray-400 flex-shrink-0" />}
        <span>{value}</span>
      </div>
    </div>
  );
}
