import { useState } from "react";
import { Layout } from "@/components/layout";
import { useListProducts } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Inventory() {
  const { data: products = [], isLoading } = useListProducts();
  const [search, setSearch] = useState("");

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Inventory Status</h1>
          <p className="text-sm text-slate-500">Live view of current stock levels.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="p-4 border-b border-slate-100 flex gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input 
              placeholder="Search by product name or SKU..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code/SKU</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Min Stock</TableHead>
              <TableHead className="text-right">Current Stock</TableHead>
              <TableHead className="text-center w-[120px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Loading inventory...</TableCell></TableRow>
            ) : filteredProducts.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">No inventory data found.</TableCell></TableRow>
            ) : (
              filteredProducts.map(product => {
                const isLowStock = product.currentStock <= product.minStock;
                return (
                  <TableRow key={product.id} className={isLowStock ? "bg-amber-50/30" : ""}>
                    <TableCell className="font-mono text-xs text-slate-500">{product.sku || '-'}</TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.category || '-'}</TableCell>
                    <TableCell className="text-right text-slate-500">{product.minStock} {product.unit}</TableCell>
                    <TableCell className={`text-right font-semibold ${isLowStock ? 'text-amber-700' : 'text-slate-900'}`}>
                      {product.currentStock} {product.unit}
                    </TableCell>
                    <TableCell className="text-center">
                      {isLowStock ? (
                        <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                          <AlertTriangle className="w-3 h-3 mr-1" /> Low Stock
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          In Stock
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </Layout>
  );
}