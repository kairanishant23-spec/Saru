import { useRoute, Link } from "wouter";
import { useGetSale, getGetSaleQueryKey, useGetSettings } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

const numberToWords = (num: number): string => {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if ((num = num || 0) === 0) return 'Zero';
  const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += (n[1] != '00') ? (a[Number(n[1])] || b[parseInt(n[1][0])] + ' ' + a[parseInt(n[1][1])]) + 'Crore ' : '';
  str += (n[2] != '00') ? (a[Number(n[2])] || b[parseInt(n[2][0])] + ' ' + a[parseInt(n[2][1])]) + 'Lakh ' : '';
  str += (n[3] != '00') ? (a[Number(n[3])] || b[parseInt(n[3][0])] + ' ' + a[parseInt(n[3][1])]) + 'Thousand ' : '';
  str += (n[4] != '0') ? (a[Number(n[4])] || b[parseInt(n[4][0])] + ' ' + a[parseInt(n[4][1])]) + 'Hundred ' : '';
  str += (n[5] != '00') ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[parseInt(n[5][0])] + ' ' + a[parseInt(n[5][1])]) : '';
  return str.trim();
};

export default function SalesInvoice() {
  const [match, params] = useRoute("/sales/invoice/:id");
  const id = match && params?.id ? parseInt(params.id) : 0;

  const { data: sale, isLoading } = useGetSale(id, {
    query: {
      enabled: !!id,
      queryKey: getGetSaleQueryKey(id)
    }
  });

  const { data: settings } = useGetSettings();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading Invoice...</div>;
  }

  if (!sale) {
    return <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div>Invoice not found.</div>
      <Link href="/sales" className="text-primary hover:underline">Back to Sales</Link>
    </div>;
  }

  const printInvoice = () => window.print();

  const bizName = settings?.businessLegalName || settings?.businessName || "HIMSARU TRADERS";
  const bizGstin = settings?.gstin || "";
  const bizAddress = [settings?.address, settings?.city, settings?.state, settings?.pincode].filter(Boolean).join(", ");
  const bizPhone = settings?.phone || "";
  const bizLogo = settings?.logoData || "/logo.png";
  const sigName = settings?.businessName || "HIMSARU";

  return (
    <div className="min-h-screen bg-slate-50 py-8 print:bg-white print:py-0">
      <div className="max-w-[210mm] mx-auto bg-white p-8 shadow-sm border border-slate-200 print:shadow-none print:border-none print:p-0">

        {/* Controls - Hidden on print */}
        <div className="flex justify-between items-center mb-8 print:hidden">
          <Link href="/sales">
            <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
          </Link>
          <Button onClick={printInvoice} className="bg-primary text-primary-foreground"><Printer className="w-4 h-4 mr-2" /> Print Invoice</Button>
        </div>

        {/* Invoice Content */}
        <div className="border border-black">
          {/* Header */}
          <div className="text-center p-4 border-b border-black">
            <h1 className="text-2xl font-bold tracking-wider">TAX INVOICE</h1>
          </div>

          <div className="grid grid-cols-2 divide-x divide-black border-b border-black">
            {/* Company Details */}
            <div className="p-4 flex items-start gap-3">
              <img
                src={bizLogo}
                alt="Logo"
                className="w-12 h-12 object-contain flex-shrink-0 print:w-10 print:h-10"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <div>
                <h2 className="text-xl font-bold mb-1">{bizName}</h2>
                <div className="text-sm space-y-0.5">
                  {bizAddress && <p>{bizAddress}</p>}
                  {bizGstin && <p><strong>GSTIN:</strong> {bizGstin}</p>}
                  {bizPhone && <p><strong>Phone:</strong> {bizPhone}</p>}
                </div>
              </div>
            </div>

            {/* Invoice Details */}
            <div className="p-4 flex flex-col justify-center">
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <div className="font-semibold">Invoice No:</div>
                <div>{sale.invoiceNo || `SO-${sale.id.toString().padStart(4, '0')}`}</div>

                <div className="font-semibold">Date:</div>
                <div>{format(new Date(sale.saleDate), 'dd-MMM-yyyy')}</div>

                <div className="font-semibold">Place of Supply:</div>
                <div>{sale.placeOfSupply || '-'}</div>

                <div className="font-semibold">GST Type:</div>
                <div className="capitalize">{sale.gstType}</div>
              </div>
            </div>
          </div>

          <div className="border-b border-black p-4">
            <h3 className="font-semibold mb-2">Billed To:</h3>
            <div className="text-sm space-y-1">
              <p className="font-bold">{sale.customerName}</p>
              <p>{sale.customerAddress || 'Address not provided'}</p>
              <p>{sale.customerState || 'State not provided'}</p>
              <p><strong>GSTIN/UIN:</strong> {sale.customerGstin || 'Unregistered'}</p>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-sm border-b border-black text-center divide-y divide-black">
            <thead className="font-semibold">
              <tr className="divide-x divide-black">
                <th className="p-2 w-10">S.No</th>
                <th className="p-2 text-left">Description of Goods</th>
                <th className="p-2 w-20">HSN/SAC</th>
                <th className="p-2 w-16">Qty</th>
                <th className="p-2 w-20">Rate</th>
                <th className="p-2 w-24">Taxable Value</th>
                <th className="p-2 w-16">GST %</th>
                {sale.gstType === 'intrastate' ? (
                  <>
                    <th className="p-2 w-20">CGST</th>
                    <th className="p-2 w-20">SGST</th>
                  </>
                ) : (
                  <th className="p-2 w-24">IGST</th>
                )}
                <th className="p-2 w-24">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sale.items.map((item, idx) => (
                <tr key={item.id} className="divide-x divide-black h-8 align-top">
                  <td className="p-2">{idx + 1}</td>
                  <td className="p-2 text-left">{item.productName}</td>
                  <td className="p-2">{item.hsn || '-'}</td>
                  <td className="p-2">{item.quantity}</td>
                  <td className="p-2 text-right">{item.unitPrice.toFixed(2)}</td>
                  <td className="p-2 text-right">{item.taxableAmount.toFixed(2)}</td>
                  <td className="p-2">{item.gstRate}%</td>
                  {sale.gstType === 'intrastate' ? (
                    <>
                      <td className="p-2 text-right">{item.cgstAmount.toFixed(2)}</td>
                      <td className="p-2 text-right">{item.sgstAmount.toFixed(2)}</td>
                    </>
                  ) : (
                    <td className="p-2 text-right">{item.igstAmount.toFixed(2)}</td>
                  )}
                  <td className="p-2 text-right">{item.totalPrice.toFixed(2)}</td>
                </tr>
              ))}
              {Array.from({ length: Math.max(0, 5 - sale.items.length) }).map((_, i) => (
                <tr key={`pad-${i}`} className="divide-x divide-black h-8 border-none">
                  <td /><td /><td /><td /><td /><td /><td />
                  {sale.gstType === 'intrastate' ? <><td /><td /></> : <td />}
                  <td />
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-black font-semibold divide-x divide-black">
              <tr>
                <td colSpan={5} className="p-2 text-right">Total</td>
                <td className="p-2 text-right">{sale.items.reduce((s, item) => s + item.taxableAmount, 0).toFixed(2)}</td>
                <td></td>
                {sale.gstType === 'intrastate' ? (
                  <>
                    <td className="p-2 text-right">{sale.items.reduce((s, item) => s + item.cgstAmount, 0).toFixed(2)}</td>
                    <td className="p-2 text-right">{sale.items.reduce((s, item) => s + item.sgstAmount, 0).toFixed(2)}</td>
                  </>
                ) : (
                  <td className="p-2 text-right">{sale.items.reduce((s, item) => s + item.igstAmount, 0).toFixed(2)}</td>
                )}
                <td className="p-2 text-right">{sale.items.reduce((s, item) => s + item.totalPrice, 0).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Tax Summary & Totals */}
          <div className="grid grid-cols-2 divide-x divide-black text-sm">
            <div className="p-4 flex flex-col justify-between">
              <div>
                <p className="mb-2"><strong>Total Invoice Amount in Words:</strong></p>
                <p className="font-semibold italic">Rupees {numberToWords(Math.round(sale.totalAmount))} Only</p>
              </div>
              <div className="mt-8 border-t border-dashed border-slate-400 pt-4">
                <p className="font-bold mb-1">Declaration:</p>
                <p className="text-xs">We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>
              </div>
            </div>
            <div className="p-0">
              <table className="w-full text-sm divide-y divide-black">
                <tbody>
                  {(() => {
                    const sumTaxable = sale.items.reduce((s, item) => s + item.taxableAmount, 0);
                    const isLegacy = Math.abs(sumTaxable - sale.taxableAmount) > 0.05 && sale.discount > 0;
                    const preDiscountTaxable = isLegacy ? sumTaxable : (sale.taxableAmount + sale.discount);
                    return (
                      <>
                        <tr className="divide-x divide-black">
                          <td className="p-2 font-semibold">Total Taxable (Pre-Discount)</td>
                          <td className="p-2 text-right w-32">₹ {preDiscountTaxable.toFixed(2)}</td>
                        </tr>
                        {sale.discount > 0 && (
                          <tr className="divide-x divide-black">
                            <td className="p-2 font-semibold">Discount (-)</td>
                            <td className="p-2 text-right">₹ {sale.discount.toFixed(2)}</td>
                          </tr>
                        )}
                        {sale.discount > 0 && (
                          <tr className="divide-x divide-black bg-slate-50/50">
                            <td className="p-2 font-semibold font-bold">Net Taxable Amount</td>
                            <td className="p-2 text-right font-bold">₹ {sale.taxableAmount.toFixed(2)}</td>
                          </tr>
                        )}
                      </>
                    );
                  })()}
                  {sale.gstType === 'intrastate' ? (
                    <>
                      <tr className="divide-x divide-black">
                        <td className="p-2 font-semibold">Add: CGST</td>
                        <td className="p-2 text-right">₹ {sale.cgstAmount.toFixed(2)}</td>
                      </tr>
                      <tr className="divide-x divide-black">
                        <td className="p-2 font-semibold">Add: SGST</td>
                        <td className="p-2 text-right">₹ {sale.sgstAmount.toFixed(2)}</td>
                      </tr>
                    </>
                  ) : (
                    <tr className="divide-x divide-black">
                      <td className="p-2 font-semibold">Add: IGST</td>
                      <td className="p-2 text-right">₹ {sale.igstAmount.toFixed(2)}</td>
                    </tr>
                  )}
                  <tr className="divide-x divide-black bg-slate-50 font-bold text-base border-t border-black">
                    <td className="p-2 text-right">Grand Total</td>
                    <td className="p-2 text-right">₹ {sale.totalAmount.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
              <div className="p-4 text-center mt-12">
                <p className="font-semibold">For {sigName}</p>
                <div className="h-16"></div>
                <p className="text-xs">Authorized Signatory</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
