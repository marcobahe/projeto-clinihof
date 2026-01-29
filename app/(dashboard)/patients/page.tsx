'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, User, Phone, Mail, Loader2, Edit, Trash2, Eye } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { PatientForm } from '@/components/forms/patient-form';

interface Patient {
  id: string;
  name: string;
  email?: string | null;
  phone: string;
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

  const fetchPatients = async () => {
    try {
      const response = await fetch('/api/patients');
      if (response.ok) {
        const data = await response.json();
        setPatients(data);
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

  const handleSuccess = () => {
    setIsDialogOpen(false);
    setEditingPatient(null);
    fetchPatients();
  };

  const filteredPatients = patients?.filter((patient) =>
    patient?.name?.toLowerCase()?.includes(searchQuery?.toLowerCase() ?? '')
  ) ?? [];

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

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Buscar por nome..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

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
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-purple-600" />
                  {patient?.name}
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
    </div>
  );
}
