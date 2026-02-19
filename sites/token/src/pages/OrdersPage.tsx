import { ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/i18n";
import { getFiatTransactions, getXrpTransactions } from "@/lib/api";
import { formatCurrency, formatDate, formatTokenAmount, isIncomeType, txTypeLabel } from "@/lib/format";
import type { FiatTransaction, TransactionType, XrpTransaction } from "@/lib/types";
import { useAuthContext } from "@/lib/useAuthContext";
import { explorerTxUrl } from "@/lib/xrpl";

function txBadgeClass(type: TransactionType): string {
  if (isIncomeType(type)) return "bg-green-100 text-green-700";
  return "bg-amber-100 text-amber-700";
}

function XrpTransactionsTab() {
  const { t } = useI18n();
  const { tokens } = useAuthContext();
  const [transactions, setTransactions] = useState<XrpTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const currencyMap = useMemo(() => new Map(tokens.map((tk) => [tk.tokenId, tk.currency])), [tokens]);

  useEffect(() => {
    getXrpTransactions()
      .then(setTransactions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="py-6 text-center text-muted-foreground">{t("common.loading")}</p>;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("orders.xrpTitle", transactions.length)}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {transactions.length === 0 ? (
          <p className="px-6 py-8 text-center text-muted-foreground text-sm">{t("orders.noTransactions")}</p>
        ) : (
          <>
            <div className="divide-y sm:hidden">
              {transactions.map((tx) => (
                <div key={tx.transactionId} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={`shrink-0 text-xs ${txBadgeClass(tx.type)}`}>
                        {txTypeLabel(tx.type, t)}
                      </Badge>
                      <span className="truncate text-sm">{tx.description}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">{formatDate(tx.createdAt)}</span>
                      {tx.txHash && (
                        <a
                          href={explorerTxUrl(tx.txHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span
                      className={`block font-medium font-mono text-sm ${
                        isIncomeType(tx.type) ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      {isIncomeType(tx.type) ? "+" : "-"}
                      {formatTokenAmount(tx.amount)} {currencyMap.get(tx.tokenId) ?? ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("orders.dateTime")}</TableHead>
                    <TableHead>{t("orders.type")}</TableHead>
                    <TableHead>{t("orders.description")}</TableHead>
                    <TableHead className="text-right">{t("orders.amount")}</TableHead>
                    <TableHead className="w-14">
                      <ExternalLink className="mx-auto h-3.5 w-3.5 text-muted-foreground" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.transactionId}>
                      <TableCell className="text-muted-foreground text-xs">{formatDate(tx.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-xs ${txBadgeClass(tx.type)}`}>
                          {txTypeLabel(tx.type, t)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{tx.description}</TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`font-medium font-mono text-sm ${
                            isIncomeType(tx.type) ? "text-green-700" : "text-red-700"
                          }`}
                        >
                          {isIncomeType(tx.type) ? "+" : "-"}
                          {formatTokenAmount(tx.amount)} {currencyMap.get(tx.tokenId) ?? ""}
                        </span>
                      </TableCell>
                      <TableCell>
                        {tx.txHash && (
                          <a
                            href={explorerTxUrl(tx.txHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function FiatTransactionsTab() {
  const { t } = useI18n();
  const [transactions, setTransactions] = useState<FiatTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFiatTransactions()
      .then(setTransactions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="py-6 text-center text-muted-foreground">{t("common.loading")}</p>;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t("orders.fiatTitle", transactions.length)}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {transactions.length === 0 ? (
          <p className="px-6 py-8 text-center text-muted-foreground text-sm">{t("orders.noTransactions")}</p>
        ) : (
          <>
            <div className="divide-y sm:hidden">
              {transactions.map((tx) => (
                <div key={tx.transactionId} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={`shrink-0 text-xs ${txBadgeClass(tx.type)}`}>
                        {txTypeLabel(tx.type, t)}
                      </Badge>
                      <span className="truncate text-sm">{tx.description}</span>
                    </div>
                    <p className="mt-0.5 text-muted-foreground text-xs">{formatDate(tx.createdAt)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span
                      className={`block font-medium font-mono text-sm ${
                        isIncomeType(tx.type) ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      {isIncomeType(tx.type) ? "+" : "-"}
                      {formatCurrency(tx.amount)}
                    </span>
                    <span className="block font-mono text-muted-foreground text-xs">{formatCurrency(tx.balance)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("orders.dateTime")}</TableHead>
                    <TableHead>{t("orders.type")}</TableHead>
                    <TableHead>{t("orders.description")}</TableHead>
                    <TableHead className="text-right">{t("orders.amount")}</TableHead>
                    <TableHead className="text-right">{t("orders.balance")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.transactionId}>
                      <TableCell className="text-muted-foreground text-xs">{formatDate(tx.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`text-xs ${txBadgeClass(tx.type)}`}>
                          {txTypeLabel(tx.type, t)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{tx.description}</TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`font-medium font-mono text-sm ${
                            isIncomeType(tx.type) ? "text-green-700" : "text-red-700"
                          }`}
                        >
                          {isIncomeType(tx.type) ? "+" : "-"}
                          {formatCurrency(tx.amount)}
                        </span>
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
  );
}

export function OrdersPage() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Tabs defaultValue="fiat">
        <TabsList className="mb-4 w-full">
          <TabsTrigger value="fiat" className="flex-1">
            {t("orders.fiatTab")}
          </TabsTrigger>
          <TabsTrigger value="xrp" className="flex-1">
            {t("orders.xrpTab")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="fiat">
          <FiatTransactionsTab />
        </TabsContent>
        <TabsContent value="xrp">
          <XrpTransactionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
