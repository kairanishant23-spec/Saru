import { useState } from "react";
import { Layout } from "@/components/layout";
import { useGetBankBook } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Building2 } from "lucide-react";
import { exportToExcel, exportToPDF } from "@/lib/export";

const fmt = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function thisMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
  return { from, to };
}

export default function BankBook() {
  const range = thisMonthRange();
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);

  const { data, isLoading } = useGetBankBook({ from: from || undefined, to: to || undefined });

  const entries = data?.entries ?? [];
  const totalReceipts = data?.totalReceipts ?? 0;
  const totalPayments = data?.totalPayments ?? 0;
  const closingBalance = data?.closingBalance ?? 0;

  const handleExcelExport = () => {
    void exportToExcel(
      "Bank_Book",
      "Bank Book",
      ["Date", "Type", "Category", "Description", "Reference No", "Receipts (₹)", "Payments (₹)", "Balance (₹)"],
      entries.map((r) => [
        r.date, r.type === "income" ? "Receipt" : "Payment",
        r.categoryName ?? "", r.description, r.referenceNo ?? "",
        r.receipts || "", r.payments || "", r.balance,
      ])
    );
  };

  const handlePDFExport = () => {
    exportToPDF(
      "Bank_Book",
      `Bank Book  ${from ? `(${from} to ${to})` : ""}`,
      ["Date", "Type", "Description", "Receipts (₹)", "Payments (₹)", "Balance (₹)"],
      entries.map((r) => [
        r.date, r.type === "income" ? "Receipt" : "Payment",
        r.description, r.receipts || "", r.payments || "", r.balance,
      ])
    );
  };

  return (
    <Layout>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bank Book</h1>
            <p className="text-gray-500 mt-0.5">Bank receipts and payments ledger</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExcelExport}><Download className="w-4 h-4 mr-1" /> Excel</Button>
          <Button variant="outline" size="sm" onClick={handlePDFExport}><Download className="w-4 h-4 mr-1" /> PDF</Button>
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
        <Button variant="ghost" size="sm" onClick={() => { setFrom(""); setTo(""); }}>All Dates</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-100 rounded-lg p-4">
          <p className="text-xs text-green-600 font-medium uppercase tracking-wide">Total Receipts</p>
          <p className="text-2xl font-bold text-green-700 mt-1">₹{fmt(totalReceipts)}</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-lg p-4">
          <p className="text-xs text-red-600 font-medium uppercase tracking-wide">Total Payments</p>
          <p className="text-2xl font-bold text-red-700 mt-1">₹{fmt(totalPayments)}</p>
        </div>
        <div className={`border rounded-lg p-4 ${closingBalance >= 0 ? "bg-blue-50 border-blue-100" : "bg-orange-50 border-orange-100"}`}>
          <p className={`text-xs font-medium uppercase tracking-wide ${closingBalance >= 0 ? "text-blue-600" : "text-orange-600"}`}>Closing Balance</p>
          <p className={`text-2xl font-bold mt-1 ${closingBalance >= 0 ? "text-blue-700" : "text-orange-700"}`}>₹{fmt(closingBalance)}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead className="text-right text-green-700">Receipts (₹)</TableHead>
              <TableHead className="text-right text-red-700">Payments (₹)</TableHead>
              <TableHead className="text-right">Balance (₹)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-gray-400 py-8">Loading...</TableCell></TableRow>
            ) : entries.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-gray-400 py-8">No bank transactions in this period</TableCell></TableRow>
            ) : (
              entries.map((e, i) => (
                <TableRow key={i} className={e.type === "income" ? "hover:bg-green-50/30" : "hover:bg-red-50/30"}>
                  <TableCell className="text-sm">{e.date}</TableCell>
                  <TableCell>
                    <Badge variant={e.type === "income" ? "default" : "secondary"} className={e.type === "income" ? "bg-green-100 text-green-800 hover:bg-green-100" : "bg-red-100 text-red-800 hover:bg-red-100"}>
                      {e.type === "income" ? "Receipt" : "Payment"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">{e.categoryName ?? "—"}</TableCell>
                  <TableCell className="text-sm">{e.description}</TableCell>
                  <TableCell className="text-sm text-gray-400">{e.referenceNo ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono text-green-700 text-sm">
                    {e.receipts > 0 ? fmt(e.receipts) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-red-700 text-sm">
                    {e.payments > 0 ? fmt(e.payments) : "—"}
                  </TableCell>
                  <TableCell className={`text-right font-mono font-medium text-sm ${e.balance >= 0 ? "text-gray-900" : "text-orange-600"}`}>
                    {fmt(e.balance)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {entries.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex justify-between text-sm font-semibold">
            <span className="text-gray-600">Total ({entries.length} transactions)</span>
            <div className="flex gap-8">
              <span className="text-green-700">Receipts: ₹{fmt(totalReceipts)}</span>
              <span className="text-red-700">Payments: ₹{fmt(totalPayments)}</span>
              <span className={closingBalance >= 0 ? "text-blue-700" : "text-orange-700"}>Balance: ₹{fmt(closingBalance)}</span>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
