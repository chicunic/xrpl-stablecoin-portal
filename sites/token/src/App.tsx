import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthLayout } from "@/components/AuthLayout";
import { I18nProvider } from "@/i18n";
import { AuthProvider } from "@/lib/auth";
import { DashboardPage } from "@/pages/DashboardPage";
import { DepositPage } from "@/pages/DepositPage";
import { ExchangePage } from "@/pages/ExchangePage";
import { InvoicePage } from "@/pages/InvoicePage";
import { LoginPage } from "@/pages/LoginPage";
import { OrdersPage } from "@/pages/OrdersPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { WhitelistPage } from "@/pages/WhitelistPage";
import { WithdrawPage } from "@/pages/WithdrawPage";

function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<AuthLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/deposit" element={<DepositPage />} />
              <Route path="/withdraw" element={<WithdrawPage />} />
              <Route path="/exchange" element={<ExchangePage />} />
              <Route path="/invoices" element={<InvoicePage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/whitelist" element={<WhitelistPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
  );
}

export default App;
