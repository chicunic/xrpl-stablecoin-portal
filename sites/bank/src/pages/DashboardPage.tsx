import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getTransactions } from '@/lib/api';
import { BANK_NAME } from '@/lib/constants';
import { formatCurrency, formatDate, isIncome, txTypeLabel } from '@/lib/format';
import type { BankTransaction } from '@/lib/types';
import { useAuthContext } from '@/lib/useAuthContext';

export function DashboardPage() {
  const navigate = useNavigate();
  const { account } = useAuthContext();
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);

  useEffect(() => {
    getTransactions()
      .then(setTransactions)
      .catch(() => {});
  }, []);

  const recentTxs = transactions.slice(0, 5);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      {/* Account info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">口座情報</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground">銀行名</p>
              <p>{BANK_NAME}</p>
            </div>
            <div>
              <p className="text-muted-foreground">支店番号</p>
              <p>{account.branchCode}</p>
            </div>
            <div>
              <p className="text-muted-foreground">口座番号</p>
              <p className="font-mono">{account.accountNumber}</p>
            </div>
            <div>
              <p className="text-muted-foreground">口座種別</p>
              <p>{account.accountType === 'personal' ? '普通' : '法人'}</p>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="text-center">
            <p className="text-muted-foreground text-sm">残高</p>
            <p className="text-3xl font-semibold tabular-nums">{formatCurrency(account.balance)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Recent transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">最近のお取引</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/transactions')}>
            すべて表示
          </Button>
        </CardHeader>
        <CardContent>
          {recentTxs.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">お取引はありません</p>
          ) : (
            <div className="divide-y">
              {recentTxs.map((tx) => (
                <div key={tx.transactionId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      isIncome(tx.type) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {isIncome(tx.type) ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        {txTypeLabel(tx.type)}
                      </Badge>
                      <span className="truncate text-sm">{tx.description}</span>
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">{formatDate(tx.createdAt)}</p>
                  </div>
                  <span
                    className={`shrink-0 font-mono text-sm font-medium ${
                      isIncome(tx.type) ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {isIncome(tx.type) ? '+' : '-'}
                    {formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
