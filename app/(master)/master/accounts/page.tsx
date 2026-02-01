'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  UserPlus,
  Upload,
  Download,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface ParsedAccount {
  email: string;
  password: string;
  fullName: string;
  clinicName: string;
  plan: string;
}

interface AccountResult {
  email: string;
  success: boolean;
  error?: string;
}

type PageState = 'idle' | 'preview' | 'processing' | 'done';

export default function AccountsPage() {
  const [state, setState] = useState<PageState>('idle');
  const [accounts, setAccounts] = useState<ParsedAccount[]>([]);
  const [results, setResults] = useState<AccountResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [totalToProcess, setTotalToProcess] = useState(0);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const template = 'email,senha,nome_completo,nome_clinica,plano\njoao@clinica.com,Senha@123,João Silva,Clínica Bela Vida,pro\nmaria@dente.com,Senha@456,Maria Santos,Odonto Premium,free\n';
    const blob = new Blob(['\uFEFF' + template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_contas_clinihof.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): ParsedAccount[] => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) {
      throw new Error('O arquivo deve ter pelo menos uma linha de cabeçalho e uma linha de dados.');
    }

    const header = lines[0].toLowerCase().trim();
    const columns = header.split(',').map((c) => c.trim());

    // Map column names (support both Portuguese and English)
    const emailIdx = columns.findIndex((c) => c === 'email');
    const passwordIdx = columns.findIndex((c) => c === 'senha' || c === 'password');
    const fullNameIdx = columns.findIndex((c) => c === 'nome_completo' || c === 'fullname' || c === 'full_name');
    const clinicNameIdx = columns.findIndex((c) => c === 'nome_clinica' || c === 'clinicname' || c === 'clinic_name');
    const planIdx = columns.findIndex((c) => c === 'plano' || c === 'plan');

    if (emailIdx === -1 || passwordIdx === -1 || fullNameIdx === -1 || clinicNameIdx === -1) {
      throw new Error(
        'Colunas obrigatórias não encontradas. O CSV deve ter: email, senha, nome_completo, nome_clinica'
      );
    }

    const parsed: ParsedAccount[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map((v) => v.trim());
      
      parsed.push({
        email: values[emailIdx] || '',
        password: values[passwordIdx] || '',
        fullName: values[fullNameIdx] || '',
        clinicName: values[clinicNameIdx] || '',
        plan: planIdx !== -1 ? (values[planIdx] || 'free') : 'free',
      });
    }

    if (parsed.length === 0) {
      throw new Error('Nenhuma linha de dados encontrada no CSV.');
    }

    return parsed;
  };

  const handleFile = (file: File) => {
    setParseError(null);
    setResults([]);
    setState('idle');

    if (!file.name.endsWith('.csv')) {
      setParseError('Por favor, selecione um arquivo .csv');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseCSV(text);
        setAccounts(parsed);
        setState('preview');
      } catch (err: any) {
        setParseError(err.message);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  const processAccounts = async () => {
    setState('processing');
    setProgress(0);
    setTotalToProcess(accounts.length);
    setResults([]);

    // Process in batches of 10
    const batchSize = 10;
    const allResults: AccountResult[] = [];

    for (let i = 0; i < accounts.length; i += batchSize) {
      const batch = accounts.slice(i, i + batchSize);

      try {
        const response = await fetch('/api/master/accounts/bulk-create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accounts: batch.map((a) => ({
              email: a.email,
              password: a.password,
              fullName: a.fullName,
              clinicName: a.clinicName,
              plan: a.plan,
            })),
          }),
        });

        const data = await response.json();

        if (response.ok && data.results) {
          allResults.push(...data.results);
        } else {
          // API error for the whole batch
          batch.forEach((a) => {
            allResults.push({
              email: a.email,
              success: false,
              error: data.error || 'Erro na API',
            });
          });
        }
      } catch (error) {
        batch.forEach((a) => {
          allResults.push({
            email: a.email,
            success: false,
            error: 'Erro de conexão',
          });
        });
      }

      setProgress(Math.min(i + batchSize, accounts.length));
      setResults([...allResults]);
    }

    setState('done');
  };

  const reset = () => {
    setState('idle');
    setAccounts([]);
    setResults([]);
    setProgress(0);
    setTotalToProcess(0);
    setParseError(null);
  };

  const created = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <UserPlus className="h-8 w-8 text-purple-600" />
          Criação de Contas
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Crie contas de clínicas em massa através de upload de arquivo CSV.
        </p>
      </div>

      {/* CSV Format Instructions */}
      <Card className="border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-purple-600" />
            📋 Formato do Arquivo CSV
          </CardTitle>
          <CardDescription>
            O arquivo deve ser CSV (separado por vírgula) com encoding UTF-8.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">
                Colunas obrigatórias:
              </h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li><code className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded text-xs">email</code> — Email do administrador</li>
                <li><code className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded text-xs">senha</code> — Senha (mínimo 6 caracteres)</li>
                <li><code className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded text-xs">nome_completo</code> — Nome completo</li>
                <li><code className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded text-xs">nome_clinica</code> — Nome da clínica</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">
                Colunas opcionais:
              </h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>
                  <code className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded text-xs">plano</code> — free / pro / enterprise (padrão: free)
                </li>
              </ul>
            </div>
          </div>

          {/* Example CSV */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 overflow-x-auto">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Exemplo:</p>
            <pre className="text-sm text-gray-700 dark:text-gray-300 font-mono whitespace-pre">
{`email,senha,nome_completo,nome_clinica,plano
joao@clinica.com,Senha@123,João Silva,Clínica Bela Vida,pro
maria@dente.com,Senha@456,Maria Santos,Odonto Premium,free`}
            </pre>
          </div>

          {/* Notes */}
          <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <strong>Notas:</strong> Senha mínima de 6 caracteres. Email deve ser único no sistema. O arquivo deve estar com encoding UTF-8. Cada conta cria um usuário ADMIN + workspace com dados de exemplo.
            </div>
          </div>

          {/* Download Template */}
          <Button variant="outline" onClick={downloadTemplate} className="border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-900/20">
            <Download className="mr-2 h-4 w-4" />
            Baixar Template CSV
          </Button>
        </CardContent>
      </Card>

      {/* Upload Area */}
      {(state === 'idle' || state === 'preview') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload className="h-5 w-5 text-purple-600" />
              Upload do Arquivo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-purple-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <Upload className={`h-10 w-10 mx-auto mb-3 ${isDragging ? 'text-purple-500' : 'text-gray-400'}`} />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Arraste o arquivo CSV aqui ou{' '}
                <span className="text-purple-600 dark:text-purple-400 underline">clique para selecionar</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Apenas arquivos .csv</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              className="hidden"
            />

            {/* Parse Error */}
            {parseError && (
              <div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{parseError}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Preview Table */}
      {state === 'preview' && accounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Preview — {accounts.length} conta(s) encontrada(s)
            </CardTitle>
            <CardDescription>
              {accounts.length > 5
                ? `Mostrando as primeiras 5 de ${accounts.length} linhas.`
                : 'Verifique os dados antes de processar.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">#</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Email</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Nome</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Clínica</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Plano</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.slice(0, 5).map((acc, idx) => (
                    <tr key={idx} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                      <td className="px-4 py-2.5 text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-2.5 text-gray-900 dark:text-gray-100">{acc.email}</td>
                      <td className="px-4 py-2.5 text-gray-900 dark:text-gray-100">{acc.fullName}</td>
                      <td className="px-4 py-2.5 text-gray-900 dark:text-gray-100">{acc.clinicName}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          acc.plan === 'enterprise'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                            : acc.plan === 'pro'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {acc.plan}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {accounts.length > 5 && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ... e mais {accounts.length - 5} linha(s)
              </p>
            )}

            <div className="flex gap-3">
              <Button
                onClick={processAccounts}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Criar {accounts.length} Conta{accounts.length > 1 ? 's' : ''}
              </Button>
              <Button variant="outline" onClick={reset}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing / Progress */}
      {state === 'processing' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
              Processando...
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-purple-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${totalToProcess > 0 ? (progress / totalToProcess) * 100 : 0}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {progress} de {totalToProcess} contas processadas...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {state === 'done' && results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resultado</CardTitle>
            <CardDescription>
              {created} conta(s) criada(s) com sucesso, {failed} erro(s).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{results.length}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">{created}</p>
                <p className="text-xs text-green-600 dark:text-green-500">Criadas</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-red-700 dark:text-red-400">{failed}</p>
                <p className="text-xs text-red-600 dark:text-red-500">Erros</p>
              </div>
            </div>

            {/* Detail Table */}
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0">
                  <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Email</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Detalhe</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, idx) => (
                    <tr key={idx} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                      <td className="px-4 py-2.5">
                        {r.success ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-gray-900 dark:text-gray-100">{r.email}</td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">
                        {r.success ? 'Conta criada com sucesso' : r.error}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button onClick={reset} variant="outline" className="border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-300">
              Criar mais contas
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
