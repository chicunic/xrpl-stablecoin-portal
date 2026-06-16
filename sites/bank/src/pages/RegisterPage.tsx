import { Landmark, Printer } from "lucide-react";
import { type SubmitEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createAccount } from "@/lib/api";
import { BANK_NAME } from "@/lib/constants";
import type { BankAccount } from "@/lib/types";

function buildPrintHtml(account: BankAccount, pin: string): string {
  const dateStr = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
  const accountTypeLabel = account.accountType === "corporate" ? "法人" : "普通（個人）";

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>口座開設完了通知書 - ${BANK_NAME}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", sans-serif; padding: 40px; color: #111; }
  .header { text-align: center; margin-bottom: 32px; border-bottom: 2px solid #111; padding-bottom: 16px; }
  .header h1 { font-size: 20px; letter-spacing: 4px; }
  .header svg { margin: 0 auto 12px; }
  .bank-name { font-size: 14px; color: #555; margin-bottom: 8px; }
  .date { text-align: right; font-size: 12px; color: #555; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th, td { border: 1px solid #ccc; padding: 10px 14px; text-align: left; font-size: 14px; }
  th { background: #f5f5f5; width: 140px; font-weight: 600; }
  td { font-family: "Menlo", "Consolas", monospace; letter-spacing: 1px; }
  .pin-row td { font-size: 18px; font-weight: bold; letter-spacing: 4px; }
  .notice { background: #fff8e1; border: 1px solid #ffe082; border-radius: 4px; padding: 12px 16px; font-size: 12px; line-height: 1.8; margin-bottom: 24px; }
  .notice strong { color: #e65100; }
  .footer { text-align: center; font-size: 11px; color: #888; margin-top: 40px; border-top: 1px solid #ddd; padding-top: 16px; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
  <div class="header">
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>
    <div class="bank-name">${BANK_NAME}</div>
    <h1>口座開設完了通知書</h1>
  </div>
  <div class="date">発行日時：${dateStr}</div>
  <table>
    <tr><th>銀行名</th><td>${BANK_NAME}</td></tr>
    <tr><th>支店番号</th><td>${account.branchCode}</td></tr>
    <tr><th>口座番号</th><td>${account.accountNumber}</td></tr>
    <tr><th>口座種別</th><td>${accountTypeLabel}</td></tr>
    <tr><th>名義人</th><td>${account.accountHolder}</td></tr>
    <tr class="pin-row"><th>暗証番号</th><td>${pin}</td></tr>
  </table>
  <div class="notice">
    <strong>重要：</strong>この通知書には暗証番号が記載されています。<br>
    印刷後は厳重に保管し、第三者に見せないようご注意ください。<br>
    暗証番号はログイン時および取引時に必要です。
  </div>
  <div class="footer">${BANK_NAME}&emsp;口座開設完了通知書</div>
</body>
</html>`;
}

function openPrintWindow(html: string): void {
  const w = window.open("", "_blank");
  if (w) {
    w.document.documentElement.innerHTML = html;
    w.addEventListener("load", () => {
      w.print();
    });
  }
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [accountHolder, setAccountHolder] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [accountType, setAccountType] = useState<"personal" | "corporate">("personal");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<BankAccount | null>(null);

  function handlePrint() {
    if (!created) return;
    openPrintWindow(buildPrintHtml(created, pin));
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    setError("");
    if (pin !== confirmPin) {
      setError("暗証番号が一致しません");
      return;
    }
    setLoading(true);
    try {
      const account = await createAccount({ accountHolder, pin, accountType });
      setCreated(account);
    } catch (err) {
      setError(err instanceof Error ? err.message : "口座開設に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-gray-50">
      <Header />

      <main className="flex flex-1 items-center justify-center px-4">
        {created ? (
          <Card className="w-full max-w-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">口座開設完了</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 rounded-md border p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">銀行名</span>
                  <span>{BANK_NAME}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">支店番号</span>
                  <span>{created.branchCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">口座番号</span>
                  <span className="font-mono">{created.accountNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">名義人</span>
                  <span>{created.accountHolder}</span>
                </div>
              </div>
              <p className="text-muted-foreground text-center text-xs">
                上記の情報はログイン時に必要です。お控えください。
              </p>
              <Button variant="outline" className="w-full" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                口座情報を印刷・PDF保存
              </Button>
              <Button className="w-full" onClick={() => navigate("/login")}>
                ログイン画面へ
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full max-w-sm">
            <CardHeader className="text-center">
              <Landmark className="text-primary mx-auto mb-2 h-8 w-8" />
              <CardTitle className="text-xl">新規口座開設</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>口座種別</Label>
                  <Tabs
                    value={accountType}
                    onValueChange={(v) => {
                      setAccountType(v as "personal" | "corporate");
                    }}
                  >
                    <TabsList className="w-full">
                      <TabsTrigger value="personal" className="flex-1">
                        個人
                      </TabsTrigger>
                      <TabsTrigger value="corporate" className="flex-1">
                        法人
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountHolder">口座名義人</Label>
                  <Input
                    id="accountHolder"
                    value={accountHolder}
                    onChange={(e) => {
                      setAccountHolder(e.target.value);
                    }}
                    placeholder="口座名義人を入力"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pin">暗証番号（4桁）</Label>
                  <Input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => {
                      setPin(e.target.value.replace(/\D/g, ""));
                    }}
                    placeholder="暗証番号を入力"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPin">暗証番号（確認）</Label>
                  <Input
                    id="confirmPin"
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={confirmPin}
                    onChange={(e) => {
                      setConfirmPin(e.target.value.replace(/\D/g, ""));
                    }}
                    placeholder="暗証番号を再入力"
                    required
                  />
                </div>
                {error && <p className="text-destructive text-sm">{error}</p>}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || !accountHolder || pin.length !== 4 || confirmPin.length !== 4}
                >
                  {loading ? "開設中..." : "口座を開設する"}
                </Button>
              </form>
              <p className="text-muted-foreground mt-4 text-center text-sm">
                既に口座をお持ちの方は
                <Link to="/login" className="text-primary ml-1 underline">
                  ログイン
                </Link>
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
