import { type SubmitEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createVirtualAccount, listVirtualAccounts, updateVirtualAccount } from '@/lib/api';
import type { BankVirtualAccount } from '@/lib/types';
import { useAuthContext } from '@/lib/useAuthContext';

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge variant={isActive ? 'default' : 'secondary'} className="text-xs">
      {isActive ? '有効' : '無効'}
    </Badge>
  );
}

export function VirtualAccountsPage() {
  const navigate = useNavigate();
  const { account } = useAuthContext();
  const [virtualAccounts, setVirtualAccounts] = useState<BankVirtualAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    listVirtualAccounts()
      .then(setVirtualAccounts)
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function reload() {
    const vas = await listVirtualAccounts();
    setVirtualAccounts(vas);
  }

  async function handleCreate(e: SubmitEvent) {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      await createVirtualAccount(newLabel);
      setNewLabel('');
      setShowCreate(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '作成に失敗しました');
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActive(va: BankVirtualAccount) {
    try {
      await updateVirtualAccount(va.virtualAccountId, {
        isActive: !va.isActive,
      });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新に失敗しました');
    }
  }

  if (account.accountType !== 'corporate') {
    return (
      <div className="mx-auto max-w-md px-4 py-6">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground text-sm">バーチャル口座は法人口座のみご利用いただけます</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/')}>
              トップへ戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">バーチャル口座管理</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setShowCreate(!showCreate);
          }}
        >
          {showCreate ? 'キャンセル' : '新規作成'}
        </Button>
      </div>

      {error && <p className="text-destructive mb-4 text-sm">{error}</p>}

      {showCreate && (
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">バーチャル口座を作成</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex gap-3">
              <div className="flex-1 space-y-2">
                <Label htmlFor="vaLabel">ラベル</Label>
                <Input
                  id="vaLabel"
                  value={newLabel}
                  onChange={(e) => {
                    setNewLabel(e.target.value);
                  }}
                  placeholder="ラベルを入力"
                  required
                />
              </div>
              <Button type="submit" className="self-end" disabled={creating || !newLabel}>
                {creating ? '作成中...' : '作成'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">全{virtualAccounts.length}件</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {virtualAccounts.length === 0 ? (
            <p className="text-muted-foreground px-6 py-8 text-center text-sm">バーチャル口座はありません</p>
          ) : (
            <>
              {/* Mobile list */}
              <div className="divide-y sm:hidden">
                {virtualAccounts.map((va) => (
                  <div key={va.virtualAccountId} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{va.label}</span>
                      <StatusBadge isActive={va.isActive} />
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <div className="text-muted-foreground text-xs">
                        <span>支店 {va.branchCode}</span>
                        <span className="mx-1.5">/</span>
                        <span className="font-mono">{va.accountNumber}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleToggleActive(va)}>
                        {va.isActive ? '無効化' : '有効化'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ラベル</TableHead>
                      <TableHead>支店番号</TableHead>
                      <TableHead>口座番号</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {virtualAccounts.map((va) => (
                      <TableRow key={va.virtualAccountId}>
                        <TableCell className="text-sm font-medium">{va.label}</TableCell>
                        <TableCell className="font-mono text-sm">{va.branchCode}</TableCell>
                        <TableCell className="font-mono text-sm">{va.accountNumber}</TableCell>
                        <TableCell>
                          <StatusBadge isActive={va.isActive} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleToggleActive(va)}>
                            {va.isActive ? '無効化' : '有効化'}
                          </Button>
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
    </div>
  );
}
