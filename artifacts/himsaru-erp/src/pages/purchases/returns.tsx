import { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import { useListPurchases, useGetPurchase, useCreatePurchaseReturn, useListPurchaseReturns, getListPurchaseReturnsQueryKey, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Save, FileText } from "lucide-react";
import { format } from "date-fns";

export default function PurchaseReturns() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: purchases = [] } = useListPurchases();
  
  const [purchaseId, setPurchaseId] = useState<string>("");
  const { data: selectedPurchase, isLoading: loadingPurchase } = useGetPurchase(Number(purchaseId), { query: { enabled: !!purchaseId, queryKey: ["purchases", purchaseId] } });
  
  const createReturn = useCreatePurchaseReturn();
  const { data: pastReturns = [] } = useListPurchaseReturns();

  const [returnDate, setReturnDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [reason, setReason] = useState<string>("");
  
  // We need to manage quantities for return for each item in the purchase
  const [returnItems, setReturnItems] = useState<Record<number, number>>({});

  // When purchase changes, reset return items
  const handlePurchaseSelect = (val: string) => {
    setPurchaseId(val);
    setReturnItems({});
  };

  const handleReturnQuantityChange = (productId: number, qty: number, maxQty: number) => {
    // Ensure qty is between 0 and maxQty
    const safeQty = Math.max(0, Math.min(qty, maxQty));
    setReturnItems(prev => ({
      ...prev,
      [productId]: safeQty
    }));
  };

  const totalReturnAmount = useMemo(() => {
    if (!selectedPurchase) return 0;
    return selectedPurchase.items.reduce((sum, item) => {
      const returnQty = returnItems[item.productId] || 0;
      return sum + (returnQty * item.unitPrice);
    }, 0);
  }, [selectedPurchase, returnItems]);

  const hasItemsToReturn = useMemo(() => {
    return Object.values(returnItems).some(qty => qty > 0);
  }, [returnItems]);

  const handleSubmit = () => {
    if (!purchaseId || !hasItemsToReturn) {
      toast({ title: "Validation Error", description: "Select a purchase and items to return", variant: "destructive" });
      return;
    }

    const itemsToReturn = selectedPurchase!.items
      .filter(item => (returnItems[item.productId] || 0) > 0)
      .map(item => ({
        productId: item.productId,
        quantity: returnItems[item.productId]!,
        unitPrice: item.unitPrice
      }));

    createReturn.mutate({
      data: {
        purchaseId: Number(purchaseId),
        returnDate,
        reason: reason || undefined,
        items: itemsToReturn
      }
    }, {
      onSuccess: () => {
        toast({ title: "Purchase Return processed" });
        queryClient.invalidateQueries({ queryKey: getListPurchaseReturnsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        setPurchaseId("");
        setReturnItems({});
        setReason("");
      },
      onError: () => {
        toast({ title: "Error processing return", variant: "destructive" });
      }
    });
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Purchase Returns</h1>
          <p className="text-sm text-slate-500">Return items from existing purchases and deduct inventory.</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label>Select Purchase <span className="text-red-500">*</span></Label>
            <Select value={purchaseId} onValueChange={handlePurchaseSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Search by PO ID or Supplier" />
              </SelectTrigger>
              <SelectContent>
                {purchases.map(p => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    PO-{p.id.toString().padStart(4, '0')} - {p.supplierName} ({format(new Date(p.purchaseDate), 'dd/MM/yy')})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Return Date <span className="text-red-500">*</span></Label>
            <Input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label>Reason</Label>
            <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for return" />
          </div>
        </div>
      </div>

      {purchaseId && (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-semibold">Select Items to Return</h2>
          </div>

          {loadingPurchase ? (
            <div className="p-8 text-center text-slate-500">Loading purchase details...</div>
          ) : selectedPurchase ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Purchased Qty</TableHead>
                    <TableHead className="text-right">Unit Price (₹)</TableHead>
                    <TableHead className="text-right w-[150px]">Return Qty</TableHead>
                    <TableHead className="text-right">Return Value (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedPurchase.items.map((item) => {
                    const returnQty = returnItems[item.productId] || 0;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{item.unitPrice}</TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            min="0" 
                            max={item.quantity} 
                            value={returnQty} 
                            onChange={(e) => handleReturnQuantityChange(item.productId, Number(e.target.value), item.quantity)}
                            className="text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium text-amber-700">
                          {(returnQty * item.unitPrice).toLocaleString('en-IN')}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <div className="w-72">
                  <div className="flex justify-between items-center font-bold text-xl text-amber-700">
                    <span>Total Return:</span>
                    <span>₹{totalReturnAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <Button 
                    className="w-full mt-4" 
                    size="lg" 
                    onClick={handleSubmit} 
                    disabled={!hasItemsToReturn || createReturn.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {createReturn.isPending ? "Processing..." : "Process Return"}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-slate-500">Failed to load purchase details</div>
          )}
        </div>
      )}

      {/* Historical Purchase Returns */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden mt-6">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <FileText className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold">Purchase Return History</h2>
        </div>
        {pastReturns.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No purchase returns recorded yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Debit Note</TableHead>
                <TableHead>Return Date</TableHead>
                <TableHead>Purchase Invoice</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Amount (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pastReturns.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-primary">{r.debitNoteNo || `DN-${r.id.toString().padStart(4, '0')}`}</TableCell>
                  <TableCell>{format(new Date(r.returnDate), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>{r.invoiceNo || `PO-${r.purchaseId?.toString().padStart(4, '0')}`}</TableCell>
                  <TableCell>{r.supplierName || '-'}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{r.reason || '-'}</TableCell>
                  <TableCell className="text-right font-medium text-amber-700">
                    ₹{(typeof r.totalAmount === 'number' ? r.totalAmount : parseFloat(r.totalAmount || '0')).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </Layout>
  );
}