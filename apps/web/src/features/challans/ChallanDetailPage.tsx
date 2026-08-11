import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { ChallanStatusBadge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { Alert, getErrorMessage } from "../../components/ui/Alert";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";

export default function ChallanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirmModal, setConfirmModal] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: challan, isLoading, error } = useQuery({
    queryKey: ["challans", id],
    queryFn: () => api.challans.get(id!),
    enabled: !!id,
  });

  const confirmMutation = useMutation({
    mutationFn: () => api.challans.confirm(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["challans"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setConfirmModal(false);
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  });

  const cancelMutation = useMutation({
    mutationFn: () => api.challans.cancel(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["challans"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setCancelModal(false);
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  });

  if (isLoading) return <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />;
  if (error || !challan) return <Alert variant="error" message={error ? getErrorMessage(error) : "Challan not found"} />;

  const isDraft = challan.status === "DRAFT";
  const isConfirmed = challan.status === "CONFIRMED";
  const isCancelled = challan.status === "CANCELLED";

  const totalValue = challan.items.reduce(
    (sum: number, i: { quantity: number; unitPriceSnapshot: number }) =>
      sum + i.quantity * Number(i.unitPriceSnapshot),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>Back</Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="page-title font-mono">{challan.challanNumber}</h1>
            <ChallanStatusBadge status={challan.status} />
          </div>
          <p className="text-gray-500 text-sm">
            Created by {challan.createdBy?.name} · {new Date(challan.createdAt).toLocaleDateString("en-IN", { dateStyle: "long" })}
          </p>
        </div>
        <div className="flex gap-2">
          {isDraft && (
            <>
              <Button
                variant="outline"
                icon={<XCircle size={15} />}
                onClick={() => { setActionError(null); setCancelModal(true); }}
              >
                Cancel
              </Button>
              <Button
                icon={<CheckCircle size={15} />}
                onClick={() => { setActionError(null); setConfirmModal(true); }}
              >
                Confirm Challan
              </Button>
            </>
          )}
          {isConfirmed && (
            <Button
              variant="danger"
              icon={<XCircle size={15} />}
              onClick={() => { setActionError(null); setCancelModal(true); }}
            >
              Cancel & Reverse Stock
            </Button>
          )}
        </div>
      </div>

      {actionError && <Alert variant="error" message={actionError} />}

      {isConfirmed && (
        <Alert variant="success" message={`Confirmed on ${new Date(challan.confirmedAt).toLocaleDateString("en-IN", { dateStyle: "long" })}`} />
      )}
      {isCancelled && (
        <Alert variant="warning" title="Cancelled" message="This challan has been cancelled. Stock has been reversed if it was previously confirmed." />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer info */}
        <div className="card p-5">
          <h2 className="section-title mb-3">Customer</h2>
          <p className="font-semibold text-gray-900">{challan.customer?.name}</p>
          {challan.customer?.businessName && <p className="text-sm text-gray-500">{challan.customer.businessName}</p>}
          <p className="text-sm text-gray-600 mt-2">{challan.customer?.mobile}</p>
          <p className="text-sm text-gray-500 mt-1">{challan.customer?.address}</p>
        </div>

        {/* Summary */}
        <div className="lg:col-span-2 card p-5">
          <h2 className="section-title mb-4">Items</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="pb-2 text-left">Product</th>
                  <th className="pb-2 text-left">SKU</th>
                  <th className="pb-2 text-right">Unit Price</th>
                  <th className="pb-2 text-right">Qty</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {challan.items.map((item: {
                  id: string;
                  productNameSnapshot: string;
                  productSkuSnapshot: string;
                  unitPriceSnapshot: number;
                  quantity: number;
                }) => (
                  <tr key={item.id} className="py-2">
                    <td className="py-2.5 font-medium text-gray-900">{item.productNameSnapshot}</td>
                    <td className="py-2.5 text-gray-500 font-mono text-xs">{item.productSkuSnapshot}</td>
                    <td className="py-2.5 text-right text-gray-700">₹{Number(item.unitPriceSnapshot).toFixed(2)}</td>
                    <td className="py-2.5 text-right font-semibold">{item.quantity}</td>
                    <td className="py-2.5 text-right font-semibold text-gray-900">
                      ₹{(item.quantity * Number(item.unitPriceSnapshot)).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200">
                  <td colSpan={3} className="pt-3 text-sm text-gray-500">Total</td>
                  <td className="pt-3 text-right font-bold text-gray-900">{challan.totalQuantity}</td>
                  <td className="pt-3 text-right font-bold text-gray-900 text-base">₹{totalValue.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Confirm Modal */}
      <Modal
        isOpen={confirmModal}
        onClose={() => setConfirmModal(false)}
        title="Confirm Challan"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmModal(false)}>Back</Button>
            <Button
              loading={confirmMutation.isPending}
              onClick={() => confirmMutation.mutate()}
            >
              Yes, Confirm & Deduct Stock
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-700">
          Confirming <strong>{challan.challanNumber}</strong> will deduct the following quantities from stock:
        </p>
        <ul className="mt-3 space-y-1 text-sm text-gray-600">
          {challan.items.map((item: { id: string; productNameSnapshot: string; quantity: number }) => (
            <li key={item.id} className="flex justify-between">
              <span>{item.productNameSnapshot}</span>
              <span className="font-medium text-red-600">-{item.quantity}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-gray-500">This action cannot be undone without cancelling the challan.</p>
        {actionError && <Alert variant="error" message={actionError} className="mt-3" />}
      </Modal>

      {/* Cancel Modal */}
      <Modal
        isOpen={cancelModal}
        onClose={() => setCancelModal(false)}
        title={isConfirmed ? "Cancel & Reverse Stock" : "Cancel Challan"}
        footer={
          <>
            <Button variant="outline" onClick={() => setCancelModal(false)}>Back</Button>
            <Button
              variant="danger"
              loading={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
            >
              Yes, Cancel Challan
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-700">
          {isConfirmed
            ? `Cancelling challan ${challan.challanNumber} will reverse all stock deductions and mark it as cancelled.`
            : `Are you sure you want to cancel draft challan ${challan.challanNumber}?`}
        </p>
        {actionError && <Alert variant="error" message={actionError} className="mt-3" />}
      </Modal>
    </div>
  );
}
