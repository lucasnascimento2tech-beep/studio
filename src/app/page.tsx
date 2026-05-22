
"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/firebase";
import { journeyPhases } from "@/data/journeyData";
import { ProgressHeader } from "@/components/journey/ProgressHeader";
import { PhaseCard } from "@/components/journey/PhaseCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Settings, Info, Trophy, Rocket, UserPlus, AlertCircle, Calendar, ArrowRight, CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useRouter } from "next/navigation";
import { UserNav } from "@/components/layout/UserNav";
import { useJourneyStore } from "@/hooks/useJourneyStore";
import { useCurrentImplementationMember } from "@/hooks/useCurrentImplementationMember";
import { cn } from "@/lib/utils";

export default function Home() {
  const { user, loading: authLoading } = useUser();
  const { progress, isLoaded } = useJourneyStore();
  const { effectiveAreas, loading: memberLoading } = useCurrentImplementationMember();
  const router = useRouter();

  if (authLoading || !isLoaded || memberLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium text-lg animate-pulse">Sincronizando jornada individual...</p>
      </div>
    </div>
  );

  if (user?.globalRole === 'client_participant' && effectiveAreas.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-orange-500 mx-auto" />
          <h1 className="text-2xl font-bold">Acesso não configurado</h1>
          <p className="text-slate-500">Seu usuário ainda não possui áreas de acesso liberadas nesta implantação. Por favor, entre em contato com o responsável da sua empresa.</p>
          <Button onClick={() => router.push('/login')} variant="outline">Sair da conta</Button>
        </div>
      </div>
    );
  }

  // Lógica de Próxima Fase
  const nextPhase = journeyPhases.find(p => progress.phaseStatus[p.id] !== 'Completed');
  const isJourneyCompleted = !nextPhase;
  const nextPhaseStatus = nextPhase ? (progress.phaseStatus[nextPhase.id] || (nextPhase.id === 'fase-0' ? 'InProgress' : 'Locked')) : 'Completed';

  const renderMeetingInfoCard = () => {
    if (!nextPhase || !nextPhase.hasMeeting) return null;

    const config = {
      ReadyToSchedule: {
        title: "Encontro liberado",
        description: "Você já pode acessar a fase e registrar o agendamento com o implantador.",
        button: "Agendar na fase",
        icon: <Calendar className="w-6 h-6 text-green-600" />,
        color: "border-green-200 bg-green-50/30"
      },
      Scheduled: {
        title: "Encontro agendado",
        description: "Acesse a fase para acompanhar o status e o horário do encontro.",
        button: "Ver encontro",
        icon: <Calendar className="w-6 h-6 text-blue-600" />,
        color: "border-blue-200 bg-blue-50/30"
      },
      WaitingApproval: {
        title: "Aguardando aprovação",
        description: "O encontro foi marcado como realizado e aguarda validação da equipe 2tech.",
        button: "Ver status",
        icon: <Clock className="w-6 h-6 text-amber-600" />,
        color: "border-amber-200 bg-amber-50/30"
      },
      PendingAdjustments: {
        title: "Ajustes solicitados",
        description: "Acesse a fase para verificar o comentário do implantador e reagendar se necessário.",
        button: "Ver ajustes",
        icon: <AlertCircle className="w-6 h-6 text-red-600" />,
        color: "border-red-200 bg-red-50/30"
      },
      default: {
        title: "Esta fase possui encontro",
        description: "Após concluir os módulos e a validação, o agendamento será liberado nesta fase.",
        button: "Acessar fase",
        icon: <Calendar className="w-6 h-6 text-slate-400" />,
        color: "border-slate-100 bg-slate-50/50"
      }
    };

    const info = config[nextPhaseStatus as keyof typeof config] || config.default;

    return (
      <Card className={cn("border-2 shadow-lg transition-all overflow-hidden", info.color)}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-white shadow-sm">
              {info.icon}
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-800">{info.title}</CardTitle>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Ação individual necessária</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-white">{nextPhaseStatus}</Badge>
        </CardHeader>
        <CardContent className="pt-2">
          <p className="text-sm text-slate-600 leading-relaxed">{info.description}</p>
        </CardContent>
        <CardFooter className="bg-white/50 border-t p-4 flex justify-end">
          <Button asChild variant="outline" size="sm" className="font-bold">
            <Link href={`/phases/${nextPhase.id}`}>{info.button} <ArrowRight className="w-4 h-4 ml-2" /></Link>
          </Button>
        </CardFooter>
      </Card>
    );
  };

  return (
    <AuthGuard allowedRoles={['client_master', 'client_participant']}>
      <div className="min-h-screen flex flex-col bg-slate-50">
        <nav className="bg-slate-900 text-white py-3 px-6 flex justify-between items-center shadow-lg sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-1.5 rounded-lg">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">2tech</span>
            <span className="text-white/40 text-xs hidden md:inline font-medium uppercase tracking-widest">| Portal do Cliente</span>
          </div>
          <div className="flex items-center gap-4">
            {user?.globalRole === 'client_master' && (
              <Button variant="default" size="sm" asChild className="bg-secondary text-primary font-bold hover:bg-secondary/80 hidden md:flex">
                <Link href="/app/participants"><UserPlus className="w-4 h-4 mr-2" /> Gerenciar Equipe</Link>
              </Button>
            )}
            <UserNav user={user} />
          </div>
        </nav>

        {progress && <ProgressHeader progress={progress} />}

        <main className="flex-1 max-w-7xl mx-auto w-full p-4 py-8">
          <div className="space-y-8">
            {isJourneyCompleted ? (
              <div className="bg-white rounded-3xl shadow-xl border-none p-12 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full -mr-32 -mt-32" />
                <div className="relative z-10 space-y-6">
                  <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-green-600">
                    <Trophy className="w-10 h-10" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-3xl font-bold text-slate-900">Jornada Concluída!</h2>
                    <p className="text-slate-500 max-w-lg mx-auto">Parabéns, sua jornada de implantação foi concluída com sucesso. A partir de agora, sua equipe pode seguir utilizando o 2tech com total autonomia.</p>
                  </div>
                  <Button asChild size="lg" className="bg-green-600 hover:bg-green-700 text-white font-bold px-12 h-14 rounded-2xl shadow-xl shadow-green-100">
                    <Link href={`/phases/${journeyPhases[0].id}`}>Revisar Conteúdos</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl shadow-xl border-none p-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
                <div className="bg-primary/10 p-6 rounded-2xl relative z-10">
                  <Rocket className="w-12 h-12 text-primary" />
                </div>
                <div className="flex-1 text-center md:text-left relative z-10">
                  <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-2 flex items-center gap-2 justify-center md:justify-start">
                    <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                    Seu Próximo Passo Individual
                  </h2>
                  <h3 className="text-3xl font-bold text-slate-900 mb-2">{nextPhase.title}</h3>
                  <p className="text-slate-500 text-sm max-w-xl">
                    Avanço baseado nas suas responsabilidades: <span className="font-bold text-primary capitalize">{effectiveAreas.join(', ')}</span>.
                  </p>
                </div>
                <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-white font-bold px-12 h-16 rounded-2xl shadow-xl shadow-primary/20 relative z-10">
                  <Link href={`/phases/${nextPhase.id}`}>Acessar Meus Módulos</Link>
                </Button>
              </div>
            )}

            {renderMeetingInfoCard()}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
            {journeyPhases.map((phase) => (
              <PhaseCard 
                key={phase.id} 
                phase={phase} 
                status={progress?.phaseStatus[phase.id] || (phase.id === 'fase-0' ? 'InProgress' : 'Locked')} 
              />
            ))}
          </div>

          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-12 border-t pt-16">
            <div className="flex gap-5">
              <div className="bg-white p-4 rounded-2xl shadow-md h-fit border-none"><Info className="text-primary w-7 h-7" /></div>
              <div>
                <h4 className="font-bold text-slate-900 mb-2 text-lg">Jornada Individual</h4>
                <p className="text-sm text-slate-500 leading-relaxed">Você avança conforme seu próprio ritmo e áreas atribuídas.</p>
              </div>
            </div>
            <div className="flex gap-5">
              <div className="bg-white p-4 rounded-2xl shadow-md h-fit border-none"><Trophy className="text-primary w-7 h-7" /></div>
              <div>
                <h4 className="font-bold text-slate-900 mb-2 text-lg">Foco Operacional</h4>
                <p className="text-sm text-slate-500 leading-relaxed">Cada participante libera seus próprios checkpoints e encontros.</p>
              </div>
            </div>
            <div className="flex gap-5">
              <div className="bg-white p-4 rounded-2xl shadow-md h-fit border-none"><Settings className="text-primary w-7 h-7" /></div>
              <div>
                <h4 className="font-bold text-slate-900 mb-2 text-lg">Apoio Especializado</h4>
                <p className="text-sm text-slate-500 leading-relaxed">Nossos implantadores validam suas evidências individualmente.</p>
              </div>
            </div>
          </div>
        </main>

        <footer className="bg-white border-t py-12 text-center text-slate-400 text-sm mt-auto">
          <p className="font-bold text-slate-500">&copy; 2024 2tech - Gestão Inteligente de Crédito</p>
          <p className="text-xs mt-2 uppercase tracking-widest">Plataforma de Sucesso do Cliente</p>
        </footer>
      </div>
    </AuthGuard>
  );
}
