import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { Table } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { Input, Select } from "../../components/ui/FormFields";
import { CustomerStatusBadge } from "../../components/ui/Badge";
import { Pagination } from "../../components/ui/Pagination";
import { Alert, getErrorMessage } from "../../components/ui/Alert";
import { Plus, Search } from "lucide-react";

interface CustomerRow {
  id: string;
  name: string;
  businessName?: string;
  mobile: string;
  type: string;
  status: string;
  followUpDate?: string;
  createdBy?: { name: string };
}

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "LEAD", label: "Lead" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

export default function CustomerListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["customers", { page, search, status }],
    queryFn: () =>
      api.customers.list({
        page: String(page),
        ...(search && { search }),
        ...(status && { status }),
      }),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleStatusChange = (val: string) => {
    setStatus(val);
    setPage(1);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Customers</h1>
        <Button icon={<Plus size={16} />} onClick={() => navigate("/customers/new")}>
          Add Customer
        </Button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4">
        <div className="flex gap-3 items-end flex-wrap">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-64">
            <Input
              placeholder="Search name, business, mobile..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" variant="outline" icon={<Search size={14} />}>
              Search
            </Button>
          </form>
          <div className="w-40">
            <Select
              options={STATUS_OPTIONS}
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
              placeholder="All Statuses"
            />
          </div>
        </div>
      </div>

      {error && <Alert variant="error" message={getErrorMessage(error)} className="mb-4" />}

      <div className="card">
        <Table<CustomerRow>
          isLoading={isLoading}
          data={(data?.data ?? []) as CustomerRow[]}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => navigate(`/customers/${row.id}`)}
          emptyMessage="No customers found. Add your first customer!"
          columns={[
            {
              key: "name",
              header: "Name",
              render: (row) => (
                <div>
                  <p className="font-medium text-gray-900">{row.name}</p>
                  {row.businessName && <p className="text-xs text-gray-500">{row.businessName}</p>}
                </div>
              ),
            },
            { key: "mobile", header: "Mobile", render: (row) => row.mobile },
            { key: "type", header: "Type", render: (row) => <span className="text-xs font-medium text-gray-600">{row.type}</span> },
            { key: "status", header: "Status", render: (row) => <CustomerStatusBadge status={row.status} /> },
            {
              key: "followUpDate",
              header: "Follow-up",
              render: (row) =>
                row.followUpDate
                  ? new Date(row.followUpDate).toLocaleDateString("en-IN")
                  : "—",
            },
            { key: "createdBy", header: "Created By", render: (row) => row.createdBy?.name ?? "—" },
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
