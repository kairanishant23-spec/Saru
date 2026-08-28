import { useState } from "react";
import { Layout } from "@/components/layout";
import { useListPurchases } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye } from "lucide-react";
import { format } from "date-fns";

export default function PurchaseRegister() {
  const { data: purchases = [], isLoading } = useListPurchases();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");

  const filteredPurchases = purchases.filter(p => 
    p.supplierName.toLowerCase().includes(search.toLowerCase()) || 
    (p.invoiceNo && p.invoiceNo.toLowerCase().includes(search.toLowerCase())) ||
    p.id.toString().includes(search)
  );

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Purchase Register</h1>
          <p className="text-sm text-slate-500">View and track all purchase entries.</p>
        </div>
        <Button onClick={() => setLocation("/purchases/entry")}>
          <Plus className="w-4 h-4 mr-2" />
          New Purchase
        </Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
        <div className="p-4 border-b border-slate-100 flex gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input 
              placeholder="Search by supplier or invoice..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Invoice No</TableHead>
              <TableHead className="text-right">Amount (₹)</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : filteredPurchases.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">No purchases found.</TableCell></TableRow>
            ) : (
              filteredPurchases.map(purchase => (
                <TableRow key={purchase.id}>
                  <TableCell className="font-mono text-xs">PO-{purchase.id.toString().padStart(4, '0')}</TableCell>
                  <TableCell>{format(new Date(purchase.purchaseDate), 'dd MMM yyyy')}</TableCell>
                  <TableCell className="font-medium">{purchase.supplierName}</TableCell>
                  <TableCell>{purchase.invoiceNo || '-'}</TableCell>
                  <TableCell className="text-right font-semibold">{purchase.totalAmount.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={purchase.status === 'completed' ? 'default' : 'secondary'}>
                      {purchase.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Layout>
  );
}