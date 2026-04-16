import { AlertTriangle, ExternalLink, Printer, Send, Upload, Wallet } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { type SubmitEvent, useEffect, useState } from 'react';
import { OperationMfaDialog } from '@/components/OperationMfaDialog';
import { PrerequisiteAlerts, usePrerequisites } from '@/components/PrerequisiteGuard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useI18n } from '@/i18n';
import { listInvoices, OperationMfaRequiredError, parseInvoicePdf, payInvoice, sendInvoice } from '@/lib/api';
import { formatDate, formatTokenAmount } from '@/lib/format';
import type { Invoice, Token } from '@/lib/types';
import { useAuthContext } from '@/lib/useAuthContext';
import { explorerTxUrl } from '@/lib/xrpl';

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
      value={value || '__empty__'}
      onValueChange={(v) => {
        onChange(v === '__empty__' ? '' : v);
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__empty__" disabled className="text-muted-foreground">
          {t('invoice.tokenSelect')}
        </SelectItem>
        {tokens.map((tk) => (
          <SelectItem key={tk.tokenId} value={tk.tokenId}>
            {tk.currency}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function DisabledFieldGroup({ disabled, children }: { disabled: boolean; children: React.ReactNode }) {
  const disabledClass = disabled ? ' cursor-not-allowed opacity-50 [&_*]:pointer-events-none' : '';
  return <div className={`space-y-4${disabledClass}`}>{children}</div>;
}

function InvoicePrintButton({ invoice, userName }: { invoice: Invoice; userName: string }) {
  const { tokens } = useAuthContext();
  const token = tokens.find((t) => t.tokenId === invoice.tokenId);
  const currency = token?.currency ?? invoice.tokenId;
  const issuerAddress = token?.issuerAddress ?? '';

  const isReceipt = invoice.type === 'pay';

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
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const qrSvg = document.getElementById(`qr-${invoice.invoiceId}`);
    const qrHtml = qrSvg ? `<div style="margin-top:20px">${qrSvg.outerHTML}</div>` : '';

    const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="141.32 220.26 511.07 118.84" width="180"><g transform="translate(-813.70136)" fill="#000000"><path d="m 0,0 -18.553,31.842 h -9.886 v -46.8 h 9.629 V 17.398 L 0,-14.958 h 9.63 v 46.8 H 0 Z" transform="matrix(1.3333333,0,0,-1.3333333,1112.0035,300.50387)"/><path d="M 0,0 H -10.785 L -16.37,-10.464 -22.02,0 h -10.785 l 11.299,-17.205 -11.556,-17.462 h 10.786 l 5.906,10.786 5.842,-10.786 H 0.257 l -11.556,17.462 z" transform="matrix(1.3333333,0,0,-1.3333333,1213.9475,274.22587)"/><path d="M 0,0 H -11.491 V 12.133 H 0 c 4.687,0 7.126,-2.054 7.126,-6.098 C 7.126,2.054 4.687,0 0,0 m -11.491,30.75 h 10.465 c 4.493,0 6.804,-1.797 6.804,-5.264 0,-3.53 -2.311,-5.328 -6.804,-5.328 H -11.491 Z M 8.603,16.82 c 4.622,2.953 6.419,5.649 6.419,9.629 0,3.275 -1.604,6.613 -4.237,8.924 -2.76,2.375 -6.034,3.402 -11.042,3.402 h -20.864 v -46.8 h 21.058 c 5.392,0 8.987,1.027 11.811,3.403 2.825,2.375 4.623,6.291 4.623,10.079 0,4.622 -2.439,8.281 -7.768,11.363" transform="matrix(1.3333333,0,0,-1.3333333,1246.5581,309.748)"/><path d="m 366.896,179.192 h 8.987 v 34.667 h -8.987 z" transform="matrix(1.3333333,0,0,-1.3333333,813.70133,559.37067)"/><path d="M 0,0 H -0.009 V -8.025 H 0 V -8.979 H 8.979 V 0 0 Z" transform="matrix(1.3333333,0,0,-1.3333333,1302.9071,258.04747)"/><path d="m 0,0 c 1.715,1.715 3.996,2.66 6.422,2.66 2.425,0 4.706,-0.945 6.421,-2.66 0.975,-0.975 1.701,-2.133 2.145,-3.396 H -2.146 C -1.701,-2.133 -0.976,-0.975 0,0 m 11.446,-13.989 c -1.476,-0.985 -3.21,-1.514 -5.024,-1.514 -2.426,0 -4.707,0.945 -6.422,2.66 -0.976,0.975 -1.701,2.133 -2.146,3.396 h 6.913 10.221 8.503 c 0.173,0.983 0.263,1.993 0.263,3.026 0,9.572 -7.76,17.333 -17.332,17.333 -9.573,0 -17.333,-7.761 -17.333,-17.333 0,-9.573 7.76,-17.333 17.333,-17.333 6.858,0 12.787,3.984 15.598,9.765 z" transform="matrix(1.3333333,0,0,-1.3333333,1143.4995,288.77467)"/><path d="m 0,0 c 1.715,1.715 3.995,2.66 6.421,2.66 2.426,0 4.707,-0.945 6.422,-2.66 0.974,-0.975 1.7,-2.133 2.145,-3.396 H -2.146 C -1.701,-2.133 -0.976,-0.975 0,0 m 14.988,-9.447 h 8.503 c 0.173,0.983 0.263,1.993 0.263,3.026 0,9.572 -7.76,17.333 -17.333,17.333 -9.572,0 -17.333,-7.761 -17.333,-17.333 0,-9.573 7.761,-17.333 17.333,-17.333 6.859,0 12.788,3.984 15.598,9.765 H 11.446 c -1.476,-0.985 -3.21,-1.514 -5.025,-1.514 -2.426,0 -4.706,0.945 -6.421,2.66 -0.976,0.975 -1.701,2.133 -2.146,3.396 h 6.913 z" transform="matrix(1.3333333,0,0,-1.3333333,1434.4123,288.77467)"/><path d="m 0,0 c -1.611,-1.611 -3.754,-2.499 -6.033,-2.499 -2.279,0 -4.421,0.888 -6.032,2.499 -1.612,1.611 -2.499,3.754 -2.499,6.033 0,2.279 0.887,4.421 2.499,6.032 1.611,1.611 3.753,2.499 6.032,2.499 2.279,0 4.422,-0.888 6.033,-2.499 1.466,-1.466 2.333,-3.372 2.477,-5.42 V 5.421 C 2.333,3.373 1.466,1.466 0,0 m 2.477,21.136 c -2.514,1.419 -5.417,2.23 -8.51,2.23 -9.572,0 -17.332,-7.761 -17.332,-17.333 0,-9.573 7.76,-17.333 17.332,-17.333 3.093,0 5.996,0.81 8.51,2.229 v -2.22 h 8.988 v 46.8 H 2.477 Z" transform="matrix(1.3333333,0,0,-1.3333333,1350.1415,305.3932)"/><path d="m 0,0 v -17.432 h 8.994 v 17.285 c 0,4.626 3.751,8.378 8.379,8.378 h 2.348 v 8.994 H 17.226 C 7.712,17.225 0,9.513 0,0" transform="matrix(1.3333333,0,0,-1.3333333,1272.4929,297.20573)"/><path d="m 0,0 c -0.339,-1.602 -1.133,-3.072 -2.319,-4.256 -0.353,-0.352 -0.734,-0.67 -1.138,-0.952 -1.426,-0.997 -3.136,-1.542 -4.896,-1.541 -1.338,10e-4 -2.629,0.309 -3.793,0.889 -0.378,0.189 -0.742,0.406 -1.09,0.65 -0.404,0.284 -0.786,0.604 -1.142,0.96 -1.611,1.611 -2.499,3.754 -2.499,6.033 0,0.386 0.027,0.771 0.078,1.15 0.251,1.838 1.096,3.559 2.423,4.885 0.904,0.903 1.975,1.578 3.142,1.997 0.91,0.326 1.879,0.497 2.873,0.499 C -6.1,10.318 -3.921,9.419 -2.32,7.822 -1.134,6.639 -0.339,5.167 0,3.565 0.044,3.356 0.08,3.145 0.108,2.932 0.159,2.554 0.186,2.17 0.186,1.783 0.186,1.176 0.122,0.58 0,0 M 0.449,19.116 H 0 v -2.138 c -1.28,0.704 -2.659,1.251 -4.11,1.616 -1.356,0.341 -2.775,0.522 -4.236,0.522 -2.044,0 -4.005,-0.354 -5.825,-1.004 -6.707,-2.393 -11.508,-8.8 -11.508,-16.329 0,-2.489 0.525,-4.854 1.469,-6.993 1.23,-2.785 3.171,-5.185 5.593,-6.97 0.579,-0.427 1.185,-0.819 1.817,-1.172 2.501,-1.4 5.384,-2.198 8.454,-2.198 2.42,0 4.724,0.496 6.817,1.391 0.523,0.224 1.033,0.474 1.529,0.746 v -0.573 c -0.339,-1.598 -1.131,-3.067 -2.313,-4.249 -1.612,-1.612 -3.753,-2.499 -6.033,-2.499 -1.433,0 -2.813,0.342 -4.041,1.005 -3.168,0.002 -6.337,-0.003 -9.505,0 v -0.001 0.001 h -2.076 c 1.432,-2.969 3.684,-5.459 6.463,-7.192 0.912,-0.569 1.881,-1.055 2.896,-1.448 1.942,-0.754 4.054,-1.167 6.263,-1.167 0.182,0 0.364,0.003 0.544,0.009 9.322,0.287 16.789,7.933 16.789,17.324 v 13.986 17.333 0.01 H 0.449 Z" transform="matrix(1.3333333,0,0,-1.3333333,1403.7729,299.72653)"/><path fill="#000000" d="m 0,0 v -28.607 -5.352 h -5.352 -6.566 l -25.053,33.128 v -46.262 h 25.053 c 13.836,0 25.052,11.216 25.052,25.052 C 13.134,-12.519 7.822,-4.238 0,0" transform="matrix(1.3333333,0,0,-1.3333333,1037.7169,257.68293)"/><path fill="#000000" d="m 0,0 v 20.211 0.999 c 0,13.836 -11.217,25.053 -25.053,25.053 h -25.052 v -75.158 h 13.133 v 56.672 5.352 h 11.919 z" transform="matrix(1.3333333,0,0,-1.3333333,1021.8263,281.9472)"/></g></svg>`;

    printWindow.document.documentElement.innerHTML = `
<head>
<meta charset="utf-8">
<title>${isReceipt ? 'Receipt' : 'Invoice'} ${invoice.invoiceId}</title>
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
      <h1>${isReceipt ? '支払証明書' : '請求書'}</h1>
      <div class="subtitle">${isReceipt ? 'Payment Receipt' : 'Invoice'}</div>
    </div>
  </div>

  <hr class="divider">

  <div class="meta-row">
    <div class="meta-left">
      <div class="meta-item">
        <span class="meta-label">${isReceipt ? '支払番号 / Receipt No.' : '請求書番号 / Invoice No.'}</span>
        <span class="meta-value">${invoice.invoiceId}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">発行日 / Issue Date</span>
        <span class="meta-value">${formatDate(invoice.createdAt)}</span>
      </div>
      ${invoice.dueDate ? `<div class="meta-item"><span class="meta-label">支払期限 / Due Date</span><span class="meta-value">${formatDate(invoice.dueDate)}</span></div>` : ''}
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
    <div class="amount-label">${isReceipt ? 'お支払金額 / Amount Paid' : 'ご請求金額 / Amount Due'}</div>
    <div class="amount-value">${formatTokenAmount(invoice.amount)} ${currency}</div>
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
      ${
        isReceipt
          ? `本支払証明書はNexBridgeにより発行されました。<br>Tx: ${invoice.xrplTxHash ?? ''}`
          : '本請求書はNexBridgeにより発行されました。<br>QRコードをスキャンして支払いを行えます。'
      }
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

  return (
    <div className="rounded-2xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            {invoice.dueDate && new Date(invoice.dueDate) < new Date() && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {t('invoice.statusExpired')}
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
                {t('invoice.dueDate')}: {formatDate(invoice.dueDate)}
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
            {formatTokenAmount(invoice.amount)} {invoice.tokenId}
          </p>
          <div className="mt-2 flex justify-end gap-2">
            {(invoice.type === 'send' || invoice.status === 'paid') && (
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
  const [tokenId, setTokenId] = useState('');
  const [amount, setAmount] = useState('');
  const [recipientName, setRecipientName] = useState(user.name);
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const walletAddress = user.walletAddress ?? '';

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await sendInvoice({
        tokenId,
        amount: Number(amount),
        recipientAddress: walletAddress,
        recipientName,
        description,
        ...(dueDate ? { dueDate: new Date(dueDate).toISOString() } : {}),
      });
      setAmount('');
      setRecipientName(user.name);
      setDescription('');
      setDueDate('');
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('invoice.createError'));
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
                <FieldLabel>{t('invoice.tokenLabel')}</FieldLabel>
                <TokenSelect tokens={tokens} value={tokenId} onChange={setTokenId} />
              </div>
              <div>
                <FieldLabel>{t('invoice.amount')}</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  step="any"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                  }}
                  placeholder={t('invoice.amountPlaceholder')}
                  required
                />
              </div>
            </div>
            <div>
              <FieldLabel>{t('invoice.recipientAddress')}</FieldLabel>
              <Input value={walletAddress} disabled className="font-mono text-xs" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>{t('invoice.recipientName')}</FieldLabel>
                <Input
                  value={recipientName}
                  onChange={(e) => {
                    setRecipientName(e.target.value);
                  }}
                  placeholder={t('invoice.recipientNamePlaceholder')}
                  required
                />
              </div>
              <div>
                <FieldLabel>{t('invoice.dueDate')}</FieldLabel>
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
              <FieldLabel>{t('invoice.description')}</FieldLabel>
              <Input
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                }}
                placeholder={t('invoice.descriptionPlaceholder')}
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
              {loading ? t('common.processing') : t('invoice.sendCreateButton')}
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
  const [tokenId, setTokenId] = useState('');
  const [amount, setAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseMessage, setParseMessage] = useState('');
  const [parseError, setParseError] = useState(false);
  const [operationMfaOpen, setOperationMfaOpen] = useState(false);
  const [scannedInvoiceId, setScannedInvoiceId] = useState('');

  async function handleScan(file: File) {
    setParsing(true);
    setParseMessage('');
    setParseError(false);
    try {
      const data = await parseInvoicePdf(file);
      setTokenId(data.tokenId);
      setAmount(String(data.amount));
      setRecipientAddress(data.recipientAddress);
      setRecipientName(data.recipientName);
      setDescription(data.description);
      if (data.dueDate) setDueDate(data.dueDate.slice(0, 10));
      if (data.invoiceId) setScannedInvoiceId(data.invoiceId);
      setParseMessage(t('invoice.uploadPdfSuccess'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('invoice.uploadPdfError');
      setParseMessage(msg.includes('Not a NexBridge') ? t('invoice.uploadPdfInvalid') : t('invoice.uploadPdfError'));
      setParseError(true);
    } finally {
      setParsing(false);
    }
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await payInvoice({
        tokenId,
        amount: Number(amount),
        recipientAddress,
        recipientName,
        description,
        ...(dueDate ? { dueDate: new Date(dueDate).toISOString() } : {}),
        ...(scannedInvoiceId ? { invoiceId: scannedInvoiceId } : {}),
      });
      setAmount('');
      setRecipientAddress('');
      setRecipientName('');
      setDescription('');
      setDueDate('');
      setScannedInvoiceId('');
      onCreated();
    } catch (err) {
      if (err instanceof OperationMfaRequiredError) {
        setOperationMfaOpen(true);
      } else {
        setError(err instanceof Error ? err.message : t('invoice.createError'));
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
                  {t('invoice.uploadPdfTitle')}
                </div>
                <p className="text-muted-foreground mt-1 text-xs">{t('invoice.uploadPdfDescription')}</p>
              </div>
              <label className="shrink-0">
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleScan(file);
                    e.target.value = '';
                  }}
                  disabled={parsing}
                />
                <Button type="button" size="sm" variant="outline" className="pointer-events-none gap-1" tabIndex={-1}>
                  <Upload className="h-3 w-3" />
                  {t('invoice.uploadPdfButton')}
                </Button>
              </label>
            </div>
            {parsing && <p className="text-muted-foreground mt-2 text-xs">{t('invoice.uploadPdfParsing')}</p>}
            {parseMessage && (
              <p className={`mt-2 text-xs ${parseError ? 'text-destructive' : 'text-green-600'}`}>{parseMessage}</p>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <DisabledFieldGroup disabled={prereq.disabled}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>{t('invoice.tokenLabel')}</FieldLabel>
                  <TokenSelect tokens={tokens} value={tokenId} onChange={setTokenId} />
                </div>
                <div>
                  <FieldLabel>{t('invoice.amount')}</FieldLabel>
                  <Input
                    type="number"
                    min={1}
                    step="any"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                    }}
                    placeholder={t('invoice.amountPlaceholder')}
                    required
                  />
                </div>
              </div>
              <div>
                <FieldLabel>{t('invoice.recipientAddress')}</FieldLabel>
                <Input
                  value={recipientAddress}
                  onChange={(e) => {
                    setRecipientAddress(e.target.value);
                  }}
                  placeholder={t('invoice.recipientAddressPlaceholder')}
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>{t('invoice.recipientName')}</FieldLabel>
                  <Input
                    value={recipientName}
                    onChange={(e) => {
                      setRecipientName(e.target.value);
                    }}
                    placeholder={t('invoice.recipientNamePlaceholder')}
                    required
                  />
                </div>
                <div>
                  <FieldLabel>{t('invoice.dueDate')}</FieldLabel>
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
                <FieldLabel>{t('invoice.description')}</FieldLabel>
                <Input
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                  }}
                  placeholder={t('invoice.descriptionPlaceholder')}
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
                {loading ? t('common.processing') : t('invoice.payCreateButton')}
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
          const form = document.querySelector<HTMLFormElement>('form');
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
          <p className="text-muted-foreground py-4 text-center text-sm">{t('invoice.emptyList')}</p>
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
    Promise.all([listInvoices('send'), listInvoices('pay')])
      .then(([send, pay]) => {
        setSendInvoices(send);
        setPayInvoices(pay);
      })
      .catch(() => {})
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
        <p className="text-muted-foreground py-6 text-center">{t('common.loading')}</p>
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
            {t('invoice.sendTab')} ({sendInvoices.length})
          </TabsTrigger>
          <TabsTrigger value="pay" className="flex-1 gap-1">
            <Wallet className="h-4 w-4" />
            {t('invoice.payTab')} ({payInvoices.length})
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
