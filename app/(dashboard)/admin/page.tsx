'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'react-hot-toast';
import { Database, Loader2 } from 'lucide-react';

export default function AdminPage() {
  const [isPopulating, setIsPopulating] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handlePopulateWorkspace = async () => {
    setIsPopulating(true);
    setResult(null);

    try {
      const res = await fetch('/api/admin/populate-workspace', {
        method: 'POST',
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Workspace populated successfully!');
        setResult(data);
      } else {
        toast.error(data.error || 'Failed to populate workspace');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error populating workspace');
    } finally {
      setIsPopulating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Administração</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Ferramentas de administração do workspace
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Popular Workspace com Dados Mock
          </CardTitle>
          <CardDescription>
            Esta ação irá adicionar dados de exemplo ao seu workspace, incluindo custos fixos, impostos e comissões.
            <br />
            <strong>Nota:</strong> Dados que já existem não serão duplicados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handlePopulateWorkspace}
            disabled={isPopulating}
            className="w-full sm:w-auto"
          >
            {isPopulating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Populando...
              </>
            ) : (
              'Popular Workspace'
            )}
          </Button>

          {result && (
            <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                ✅ Sucesso!
              </h3>
              <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
                <p><strong>Criados:</strong></p>
                <ul className="list-disc list-inside ml-4">
                  <li>{result.created.fixedCosts} custos fixos</li>
                  <li>{result.created.taxes} impostos</li>
                  <li>{result.created.commissions} comissões</li>
                </ul>
                <p className="mt-3"><strong>Total no workspace:</strong></p>
                <ul className="list-disc list-inside ml-4">
                  <li>Total de custos: {result.totals.all}</li>
                  <li>OPERATIONAL: {result.totals.byCategory.OPERATIONAL || 0}</li>
                  <li>TAX: {result.totals.byCategory.TAX || 0}</li>
                  <li>COMMISSION: {result.totals.byCategory.COMMISSION || 0}</li>
                  <li>CARD: {result.totals.byCategory.CARD || 0}</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
          💡 Dica
        </h3>
        <p className="text-sm text-blue-800 dark:text-blue-200">
          Após popular o workspace, acesse a página de <strong>Custos</strong> para ver todos os dados.
          Você pode editar ou excluir qualquer item conforme necessário.
        </p>
      </div>
    </div>
  );
}
