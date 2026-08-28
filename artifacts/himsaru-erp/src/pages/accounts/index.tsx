import { Link } from "wouter";
import { Layout } from "@/components/layout";
import { Wallet, Building2, TrendingDown, TrendingUp } from "lucide-react";

const features = [
  {
    href: "/accounts/cash-book",
    icon: Wallet,
    title: "Cash Book",
    description: "Track all cash receipts and payments with running balance",
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    href: "/accounts/bank-book",
    icon: Building2,
    title: "Bank Book",
    description: "Track all bank receipts and payments with running balance",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    href: "/accounts/expense-entry",
    icon: TrendingDown,
    title: "Expense Entry",
    description: "Record and manage business expenses",
    color: "text-red-600",
    bg: "bg-red-50",
  },
  {
    href: "/accounts/income-entry",
    icon: TrendingUp,
    title: "Income Entry",
    description: "Record and manage non-sales income",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
];

export default function AccountsHub() {
  return (
    <Layout>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
        <p className="text-gray-500 mt-1">Cash book, bank book, expenses and income management</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-6">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <Link key={f.href} href={f.href}>
              <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer group">
                <div className={`w-12 h-12 rounded-lg ${f.bg} flex items-center justify-center mb-4`}>
                  <Icon className={`w-6 h-6 ${f.color}`} />
                </div>
                <h3 className="font-semibold text-gray-900 text-lg group-hover:text-primary transition-colors">{f.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{f.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </Layout>
  );
}
