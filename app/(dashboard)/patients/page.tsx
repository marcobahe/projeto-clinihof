'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, User, Phone, Mail, Loader2, Edit, Trash2, Eye, FileSpreadsheet, Filter, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PatientForm } from '@/components/forms/patient-form';
import { PatientCSVImport } from '@/components/patients/patient-csv-import';

type PatientOrigin = 'INSTAGRAM' | 'INDICACAO' | 'GOOGLE' | 'WHATSAPP' | 'FACEBOOK' | 'SITE' | 'OUTROS';

const originLabels: Record<PatientOrigin, string> = {
  INSTAGRAM: 'Instagram',
  INDICACAO: 'Indicação',
  GOOGLE: 'Google',
  WHATSAPP: 'WhatsApp',
  FACEBOOK: 'Facebook',
  SITE: 'Site',
  OUTROS: 'Outros',
};

interface Patient {
  id: string;
  name: string;
  email?: string | null;
  phone: string;
  birthday?: string | null;
  origin?: PatientOrigin | null;
  city?: string | null;
  state?: string | null;
  cpf?: string | null;
  notes?: string | null;
  createdAt: string;
}

export default function PatientsPage() {
  const { data: session } = useSession() || {};
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [originFilter, setOriginFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [emailFilter, setEmailFilter] = useState('all');
  const [birthdayFilter, setBirthdayFilter] = useState('all');
  const [birthdayMonthFilter, setBirthdayMonthFilter] = useState('all');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [bulkConfirmText, setBulkConfirmText] = useState('');
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const fetchPatients = async () => {
    try {
      const response = await fetch('/api/patients');
      if (response.ok) {
        const data = await response.json();
        setPatients(data);
        setSelectedIds((current) => {
          const validIds = new Set(data.map((patient: Patient) => patient.id));
          return new Set([...current].filter((id) => validIds.has(id)));
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar pacientes',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchPatients();
    }
  }, [session]);

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este paciente?')) return;

    try {
      const response = await fetch(`/api/patients/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Sucesso',
          description: 'Paciente excluído com sucesso',
        });
        fetchPatients();
      } else {
        throw new Error();
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir paciente',
        variant: 'destructive',
      });
    }
  };

  const handleBulkDelete = async () => {
    setIsBulkDeleting(true);

    try {
      const response = await fetch('/api/patients/bulk-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          confirmText: bulkConfirmText,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao excluir pacientes');
      }

      toast({
        title: 'Pacientes excluídos',
        description: `${data.deleted} paciente(s) excluído(s) com sucesso.`,
      });

      setSelectedIds(new Set());
      setBulkConfirmText('');
      setIsBulkDeleteOpen(false);
      fetchPatients();
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao excluir pacientes',
        variant: 'destructive',
      });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleSuccess = () => {
    setIsDialogOpen(false);
    setEditingPatient(null);
    fetchPatients();
  };

  const filteredPatients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const state = stateFilter.trim().toLowerCase();
    const city = cityFilter.trim().toLowerCase();

    return patients.filter((patient) => {
      const matchesQuery = !query || [
        patient.name,
        patient.phone,
        patient.email,
        patient.cpf,
      ].some((value) => value?.toLowerCase().includes(query));

      const matchesOrigin = originFilter === 'all' || patient.origin === originFilter;
      const matchesState = !state || patient.state?.toLowerCase() === state;
      const matchesCity = !city || patient.city?.toLowerCase().includes(city);
      const matchesEmail =
        emailFilter === 'all' ||
        (emailFilter === 'with' && Boolean(patient.email)) ||
        (emailFilter === 'without' && !patient.email);
      const matchesBirthday =
        birthdayFilter === 'all' ||
        (birthdayFilter === 'with' && Boolean(patient.birthday)) ||
        (birthdayFilter === 'without' && !patient.birthday);
      const matchesBirthdayMonth =
        birthdayMonthFilter === 'all' ||
        (patient.birthday && String(new Date(patient.birthday).getUTCMonth() + 1) === birthdayMonthFilter);

      const createdAt = new Date(patient.createdAt);
      const matchesCreatedFrom = !createdFrom || createdAt >= new Date(`${createdFrom}T00:00:00`);
      const matchesCreatedTo = !createdTo || createdAt <= new Date(`${createdTo}T23:59:59`);

      return (
        matchesQuery &&
        matchesOrigin &&
        matchesState &&
        matchesCity &&
        matchesEmail &&
        matchesBirthday &&
        matchesBirthdayMonth &&
        matchesCreatedFrom &&
        matchesCreatedTo
      );
    });
  }, [patients, searchQuery, originFilter, stateFilter, cityFilter, emailFilter, birthdayFilter, birthdayMonthFilter, createdFrom, createdTo]);

  const filteredIds = filteredPatients.map((patient) => patient.id);
  const selectedFilteredCount = filteredIds.filter((id) => selectedIds.has(id)).length;
  const allFilteredSelected = filteredIds.length > 0 && selectedFilteredCount === filteredIds.length;
  const hasActiveFilters = Boolean(
    searchQuery ||
    originFilter !== 'all' ||
    stateFilter ||
    cityFilter ||
    emailFilter !== 'all' ||
    birthdayFilter !== 'all' ||
    birthdayMonthFilter !== 'all' ||
    createdFrom ||
    createdTo
  );

  const togglePatientSelection = (id: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const toggleFilteredSelection = (checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      filteredIds.forEach((id) => {
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
      });
      return next;
    });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setOriginFilter('all');
    setStateFilter('');
    setCityFilter('');
    setEmailFilter('all');
    setBirthdayFilter('all');
    setBirthdayMonthFilter('all');
    setCreatedFrom('');
    setCreatedTo('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Pacientes</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gerencie seus pacientes</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsImportModalOpen(true)}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Importar CSV</span>
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-purple-600 hover:bg-purple-700"
                onClick={() => setEditingPatient(null)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo Paciente
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingPatient ? 'Editar Paciente' : 'Novo Paciente'}
              </DialogTitle>
            </DialogHeader>
            <PatientForm patient={editingPatient} onSuccess={handleSuccess} />
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Modal de Importação CSV */}
      {isImportModalOpen && (
        <PatientCSVImport
          onSuccess={fetchPatients}
          onClose={() => setIsImportModalOpen(false)}
        />
      )}

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4 text-purple-600" />
            Filtros
            {hasActiveFilters && (
              <Badge variant="secondary">{filteredPatients.length} de {patients.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="patient-search">Busca</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="patient-search"
                  placeholder="Nome, telefone, e-mail ou CPF"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Origem</Label>
              <Select value={originFilter} onValueChange={setOriginFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {Object.entries(originLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Com e-mail</Label>
              <Select value={emailFilter} onValueChange={setEmailFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="with">Com e-mail</SelectItem>
                  <SelectItem value="without">Sem e-mail</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="patient-city">Cidade</Label>
              <Input
                id="patient-city"
                placeholder="Filtrar cidade"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="patient-state">UF</Label>
              <Input
                id="patient-state"
                placeholder="UF"
                maxLength={2}
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value.toUpperCase())}
              />
            </div>

            <div className="space-y-2">
              <Label>Aniversário</Label>
              <Select value={birthdayFilter} onValueChange={setBirthdayFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="with">Com data</SelectItem>
                  <SelectItem value="without">Sem data</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Mês aniversário</Label>
              <Select value={birthdayMonthFilter} onValueChange={setBirthdayMonthFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((month, index) => (
                    <SelectItem key={month} value={String(index + 1)}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" className="w-full" onClick={clearFilters} disabled={!hasActiveFilters}>
                <X className="mr-2 h-4 w-4" />
                Limpar
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="created-from">Cadastrado a partir de</Label>
              <Input
                id="created-from"
                type="date"
                value={createdFrom}
                onChange={(e) => setCreatedFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="created-to">Cadastrado até</Label>
              <Input
                id="created-to"
                type="date"
                value={createdTo}
                onChange={(e) => setCreatedTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-4 flex flex-col gap-3 rounded-lg border bg-white p-3 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={allFilteredSelected}
            onCheckedChange={(checked) => toggleFilteredSelection(Boolean(checked))}
            aria-label="Selecionar pacientes filtrados"
          />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {selectedIds.size} selecionado(s)
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {filteredPatients.length} paciente(s) nos filtros atuais
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleFilteredSelection(!allFilteredSelected)}
            disabled={filteredPatients.length === 0}
          >
            {allFilteredSelected ? 'Desmarcar filtrados' : 'Selecionar filtrados'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
            disabled={selectedIds.size === 0}
          >
            Limpar seleção
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setIsBulkDeleteOpen(true)}
            disabled={selectedIds.size === 0}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir selecionados
          </Button>
        </div>
      </div>

      {filteredPatients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-center">
              {searchQuery ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPatients.map((patient) => (
            <Card key={patient?.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedIds.has(patient.id)}
                    onCheckedChange={(checked) => togglePatientSelection(patient.id, Boolean(checked))}
                    aria-label={`Selecionar ${patient.name}`}
                    className="mt-1"
                  />
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <User className="w-5 h-5 flex-shrink-0 text-purple-600" />
                    <span className="truncate">{patient?.name}</span>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  {patient?.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Mail className="w-4 h-4" />
                      {patient.email}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Phone className="w-4 h-4" />
                    {patient?.phone}
                  </div>
                  {(patient.origin || patient.city || patient.state) && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {patient.origin && (
                        <Badge variant="outline">{originLabels[patient.origin]}</Badge>
                      )}
                      {(patient.city || patient.state) && (
                        <Badge variant="secondary">
                          {[patient.city, patient.state].filter(Boolean).join(' / ')}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Link href={`/patients/${patient?.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <Eye className="w-4 h-4 mr-1" />
                      Ver
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingPatient(patient);
                      setIsDialogOpen(true);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(patient?.id ?? '')}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pacientes selecionados?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação vai excluir {selectedIds.size} paciente(s) selecionado(s). Dados relacionados por vínculo de paciente também podem ser removidos pelo banco. Digite EXCLUIR para confirmar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="bulk-confirm">Confirmação</Label>
            <Input
              id="bulk-confirm"
              value={bulkConfirmText}
              onChange={(e) => setBulkConfirmText(e.target.value)}
              placeholder="EXCLUIR"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                handleBulkDelete();
              }}
              disabled={bulkConfirmText !== 'EXCLUIR' || isBulkDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isBulkDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
