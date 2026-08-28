import { Layout } from "@/components/layout";
import { Link } from "wouter";
import { TrendingUp, ShoppingCart, Boxes, BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ReportsHub() {
  const reports = [
    {
      title: "Sales Report",
      description: "Sales by date range with GST breakdown",
      icon: TrendingUp,
      href: "/reports/sales",
      color: "text-blue-500",
      bg: "bg-blue-50"
    },
    {
      title: "Purchases Report",
      description: "Purchase orders by date range",
      icon: ShoppingCart,
      href: "/reports/purchases",
      color: "text-purple-500",
      bg: "bg-purple-50"
    },
    {
      title: "Stock Report",
      description: "Current inventory levels and value",
      icon: Boxes,
      href: "/reports/stock",
      color: "text-amber-500",
      bg: "bg-amber-50"
    },
    {
      title: "Profit Report",
      description: "Gross profit and margin analysis",
      icon: BarChart3,
      href: "/reports/profit",
      color: "text-emerald-500",
      bg: "bg-emerald-50"
    }
  ];

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports</h1>
        <p className="text-sm text-slate-500">Comprehensive insights into your business performance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => (
          <Card key={report.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className={`p-3 rounded-lg ${report.bg}`}>
                <report.icon className={`w-6 h-6 ${report.color}`} />
              </div>
              <div>
                <CardTitle>{report.title}</CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Link href={report.href}>
                <Button variant="secondary" className="w-full">
                  View Report
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </Layout>
  );
}
