import { ArrowDownLeft, ArrowUpRight, Receipt } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getTransactions } from '@/lib/api';
import { formatCurrency, formatDate, isIncome, txTypeLabel } from '@/lib/format';
import type { BankTransaction } from '@/lib/types';

function TransactionIcon({ type }: { type: BankTransaction['type'] }) {
  const income = isIncome(type);
  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
        income ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}
    >
      {income ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
    </div>
  );
}

function TransactionAmount({ type, amount }: { type: BankTransaction['type']; amount: number }) {
  const income = isIncome(type);
  return (
    <span className={`font-mono text-sm font-medium ${income ? 'text-green-700' : 'text-red-700'}`}>
      {income ? '+' : '-'}
      {formatCurrency(amount)}
    </span>
  );
}

export function TransactionsPage() {
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTransactions()
      .then(setTransactions)
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            お取引明細{'\u3000'}全{transactions.length}件
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center gap-2 px-6 py-12">
              <Receipt className="h-10 w-10" />
              <p className="text-sm">お取引はありません</p>
            </div>
          ) : (
            <>
              {/* Mobile list */}
              <div className="divide-y sm:hidden">
                {transactions.map((tx) => (
                  <div key={tx.transactionId} className="flex items-center gap-3 px-4 py-3">
                    <TransactionIcon type={tx.type} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          {txTypeLabel(tx.type)}
                        </Badge>
                        <span className="truncate text-sm">{tx.description}</span>
                      </div>
                      <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
                        <span>{formatDate(tx.createdAt)}</span>
                        {tx.virtualAccountLabel && <span>[{tx.virtualAccountLabel}]</span>}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="block">
                        <TransactionAmount type={tx.type} amount={tx.amount} />
                      </span>
                      <span className="text-muted-foreground block font-mono text-xs">
                        {formatCurrency(tx.balance)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead className="w-24">日時</TableHead>
                      <TableHead className="w-20">種別</TableHead>
                      <TableHead>摘要</TableHead>
                      <TableHead className="text-right">金額</TableHead>
                      <TableHead className="text-right">残高</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.transactionId}>
                        <TableCell>
                          <TransactionIcon type={tx.type} />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                          {formatDate(tx.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {txTypeLabel(tx.type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {tx.description}
                          {tx.virtualAccountLabel && (
                            <span className="text-muted-foreground ml-1 text-xs">[{tx.virtualAccountLabel}]</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <TransactionAmount type={tx.type} amount={tx.amount} />
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatCurrency(tx.balance)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
