import { Layout } from "@/components/layout";
import { useGetDashboardStats } from "@workspace/api-client-react";
import { 
  Package, 
  Users, 
  Truck, 
  TrendingUp, 
  ShoppingCart, 
  AlertTriangle 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: stats, isLoading } = useGetDashboardStats();

  if (isLoading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!stats) return null;

  return (
    <Layout>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Sales (This Month)</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.totalSalesThisMonth.toLocaleString('en-IN')}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Purchases (This Month)</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.totalPurchasesThisMonth.toLocaleString('en-IN')}</div>
          </CardContent>
        </Card>

        <Card className={stats.lowStockCount > 0 ? "border-amber-200 bg-amber-50/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Low Stock Items</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${stats.lowStockCount > 0 ? "text-amber-600" : "text-slate-400"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.lowStockCount > 0 ? "text-amber-700" : ""}`}>{stats.lowStockCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Products Catalog</CardTitle>
            <Package className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Active Customers</CardTitle>
            <Users className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Registered Suppliers</CardTitle>
            <Truck className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSuppliers}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Recent Sales</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentSales.length === 0 ? (
              <div className="text-sm text-slate-500 py-4 text-center">No recent sales</div>
            ) : (
              <div className="space-y-4">
                {stats.recentSales.map(sale => (
                  <div key={sale.id} className="flex items-center justify-between border-b border-slate-100 last:border-0 pb-3 last:pb-0">
                    <div>
                      <div className="font-medium text-sm">{sale.customerName}</div>
                      <div className="text-xs text-slate-500">{format(new Date(sale.saleDate), 'PP')} • {sale.invoiceNo || 'No Invoice'}</div>
                    </div>
                    <div className="font-semibold text-sm">₹{sale.totalAmount.toLocaleString('en-IN')}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Recent Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentPurchases.length === 0 ? (
              <div className="text-sm text-slate-500 py-4 text-center">No recent purchases</div>
            ) : (
              <div className="space-y-4">
                {stats.recentPurchases.map(purchase => (
                  <div key={purchase.id} className="flex items-center justify-between border-b border-slate-100 last:border-0 pb-3 last:pb-0">
                    <div>
                      <div className="font-medium text-sm">{purchase.supplierName}</div>
                      <div className="text-xs text-slate-500">{format(new Date(purchase.purchaseDate), 'PP')} • {purchase.invoiceNo || 'No Invoice'}</div>
                    </div>
                    <div className="font-semibold text-sm">₹{purchase.totalAmount.toLocaleString('en-IN')}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}