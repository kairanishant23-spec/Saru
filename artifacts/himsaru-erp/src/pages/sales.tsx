import { useState } from "react";
import { Layout } from "@/components/layout";
import { useListSales, useDeleteSale, getListSalesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Plus, FileText, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function Sales() {
  const { data: sales = [], isLoading } = useListSales();
  const deleteSaleMutation = useDeleteSale();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; invoiceNo: string } | null>(null);

  const filteredSales = sales.filter(s => {
    const matchesSearch = s.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (s.invoiceNo && s.invoiceNo.toLowerCase().includes(search.toLowerCase())) ||
      s.id.toString().includes(search);
    const matchesDate = dateFilter ? s.saleDate.startsWith(dateFilter) : true;
    return matchesSearch && matchesDate;
  });

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteSaleMutation.mutate({ id: deleteTarget.id }, {
      onSuccess: () => {
        toast({ title: "Sale deleted", description: `${deleteTarget.invoiceNo} has been removed and inventory restored.` });
        queryClient.invalidateQueries({ queryKey: getListSalesQueryKey() });
        setDeleteTarget(null);
      },
      onError: (err) => {
        toast({ title: "Failed to delete sale", description: err.message || "Please try again", variant: "destructive" });
        setDeleteTarget(null);
      },
    });
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales Register</h1>
          <p className="text-sm text-muted-foreground">View and manage all sales transactions.</p>
        </div>
        <Link href="/sales/entry">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Sale
          </Button>
        </Link>
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm">
        <div className="p-4 border-b border-border flex gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by customer or invoice…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="w-48">
            <Input
              type="date"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
            />
          </div>
          {dateFilter && (
            <Button variant="ghost" onClick={() => setDateFilter("")}>Clear Date</Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead>Invoice No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Taxable (₹)</TableHead>
                <TableHead className="text-right">Tax (₹)</TableHead>
                <TableHead className="text-right">Total (₹)</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8">Loading…</TableCell></TableRow>
              ) : filteredSales.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No sales found.</TableCell></TableRow>
              ) : (
                filteredSales.map(sale => {
                  const totalTax = sale.cgstAmount + sale.sgstAmount + sale.igstAmount;
                  const invoiceStr = sale.invoiceNo || `SO-${sale.id.toString().padStart(4, '0')}`;
                  return (
                    <TableRow key={sale.id}>
                      <TableCell className="font-mono text-xs font-semibold">{invoiceStr}</TableCell>
                      <TableCell>{format(new Date(sale.saleDate), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="font-medium">{sale.customerName}</TableCell>
                      <TableCell className="text-right">{sale.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right font-bold">{sale.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={sale.status === 'completed' ? 'default' : 'secondary'}
                          className={sale.status === 'completed' ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}
                        >
                          {sale.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/sales/invoice/${sale.id}`}>
                            <Button variant="ghost" size="icon" title="View Invoice">
                              <FileText className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete Sale"
                            onClick={() => setDeleteTarget({ id: sale.id, invoiceNo: invoiceStr })}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sale?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.invoiceNo}</strong> and restore the inventory for all items in this sale. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteSaleMutation.isPending}
            >
              {deleteSaleMutation.isPending ? "Deleting…" : "Delete Sale"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
