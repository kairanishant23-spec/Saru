import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Pages
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Products from "@/pages/products";
import Inventory from "@/pages/inventory";
import Customers from "@/pages/customers";
import Suppliers from "@/pages/purchases/suppliers";
import PurchaseEntry from "@/pages/purchases/entry";
import PurchaseRegister from "@/pages/purchases/register";
import PurchaseReturns from "@/pages/purchases/returns";
import Sales from "@/pages/sales";
import SalesEntry from "@/pages/sales/entry";
import SalesInvoice from "@/pages/sales/invoice";
import NotFound from "@/pages/not-found";
import ReportsHub from "@/pages/reports/index";
import SalesReport from "@/pages/reports/sales";
import PurchasesReport from "@/pages/reports/purchases";
import StockReport from "@/pages/reports/stock";
import ProfitReport from "@/pages/reports/profit";
import AccountsHub from "@/pages/accounts/index";
import ExpenseEntry from "@/pages/accounts/expense-entry";
import IncomeEntry from "@/pages/accounts/income-entry";
import CashBook from "@/pages/accounts/cash-book";
import BankBook from "@/pages/accounts/bank-book";
import SettingsPage from "@/pages/settings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: unknown) => {
        const status = (error as { status?: number })?.status;
        if (status === 401 || status === 403) return false;
        return failureCount < 2;
      },
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => { window.location.href = "/dashboard"; return null; }} />
      <Route path="/login" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/products" component={Products} />
      <Route path="/inventory" component={Inventory} />
      <Route path="/customers" component={Customers} />
      <Route path="/purchases/suppliers" component={Suppliers} />
      <Route path="/purchases/entry" component={PurchaseEntry} />
      <Route path="/purchases/register" component={PurchaseRegister} />
      <Route path="/purchases/returns" component={PurchaseReturns} />
      <Route path="/sales" component={Sales} />
      <Route path="/sales/entry" component={SalesEntry} />
      <Route path="/sales/invoice/:id" component={SalesInvoice} />
      <Route path="/reports" component={ReportsHub} />
      <Route path="/reports/sales" component={SalesReport} />
      <Route path="/reports/purchases" component={PurchasesReport} />
      <Route path="/reports/stock" component={StockReport} />
      <Route path="/reports/profit" component={ProfitReport} />
      <Route path="/accounts" component={AccountsHub} />
      <Route path="/accounts/expense-entry" component={ExpenseEntry} />
      <Route path="/accounts/income-entry" component={IncomeEntry} />
      <Route path="/accounts/cash-book" component={CashBook} />
      <Route path="/accounts/bank-book" component={BankBook} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;