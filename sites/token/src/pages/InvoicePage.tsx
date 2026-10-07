import { noop } from "@xrpl-stablecoin-portal/shared";
import { AlertTriangle, ExternalLink, Printer, Send, Upload, Wallet } from "lucide-react";
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
import { OperationMfaRequiredError, listInvoices, parseInvoicePdf, payInvoice, sendInvoice } from "@/lib/api";
import { formatDate, formatMptAmount, rawToInput, toRawAmount } from "@/lib/format";
import type { Invoice, Token } from "@/lib/types";
import { useAuthContext } from "@/lib/useAuthContext";
import { explorerTxUrl } from "@/lib/xrpl";

/* ── Shared Types ──────────────────────────────────────────────────── */

interface PrereqState {
  needsKyc: boolean;
  needsMfa: boolean;
  disabled: boolean;
}

/* ── Shared Components ─────────────────────────────────────────────── */

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground mb-1 text-xs">{children}</p>;
}

function TokenSelect({
  tokens,
  value,
  onChange,
}: {
  tokens: Token[];
  value: string;
  onChange: (tokenId: string) => void;
}) {
  const { t } = useI18n();
  return (
    <Select
      value={value || "__empty__"}
      onValueChange={(v) => {
        onChange(v === "__empty__" ? "" : v);
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__empty__" disabled className="text-muted-foreground">
          {t("invoice.tokenSelect")}
        </SelectItem>
        {tokens.map((tk) => (
          <SelectItem key={tk.tokenId} value={tk.tokenId}>
            {tk.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function DisabledFieldGroup({ disabled, children }: { disabled: boolean; children: React.ReactNode }) {
  const disabledClass = disabled ? " cursor-not-allowed opacity-50 [&_*]:pointer-events-none" : "";
  return <div className={`space-y-4${disabledClass}`}>{children}</div>;
}

function InvoicePrintButton({ invoice, userName }: { invoice: Invoice; userName: string }) {
  const { tokens } = useAuthContext();
  const token = tokens.find((t) => t.tokenId === invoice.tokenId);
  const currency = token?.name ?? invoice.tokenId;
  const issuerAddress = token?.issuerAddress ?? "";

  const isReceipt = invoice.type === "pay";

  const qrData = JSON.stringify({
    v: 1,
    invoiceId: invoice.invoiceId,
    tokenId: invoice.tokenId,
    amount: invoice.amount,
    recipientAddress: invoice.recipientAddress,
    recipientName: invoice.recipientName,
    description: invoice.description,
    ...(invoice.dueDate ? { dueDate: invoice.dueDate } : {}),
  });

  function handlePrint() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const qrSvg = document.getElementById(`qr-${invoice.invoiceId}`);
    const qrHtml = qrSvg ? `<div style="margin-top:20px">${qrSvg.outerHTML}</div>` : "";

    const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/></svg>`;

    printWindow.document.documentElement.innerHTML = `
<head>
<meta charset="utf-8">
<title>${isReceipt ? "Receipt" : "Invoice"} ${invoice.invoiceId}</title>
<style>
  @page { size: A4; margin: 15mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; color: #1a1a1a; line-height: 1.5; max-width: 800px; margin: 0 auto; padding: 32px 24px; font-size: 12px; }
  @media print { body { max-width: none; margin: 0; padding: 0; } }

  .top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
  .logo { flex-shrink: 0; }
  .title-area { text-align: right; }
  .title-area h1 { font-size: 24px; font-weight: 700; letter-spacing: 6px; }
  .title-area .subtitle { font-size: 10px; color: #999; letter-spacing: 3px; }

  .divider { border: none; border-top: 2px solid #1a1a1a; margin: 0 0 16px 0; }

  .meta-row { margin-bottom: 16px; }
  .meta-left { font-size: 11px; }
  .meta-item { margin-bottom: 3px; }
  .meta-label { color: #888; font-size: 10px; display: block; }
  .meta-value { font-weight: 500; }

  .parties { display: flex; justify-content: space-between; margin-bottom: 16px; padding: 16px; background: #fafafa; border-radius: 6px; }
  .party { width: 45%; }
  .party-label { font-size: 10px; color: #888; letter-spacing: 1px; margin-bottom: 2px; }
  .party-name { font-size: 14px; font-weight: 600; }
  .party-right { text-align: right; }

  .amount-box { border-top: 2px solid #1a1a1a; border-bottom: 2px solid #1a1a1a; padding: 14px 0; text-align: center; margin-bottom: 16px; }
  .amount-label { font-size: 10px; color: #888; letter-spacing: 1px; margin-bottom: 4px; }
  .amount-value { font-size: 28px; font-weight: 700; font-variant-numeric: tabular-nums; color: #1a1a1a; }

  .details { margin-bottom: 16px; }
  .detail-row { display: flex; border-bottom: 1px solid #eee; padding: 8px 0; }
  .detail-label { width: 140px; font-size: 10px; color: #888; flex-shrink: 0; padding-top: 1px; }
  .detail-value { font-size: 12px; flex: 1; }
  .detail-mono { font-family: 'SF Mono', 'Courier New', monospace; font-size: 11px; word-break: break-all; }

  .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 20px; padding-top: 12px; border-top: 1px solid #eee; }
  .footer-note { font-size: 10px; color: #aaa; max-width: 300px; line-height: 1.4; }
  .qr-area { text-align: right; }
  .qr-label { font-size: 9px; color: #aaa; margin-bottom: 4px; text-align: center; }

</style>
</head>
<body>
  <div class="top-bar">
    <div class="logo">${logoSvg}</div>
    <div class="title-area">
      <h1>${isReceipt ? "支払証明書" : "請求書"}</h1>
      <div class="subtitle">${isReceipt ? "Payment Receipt" : "Invoice"}</div>
    </div>
  </div>

  <hr class="divider">

  <div class="meta-row">
    <div class="meta-left">
      <div class="meta-item">
        <span class="meta-label">${isReceipt ? "支払番号 / Receipt No." : "請求書番号 / Invoice No."}</span>
        <span class="meta-value">${invoice.invoiceId}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">発行日 / Issue Date</span>
        <span class="meta-value">${formatDate(invoice.createdAt)}</span>
      </div>
      ${invoice.dueDate ? `<div class="meta-item"><span class="meta-label">支払期限 / Due Date</span><span class="meta-value">${formatDate(invoice.dueDate)}</span></div>` : ""}
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <div class="party-label">宛先 / To</div>
      <div class="party-name">${invoice.recipientName} 様</div>
    </div>
    <div class="party party-right">
      <div class="party-label">差出人 / From</div>
      <div class="party-name">${userName}</div>
    </div>
  </div>

  <div class="amount-box">
    <div class="amount-label">${isReceipt ? "お支払金額 / Amount Paid" : "ご請求金額 / Amount Due"}</div>
    <div class="amount-value">${formatMptAmount(invoice.amount, token?.assetScale ?? 0)} ${currency}</div>
  </div>

  <div class="details">
    <div class="detail-row">
      <div class="detail-label">摘要 / Description</div>
      <div class="detail-value">${invoice.description}</div>
    </div>
    <div class="detail-row">
      <div class="detail-label">お支払先 / Payment Address</div>
      <div class="detail-value detail-mono">${invoice.recipientAddress}</div>
    </div>
    <div class="detail-row">
      <div class="detail-label">トークン / Token</div>
      <div class="detail-value">${currency}</div>
    </div>
    <div class="detail-row">
      <div class="detail-label">発行者アドレス / Issuer</div>
      <div class="detail-value detail-mono">${issuerAddress}</div>
    </div>
    <div class="detail-row">
      <div class="detail-label">ネットワーク / Network</div>
      <div class="detail-value">XRP Ledger</div>
    </div>
  </div>

  <div class="footer">
    <div class="footer-note">
      ${isReceipt ? `Tx: ${invoice.xrplTxHash ?? ""}` : "QRコードをスキャンして支払いを行えます。"}
    </div>
    <div class="qr-area">
      <div class="qr-label">Scan to Pay</div>
      ${qrHtml}
    </div>
  </div>
</body>`;
    printWindow.focus();
    printWindow.onload = () => {
      printWindow.print();
    };
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
  const { tokens } = useAuthContext();
  const assetScale = tokens.find((tk) => tk.tokenId === invoice.tokenId)?.assetScale ?? 0;

  return (
    <div className="rounded-2xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            {invoice.dueDate && new Date(invoice.dueDate) < new Date() && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {t("invoice.statusExpired")}
              </Badge>
            )}
            <span className="text-sm font-medium">{invoice.recipientName}</span>
          </div>
          <p className="text-muted-foreground text-xs">{invoice.description}</p>
          <p className="text-muted-foreground font-mono text-xs">{invoice.recipientAddress}</p>
          <div className="text-muted-foreground flex items-center gap-3 text-xs">
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
              className="text-primary inline-flex items-center gap-1 font-mono text-xs hover:underline"
            >
              Tx: {invoice.xrplTxHash.slice(0, 12)}...
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          )}
          {invoice.failureReason && <p className="text-destructive text-xs">{invoice.failureReason}</p>}
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-lg font-semibold tabular-nums">
            {formatMptAmount(invoice.amount, assetScale)} {invoice.tokenId}
          </p>
          <div className="mt-2 flex justify-end gap-2">
            {(invoice.type === "send" || invoice.status === "paid") && (
              <InvoicePrintButton invoice={invoice} userName={userName} />
            )}
            {actions}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Issued Tab ────────────────────────────────────────────────────── */

function IssuedForm({ prereq, onCreated }: { prereq: PrereqState; onCreated: () => void }) {
  const { tokens, user } = useAuthContext();
  const { t } = useI18n();
  const [tokenId, setTokenId] = useState("");
  const [amount, setAmount] = useState("");
  const [recipientName, setRecipientName] = useState(user.name);
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const walletAddress = user.walletAddress ?? "";

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await sendInvoice({
        tokenId,
        amount: toRawAmount(amount, tokens.find((tk) => tk.tokenId === tokenId)?.assetScale ?? 0),
        recipientAddress: walletAddress,
        recipientName,
        description,
        ...(dueDate ? { dueDate: new Date(dueDate).toISOString() } : {}),
      });
      setAmount("");
      setRecipientName(user.name);
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
        <form onSubmit={handleSubmit}>
          <DisabledFieldGroup disabled={prereq.disabled}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>{t("invoice.tokenLabel")}</FieldLabel>
                <TokenSelect tokens={tokens} value={tokenId} onChange={setTokenId} />
              </div>
              <div>
                <FieldLabel>{t("invoice.amount")}</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  step="any"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                  }}
                  placeholder={t("invoice.amountPlaceholder")}
                  required
                />
              </div>
            </div>
            <div>
              <FieldLabel>{t("invoice.recipientAddress")}</FieldLabel>
              <Input value={walletAddress} disabled className="font-mono text-xs" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>{t("invoice.recipientName")}</FieldLabel>
                <Input
                  value={recipientName}
                  onChange={(e) => {
                    setRecipientName(e.target.value);
                  }}
                  placeholder={t("invoice.recipientNamePlaceholder")}
                  required
                />
              </div>
              <div>
                <FieldLabel>{t("invoice.dueDate")}</FieldLabel>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                  }}
                />
              </div>
            </div>
            <div>
              <FieldLabel>{t("invoice.description")}</FieldLabel>
              <Input
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                }}
                placeholder={t("invoice.descriptionPlaceholder")}
                required
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button
              type="submit"
              className="w-full"
              disabled={
                prereq.disabled || loading || !tokenId || !amount || !walletAddress || !recipientName || !description
              }
            >
              {loading ? t("common.processing") : t("invoice.sendCreateButton")}
            </Button>
          </DisabledFieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

/* ── Received Tab ──────────────────────────────────────────────────── */

function ReceivedForm({ prereq, onCreated }: { prereq: PrereqState; onCreated: () => void }) {
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
  const [operationMfaOpen, setOperationMfaOpen] = useState(false);
  const [scannedInvoiceId, setScannedInvoiceId] = useState("");

  async function handleScan(file: File) {
    setParsing(true);
    setParseMessage("");
    setParseError(false);
    try {
      const data = await parseInvoicePdf(file);
      setTokenId(data.tokenId);
      setAmount(rawToInput(data.amount, tokens.find((tk) => tk.tokenId === data.tokenId)?.assetScale ?? 0));
      setRecipientAddress(data.recipientAddress);
      setRecipientName(data.recipientName);
      setDescription(data.description);
      if (data.dueDate) setDueDate(data.dueDate.slice(0, 10));
      if (data.invoiceId) setScannedInvoiceId(data.invoiceId);
      setParseMessage(t("invoice.uploadPdfSuccess"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("invoice.uploadPdfError");
      setParseMessage(
        msg.includes("Not a valid invoice PDF") ? t("invoice.uploadPdfInvalid") : t("invoice.uploadPdfError"),
      );
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
      await payInvoice({
        tokenId,
        amount: toRawAmount(amount, tokens.find((tk) => tk.tokenId === tokenId)?.assetScale ?? 0),
        recipientAddress,
        recipientName,
        description,
        ...(dueDate ? { dueDate: new Date(dueDate).toISOString() } : {}),
        ...(scannedInvoiceId ? { invoiceId: scannedInvoiceId } : {}),
      });
      setAmount("");
      setRecipientAddress("");
      setRecipientName("");
      setDescription("");
      setDueDate("");
      setScannedInvoiceId("");
      onCreated();
    } catch (err) {
      if (err instanceof OperationMfaRequiredError) {
        setOperationMfaOpen(true);
      } else {
        setError(err instanceof Error ? err.message : t("invoice.createError"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <PrerequisiteAlerts needsKyc={prereq.needsKyc} needsMfa={prereq.needsMfa} />

          <div className="mb-4 rounded-lg border border-dashed p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Upload className="h-4 w-4" />
                  {t("invoice.uploadPdfTitle")}
                </div>
                <p className="text-muted-foreground mt-1 text-xs">{t("invoice.uploadPdfDescription")}</p>
              </div>
              <label className="shrink-0">
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleScan(file);
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
            {parsing && <p className="text-muted-foreground mt-2 text-xs">{t("invoice.uploadPdfParsing")}</p>}
            {parseMessage && (
              <p className={`mt-2 text-xs ${parseError ? "text-destructive" : "text-green-600"}`}>{parseMessage}</p>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <DisabledFieldGroup disabled={prereq.disabled}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>{t("invoice.tokenLabel")}</FieldLabel>
                  <TokenSelect tokens={tokens} value={tokenId} onChange={setTokenId} />
                </div>
                <div>
                  <FieldLabel>{t("invoice.amount")}</FieldLabel>
                  <Input
                    type="number"
                    min={1}
                    step="any"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                    }}
                    placeholder={t("invoice.amountPlaceholder")}
                    required
                  />
                </div>
              </div>
              <div>
                <FieldLabel>{t("invoice.recipientAddress")}</FieldLabel>
                <Input
                  value={recipientAddress}
                  onChange={(e) => {
                    setRecipientAddress(e.target.value);
                  }}
                  placeholder={t("invoice.recipientAddressPlaceholder")}
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>{t("invoice.recipientName")}</FieldLabel>
                  <Input
                    value={recipientName}
                    onChange={(e) => {
                      setRecipientName(e.target.value);
                    }}
                    placeholder={t("invoice.recipientNamePlaceholder")}
                    required
                  />
                </div>
                <div>
                  <FieldLabel>{t("invoice.dueDate")}</FieldLabel>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => {
                      setDueDate(e.target.value);
                    }}
                  />
                </div>
              </div>
              <div>
                <FieldLabel>{t("invoice.description")}</FieldLabel>
                <Input
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                  }}
                  placeholder={t("invoice.descriptionPlaceholder")}
                  required
                />
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
              <Button
                type="submit"
                className="w-full"
                disabled={
                  prereq.disabled ||
                  loading ||
                  !tokenId ||
                  !amount ||
                  !recipientAddress ||
                  !recipientName ||
                  !description
                }
              >
                {loading ? t("common.processing") : t("invoice.payCreateButton")}
              </Button>
            </DisabledFieldGroup>
          </form>
        </CardContent>
      </Card>
      <OperationMfaDialog
        open={operationMfaOpen}
        onClose={() => {
          setOperationMfaOpen(false);
        }}
        onVerified={() => {
          setOperationMfaOpen(false);
          const form = document.querySelector<HTMLFormElement>("form");
          if (form) form.requestSubmit();
        }}
      />
    </>
  );
}

/* ── Invoice History List ──────────────────────────────────────────── */

function InvoiceHistory({ invoices, userName }: { invoices: Invoice[]; userName: string }) {
  const { t } = useI18n();

  return (
    <Card>
      <CardContent className="pt-6">
        {invoices.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">{t("invoice.emptyList")}</p>
        ) : (
          <div className="space-y-3">
            {invoices.map((inv) => (
              <InvoiceCard key={inv.paymentId ?? inv.invoiceId} invoice={inv} userName={userName} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Page ──────────────────────────────────────────────────────────── */

export function InvoicePage() {
  const { t } = useI18n();
  const { user } = useAuthContext();
  const prereq = usePrerequisites({ requireKyc: true, requireMfa: true });
  const [sendInvoices, setSendInvoices] = useState<Invoice[]>([]);
  const [payInvoices, setPayInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  function loadAll() {
    Promise.all([listInvoices("send"), listInvoices("pay")])
      .then(([send, pay]) => {
        setSendInvoices(send);
        setPayInvoices(pay);
      })
      .catch(noop)
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    loadAll();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <p className="text-muted-foreground py-6 text-center">{t("common.loading")}</p>
      </div>
    );
  }

  const userName = user.name;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Tabs defaultValue="send">
        <TabsList className="mb-4 w-full">
          <TabsTrigger value="send" className="flex-1 gap-1">
            <Send className="h-4 w-4" />
            {t("invoice.sendTab")} ({sendInvoices.length})
          </TabsTrigger>
          <TabsTrigger value="pay" className="flex-1 gap-1">
            <Wallet className="h-4 w-4" />
            {t("invoice.payTab")} ({payInvoices.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="send" className="space-y-4">
          <IssuedForm prereq={prereq} onCreated={loadAll} />
          <InvoiceHistory invoices={sendInvoices} userName={userName} />
        </TabsContent>
        <TabsContent value="pay" className="space-y-4">
          <ReceivedForm prereq={prereq} onCreated={loadAll} />
          <InvoiceHistory invoices={payInvoices} userName={userName} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
