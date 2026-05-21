
"use client";

import { useJourneyStore } from "@/hooks/useJourneyStore";
import { journeyPhases } from "@/data/journeyData";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, XCircle, FileText, User, MessageSquare } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function ImplantadorPage() {
  const { progress, isLoaded, approvePhase, rejectPhase, resetProgress } = useJourneyStore();
  const { toast } = useToast();
  const [notes, setNotes] = useState<Record<string, string>>({});

  if (!isLoaded) return null;

  const handleApprove = (phaseId: string) => {
    approvePhase(phaseId);
    toast({ title: "Fase Aprovada", description: "O cliente foi notificado e a próxima fase foi liberada." });
  };

  const handleReject = (phaseId: string) => {
    if (!notes[phaseId]) {
      toast({ title: "Observação necessária", description: "Explique o motivo da pendência.", variant: "destructive" });
      return;
    }
    rejectPhase(phaseId, notes[phaseId]);
    toast({ title: "Status Atualizado", description: "Fase marcada com pendência de ajuste." });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-slate-900 text-white py-4 px-6 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Badge className="bg-blue-600">MODO IMPLANTADOR</Badge>
          <h1 className="font-bold text-lg">Portal Especialista 2tech</h1>
        </div>
        <div className="flex gap-4">
          <Button variant="ghost" className="text-white hover:bg-white/10" asChild>
            <Link href="/">Voltar ao App</Link>
          </Button>
          <Button variant="destructive" size="sm" onClick={() => { if(confirm("Deseja resetar todo o progresso simulado?")) resetProgress(); }}>
            Resetar Simulação
          </Button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-6">
        <div className="mb-8">
          <h2 className="text-2xl font-headline font-bold text-slate-800">Visão Geral de Clientes</h2>
          <p className="text-slate-500">Acompanhe as evidências, provas e solicite agendamentos.</p>
        </div>

        <div className="space-y-8">
          {journeyPhases.map((phase) => {
            const status = progress.phaseStatus[phase.id] || (phase.order === 0 ? 'InProgress' : 'Locked');
            const evidenceCount = phase.modules.filter(m => progress.uploadedEvidence[m.id]).length;
            const requiredEvidence = phase.modules.filter(m => m.requiresEvidence).length;

            return (
              <Card key={phase.id} className={cn(
                "border-l-4",
                status === 'Completed' ? "border-l-green-500" : "border-l-blue-500"
              )}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      Fase {phase.order}: {phase.title}
                      {status === 'Completed' && <CheckCircle className="w-5 h-5 text-green-500" />}
                    </CardTitle>
                    <Badge variant="outline" className="mt-1">{status}</Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Evidências</p>
                    <p className="text-lg font-bold text-slate-700">{evidenceCount} / {requiredEvidence}</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Evidence Review */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg border shadow-sm">
                      <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Arquivos Enviados
                      </h4>
                      <ul className="space-y-2">
                        {phase.modules.filter(m => progress.uploadedEvidence[m.id]).map(m => (
                          <li key={m.id} className="text-xs flex justify-between items-center bg-slate-50 p-2 rounded">
                            <span className="font-medium text-slate-600">{m.title}</span>
                            <span className="text-blue-600 underline cursor-pointer">{progress.uploadedEvidence[m.id].name}</span>
                          </li>
                        ))}
                        {phase.modules.filter(m => m.requiresEvidence && !progress.uploadedEvidence[m.id]).map(m => (
                          <li key={m.id} className="text-xs flex justify-between items-center bg-red-50 p-2 rounded text-red-600">
                            <span>{m.title}</span>
                            <span className="italic">Pendente</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-white p-4 rounded-lg border shadow-sm">
                      <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" /> Notas do Implantador
                      </h4>
                      <Textarea 
                        placeholder="Adicione observações para o cliente..." 
                        className="text-xs min-h-[80px]"
                        value={notes[phase.id] || ""}
                        onChange={(e) => setNotes({...notes, [phase.id]: e.target.value})}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-slate-50 border-t flex justify-end gap-3 p-4">
                  <Button variant="outline" size="sm" onClick={() => handleReject(phase.id)} disabled={status === 'Completed'}>
                    Marcar Pendência
                  </Button>
                  <Button className="bg-green-600 hover:bg-green-700 text-white" size="sm" onClick={() => handleApprove(phase.id)} disabled={status === 'Completed'}>
                    Aprovar Fase
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
