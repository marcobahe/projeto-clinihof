'use client';

import { useState, useEffect } from 'react';
import { Plus, FileText, Trash2, Printer, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { useSession } from 'next-auth/react';

interface Patient { id: string; name: string; }
interface Collaborator { id: string; name: string; }
interface PrescriptionItem { id?: string; medication: string; dosage: string; frequency: string; duration: string; notes?: string; }
interface Prescription {
  id: string; date: string; diagnosis?: string; instructions: string; observations?: string; status: string;
  patient: { id: string; name: string }; collaborator?: { id: string; name: string }; items: PrescriptionItem[];
}

export default function ReceitasPage() {
  const { data: session } = useSession();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [formData, setFormData] = useState({
    patientId: '', collaboratorId: '', diagnosis: '', instructions: '', observations: '', items: [] as PrescriptionItem[]
  });

  useEffect(() => { if (session) { fetchAll(); } }, [session]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [prescRes, patRes, collabRes] = await Promise.all([
        fetch('/api/prescriptions'), fetch('/api/patients'), fetch('/api/collaborators')
      ]);
      if (prescRes.ok) setPrescriptions(await prescRes.json());
      if (patRes.ok) setPatients(await patRes.json());
      if (collabRes.ok) setCollaborators(await collabRes.json());
    } catch { toast.error('Erro ao carregar dados'); }
    finally { setLoading(false); }
  };

  const handleAddItem = () => {
    setFormData(prev => ({ ...prev, items: [...prev.items, { medication: '', dosage: '', frequency: '', duration: '', notes: '' }] }));
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    setFormData(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const handleCreate = async () => {
    if (!formData.patientId || !formData.instructions || formData.items.length === 0) {
      toast.error('Preencha paciente, instruções e pelo menos 1 medicamento');
      return;
    }
    try {
      const res = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        toast.success('Receita criada!');
        setIsCreateOpen(false);
        setFormData({ patientId: '', collaboratorId: '', diagnosis: '', instructions: '', observations: '', items: [] });
        fetchAll();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Erro ao criar receita');
      }
    } catch { toast.error('Erro ao criar receita'); }
  };

  const handlePrint = (prescription: Prescription) => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Receita - ${prescription.patient.name}</title>
    <style>body{font-family:Arial,sans-serif;max-width:700px;margin:40px auto;padding:20px}
    h1{color:#7c3aed;border-bottom:2px solid #7c3aed;padding-bottom:10px}
    .info{margin:20px 0;line-height:1.6} .item{margin:10px 0;padding:10px;border:1px solid #e5e7eb;border-radius:8px}
    .item strong{color:#374151} .footer{margin-top:40px;border-top:1px solid #e5e7eb;padding-top:20px;text-align:center;color:#6b7280}
    .signature{margin-top:60px;border-top:1px solid #000;width:300px;margin-left:auto;margin-right:auto;padding-top:10px;text-align:center}</style></head><body>
    <h1>Receita Médica</h1>
    <div class="info"><strong>Paciente:</strong> ${prescription.patient.name}<br>
    <strong>Data:</strong> ${new Date(prescription.date).toLocaleDateString('pt-BR')}<br>
    ${prescription.diagnosis ? `<strong>Diagnóstico:</strong> ${prescription.diagnosis}<br>` : ''}
    ${prescription.collaborator ? `<strong>Profissional:</strong> ${prescription.collaborator.name}<br>` : ''}</div>
    <h2 style="color:#7c3aed">Medicamentos</h2>
    ${prescription.items.map(item => `<div class="item"><strong>${item.medication}</strong><br>
    Dosagem: ${item.dosage} | Frequência: ${item.frequency} | Duração: ${item.duration}
    ${item.notes ? `<br><em>${item.notes}</em>` : ''}</div>`).join('')}
    ${prescription.instructions ? `<div class="info"><strong>Instruções:</strong><br>${prescription.instructions}</div>` : ''}
    ${prescription.observations ? `<div class="info"><strong>Observações:</strong><br>${prescription.observations}</div>` : ''}
    <div class="signature">${prescription.collaborator?.name || 'Profissional Responsável'}<br><small>CRM / CRO</small></div>
    <div class="footer">ClíniHOF — Sistema de Gestão Clínica</div></body></html>`);
    w.document.close();
    w.print();
  };

  const filtered = prescriptions.filter(p =>
    p.patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.diagnosis || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Receitas Médicas</h1>
          <p className="text-muted-foreground">Prescrições e receitas para pacientes</p>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nova Receita
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por paciente ou diagnóstico..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma receita encontrada</h3>
          <p className="text-muted-foreground">Crie sua primeira receita médica</p>
        </CardContent></Card>
      ) : filtered.map(prescription => (
        <Card key={prescription.id}>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold">{prescription.patient.name}</h3>
                  <Badge variant={prescription.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {prescription.status === 'ACTIVE' ? 'Ativa' : prescription.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-1">{new Date(prescription.date).toLocaleDateString('pt-BR')}</p>
                {prescription.diagnosis && <p className="text-sm text-muted-foreground mb-2"><strong>Diagnóstico:</strong> {prescription.diagnosis}</p>}
                {prescription.collaborator && <p className="text-sm text-muted-foreground"><strong>Profissional:</strong> {prescription.collaborator.name}</p>}
                <div className="mt-3 space-y-1">
                  {prescription.items.map((item, i) => (
                    <div key={i} className="text-sm p-2 bg-gray-50 dark:bg-gray-900 rounded">
                      <strong>{item.medication}</strong> — {item.dosage} | {item.frequency} | {item.duration}
                    </div>
                  ))}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => handlePrint(prescription)}>
                <Printer className="h-4 w-4 mr-2" /> Imprimir
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Modal Criar Receita */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova Receita Médica</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Paciente *</Label>
                <Select value={formData.patientId} onValueChange={v => setFormData(prev => ({ ...prev, patientId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Profissional</Label>
                <Select value={formData.collaboratorId} onValueChange={v => setFormData(prev => ({ ...prev, collaboratorId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{collaborators.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Diagnóstico / CID</Label><Input value={formData.diagnosis} onChange={e => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))} placeholder="Ex: L02.0 - Lesão cutânea" /></div>
            
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-3">
                <Label>Medicamentos *</Label>
                <Button type="button" size="sm" onClick={handleAddItem}><Plus className="h-4 w-4 mr-1" /> Medicamento</Button>
              </div>
              {formData.items.map((item, i) => (
                <Card key={i} className="mb-3"><CardContent className="p-3">
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-4"><Label className="text-xs">Medicamento</Label><Input value={item.medication} onChange={e => handleItemChange(i, 'medication', e.target.value)} placeholder="Nome" /></div>
                    <div className="col-span-2"><Label className="text-xs">Dosagem</Label><Input value={item.dosage} onChange={e => handleItemChange(i, 'dosage', e.target.value)} placeholder="10mg" /></div>
                    <div className="col-span-2"><Label className="text-xs">Frequência</Label><Input value={item.frequency} onChange={e => handleItemChange(i, 'frequency', e.target.value)} placeholder="8/8h" /></div>
                    <div className="col-span-2"><Label className="text-xs">Duração</Label><Input value={item.duration} onChange={e => handleItemChange(i, 'duration', e.target.value)} placeholder="7 dias" /></div>
                    <div className="col-span-1 flex items-end"><Button size="sm" variant="destructive" onClick={() => handleRemoveItem(i)}>×</Button></div>
                  </div>
                </CardContent></Card>
              ))}
              {formData.items.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Adicione pelo menos 1 medicamento</p>}
            </div>

            <div><Label>Instruções</Label><Textarea value={formData.instructions} onChange={e => setFormData(prev => ({ ...prev, instructions: e.target.value }))} placeholder="Instruções gerais da receita" rows={3} /></div>
            <div><Label>Observações</Label><Textarea value={formData.observations} onChange={e => setFormData(prev => ({ ...prev, observations: e.target.value }))} placeholder="Observações adicionais" rows={2} /></div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} className="bg-purple-600 hover:bg-purple-700">Criar Receita</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
