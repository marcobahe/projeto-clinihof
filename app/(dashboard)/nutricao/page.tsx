'use client';

import { useState, useEffect } from 'react';
import { Plus, UtensilsCrossed, Search, Trash2, Printer, Calendar } from 'lucide-react';
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
interface Quote { id: string; title: string; finalAmount: number; }
interface Meal { id?: string; mealType: string; time?: string; description: string; calories?: number; protein?: number; carbs?: number; fat?: number; notes?: string; }
interface Day { dayNumber: number; dayLabel?: string; notes?: string; meals: Meal[]; }
interface MealPlan {
  id: string; title: string; objective?: string; restrictions?: string; observations?: string;
  startDate?: string; endDate?: string; status: string; createdAt: string;
  patient: { id: string; name: string }; collaborator?: { id: string; name: string };
  quote?: { id: string; title: string; finalAmount: number };
  days: Day[];
}

const mealTypes = [
  { value: 'CAFE_DA_MANHA', label: 'Café da Manhã', emoji: '☕' },
  { value: 'LANCHE_MANHA', label: 'Lanche da Manhã', emoji: '🍎' },
  { value: 'ALMOCO', label: 'Almoço', emoji: '🍽️' },
  { value: 'LANCHE_TARDE', label: 'Lanche da Tarde', emoji: '🥤' },
  { value: 'JANTAR', label: 'Jantar', emoji: '🌙' },
  { value: 'CEIA', label: 'Ceia', emoji: '🍵' },
];

export default function NutricaoPage() {
  const { data: session } = useSession();
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [formData, setFormData] = useState({
    patientId: '', collaboratorId: '', title: '', objective: '', restrictions: '',
    observations: '', startDate: '', endDate: '', quoteId: '', days: [] as Day[]
  });

  useEffect(() => { if (session) fetchAll(); }, [session]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [mRes, pRes, cRes, qRes] = await Promise.all([
        fetch('/api/meal-plans'), fetch('/api/patients'), fetch('/api/collaborators'), fetch('/api/quotes')
      ]);
      if (mRes.ok) setPlans(await mRes.json());
      if (pRes.ok) setPatients(await pRes.json());
      if (cRes.ok) setCollaborators(await cRes.json());
      if (qRes.ok) { const d = await qRes.json(); setQuotes(d.quotes || d); }
    } catch { toast.error('Erro ao carregar'); }
    finally { setLoading(false); }
  };

  const addDay = () => {
    setFormData(prev => ({ ...prev, days: [...prev.days, { dayNumber: prev.days.length + 1, dayLabel: '', notes: '', meals: [] }] }));
  };

  const addMeal = (dayIndex: number) => {
    setFormData(prev => {
      const days = [...prev.days];
      days[dayIndex] = { ...days[dayIndex], meals: [...days[dayIndex].meals, { mealType: 'CAFE_DA_MANHA', description: '' }] };
      return { ...prev, days };
    });
  };

  const updateMeal = (dayIndex: number, mealIndex: number, field: string, value: any) => {
    setFormData(prev => {
      const days = [...prev.days];
      const meals = [...days[dayIndex].meals];
      meals[mealIndex] = { ...meals[mealIndex], [field]: value };
      days[dayIndex] = { ...days[dayIndex], meals };
      return { ...prev, days };
    });
  };

  const removeMeal = (dayIndex: number, mealIndex: number) => {
    setFormData(prev => {
      const days = [...prev.days];
      days[dayIndex] = { ...days[dayIndex], meals: days[dayIndex].meals.filter((_, i) => i !== mealIndex) };
      return { ...prev, days };
    });
  };

  const updateDay = (dayIndex: number, field: string, value: string) => {
    setFormData(prev => {
      const days = [...prev.days];
      days[dayIndex] = { ...days[dayIndex], [field]: value };
      return { ...prev, days };
    });
  };

  const handleCreate = async () => {
    if (!formData.patientId || !formData.title || formData.days.length === 0) {
      toast.error('Preencha paciente, título e pelo menos 1 dia');
      return;
    }
    try {
      const res = await fetch('/api/meal-plans', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData)
      });
      if (res.ok) {
        toast.success('Plano alimentar criado!');
        setIsCreateOpen(false);
        setFormData({ patientId: '', collaboratorId: '', title: '', objective: '', restrictions: '', observations: '', startDate: '', endDate: '', quoteId: '', days: [] });
        fetchAll();
      } else { const err = await res.json(); toast.error(err.error || 'Erro'); }
    } catch { toast.error('Erro ao criar plano'); }
  };

  const handlePrint = (plan: MealPlan) => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Plano Alimentar - ${plan.patient.name}</title>
    <style>body{font-family:Arial,sans-serif;max-width:800px;margin:30px auto;padding:20px;font-size:14px}
    h1{color:#7c3aed;border-bottom:2px solid #7c3aed;padding-bottom:10px} h2{color:#6d28d9;margin-top:20px}
    .info{margin:15px 0;line-height:1.6} .day{border:1px solid #e5e7eb;border-radius:8px;margin:15px 0;padding:15px}
    .meal{background:#f3f4f6;border-radius:6px;padding:10px;margin:8px 0} .meal-type{font-weight:bold;color:#7c3aed}
    .macros{color:#6b7280;font-size:12px} .signature{margin-top:50px;border-top:1px solid #000;width:300px;margin-left:auto;margin-right:auto;padding-top:10px;text-align:center}</style></head><body>
    <h1>Plano Alimentar</h1>
    <div class="info"><strong>Paciente:</strong> ${plan.patient.name}<br>
    ${plan.collaborator ? `<strong>Nutricionista:</strong> ${plan.collaborator.name}<br>` : ''}
    ${plan.objective ? `<strong>Objetivo:</strong> ${plan.objective}<br>` : ''}
    ${plan.startDate ? `<strong>Período:</strong> ${new Date(plan.startDate).toLocaleDateString('pt-BR')} - ${plan.endDate ? new Date(plan.endDate).toLocaleDateString('pt-BR') : 'indeterminado'}<br>` : ''}
    ${plan.quote ? `<strong>Orçamento vinculado:</strong> ${plan.quote.title} (${plan.quote.finalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})<br>` : ''}</div>
    ${plan.restrictions ? `<div class="info" style="color:#dc2626"><strong>⚠️ Restrições:</strong> ${plan.restrictions}</div>` : ''}
    ${plan.days.map(day => `<div class="day"><h3>Dia ${day.dayNumber}${day.dayLabel ? ' — ' + day.dayLabel : ''}</h3>
    ${day.meals.map(meal => {
      const mt = mealTypes.find(m => m.value === meal.mealType);
      return `<div class="meal"><span class="meal-type">${mt?.emoji || ''} ${mt?.label || meal.mealType}</span>${meal.time ? ' — ' + meal.time : ''}<br>
      ${meal.description.replace(/\n/g, '<br>')}
      ${meal.calories || meal.protein || meal.carbs || meal.fat ? `<div class="macros">${meal.calories ? `Cal: ${meal.calories}kcal` : ''} ${meal.protein ? `P: ${meal.protein}g` : ''} ${meal.carbs ? `C: ${meal.carbs}g` : ''} ${meal.fat ? `G: ${meal.fat}g` : ''}</div>` : ''}
      </div>`;
    }).join('')}
    ${day.notes ? `<p style="color:#6b7280;font-size:12px;margin-top:5px">${day.notes}</p>` : ''}</div>`).join('')}
    ${plan.observations ? `<div class="info"><strong>Observações:</strong><br>${plan.observations.replace(/\n/g, '<br>')}</div>` : ''}
    <div class="signature">${plan.collaborator?.name || 'Nutricionista'}<br><small>CRN</small></div>
    </body></html>`);
    w.document.close(); w.print();
  };

  const filtered = plans.filter(p =>
    p.patient.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold">Nutrição</h1><p className="text-muted-foreground">Planos alimentares personalizados</p></div>
        <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => setIsCreateOpen(true)}><Plus className="h-4 w-4 mr-2" /> Novo Plano</Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por paciente ou título..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <UtensilsCrossed className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum plano alimentar encontrado</h3>
        </CardContent></Card>
      ) : filtered.map(plan => (
        <Card key={plan.id}>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold">{plan.title}</h3>
                  <Badge variant={plan.status === 'ACTIVE' ? 'default' : 'secondary'}>{plan.status === 'ACTIVE' ? 'Ativo' : plan.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground"><strong>Paciente:</strong> {plan.patient.name}</p>
                {plan.objective && <p className="text-sm text-muted-foreground"><strong>Objetivo:</strong> {plan.objective}</p>}
                {plan.restrictions && <p className="text-sm text-red-600"><strong>Restrições:</strong> {plan.restrictions}</p>}
                {plan.quote && <p className="text-sm text-muted-foreground"><strong>Orçamento:</strong> {plan.quote.title} ({formatCurrency(plan.quote.finalAmount)})</p>}

                <div className="mt-3 space-y-2">
                  {plan.days.map((day, di) => (
                    <div key={di} className="p-3 bg-gray-50 dark:bg-gray-900 rounded">
                      <p className="font-semibold text-sm mb-1">Dia {day.dayNumber}{day.dayLabel ? ` — ${day.dayLabel}` : ''}</p>
                      {day.meals.map((meal, mi) => {
                        const mt = mealTypes.find(m => m.value === meal.mealType);
                        return (
                          <div key={mi} className="text-sm ml-4 mb-1">
                            <span className="text-purple-600 font-medium">{mt?.emoji} {mt?.label}</span>
                            {meal.time && <span className="text-muted-foreground ml-1">({meal.time})</span>}
                            {' — '}{meal.description.substring(0, 80)}{meal.description.length > 80 ? '...' : ''}
                            {meal.calories && <span className="text-muted-foreground ml-2 text-xs">{meal.calories}kcal</span>}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => handlePrint(plan)}><Printer className="h-4 w-4 mr-2" /> Imprimir</Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Modal Criar Plano */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Plano Alimentar</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Paciente *</Label>
                <Select value={formData.patientId} onValueChange={v => setFormData(p => ({ ...p, patientId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Nutricionista</Label>
                <Select value={formData.collaboratorId} onValueChange={v => setFormData(p => ({ ...p, collaboratorId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{collaborators.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Título *</Label><Input value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Plano de Emagrecimento 30 dias" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Objetivo</Label><Input value={formData.objective} onChange={e => setFormData(p => ({ ...p, objective: e.target.value }))} placeholder="Ex: Perda de peso, hipertrofia" /></div>
              <div><Label>Restrições</Label><Input value={formData.restrictions} onChange={e => setFormData(p => ({ ...p, restrictions: e.target.value }))} placeholder="Ex: Intolerância à lactose" /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Início</Label><Input type="date" value={formData.startDate} onChange={e => setFormData(p => ({ ...p, startDate: e.target.value }))} /></div>
              <div><Label>Fim</Label><Input type="date" value={formData.endDate} onChange={e => setFormData(p => ({ ...p, endDate: e.target.value }))} /></div>
              <div><Label>Vincular Orçamento</Label>
                <Select value={formData.quoteId} onValueChange={v => setFormData(p => ({ ...p, quoteId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {quotes.filter((q: any) => q.status === 'ACCEPTED' || q.status === 'PENDING').map((q: any) => (
                      <SelectItem key={q.id} value={q.id}>{q.title} ({formatCurrency(q.finalAmount)})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dias e Refeições */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-3">
                <Label className="text-lg font-semibold">Dias do Plano</Label>
                <Button type="button" size="sm" onClick={addDay}><Plus className="h-4 w-4 mr-1" /> Dia</Button>
              </div>
              {formData.days.map((day, di) => (
                <Card key={di} className="mb-4">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="font-bold text-purple-600">Dia {day.dayNumber}</span>
                      <Input className="w-48" placeholder="Label (ex: Segunda)" value={day.dayLabel || ''} onChange={e => updateDay(di, 'dayLabel', e.target.value)} />
                      <div className="flex-1" />
                      <Button size="sm" variant="outline" onClick={() => addMeal(di)}><Plus className="h-3 w-3 mr-1" /> Refeição</Button>
                    </div>
                    {day.meals.map((meal, mi) => {
                      const mt = mealTypes.find(m => m.value === meal.mealType);
                      return (
                        <div key={mi} className="grid grid-cols-12 gap-2 mb-2 p-2 bg-gray-50 dark:bg-gray-900 rounded">
                          <div className="col-span-2">
                            <Label className="text-xs">Refeição</Label>
                            <Select value={meal.mealType} onValueChange={v => updateMeal(di, mi, 'mealType', v)}>
                              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>{mealTypes.map(m => <SelectItem key={m.value} value={m.value}>{m.emoji} {m.label}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-1"><Label className="text-xs">Hora</Label><Input className="h-9 text-xs" placeholder="07:00" value={meal.time || ''} onChange={e => updateMeal(di, mi, 'time', e.target.value)} /></div>
                          <div className="col-span-5"><Label className="text-xs">Descrição</Label><Input className="h-9 text-xs" placeholder="O que comer" value={meal.description} onChange={e => updateMeal(di, mi, 'description', e.target.value)} /></div>
                          <div className="col-span-1"><Label className="text-xs">Kcal</Label><Input className="h-9 text-xs" type="number" placeholder="0" value={meal.calories || ''} onChange={e => updateMeal(di, mi, 'calories', parseInt(e.target.value) || undefined)} /></div>
                          <div className="col-span-1"><Label className="text-xs">Prot(g)</Label><Input className="h-9 text-xs" type="number" step="0.1" placeholder="0" value={meal.protein || ''} onChange={e => updateMeal(di, mi, 'protein', parseFloat(e.target.value) || undefined)} /></div>
                          <div className="col-span-1"><Label className="text-xs">Carb(g)</Label><Input className="h-9 text-xs" type="number" step="0.1" placeholder="0" value={meal.carbs || ''} onChange={e => updateMeal(di, mi, 'carbs', parseFloat(e.target.value) || undefined)} /></div>
                          <div className="col-span-1 flex items-end"><Button size="sm" variant="destructive" className="h-9 w-9 p-0" onClick={() => removeMeal(di, mi)}>×</Button></div>
                        </div>
                      );
                    })}
                    {day.meals.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">Adicione refeições a este dia</p>}
                  </CardContent>
                </Card>
              ))}
              {formData.days.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Adicione pelo menos 1 dia ao plano</p>}
            </div>

            <div><Label>Observações</Label><Textarea value={formData.observations} onChange={e => setFormData(p => ({ ...p, observations: e.target.value }))} placeholder="Observações gerais" rows={2} /></div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} className="bg-purple-600 hover:bg-purple-700">Criar Plano</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
