'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Upload,
  Download,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  Eye,
  Info,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

type PatientOrigin = 'INSTAGRAM' | 'INDICACAO' | 'GOOGLE' | 'WHATSAPP' | 'FACEBOOK' | 'SITE' | 'OUTROS';

const VALID_ORIGINS: PatientOrigin[] = ['INSTAGRAM', 'INDICACAO', 'GOOGLE', 'WHATSAPP', 'FACEBOOK', 'SITE', 'OUTROS'];

const ORIGIN_LABELS: Record<PatientOrigin, string> = {
  INSTAGRAM: 'Instagram',
  INDICACAO: 'Indicação',
  GOOGLE: 'Google',
  WHATSAPP: 'WhatsApp',
  FACEBOOK: 'Facebook',
  SITE: 'Site',
  OUTROS: 'Outros',
};

interface ParsedPatient {
  rowNumber: number;
  name: string;
  phone: string;
  email: string;
  birthday: string;
  origin: string;
  notes: string;
  errors: string[];
  isValid: boolean;
}

interface ImportResult {
  success: number;
  failed: number;
  duplicates: number;
  errors: Array<{
    row: number;
    name: string;
    phone: string;
    error: string;
  }>;
}

interface PatientCSVImportProps {
  onSuccess: () => void;
  onClose: () => void;
}

export function PatientCSVImport({ onSuccess, onClose }: PatientCSVImportProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'result'>('upload');
  const [parsedPatients, setParsedPatients] = useState<ParsedPatient[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gera template CSV para download
  const downloadTemplate = () => {
    const headers = 'name,phone,email,birthday,origin,notes';
    const example = '"Maria Silva","11999998888","maria@email.com","1990-05-15","INDICACAO","Paciente VIP"';
    const instructions = `# Template de Importação de Pacientes - CliniHOF
# Campos obrigatórios: name, phone
# Formato de birthday: YYYY-MM-DD (ex: 1990-05-15)
# Valores válidos para origin: INSTAGRAM, INDICACAO, GOOGLE, WHATSAPP, FACEBOOK, SITE, OUTROS
#
${headers}
${example}`;

    const blob = new Blob([instructions], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_pacientes_clinihof.csv';
    link.click();
    URL.revokeObjectURL(link.href);

    toast({
      title: 'Template baixado',
      description: 'Use o arquivo como modelo para importar seus pacientes.',
    });
  };

  // Parseia uma linha CSV respeitando aspas
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  // Valida um paciente parseado
  const validatePatient = (patient: Omit<ParsedPatient, 'errors' | 'isValid'>): string[] => {
    const errors: string[] = [];

    if (!patient.name || patient.name.trim() === '') {
      errors.push('Nome é obrigatório');
    }

    if (!patient.phone || patient.phone.trim() === '') {
      errors.push('Telefone é obrigatório');
    }

    if (patient.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patient.email)) {
      errors.push('Email inválido');
    }

    if (patient.birthday) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(patient.birthday)) {
        errors.push('Data de nascimento deve estar no formato YYYY-MM-DD');
      } else {
        const date = new Date(patient.birthday);
        if (isNaN(date.getTime())) {
          errors.push('Data de nascimento inválida');
        }
      }
    }

    if (patient.origin && !VALID_ORIGINS.includes(patient.origin.toUpperCase() as PatientOrigin)) {
      errors.push(`Origem inválida. Use: ${VALID_ORIGINS.join(', ')}`);
    }

    return errors;
  };

  // Processa o arquivo CSV
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Por favor, selecione um arquivo CSV.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/).filter(line => {
          // Ignora linhas vazias e comentários
          const trimmed = line.trim();
          return trimmed && !trimmed.startsWith('#');
        });

        if (lines.length < 2) {
          throw new Error('O arquivo deve conter pelo menos o cabeçalho e uma linha de dados.');
        }

        // Verifica o cabeçalho
        const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
        const nameIndex = headers.indexOf('name');
        const phoneIndex = headers.indexOf('phone');
        const emailIndex = headers.indexOf('email');
        const birthdayIndex = headers.indexOf('birthday');
        const originIndex = headers.indexOf('origin');
        const notesIndex = headers.indexOf('notes');

        if (nameIndex === -1 || phoneIndex === -1) {
          throw new Error('O CSV deve conter as colunas "name" e "phone".');
        }

        // Parseia as linhas de dados
        const patients: ParsedPatient[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);

          const patient = {
            rowNumber: i + 1, // +1 para compensar índice e cabeçalho
            name: values[nameIndex] || '',
            phone: values[phoneIndex] || '',
            email: emailIndex !== -1 ? values[emailIndex] || '' : '',
            birthday: birthdayIndex !== -1 ? values[birthdayIndex] || '' : '',
            origin: originIndex !== -1 ? (values[originIndex] || '').toUpperCase() : '',
            notes: notesIndex !== -1 ? values[notesIndex] || '' : '',
            errors: [] as string[],
            isValid: true,
          };

          patient.errors = validatePatient(patient);
          patient.isValid = patient.errors.length === 0;

          patients.push(patient);
        }

        setParsedPatients(patients);
        setStep('preview');

        toast({
          title: 'Arquivo processado',
          description: `${patients.length} paciente(s) encontrado(s). ${patients.filter(p => p.isValid).length} válido(s).`,
        });
      } catch (error) {
        toast({
          title: 'Erro ao processar arquivo',
          description: error instanceof Error ? error.message : 'Erro desconhecido',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.onerror = () => {
      toast({
        title: 'Erro ao ler arquivo',
        description: 'Não foi possível ler o arquivo. Tente novamente.',
        variant: 'destructive',
      });
      setIsLoading(false);
    };

    reader.readAsText(file);
  }, []);

  // Executa a importação
  const handleImport = async () => {
    const validPatients = parsedPatients.filter(p => p.isValid);

    if (validPatients.length === 0) {
      toast({
        title: 'Nenhum paciente válido',
        description: 'Corrija os erros e tente novamente.',
        variant: 'destructive',
      });
      return;
    }

    setStep('importing');
    setIsLoading(true);
    setProgress(0);

    try {
      const response = await fetch('/api/patients/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patients: validPatients.map(p => ({
            name: p.name.trim(),
            phone: p.phone.trim(),
            email: p.email.trim() || null,
            birthday: p.birthday || null,
            origin: p.origin || null,
            notes: p.notes.trim() || null,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao importar pacientes');
      }

      const result: ImportResult = await response.json();
      setImportResult(result);
      setStep('result');

      if (result.success > 0) {
        onSuccess();
      }
    } catch (error) {
      toast({
        title: 'Erro na importação',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      setStep('preview');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset para nova importação
  const handleReset = () => {
    setStep('upload');
    setParsedPatients([]);
    setImportResult(null);
    setProgress(0);
  };

  const validCount = parsedPatients.filter(p => p.isValid).length;
  const invalidCount = parsedPatients.filter(p => !p.isValid).length;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-purple-600" />
            Importar Pacientes via CSV
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Faça upload de um arquivo CSV com os dados dos pacientes.'}
            {step === 'preview' && 'Revise os dados antes de importar.'}
            {step === 'importing' && 'Importando pacientes...'}
            {step === 'result' && 'Importação concluída.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-4">
          {/* Step: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Informações do formato */}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Formato do CSV</AlertTitle>
                <AlertDescription className="mt-2">
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li><strong>Campos obrigatórios:</strong> name, phone</li>
                    <li><strong>Campos opcionais:</strong> email, birthday, origin, notes</li>
                    <li><strong>Formato de data:</strong> YYYY-MM-DD (ex: 1990-05-15)</li>
                    <li><strong>Valores de origin:</strong> {VALID_ORIGINS.join(', ')}</li>
                  </ul>
                </AlertDescription>
              </Alert>

              {/* Área de upload */}
              <Card
                className="border-2 border-dashed border-gray-300 hover:border-purple-500 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Upload className="h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                    Clique para selecionar ou arraste o arquivo
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Apenas arquivos .csv
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </CardContent>
              </Card>

              {/* Botão de template */}
              <div className="flex justify-center">
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Template CSV
                </Button>
              </div>

              {isLoading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                  <span className="ml-2 text-gray-600">Processando arquivo...</span>
                </div>
              )}
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* Resumo */}
              <div className="flex flex-wrap gap-4">
                <Badge variant="outline" className="text-base px-4 py-2">
                  <Eye className="h-4 w-4 mr-2" />
                  Total: {parsedPatients.length}
                </Badge>
                <Badge variant="default" className="text-base px-4 py-2 bg-green-600">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Válidos: {validCount}
                </Badge>
                {invalidCount > 0 && (
                  <Badge variant="destructive" className="text-base px-4 py-2">
                    <XCircle className="h-4 w-4 mr-2" />
                    Com erros: {invalidCount}
                  </Badge>
                )}
              </div>

              {/* Aviso sobre erros */}
              {invalidCount > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Atenção</AlertTitle>
                  <AlertDescription>
                    {invalidCount} paciente(s) com erros não serão importados.
                  </AlertDescription>
                </Alert>
              )}

              {/* Tabela de preview */}
              <div className="border rounded-lg overflow-auto max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Linha</TableHead>
                      <TableHead className="w-16">Status</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Nascimento</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Erros</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedPatients.map((patient) => (
                      <TableRow
                        key={patient.rowNumber}
                        className={!patient.isValid ? 'bg-red-50 dark:bg-red-950/20' : ''}
                      >
                        <TableCell className="font-mono text-sm">{patient.rowNumber}</TableCell>
                        <TableCell>
                          {patient.isValid ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{patient.name || '-'}</TableCell>
                        <TableCell>{patient.phone || '-'}</TableCell>
                        <TableCell className="text-sm text-gray-600">{patient.email || '-'}</TableCell>
                        <TableCell className="text-sm">{patient.birthday || '-'}</TableCell>
                        <TableCell>
                          {patient.origin && VALID_ORIGINS.includes(patient.origin as PatientOrigin) ? (
                            <Badge variant="secondary">
                              {ORIGIN_LABELS[patient.origin as PatientOrigin]}
                            </Badge>
                          ) : patient.origin ? (
                            <Badge variant="destructive">{patient.origin}</Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-sm text-red-600 max-w-[200px]">
                          {patient.errors.join('; ') || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Step: Importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <Loader2 className="h-16 w-16 animate-spin text-purple-600" />
              <div className="text-center">
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                  Importando pacientes...
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Por favor, aguarde.
                </p>
              </div>
              <Progress value={progress} className="w-64" />
            </div>
          )}

          {/* Step: Result */}
          {step === 'result' && importResult && (
            <div className="space-y-6">
              {/* Resumo da importação */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-green-50 dark:bg-green-950/20 border-green-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-green-700 dark:text-green-400 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5" />
                      Importados
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-green-700 dark:text-green-400">
                      {importResult.success}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Duplicados
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-yellow-700 dark:text-yellow-400">
                      {importResult.duplicates}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-red-50 dark:bg-red-950/20 border-red-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-red-700 dark:text-red-400 flex items-center gap-2">
                      <XCircle className="h-5 w-5" />
                      Falhas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-red-700 dark:text-red-400">
                      {importResult.failed}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Lista de erros */}
              {importResult.errors.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-red-600 flex items-center gap-2">
                      <XCircle className="h-5 w-5" />
                      Detalhes dos Erros
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg overflow-auto max-h-[200px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Linha</TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>Telefone</TableHead>
                            <TableHead>Erro</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importResult.errors.map((error, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-mono">{error.row}</TableCell>
                              <TableCell>{error.name}</TableCell>
                              <TableCell>{error.phone}</TableCell>
                              <TableCell className="text-red-600">{error.error}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Mensagem de sucesso */}
              {importResult.success > 0 && (
                <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-700 dark:text-green-400">
                    Importação concluída!
                  </AlertTitle>
                  <AlertDescription className="text-green-600 dark:text-green-500">
                    {importResult.success} paciente(s) importado(s) com sucesso.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 gap-2">
          {step === 'upload' && (
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          )}

          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={handleReset}>
                <X className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <Button
                onClick={handleImport}
                disabled={validCount === 0 || isLoading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Importar {validCount} Paciente(s)
                  </>
                )}
              </Button>
            </>
          )}

          {step === 'result' && (
            <>
              <Button variant="outline" onClick={handleReset}>
                Nova Importação
              </Button>
              <Button onClick={onClose} className="bg-purple-600 hover:bg-purple-700">
                Fechar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
