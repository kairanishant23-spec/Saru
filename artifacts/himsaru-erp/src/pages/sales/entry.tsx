import { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import { 
  useListProducts, 
  useListCustomers, 
  useCreateSale, 
  getListSalesQueryKey,
  type SaleItemInput
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function SalesEntry() {
  const [, setLocation] = useLocation();
  const { data: products = [] } = useListProducts();
  const { data: customers = [] } = useListCustomers();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createSaleMutation = useCreateSale();

  const [customerId, setCustomerId] = useState<string>("");
  const [saleDate, setSaleDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [invoiceNo, setInvoiceNo] = useState<string>("");
  const [gstType, setGstType] = useState<string>("intrastate");
  const [placeOfSupply, setPlaceOfSupply] = useState<string>("Himachal Pradesh");
  const [discount, setDiscount] = useState<number>(0);
  
  const [items, setItems] = useState<Array<SaleItemInput & { id: string }>>([]);

  const handleAddItem = () => {
    setItems([
      ...items, 
      { 
        id: crypto.randomUUID(), 
        productId: 0, 
        quantity: 1, 
        unitPrice: 0, 
        gstRate: 0, 
        hsn: "" 
      }
    ]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof SaleItemInput, value: any) => {
    setItems(items.map(item => {
      if (item.id !== id) return item;
      
      const updatedItem = { ...item, [field]: value };
      
      if (field === 'productId') {
        const product = products.find(p => p.id.toString() === value.toString());
        if (product) {
          updatedItem.unitPrice = product.sellingPrice;
          updatedItem.gstRate = product.gstRate;
          updatedItem.hsn = product.hsn || "";
        }
      }
      
      return updatedItem;
    }));
  };

  const summary = useMemo(() => {
    const totalTaxableBeforeDiscount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const discountAmt = discount;
    let accumulatedDiscount = 0;

    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    items.forEach((item, idx) => {
      const rawTaxable = item.quantity * item.unitPrice;
      
      let itemDiscount = 0;
      if (totalTaxableBeforeDiscount > 0) {
        if (idx === items.length - 1) {
          itemDiscount = discountAmt - accumulatedDiscount;
        } else {
          itemDiscount = discountAmt * (rawTaxable / totalTaxableBeforeDiscount);
          accumulatedDiscount += itemDiscount;
        }
      }
      const taxable = rawTaxable - itemDiscount;
      
      if (gstType === 'intrastate') {
        const tax = (taxable * (item.gstRate || 0)) / 100;
        totalCgst += tax / 2;
        totalSgst += tax / 2;
      } else {
        totalIgst += (taxable * (item.gstRate || 0)) / 100;
      }
      totalTaxable += taxable;
    });

    const subTotal = totalTaxable;
    const grandTotal = subTotal + totalCgst + totalSgst + totalIgst;

    return { totalTaxable, totalCgst, totalSgst, totalIgst, subTotal, grandTotal };
  }, [items, gstType, discount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerId) {
      toast({ title: "Please select a customer", variant: "destructive" });
      return;
    }

    if (items.length === 0 || items.some(i => !i.productId || i.quantity <= 0)) {
      toast({ title: "Please add valid items", variant: "destructive" });
      return;
    }

    createSaleMutation.mutate({
      data: {
        customerId: parseInt(customerId),
        saleDate,
        invoiceNo: invoiceNo || undefined,
        gstType,
        placeOfSupply,
        discount,
        items: items.map(({ id, ...rest }) => rest)
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSalesQueryKey() });
        toast({ title: "Sale recorded successfully" });
        setLocation("/sales");
      },
      onError: (err) => {
        toast({ title: "Error creating sale", description: err.message || "Please try again", variant: "destructive" });
      }
    });
  };

  return (
    <Layout>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => setLocation("/sales")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sales Entry (GST)</h1>
          <p className="text-sm text-slate-500">Create a new sales invoice with GST calculation.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Invoice Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select value={customerId} onValueChange={setCustomerId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select Customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Sale Date</Label>
              <Input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label>Invoice No</Label>
              <Input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} placeholder="Auto-generated if blank" />
            </div>

            <div className="space-y-2">
              <Label>GST Type</Label>
              <Select value={gstType} onValueChange={setGstType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select GST Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="intrastate">Intrastate (CGST + SGST)</SelectItem>
                  <SelectItem value="interstate">Interstate (IGST)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Place of Supply</Label>
              <Input value={placeOfSupply} onChange={e => setPlaceOfSupply(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Discount (₹)</Label>
              <Input type="number" min="0" step="0.01" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h2 className="text-lg font-semibold">Line Items</h2>
            <Button type="button" onClick={handleAddItem} size="sm" variant="secondary">
              <Plus className="h-4 w-4 mr-2" /> Add Item
            </Button>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Product</TableHead>
                  <TableHead>HSN</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Rate (₹)</TableHead>
                  <TableHead>Taxable (₹)</TableHead>
                  <TableHead>GST %</TableHead>
                  {gstType === 'intrastate' ? (
                    <>
                      <TableHead>CGST (₹)</TableHead>
                      <TableHead>SGST (₹)</TableHead>
                    </>
                  ) : (
                    <TableHead>IGST (₹)</TableHead>
                  )}
                  <TableHead>Total (₹)</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-slate-500">
                      No items added. Click "Add Item" to begin.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item, index) => {
                    const rawTaxable = item.quantity * item.unitPrice;
                    const totalTaxableBeforeDiscount = items.reduce((sum, it) => sum + (it.quantity * it.unitPrice), 0);
                    let itemDiscount = 0;
                    if (totalTaxableBeforeDiscount > 0) {
                      const discList = items.map((it) => it.quantity * it.unitPrice);
                      const acc = discList.slice(0, index).reduce((s, val) => s + discount * (val / totalTaxableBeforeDiscount), 0);
                      if (index === items.length - 1) {
                        itemDiscount = discount - acc;
                      } else {
                        itemDiscount = discount * (rawTaxable / totalTaxableBeforeDiscount);
                      }
                    }
                    const taxable = rawTaxable - itemDiscount;
                    const tax = (taxable * (item.gstRate || 0)) / 100;
                    const total = taxable + tax;
                    
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Select 
                            value={item.productId ? item.productId.toString() : ""} 
                            onValueChange={v => handleItemChange(item.id, 'productId', parseInt(v))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select Product" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map(p => (
                                <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input value={item.hsn || ""} onChange={e => handleItemChange(item.id, 'hsn', e.target.value)} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" min="1" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 0)} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" min="0" step="0.01" value={item.unitPrice} onChange={e => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {taxable.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Select value={(item.gstRate || 0).toString()} onValueChange={v => handleItemChange(item.id, 'gstRate', parseInt(v))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[0, 5, 12, 18, 28].map(r => (
                                <SelectItem key={r} value={r.toString()}>{r}%</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        {gstType === 'intrastate' ? (
                          <>
                            <TableCell className="text-right text-slate-500">{(tax / 2).toFixed(2)}</TableCell>
                            <TableCell className="text-right text-slate-500">{(tax / 2).toFixed(2)}</TableCell>
                          </>
                        ) : (
                          <TableCell className="text-right text-slate-500">{tax.toFixed(2)}</TableCell>
                        )}
                        <TableCell className="text-right font-bold text-primary">
                          {total.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => handleRemoveItem(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-end gap-6">
          <div className="w-full md:w-80 bg-slate-50 border border-slate-200 rounded-lg p-6 space-y-3 shadow-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Total Taxable</span>
              <span className="font-medium">₹ {summary.totalTaxable.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>- ₹ {discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-600">Sub Total</span>
              <span className="font-medium">₹ {summary.subTotal.toFixed(2)}</span>
            </div>
            {gstType === 'intrastate' ? (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-600">Total CGST</span>
                  <span className="font-medium">₹ {summary.totalCgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Total SGST</span>
                  <span className="font-medium">₹ {summary.totalSgst.toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between">
                <span className="text-slate-600">Total IGST</span>
                <span className="font-medium">₹ {summary.totalIgst.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
              <span className="font-bold text-lg">Grand Total</span>
              <span className="font-bold text-xl text-primary">₹ {summary.grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => setLocation("/sales")}>Cancel</Button>
          <Button type="submit" size="lg" disabled={createSaleMutation.isPending}>
            {createSaleMutation.isPending ? "Saving..." : "Save Invoice"}
          </Button>
        </div>
      </form>
    </Layout>
  );
}
