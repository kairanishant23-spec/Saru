import { Layout } from "@/components/layout";
import { useGetStockReport, getGetStockReportQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, FileText } from "lucide-react";
import { exportToExcel, exportToPDF } from "@/lib/export";

export default function StockReport() {
  const { data, isLoading } = useGetStockReport({
    query: { queryKey: getGetStockReportQueryKey() }
  });

  const headers = ["Product", "SKU", "Category", "Unit", "HSN", "GST%", "Stock Qty", "Min Stock", "Purchase Price (₹)", "Selling Price (₹)", "Stock Value (₹)", "Retail Value (₹)", "Status"];
  
  const getRows = () => {
    if (!data?.rows) return [];
    return data.rows.map(r => [
      r.name,
      r.sku || '-',
      r.category || '-',
      r.unit,
      r.hsn || '-',
      r.gstRate,
      r.currentStock,
      r.minStock,
      r.purchasePrice.toFixed(2),
      r.sellingPrice.toFixed(2),
      r.stockValue.toFixed(2),
      r.retailValue.toFixed(2),
      r.belowMin ? 'Low Stock' : 'OK'
    ]);
  };

  const handleExportExcel = () => {
    void exportToExcel("Stock_Report", "Stock", headers, getRows());
  };

  const handleExportPDF = () => {
    exportToPDF("Stock_Report", "HIMSARU TRADERS - Stock Report", headers, getRows());
  };

  const summary = data?.summary;

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Stock Report</h1>
          <p className="text-sm text-slate-500">Current inventory levels and value</p>
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

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-slate-500 font-medium">Total Products</div>
              <div className="text-2xl font-bold mt-1">{summary.totalProducts}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-slate-500 font-medium">Stock Value</div>
              <div className="text-2xl font-bold mt-1 text-slate-900">₹{summary.totalStockValue.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-slate-500 font-medium">Retail Value</div>
              <div className="text-2xl font-bold mt-1 text-slate-900">₹{summary.totalRetailValue.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-slate-500 font-medium">Low Stock Items</div>
              <div className="text-2xl font-bold mt-1 text-amber-600">{summary.lowStockCount}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>HSN</TableHead>
                <TableHead className="text-right">GST%</TableHead>
                <TableHead className="text-right">Stock Qty</TableHead>
                <TableHead className="text-right">Min Stock</TableHead>
                <TableHead className="text-right">Purchase Price (₹)</TableHead>
                <TableHead className="text-right">Selling Price (₹)</TableHead>
                <TableHead className="text-right">Stock Value (₹)</TableHead>
                <TableHead className="text-right">Retail Value (₹)</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={13} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : !data?.rows?.length ? (
                <TableRow><TableCell colSpan={13} className="text-center py-8 text-slate-500">No stock data found.</TableCell></TableRow>
              ) : (
                data.rows.map(row => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium whitespace-nowrap">{row.name}</TableCell>
                    <TableCell>{row.sku || '-'}</TableCell>
                    <TableCell>{row.category || '-'}</TableCell>
                    <TableCell>{row.unit}</TableCell>
                    <TableCell>{row.hsn || '-'}</TableCell>
                    <TableCell className="text-right">{row.gstRate}%</TableCell>
                    <TableCell className="text-right font-bold">{row.currentStock}</TableCell>
                    <TableCell className="text-right text-slate-500">{row.minStock}</TableCell>
                    <TableCell className="text-right">{row.purchasePrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{row.sellingPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-semibold">{row.stockValue.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-semibold">{row.retailValue.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={row.belowMin ? "destructive" : "secondary"} className={row.belowMin ? "bg-amber-100 text-amber-800 hover:bg-amber-100" : "bg-green-100 text-green-800 hover:bg-green-100"}>
                        {row.belowMin ? "Low Stock" : "OK"}
                      </Badge>
                    </TableCell>
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
