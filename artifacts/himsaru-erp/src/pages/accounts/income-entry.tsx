import { useState } from "react";
import { Layout } from "@/components/layout";
import {
  useListIncomes,
  useCreateIncome,
  useUpdateIncome,
  useDeleteIncome,
  useListIncomeCategories,
  getListIncomesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Download } from "lucide-react";
import { exportToExcel, exportToPDF } from "@/lib/export";
import type { IncomeRow, IncomeInput } from "@workspace/api-client-react";

const fmt = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function today() {
  return new Date().toISOString().split("T")[0];
}

const emptyForm = (): IncomeInput => ({
  incomeDate: today(),
  categoryId: null,
  description: "",
  amount: 0,
  paymentMode: "cash",
  referenceNo: null,
  notes: null,
});

export default function IncomeEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { data: incomes = [], isLoading } = useListIncomes({ from: from || undefined, to: to || undefined });
  const { data: categories = [] } = useListIncomeCategories();

  const createMutation = useCreateIncome();
  const updateMutation = useUpdateIncome();
  const deleteMutation = useDeleteIncome();

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<IncomeRow | null>(null);
  const [form, setForm] = useState<IncomeInput>(emptyForm());

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListIncomesQueryKey() });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setIsOpen(true);
  };

  const openEdit = (e: IncomeRow) => {
    setEditing(e);
    setForm({
      incomeDate: e.incomeDate,
      categoryId: e.categoryId ?? null,
      description: e.description,
      amount: e.amount,
      paymentMode: e.paymentMode,
      referenceNo: e.referenceNo ?? null,
      notes: e.notes ?? null,
    });
    setIsOpen(true);
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this income entry?")) return;
    deleteMutation.mutate({ id }, {
      onSuccess: () => { invalidate(); toast({ title: "Income deleted" }); },
      onError: () => toast({ title: "Error deleting income", variant: "destructive" }),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: IncomeInput = {
      ...form,
      categoryId: form.categoryId || null,
      referenceNo: form.referenceNo || null,
      notes: form.notes || null,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload }, {
        onSuccess: () => { invalidate(); setIsOpen(false); toast({ title: "Income updated" }); },
        onError: () => toast({ title: "Error updating income", variant: "destructive" }),
      });
    } else {
      createMutation.mutate({ data: payload }, {
        onSuccess: () => { invalidate(); setIsOpen(false); toast({ title: "Income saved" }); },
        onError: () => toast({ title: "Error saving income", variant: "destructive" }),
      });
    }
  };

  const totalAmount = incomes.reduce((s, r) => s + r.amount, 0);

  const handleExcelExport = () => {
    void exportToExcel(
      "Income_Register",
      "Incomes",
      ["Date", "Category", "Description", "Payment Mode", "Reference No", "Amount (₹)"],
      incomes.map((r) => [
        r.incomeDate, r.categoryName ?? "", r.description,
        r.paymentMode, r.referenceNo ?? "", r.amount,
      ])
    );
  };

  const handlePDFExport = () => {
    exportToPDF(
      "Income_Register",
      "Income Register",
      ["Date", "Category", "Description", "Mode", "Ref No", "Amount (₹)"],
      incomes.map((r) => [
        r.incomeDate, r.categoryName ?? "", r.description,
        r.paymentMode, r.referenceNo ?? "", r.amount,
      ])
    );
  };

  return (
    <Layout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Income Entry</h1>
          <p className="text-gray-500 mt-1">Record and manage non-sales income</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExcelExport}><Download className="w-4 h-4 mr-1" /> Excel</Button>
          <Button variant="outline" size="sm" onClick={handlePDFExport}><Download className="w-4 h-4 mr-1" /> PDF</Button>
          <Button onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Add Income</Button>
        </div>
      </div>

      <div className="flex gap-3 items-end">
        <div>
          <Label className="text-xs text-gray-500">From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36" />
        </div>
        <div>
          <Label className="text-xs text-gray-500">To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36" />
        </div>
        {(from || to) && (
          <Button variant="ghost" size="sm" onClick={() => { setFrom(""); setTo(""); }}>Clear</Button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Reference No</TableHead>
              <TableHead className="text-right">Amount (₹)</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-gray-400 py-8">Loading...</TableCell></TableRow>
            ) : incomes.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-gray-400 py-8">No income entries found</TableCell></TableRow>
            ) : (
              incomes.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.incomeDate}</TableCell>
                  <TableCell>{r.categoryName ?? <span className="text-gray-400">—</span>}</TableCell>
                  <TableCell>{r.description}</TableCell>
                  <TableCell>
                    <Badge variant={r.paymentMode === "cash" ? "secondary" : "outline"}>
                      {r.paymentMode === "cash" ? "Cash" : "Bank"}
                    </Badge>
                  </TableCell>
                  <TableCell>{r.referenceNo ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(r.amount)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}><Edit className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => handleDelete(r.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {incomes.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex justify-end">
            <span className="text-sm font-semibold text-gray-700">Total: ₹{fmt(totalAmount)}</span>
          </div>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Income" : "New Income"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Date *</Label>
                <Input type="date" required value={form.incomeDate} onChange={(e) => setForm({ ...form, incomeDate: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Payment Mode *</Label>
                <Select value={form.paymentMode} onValueChange={(v) => setForm({ ...form, paymentMode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank">Bank</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Category</Label>
              <Select
                value={form.categoryId ? String(form.categoryId) : "none"}
                onValueChange={(v) => setForm({ ...form, categoryId: v === "none" ? null : parseInt(v) })}
              >
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— No category —</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Description *</Label>
              <Input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Income description" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Amount (₹) *</Label>
                <Input
                  type="number" step="0.01" min="0" required
                  value={form.amount || ""}
                  onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1">
                <Label>Reference No</Label>
                <Input value={form.referenceNo ?? ""} onChange={(e) => setForm({ ...form, referenceNo: e.target.value || null })} placeholder="Cheque / Ref no" />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Notes</Label>
              <Input value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value || null })} placeholder="Optional notes" />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editing ? "Update" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
