import { useState } from "react";
import { Layout } from "@/components/layout";
import { useGetPurchasesReport, getGetPurchasesReportQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText } from "lucide-react";
import { format } from "date-fns";
import { exportToExcel, exportToPDF } from "@/lib/export";

export default function PurchasesReport() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  
  const [activeFrom, setActiveFrom] = useState("");
  const [activeTo, setActiveTo] = useState("");

  const params = {
    ...(activeFrom && { from: activeFrom }),
    ...(activeTo && { to: activeTo })
  };

  const { data, isLoading } = useGetPurchasesReport(params, {
    query: { queryKey: getGetPurchasesReportQueryKey(params) }
  });

  const handleLoad = () => {
    setActiveFrom(fromDate);
    setActiveTo(toDate);
  };

  const headers = ["Date", "Invoice No", "Supplier", "Total (₹)"];
  
  const getRows = () => {
    if (!data?.rows) return [];
    return data.rows.map(r => [
      format(new Date(r.purchaseDate), 'dd/MM/yyyy'),
      r.invoiceNo || '-',
      r.supplierName,
      r.totalAmount.toFixed(2)
    ]);
  };

  const handleExportExcel = () => {
    void exportToExcel("Purchases_Report", "Purchases", headers, getRows());
  };

  const handleExportPDF = () => {
    exportToPDF("Purchases_Report", "HIMSARU TRADERS - Purchases Report", headers, getRows());
  };

  const summary = data?.summary;

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Purchases Report</h1>
          <p className="text-sm text-slate-500">Purchase orders by date range</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportExcel} disabled={!data?.rows?.length}>
            <Download className="w-4 h-4 mr-2" /> Export Excel
          </Button>
          <Button variant="outline" onClick={handleExportPDF} disabled={!data?.rows?.length}>
            <FileText className="w-4 h-4 mr-2" /> Export PDF
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4 flex flex-wrap items-end gap-4">
          <div className="space-y-1.5 w-48">
            <Label>From Date</Label>
            <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </div>
          <div className="space-y-1.5 w-48">
            <Label>To Date</Label>
            <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
          </div>
          <Button onClick={handleLoad}>Load Report</Button>
        </CardContent>
      </Card>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-slate-500 font-medium">Total Orders</div>
              <div className="text-2xl font-bold mt-1">{summary.count}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-slate-500 font-medium">Total Amount</div>
              <div className="text-2xl font-bold mt-1 text-slate-900">₹{summary.totalAmount.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Invoice No</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Total (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : !data?.rows?.length ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-500">No data found for the selected period.</TableCell></TableRow>
              ) : (
                data.rows.map(row => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap">{format(new Date(row.purchaseDate), 'dd MMM yyyy')}</TableCell>
                    <TableCell className="font-medium">{row.invoiceNo || '-'}</TableCell>
                    <TableCell>{row.supplierName}</TableCell>
                    <TableCell className="text-right font-bold">{row.totalAmount.toFixed(2)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </Layout>
  );
}
