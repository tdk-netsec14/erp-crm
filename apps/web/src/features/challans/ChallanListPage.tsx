import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { Table } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { Input, Select } from "../../components/ui/FormFields";
import { ChallanStatusBadge } from "../../components/ui/Badge";
import { Pagination } from "../../components/ui/Pagination";
import { Alert, getErrorMessage } from "../../components/ui/Alert";
import { Plus, Search } from "lucide-react";

interface ChallanRow {
  id: string;
  challanNumber: string;
  status: string;
  customer?: { name: string; businessName?: string };
  createdBy?: { name: string };
  totalQuantity: number;
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function ChallanListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["challans", { page, search, status }],
    queryFn: () =>
      api.challans.list({
        page: String(page),
        ...(search && { search }),
        ...(status && { status }),
      }),
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Challans</h1>
        <Button icon={<Plus size={16} />} onClick={() => navigate("/challans/new")}>
          Create Challan
        </Button>
      </div>

      <div className="card p-4 mb-4">
        <div className="flex gap-3 items-end flex-wrap">
          <form
            onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); setPage(1); }}
            className="flex gap-2 flex-1 min-w-64"
          >
            <Input
              placeholder="Search challan number..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" variant="outline" icon={<Search size={14} />}>Search</Button>
          </form>
          <div className="w-44">
            <Select
              options={STATUS_OPTIONS}
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            />
          </div>
        </div>
      </div>

      {error && <Alert variant="error" message={getErrorMessage(error)} className="mb-4" />}

      <div className="card">
        <Table<ChallanRow>
          isLoading={isLoading}
          data={(data?.data ?? []) as ChallanRow[]}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => navigate(`/challans/${row.id}`)}
          emptyMessage="No challans found."
          columns={[
            { key: "number", header: "Challan No.", render: (row) => <span className="font-mono font-medium">{row.challanNumber}</span> },
            {
              key: "customer",
              header: "Customer",
              render: (row) => (
                <div>
                  <p className="font-medium text-gray-900">{row.customer?.name}</p>
                  {row.customer?.businessName && <p className="text-xs text-gray-500">{row.customer.businessName}</p>}
                </div>
              ),
            },
            { key: "status", header: "Status", render: (row) => <ChallanStatusBadge status={row.status} /> },
            { key: "qty", header: "Total Qty", render: (row) => row.totalQuantity },
            { key: "createdBy", header: "Created By", render: (row) => row.createdBy?.name },
            {
              key: "date",
              header: "Date",
              render: (row) => new Date(row.createdAt).toLocaleDateString("en-IN"),
            },
          ]}
        />
        {data?.meta && (
          <Pagination
            page={data.meta.page}
            totalPages={data.meta.totalPages}
            total={data.meta.total}
            limit={data.meta.limit}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}
