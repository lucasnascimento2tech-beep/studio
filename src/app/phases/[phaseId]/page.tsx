
"use client";

import { useParams, useRouter } from "next/navigation";
import { journeyPhases } from "@/data/journeyData";
import { useJourneyStore } from "@/hooks/useJourneyStore";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle2, PlayCircle, FileText, ClipboardList, Lock, Calendar, Info } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { MeetingStatusCard } from "@/components/journey/MeetingStatusCard";
import { useUser } from "@/firebase";
import { useEffect, useState } from "react";
import { getFirestore, collection, query, where, onSnapshot } from "firebase/firestore";

export default function PhaseDetailPage() {
  const { phaseId } = useParams();
  const router = useRouter();
  const { user } = useUser();
  const { progress, isLoaded, scheduleMeeting } = useJourneyStore();
  
  const [members, setMembers] = useState<any[]>([]);
  const [memberProgress, setMemberProgress] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!user?.implementationId) return;

    const db = getFirestore();
    const mQuery = query(collection(db, "implementationMembers"), where("implementationId", "==", user.implementationId));
    const unsubMembers = onSnapshot(mQuery, (snap) => {
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const pQuery = query(collection(db, "moduleProgress"), where("implementationId", "==", user.implementationId));
    const unsubProg = onSnapshot(pQuery, (snap) => {
      const allProg: Record<string, any> = {};
      snap.docs.forEach(d => {
        const data = d.data();
        if (!allProg[data.uid]) allProg[data.uid] = { completedModules: [] };
        if (data.status === 'completed') {
          allProg[data.uid].completedModules.push(data.moduleId);
        }
      });
      setMemberProgress(allProg);
    });

    return () => {
      unsubMembers();
      unsubProg();
    };
  }, [user]);

  if (!isLoaded) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );

  const phase = journeyPhases.find(p => p.id === phaseId);
  if (!phase) return <div>Fase não encontrada.</div>;

  const status = progress.phaseStatus[phase.id] || (phase.order === 0 ? 'InProgress' : 'Locked');
  if (status === 'Locked') {
    router.push('/');
    return null;
  }

  // Individual areas for the user
  const userAreas = (user as any)?.areas || ['todos'];
  const individualModules = phase.modules.filter(m => userAreas.includes(m.area) || userAreas.includes('todos'));
  const completedModules = individualModules.filter(m => progress.completedModules.includes(m.id)).length;
  const percentage = individualModules.length > 0 ? Math.round((completedModules / individualModules.length) * 100) : 100;

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
                <span>Seu Progresso</span>
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
            <ClipboardList className="w-5 h-5" /> Seus Módulos de Aprendizado
          </h2>
          <div className="space-y-4">
            {individualModules.length === 0 ? (
              <Card className="py-12 text-center text-slate-500 border-dashed">
                <p>Nenhum módulo específico para sua área nesta fase.</p>
              </Card>
            ) : (
              individualModules.map((module) => {
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
              })
            )}
          </div>
        </section>

        {/* Checkpoint Section */}
        {percentage === 100 && status === 'InProgress' && (
          <section className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-2 border-secondary bg-secondary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary font-headline">
                  <CheckCircle2 className="w-6 h-6 text-secondary" /> Checkpoint de Validação Individual
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Você concluiu todos os seus módulos da <strong>{phase.title}</strong>. 
                  Responda o checkpoint para liberar o agendamento do seu encontro.
                </p>
                <Button asChild size="lg" className="w-full bg-secondary text-primary font-bold hover:bg-secondary/90">
                  <Link href={`/phases/${phase.id}/checkpoint`}>Realizar Validação</Link>
                </Button>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Meeting Section */}
        {phase.hasMeeting && (
          <MeetingStatusCard 
            phase={phase}
            userProgress={{
              completedModules: progress.completedModules,
              uploadedEvidence: progress.uploadedEvidence,
              status: status
            }}
            userAreas={userAreas}
            isClientMaster={user?.globalRole === 'client_master'}
            members={members}
            memberProgress={memberProgress}
            onSchedule={() => scheduleMeeting(phase.id)}
          />
        )}
      </main>
    </div>
  );
}
