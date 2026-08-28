import { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import { useListSuppliers, useListProducts, useCreatePurchase, getListPurchasesQueryKey, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

interface LineItem {
  id: string; // temp id for UI
  productId: number;
  quantity: number;
  unitPrice: number;
}

export default function PurchaseEntry() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: suppliers = [], isLoading: loadingSuppliers } = useListSuppliers();
  const { data: products = [], isLoading: loadingProducts } = useListProducts();
  const createPurchase = useCreatePurchase();

  const [supplierId, setSupplierId] = useState<string>("");
  const [purchaseDate, setPurchaseDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [invoiceNo, setInvoiceNo] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  
  const [items, setItems] = useState<LineItem[]>([
    { id: crypto.randomUUID(), productId: 0, quantity: 1, unitPrice: 0 }
  ]);

  const addLineItem = () => {
    setItems([...items, { id: crypto.randomUUID(), productId: 0, quantity: 1, unitPrice: 0 }]);
  };

  const removeLineItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setItems(items.map(item => {
      if (item.id !== id) return item;
      
      const updated = { ...item, [field]: value };
      
      // Auto-fill unit price if product is selected
      if (field === 'productId') {
        const product = products.find(p => p.id === value);
        if (product) {
          updated.unitPrice = product.purchasePrice;
        }
      }
      
      return updated;
    }));
  };

  const grandTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  }, [items]);

  const isValid = supplierId && items.every(item => item.productId > 0 && item.quantity > 0 && item.unitPrice >= 0);

  const handleSubmit = () => {
    if (!isValid) {
      toast({ title: "Validation Error", description: "Please fill all required fields correctly", variant: "destructive" });
      return;
    }

    createPurchase.mutate({
      data: {
        supplierId: Number(supplierId),
        purchaseDate,
        invoiceNo: invoiceNo || undefined,
        notes: notes || undefined,
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        }))
      }
    }, {
      onSuccess: () => {
        toast({ title: "Purchase entry created" });
        queryClient.invalidateQueries({ queryKey: getListPurchasesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        setLocation("/purchases/register");
      },
      onError: (err) => {
        toast({ title: "Error creating purchase", description: err.message || "Please try again", variant: "destructive" });
      }
    });
  };

  if (loadingSuppliers || loadingProducts) {
    return <Layout><div className="text-center py-8">Loading...</div></Layout>;
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Purchase Entry</h1>
          <p className="text-sm text-slate-500">Record a new purchase and update inventory.</p>
        </div>
        <Button variant="outline" onClick={() => setLocation("/purchases/register")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Register
        </Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 border-b border-slate-100 pb-2">Purchase Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <Label>Supplier <span className="text-red-500">*</span></Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger>
                <SelectValue placeholder="Select Supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map(s => (
                  <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Date <span className="text-red-500">*</span></Label>
            <Input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label>Invoice No</Label>
            <Input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} placeholder="Supplier Invoice" />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional remarks" />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-lg font-semibold">Line Items</h2>
          <Button variant="outline" size="sm" onClick={addLineItem}>
            <Plus className="w-4 h-4 mr-2" />
            Add Row
          </Button>
        </div>

        <div className="overflow-x-auto">
        <Table className="min-w-[560px]">
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">Product</TableHead>
              <TableHead className="min-w-[100px]">Quantity</TableHead>
              <TableHead className="min-w-[130px]">Unit Price (₹)</TableHead>
              <TableHead className="min-w-[120px] text-right">Total (₹)</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Select value={item.productId ? item.productId.toString() : ""} onValueChange={(val) => updateLineItem(item.id, "productId", Number(val))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.name} ({p.sku || 'No SKU'})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input type="number" min="1" value={item.quantity} onChange={(e) => updateLineItem(item.id, "quantity", Number(e.target.value))} />
                </TableCell>
                <TableCell>
                  <Input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateLineItem(item.id, "unitPrice", Number(e.target.value))} />
                </TableCell>
                <TableCell className="text-right font-medium">
                  {(item.quantity * item.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeLineItem(item.id)} disabled={items.length === 1}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <div className="w-72">
            <div className="flex justify-between items-center font-bold text-xl">
              <span>Grand Total:</span>
              <span>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <Button className="w-full mt-4" size="lg" onClick={handleSubmit} disabled={!isValid || createPurchase.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {createPurchase.isPending ? "Saving..." : "Save Purchase Entry"}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}