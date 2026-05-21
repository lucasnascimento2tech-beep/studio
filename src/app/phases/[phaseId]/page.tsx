
"use client";

import { useParams, useRouter } from "next/navigation";
import { journeyPhases } from "@/data/journeyData";
import { useJourneyStore } from "@/hooks/useJourneyStore";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle2, PlayCircle, FileText, ClipboardList, Lock, Calendar } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function PhaseDetailPage() {
  const { phaseId } = useParams();
  const router = useRouter();
  const { progress, isLoaded } = useJourneyStore();

  if (!isLoaded) return null;

  const phase = journeyPhases.find(p => p.id === phaseId);
  if (!phase) return <div>Fase não encontrada.</div>;

  const status = progress.phaseStatus[phase.id] || (phase.order === 0 ? 'InProgress' : 'Locked');
  if (status === 'Locked') {
    router.push('/');
    return null;
  }

  const completedModules = phase.modules.filter(m => progress.completedModules.includes(m.id)).length;
  const percentage = Math.round((completedModules / phase.modules.length) * 100);

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="bg-white border-b py-4">
        <div className="max-w-4xl mx-auto px-4">
          <Button variant="ghost" size="sm" asChild className="mb-4 text-muted-foreground hover:text-primary">
            <Link href="/"><ArrowLeft className="w-4 h-4 mr-2" /> Voltar para a Jornada</Link>
          </Button>
          <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-secondary font-bold uppercase tracking-widest text-xs">Fase {phase.order}</span>
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-100">{status}</Badge>
              </div>
              <h1 className="text-3xl font-headline font-bold text-primary">{phase.title}</h1>
            </div>
            <div className="min-w-[200px]">
              <div className="flex justify-between text-xs mb-1 font-medium text-muted-foreground">
                <span>Progresso da Fase</span>
                <span>{percentage}%</span>
              </div>
              <Progress value={percentage} className="h-2" />
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 mt-8">
        <section className="mb-10">
          <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
            <ClipboardList className="w-5 h-5" /> Módulos de Aprendizado
          </h2>
          <div className="space-y-4">
            {phase.modules.map((module) => {
              const isModuleCompleted = progress.completedModules.includes(module.id);
              return (
                <Card key={module.id} className={cn(
                  "transition-all border-l-4",
                  isModuleCompleted ? "border-l-green-500 bg-green-50/20" : "border-l-primary/20 hover:border-l-primary"
                )}>
                  <div className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-3 rounded-lg",
                        isModuleCompleted ? "bg-green-100 text-green-600" : "bg-blue-50 text-primary"
                      )}>
                        {module.type === 'Material' && <PlayCircle className="w-6 h-6" />}
                        {module.type === 'Task' && <FileText className="w-6 h-6" />}
                        {module.type === 'Evidence' && <FileText className="w-6 h-6" />}
                        {module.type === 'Pre-Meeting' && <Calendar className="w-6 h-6" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-bold text-primary">{module.title}</h3>
                          {isModuleCompleted && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="bg-gray-100 px-1.5 py-0.5 rounded">{module.type}</span>
                          <span>{module.estimatedTime}</span>
                        </div>
                      </div>
                    </div>
                    <Button asChild variant={isModuleCompleted ? "outline" : "default"} size="sm">
                      <Link href={`/phases/${phase.id}/modules/${module.id}`}>
                        {isModuleCompleted ? "Revisar" : "Iniciar"}
                      </Link>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Checkpoint Section */}
        {percentage === 100 && (
          <section className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-2 border-secondary bg-secondary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary font-headline">
                  <CheckCircle2 className="w-6 h-6 text-secondary" /> Checkpoint de Validação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Você concluiu todos os módulos da <strong>{phase.title}</strong>. 
                  Agora responda o mini questionário de validação para desbloquear a próxima etapa.
                </p>
                <Button asChild size="lg" className="w-full bg-secondary text-primary font-bold hover:bg-secondary/90">
                  <Link href={`/phases/${phase.id}/checkpoint`}>Realizar Validação da Fase</Link>
                </Button>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Meeting Section if Scheduled or in meeting status */}
        {(status === 'ReadyToSchedule' || status === 'Scheduled' || status === 'WaitingApproval') && (
          <section className="mb-10">
            <Card className="border-2 border-primary bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary font-headline">
                  <Calendar className="w-6 h-6" /> Agendamento de Encontro Guiado
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-white rounded-lg border">
                  <h4 className="font-bold text-primary mb-2">{phase.meetingTitle}</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Pré-requisitos concluídos com sucesso. Agora você pode agendar o encontro com seu implantador 2tech.
                  </p>
                  
                  {status === 'ReadyToSchedule' ? (
                    <div className="flex flex-col gap-3">
                      <Button asChild className="bg-secondary text-primary font-bold">
                        <a href="https://agenda.exemplo.com/implantacao-2tech" target="_blank" rel="noopener noreferrer">
                          Abrir Agenda do Implantador
                        </a>
                      </Button>
                      <Button variant="outline" onClick={() => scheduleMeeting(phase.id as string)}>
                        Já agendei meu encontro
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-blue-50 p-4 rounded-md border border-blue-100 flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Encontro Marvado como Agendado</p>
                        <p className="text-xs text-blue-700 mt-1">Após a reunião, o implantador irá validar seu progresso para liberar a próxima fase.</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </main>
    </div>
  );
}
