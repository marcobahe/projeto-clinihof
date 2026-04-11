'use client';

import { useState, useEffect } from 'react';
import { Plus, FlaskConical, Search, Printer } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

interface Patient { id: string; name: string; }
interface Collaborator { id: string; name: string; }
interface Formula {
  id: string; name: string; description?: string; ingredients: string; posology?: string;
  validity?: string; compoundPharmacy?: string; status: string; date: string;
  patient: { id: string; name: string }; collaborator?: { id: string; name: string };
}

export default function FormulasPage() {
  const { data: session } = useSession();
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [formData, setFormData] = useState({
    patientId: '', collaboratorId: '', name: '', description: '', ingredients: '',
    posology: '', validity: '', compoundPharmacy: ''
  });

  useEffect(() => { if (session) fetchAll(); }, [session]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [fRes, pRes, cRes] = await Promise.all([
        fetch('/api/formulas'), fetch('/api/patients'), fetch('/api/collaborators')
      ]);
      if (fRes.ok) setFormulas(await fRes.json());
      if (pRes.ok) setPatients(await pRes.json());
      if (cRes.ok) setCollaborators(await cRes.json());
    } catch { toast.error('Erro ao carregar dados'); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!formData.patientId || !formData.name || !formData.ingredients) {
      toast.error('Preencha paciente, nome e ingredientes');
      return;
    }
    try {
      const res = await fetch('/api/formulas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData)
      });
      if (res.ok) {
        toast.success('Fórmula criada!');
        setIsCreateOpen(false);
        setFormData({ patientId: '', collaboratorId: '', name: '', description: '', ingredients: '', posology: '', validity: '', compoundPharmacy: '' });
        fetchAll();
      } else { const err = await res.json(); toast.error(err.error || 'Erro'); }
    } catch { toast.error('Erro ao criar fórmula'); }
  };

  const handlePrint = (formula: Formula) => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Fórmula - ${formula.patient.name}</title>
    <style>body{font-family:Arial,sans-serif;max-width:700px;margin:40px auto;padding:20px}
    h1{color:#7c3aed;border-bottom:2px solid #7c3aed;padding-bottom:10px}
    .info{margin:20px 0;line-height:1.8} .section{margin:15px 0;padding:15px;border:1px solid #e5e7eb;border-radius:8px;background:#fafafa}
    .signature{margin-top:60px;border-top:1px solid #000;width:300px;margin-left:auto;margin-right:auto;padding-top:10px;text-align:center}</style></head><body>
    <h1>Prescrição de Fórmula Manipulada</h1>
    <div class="info"><strong>Paciente:</strong> ${formula.patient.name}<br>
    <strong>Data:</strong> ${new Date(formula.date).toLocaleDateString('pt-BR')}<br>
    ${formula.collaborator ? `<strong>Profissional:</strong> ${formula.collaborator.name}<br>` : ''}
    ${formula.compoundPharmacy ? `<strong>Farmácia:</strong> ${formula.compoundPharmacy}<br>` : ''}
    ${formula.validity ? `<strong>Validade:</strong> ${formula.validity}<br>` : ''}</div>
    <div class="section"><strong>Fórmula:</strong> ${formula.name}<br><br>
    <strong>Composição / Ingredientes:</strong><br>${formula.ingredients.replace(/\n/g, '<br>')}</div>
    ${formula.posology ? `<div class="section"><strong>Posologia:</strong><br>${formula.posology.replace(/\n/g, '<br>')}</div>` : ''}
    ${formula.description ? `<div class="section"><strong>Observações:</strong><br>${formula.description.replace(/\n/g, '<br>')}</div>` : ''}
    <div class="signature">${formula.collaborator?.name || 'Profissional Responsável'}<br><small>CRM / CRO</small></div>
    </body></html>`);
    w.document.close(); w.print();
  };

  const filtered = formulas.filter(f =>
    f.patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Fórmulas Manipuladas</h1><p className="text-muted-foreground">Prescrições de fórmulas personalizadas</p></div>
        <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => setIsCreateOpen(true)}><Plus className="h-4 w-4 mr-2" /> Nova Fórmula</Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por paciente ou fórmula..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <FlaskConical className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma fórmula encontrada</h3>
        </CardContent></Card>
      ) : filtered.map(formula => (
        <Card key={formula.id}>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold">{formula.name}</h3>
                  <Badge variant={formula.status === 'ACTIVE' ? 'default' : 'secondary'}>{formula.status === 'ACTIVE' ? 'Ativa' : formula.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-1"><strong>Paciente:</strong> {formula.patient.name} — {new Date(formula.date).toLocaleDateString('pt-BR')}</p>
                {formula.compoundPharmacy && <p className="text-sm text-muted-foreground"><strong>Farmácia:</strong> {formula.compoundPharmacy}</p>}
                {formula.validity && <p className="text-sm text-muted-foreground"><strong>Validade:</strong> {formula.validity}</p>}
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded text-sm whitespace-pre-wrap">{formula.ingredients}</div>
                {formula.posology && <div className="mt-2 text-sm"><strong>Posologia:</strong> {formula.posology}</div>}
              </div>
              <Button size="sm" variant="outline" onClick={() => handlePrint(formula)}><Printer className="h-4 w-4 mr-2" /> Imprimir</Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova Fórmula Manipulada</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Paciente *</Label>
                <Select value={formData.patientId} onValueChange={v => setFormData(p => ({ ...p, patientId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Profissional</Label>
                <Select value={formData.collaboratorId} onValueChange={v => setFormData(p => ({ ...p, collaboratorId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{collaborators.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Nome da Fórmula *</Label><Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Gel Facial Anti-manchas 30g" /></div>
            <div><Label>Ingredientes / Composição *</Label><Textarea value={formData.ingredients} onChange={e => setFormData(p => ({ ...p, ingredients: e.target.value }))} placeholder="Lista de ingredientes com quantidades, um por linha" rows={5} /></div>
            <div><Label>Posologia (Como Usar)</Label><Textarea value={formData.posology} onChange={e => setFormData(p => ({ ...p, posology: e.target.value }))} placeholder="Instruções de uso" rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Validade</Label><Input value={formData.validity} onChange={e => setFormData(p => ({ ...p, validity: e.target.value }))} placeholder="Ex: 90 dias" /></div>
              <div><Label>Farmácia de Manipulação</Label><Input value={formData.compoundPharmacy} onChange={e => setFormData(p => ({ ...p, compoundPharmacy: e.target.value }))} placeholder="Ex: Farmácia ABC" /></div>
            </div>
            <div><Label>Observações</Label><Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Observações adicionais" rows={2} /></div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} className="bg-purple-600 hover:bg-purple-700">Criar Fórmula</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
