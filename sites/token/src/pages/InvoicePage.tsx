import { Ban, CheckCircle2, Clock, ExternalLink, FileText, Printer, Send, Upload, Wallet, XCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { type SubmitEvent, useEffect, useState } from "react";
import { OperationMfaDialog } from "@/components/OperationMfaDialog";
import { PrerequisiteAlerts, usePrerequisites } from "@/components/PrerequisiteGuard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/i18n";
import {
  cancelInvoice,
  createInvoice,
  getXrpWhitelist,
  listInvoices,
  OperationMfaRequiredError,
  parseInvoicePdf,
  payInvoice,
} from "@/lib/api";
import { formatDate, formatTokenAmount } from "@/lib/format";
import type { Invoice, WhitelistAddress } from "@/lib/types";
import { useAuthContext } from "@/lib/useAuthContext";
import { explorerTxUrl } from "@/lib/xrpl";

/* ── Shared Components ─────────────────────────────────────────────── */

function StatusBadge({ status }: { status: Invoice["status"] }) {
  const { t } = useI18n();
  switch (status) {
    case "draft":
      return (
        <Badge variant="outline" className="gap-1">
          <FileText className="h-3 w-3" />
          {t("invoice.statusDraft")}
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" />
          {t("invoice.statusPending")}
        </Badge>
      );
    case "paid":
      return (
        <Badge className="gap-1 bg-green-600">
          <CheckCircle2 className="h-3 w-3" />
          {t("invoice.statusPaid")}
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          {t("invoice.statusFailed")}
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          <Ban className="h-3 w-3" />
          {t("invoice.statusCancelled")}
        </Badge>
      );
  }
}

function InvoicePrintButton({ invoice, userName }: { invoice: Invoice; userName: string }) {
  const qrData = JSON.stringify({
    v: 1,
    tokenId: invoice.tokenId,
    amount: invoice.amount,
    recipientAddress: invoice.recipientAddress,
    recipientName: invoice.recipientName,
    description: invoice.description,
    ...(invoice.dueDate ? { dueDate: invoice.dueDate } : {}),
  });

  const base64Data = btoa(new TextEncoder().encode(qrData).reduce((s, b) => s + String.fromCharCode(b), ""));

  function handlePrint() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const qrSvg = document.getElementById(`qr-${invoice.invoiceId}`);
    let qrHtml = "";
    if (qrSvg) {
      qrHtml = `<div style="margin-top:20px">${qrSvg.outerHTML}</div>`;
    }

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Invoice ${invoice.invoiceId.slice(0, 8)}</title>
<style>
  @page { size: A4; margin: 20mm; }
  body { font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; color: #1a1a1a; line-height: 1.6; }
  .header { text-align: center; margin-bottom: 32px; }
  .header h1 { font-size: 28px; margin: 0; letter-spacing: 6px; }
  .header p { font-size: 14px; color: #666; margin: 4px 0 0; letter-spacing: 3px; }
  .meta { margin-bottom: 24px; font-size: 13px; }
  .meta-item { margin-bottom: 4px; }
  .meta-label { color: #666; }
  .parties { display: flex; justify-content: space-between; margin-bottom: 32px; }
  .party { width: 45%; }
  .party-label { font-size: 12px; color: #666; margin-bottom: 4px; }
  .party-name { font-size: 16px; font-weight: 600; }
  .amount-box { border-top: 2px solid #1a1a1a; border-bottom: 2px solid #1a1a1a; padding: 16px 0; text-align: center; margin-bottom: 24px; }
  .amount-label { font-size: 12px; color: #666; margin-bottom: 4px; }
  .amount-value { font-size: 32px; font-weight: 700; font-variant-numeric: tabular-nums; }
  .section { margin-bottom: 20px; }
  .section-label { font-size: 12px; color: #666; margin-bottom: 4px; }
  .section-value { font-size: 14px; }
  .address-value { font-family: 'Courier New', monospace; font-size: 12px; word-break: break-all; }
  .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 40px; }
  .hidden-data { font-size: 1px; color: white; user-select: none; line-height: 1; overflow: hidden; height: 1px; }
</style>
</head>
<body>
  <div class="header">
    <h1>請求書</h1>
    <p>INVOICE</p>
  </div>
  <div class="meta">
    <div class="meta-item"><span class="meta-label">請求書番号 / Invoice No: </span>${invoice.invoiceId.slice(0, 8)}</div>
    <div class="meta-item"><span class="meta-label">発行日 / Issue Date: </span>${formatDate(invoice.createdAt)}</div>
    ${invoice.dueDate ? `<div class="meta-item"><span class="meta-label">支払期限 / Due Date: </span>${formatDate(invoice.dueDate)}</div>` : ""}
  </div>
  <div class="parties">
    <div class="party">
      <div class="party-label">宛先 / To</div>
      <div class="party-name">${invoice.recipientName} 様</div>
    </div>
    <div class="party" style="text-align:right">
      <div class="party-label">差出人 / From</div>
      <div class="party-name">${userName}</div>
    </div>
  </div>
  <div class="amount-box">
    <div class="amount-label">ご請求金額 / Amount Due</div>
    <div class="amount-value">${formatTokenAmount(invoice.amount)} ${invoice.tokenId}</div>
  </div>
  <div class="section">
    <div class="section-label">摘要 / Description</div>
    <div class="section-value">${invoice.description}</div>
  </div>
  <div class="section">
    <div class="section-label">お支払先 / Payment Address (XRPL)</div>
    <div class="address-value">${invoice.recipientAddress}</div>
  </div>
  <div class="footer">
    ${qrHtml}
    <div class="hidden-data">NEXBRIDGE_INVOICE_DATA:${base64Data}</div>
  </div>
</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  }

  return (
    <>
      <Button size="sm" variant="outline" className="gap-1" onClick={handlePrint}>
        <Printer className="h-3 w-3" />
      </Button>
      <div className="hidden">
        <QRCodeSVG id={`qr-${invoice.invoiceId}`} value={qrData} size={120} />
      </div>
    </>
  );
}

function InvoiceCard({
  invoice,
  userName,
  actions,
}: {
  invoice: Invoice;
  userName: string;
  actions?: React.ReactNode;
}) {
  const { t } = useI18n();

  return (
    <div className="rounded-2xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <StatusBadge status={invoice.status} />
            <span className="font-medium text-sm">{invoice.recipientName}</span>
          </div>
          <p className="text-muted-foreground text-xs">{invoice.description}</p>
          <p className="font-mono text-muted-foreground text-xs">{invoice.recipientAddress}</p>
          <div className="flex items-center gap-3 text-muted-foreground text-xs">
            <span>{formatDate(invoice.createdAt)}</span>
            {invoice.dueDate && (
              <span>
                {t("invoice.dueDate")}: {formatDate(invoice.dueDate)}
              </span>
            )}
          </div>
          {invoice.xrplTxHash && (
            <a
              href={explorerTxUrl(invoice.xrplTxHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-primary text-xs hover:underline"
            >
              Tx: {invoice.xrplTxHash.slice(0, 12)}...
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          )}
          {invoice.failureReason && <p className="text-destructive text-xs">{invoice.failureReason}</p>}
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono font-semibold text-lg tabular-nums">
            {formatTokenAmount(invoice.amount)} {invoice.tokenId}
          </p>
          <div className="mt-2 flex justify-end gap-2">
            <InvoicePrintButton invoice={invoice} userName={userName} />
            {actions}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Issued Tab (発送請求) ─────────────────────────────────────────── */

function IssuedForm({
  prereq,
  onCreated,
}: {
  prereq: { needsKyc: boolean; needsMfa: boolean; disabled: boolean };
  onCreated: () => void;
}) {
  const { tokens } = useAuthContext();
  const { t } = useI18n();
  const [tokenId, setTokenId] = useState("");
  const [amount, setAmount] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [xrpList, setXrpList] = useState<WhitelistAddress[]>([]);
  const [listLoading, setListLoading] = useState(true);

  useEffect(() => {
    getXrpWhitelist()
      .then((list) => {
        setXrpList(list);
        if (list.length > 0) setRecipientAddress(list[0].address);
      })
      .catch(() => {})
      .finally(() => setListLoading(false));
  }, []);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await createInvoice({
        type: "issued",
        tokenId,
        amount: Number(amount),
        recipientAddress,
        recipientName,
        description,
        ...(dueDate ? { dueDate: new Date(dueDate).toISOString() } : {}),
      });
      setAmount("");
      setRecipientName("");
      setDescription("");
      setDueDate("");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("invoice.createError"));
    } finally {
      setLoading(false);
    }
  }

  if (listLoading) return <p className="py-6 text-center text-muted-foreground">{t("common.loading")}</p>;

  return (
    <Card>
      <CardContent className="pt-6">
        <PrerequisiteAlerts needsKyc={prereq.needsKyc} needsMfa={prereq.needsMfa} />
        <form onSubmit={handleSubmit}>
          <div
            className={`space-y-4${prereq.disabled ? "cursor-not-allowed opacity-50 [&_*]:pointer-events-none" : ""}`}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-muted-foreground text-xs">{t("invoice.tokenLabel")}</p>
                <Select value={tokenId || undefined} onValueChange={setTokenId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("invoice.tokenSelect")} />
                  </SelectTrigger>
                  <SelectContent>
                    {tokens.map((tk) => (
                      <SelectItem key={tk.tokenId} value={tk.tokenId}>
                        {tk.currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="mb-1 text-muted-foreground text-xs">{t("invoice.amount")}</p>
                <Input
                  type="number"
                  min={1}
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={t("invoice.amountPlaceholder")}
                  required
                />
              </div>
            </div>
            <div>
              <p className="mb-1 text-muted-foreground text-xs">{t("invoice.recipientAddress")}</p>
              <Select value={recipientAddress || undefined} onValueChange={setRecipientAddress}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("invoice.recipientAddressPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {xrpList.map((item) => (
                    <SelectItem key={item.address} value={item.address}>
                      {item.label} - {item.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-muted-foreground text-xs">{t("invoice.recipientName")}</p>
                <Input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder={t("invoice.recipientNamePlaceholder")}
                  required
                />
              </div>
              <div>
                <p className="mb-1 text-muted-foreground text-xs">{t("invoice.dueDate")}</p>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
            <div>
              <p className="mb-1 text-muted-foreground text-xs">{t("invoice.description")}</p>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("invoice.descriptionPlaceholder")}
                required
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button
              type="submit"
              className="w-full"
              disabled={
                prereq.disabled || loading || !tokenId || !amount || !recipientAddress || !recipientName || !description
              }
            >
              {loading ? t("common.processing") : t("invoice.issuedCreateButton")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ── Received Tab (支払請求) ───────────────────────────────────────── */

function ReceivedForm({
  prereq,
  onCreated,
}: {
  prereq: { needsKyc: boolean; needsMfa: boolean; disabled: boolean };
  onCreated: () => void;
}) {
  const { tokens } = useAuthContext();
  const { t } = useI18n();
  const [tokenId, setTokenId] = useState("");
  const [amount, setAmount] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseMessage, setParseMessage] = useState("");
  const [parseError, setParseError] = useState(false);

  async function handleScan(file: File) {
    setParsing(true);
    setParseMessage("");
    setParseError(false);
    try {
      const data = await parseInvoicePdf(file);
      setTokenId(data.tokenId);
      setAmount(String(data.amount));
      setRecipientAddress(data.recipientAddress);
      setRecipientName(data.recipientName);
      setDescription(data.description);
      if (data.dueDate) setDueDate(data.dueDate.slice(0, 10));
      setParseMessage(t("invoice.uploadPdfSuccess"));
      setParseError(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("invoice.uploadPdfError");
      setParseMessage(msg.includes("Not a NexBridge") ? t("invoice.uploadPdfInvalid") : t("invoice.uploadPdfError"));
      setParseError(true);
    } finally {
      setParsing(false);
    }
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await createInvoice({
        type: "received",
        tokenId,
        amount: Number(amount),
        recipientAddress,
        recipientName,
        description,
        ...(dueDate ? { dueDate: new Date(dueDate).toISOString() } : {}),
      });
      setAmount("");
      setRecipientAddress("");
      setRecipientName("");
      setDescription("");
      setDueDate("");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("invoice.createError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <PrerequisiteAlerts needsKyc={prereq.needsKyc} needsMfa={prereq.needsMfa} />

        {/* PDF Upload Section */}
        <div className="mb-4 rounded-lg border border-dashed p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-medium text-sm">
                <Upload className="h-4 w-4" />
                {t("invoice.uploadPdfTitle")}
              </div>
              <p className="mt-1 text-muted-foreground text-xs">{t("invoice.uploadPdfDescription")}</p>
            </div>
            <label className="shrink-0">
              <input
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleScan(file);
                  e.target.value = "";
                }}
                disabled={parsing}
              />
              <Button type="button" size="sm" variant="outline" className="pointer-events-none gap-1" tabIndex={-1}>
                <Upload className="h-3 w-3" />
                {t("invoice.uploadPdfButton")}
              </Button>
            </label>
          </div>
          {parsing && <p className="mt-2 text-muted-foreground text-xs">{t("invoice.uploadPdfParsing")}</p>}
          {parseMessage && (
            <p className={`mt-2 text-xs ${parseError ? "text-destructive" : "text-green-600"}`}>{parseMessage}</p>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div
            className={`space-y-4${prereq.disabled ? "cursor-not-allowed opacity-50 [&_*]:pointer-events-none" : ""}`}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-muted-foreground text-xs">{t("invoice.tokenLabel")}</p>
                <Select value={tokenId || undefined} onValueChange={setTokenId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("invoice.tokenSelect")} />
                  </SelectTrigger>
                  <SelectContent>
                    {tokens.map((tk) => (
                      <SelectItem key={tk.tokenId} value={tk.tokenId}>
                        {tk.currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="mb-1 text-muted-foreground text-xs">{t("invoice.amount")}</p>
                <Input
                  type="number"
                  min={1}
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={t("invoice.amountPlaceholder")}
                  required
                />
              </div>
            </div>
            <div>
              <p className="mb-1 text-muted-foreground text-xs">{t("invoice.recipientAddress")}</p>
              <Input
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder={t("invoice.recipientAddressPlaceholder")}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-muted-foreground text-xs">{t("invoice.recipientName")}</p>
                <Input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder={t("invoice.recipientNamePlaceholder")}
                  required
                />
              </div>
              <div>
                <p className="mb-1 text-muted-foreground text-xs">{t("invoice.dueDate")}</p>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
            <div>
              <p className="mb-1 text-muted-foreground text-xs">{t("invoice.description")}</p>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("invoice.descriptionPlaceholder")}
                required
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button
              type="submit"
              className="w-full"
              disabled={
                prereq.disabled || loading || !tokenId || !amount || !recipientAddress || !recipientName || !description
              }
            >
              {loading ? t("common.processing") : t("invoice.receivedCreateButton")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ── Invoice History List (shared) ─────────────────────────────────── */

function InvoiceHistory({
  invoices,
  userName,
  showPayActions,
  onAction,
}: {
  invoices: Invoice[];
  userName: string;
  showPayActions: boolean;
  onAction: () => void;
}) {
  const { t } = useI18n();
  const [loadingId, setLoadingId] = useState("");
  const [operationMfaOpen, setOperationMfaOpen] = useState(false);
  const [pendingPayId, setPendingPayId] = useState("");
  const [error, setError] = useState("");

  async function handlePay(invoiceId: string) {
    setError("");
    setLoadingId(invoiceId);
    try {
      await payInvoice(invoiceId);
      onAction();
    } catch (err) {
      if (err instanceof OperationMfaRequiredError) {
        setPendingPayId(invoiceId);
        setOperationMfaOpen(true);
      } else {
        setError(err instanceof Error ? err.message : t("invoice.payError"));
      }
    } finally {
      setLoadingId("");
    }
  }

  async function handleCancel(invoiceId: string) {
    setError("");
    setLoadingId(invoiceId);
    try {
      await cancelInvoice(invoiceId);
      onAction();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("invoice.cancelError"));
    } finally {
      setLoadingId("");
    }
  }

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          {error && <p className="mb-4 text-destructive text-sm">{error}</p>}
          {invoices.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground text-sm">{t("invoice.emptyList")}</p>
          ) : (
            <div className="space-y-3">
              {invoices.map((inv) => (
                <InvoiceCard
                  key={inv.invoiceId}
                  invoice={inv}
                  userName={userName}
                  actions={
                    showPayActions && inv.status === "draft" ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handlePay(inv.invoiceId)}
                          disabled={loadingId === inv.invoiceId}
                        >
                          {loadingId === inv.invoiceId ? t("common.processing") : t("invoice.payButton")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancel(inv.invoiceId)}
                          disabled={loadingId === inv.invoiceId}
                        >
                          {t("common.cancel")}
                        </Button>
                      </>
                    ) : undefined
                  }
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <OperationMfaDialog
        open={operationMfaOpen}
        onClose={() => setOperationMfaOpen(false)}
        onVerified={() => {
          setOperationMfaOpen(false);
          if (pendingPayId) {
            handlePay(pendingPayId);
            setPendingPayId("");
          }
        }}
      />
    </>
  );
}

/* ── Page ──────────────────────────────────────────────────────────── */

export function InvoicePage() {
  const { t } = useI18n();
  const { user } = useAuthContext();
  const prereq = usePrerequisites({ requireKyc: true, requireMfa: true });
  const [issuedInvoices, setIssuedInvoices] = useState<Invoice[]>([]);
  const [receivedInvoices, setReceivedInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  function loadAll() {
    Promise.all([listInvoices("issued"), listInvoices("received")])
      .then(([issued, received]) => {
        setIssuedInvoices(issued);
        setReceivedInvoices(received);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAll();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <p className="py-6 text-center text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  const userName = user?.name ?? "";

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Tabs defaultValue="issued">
        <TabsList className="mb-4 w-full">
          <TabsTrigger value="issued" className="flex-1 gap-1">
            <Send className="h-4 w-4" />
            {t("invoice.issuedTab")} ({issuedInvoices.length})
          </TabsTrigger>
          <TabsTrigger value="received" className="flex-1 gap-1">
            <Wallet className="h-4 w-4" />
            {t("invoice.receivedTab")} ({receivedInvoices.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="issued" className="space-y-4">
          <IssuedForm prereq={prereq} onCreated={loadAll} />
          <InvoiceHistory invoices={issuedInvoices} userName={userName} showPayActions={false} onAction={loadAll} />
        </TabsContent>
        <TabsContent value="received" className="space-y-4">
          <ReceivedForm prereq={prereq} onCreated={loadAll} />
          <InvoiceHistory invoices={receivedInvoices} userName={userName} showPayActions={true} onAction={loadAll} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
