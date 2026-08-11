import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { Table } from "../../components/ui/Table";
import { Button } from "../../components/ui/Button";
import { Input, Select } from "../../components/ui/FormFields";
import { Badge } from "../../components/ui/Badge";
import { Pagination } from "../../components/ui/Pagination";
import { Alert, getErrorMessage } from "../../components/ui/Alert";
import { Plus, Search, AlertTriangle } from "lucide-react";

interface ProductRow {
  id: string;
  name: string;
  sku: string;
  category: string;
  unitPrice: number;
  currentStock: number;
  minStockAlert: number;
  location: string;
  isLowStock: boolean;
}

const CATEGORY_OPTIONS = [
  { value: "", label: "All Categories" },
  { value: "Bearings", label: "Bearings" },
  { value: "Seals", label: "Seals" },
  { value: "Belts", label: "Belts" },
  { value: "Other", label: "Other" },
];

export default function ProductListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [category, setCategory] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["products", { page, search, category, lowStockOnly }],
    queryFn: () =>
      api.products.list({
        page: String(page),
        ...(search && { search }),
        ...(category && { category }),
        ...(lowStockOnly && { lowStock: "true" }),
      }),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Products</h1>
        <Button icon={<Plus size={16} />} onClick={() => navigate("/products/new")}>
          Add Product
        </Button>
      </div>

      <div className="card p-4 mb-4">
        <div className="flex gap-3 items-end flex-wrap">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-64">
            <Input
              placeholder="Search name or SKU..."
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
              options={CATEGORY_OPTIONS}
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              placeholder="All Categories"
            />
          </div>
          <button
            type="button"
            onClick={() => { setLowStockOnly(!lowStockOnly); setPage(1); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              lowStockOnly ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <AlertTriangle size={14} />
            Low Stock Only
          </button>
        </div>
      </div>

      {error && <Alert variant="error" message={getErrorMessage(error)} className="mb-4" />}

      <div className="card">
        <Table<ProductRow>
          isLoading={isLoading}
          data={(data?.data ?? []) as ProductRow[]}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => navigate(`/products/${row.id}`)}
          emptyMessage="No products found."
          columns={[
            {
              key: "name",
              header: "Product",
              render: (row) => (
                <div className="flex items-center gap-2">
                  {row.isLowStock && <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />}
                  <div>
                    <p className="font-medium text-gray-900">{row.name}</p>
                    <p className="text-xs text-gray-500">{row.sku}</p>
                  </div>
                </div>
              ),
            },
            { key: "category", header: "Category", render: (row) => <Badge variant="neutral">{row.category}</Badge> },
            {
              key: "unitPrice",
              header: "Unit Price",
              render: (row) => `₹${Number(row.unitPrice).toFixed(2)}`,
            },
            {
              key: "stock",
              header: "Stock",
              render: (row) => (
                <span className={row.isLowStock ? "font-bold text-red-600" : "text-gray-900"}>
                  {row.currentStock}
                  {row.isLowStock && ` / min ${row.minStockAlert}`}
                </span>
              ),
            },
            { key: "location", header: "Location", render: (row) => row.location },
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
