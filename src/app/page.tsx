
"use client";

import { useEffect, useState } from "react";
import { getFirestore, collection, query, where, onSnapshot } from "firebase/firestore";
import { useUser } from "@/firebase";
import { journeyPhases } from "@/data/journeyData";
import { ProgressHeader } from "@/components/journey/ProgressHeader";
import { PhaseCard } from "@/components/journey/PhaseCard";
import { Button } from "@/components/ui/button";
import { Settings, Info, Trophy, Rocket, LogOut, User, Users } from "lucide-react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { ProgressState, PhaseStatus } from "@/types/journey";
import { getAuth, signOut } from "firebase/auth";

export default function Home() {
  const { user, loading: authLoading } = useUser();
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user?.implementationId) {
      if (!authLoading) setLoading(false);
      return;
    }

    const db = getFirestore();
    const q = query(
      collection(db, "moduleProgress"), 
      where("implementationId", "==", user.implementationId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const completedModules = snapshot.docs
        .filter(d => d.data().uid === user.uid && d.data().status === 'completed')
        .map(d => d.data().moduleId);
      
      const uploadedEvidence: any = {};
      snapshot.docs.forEach(d => {
        const data = d.data();
        if (data.uid === user.uid && data.evidenceStatus === 'submitted') {
          uploadedEvidence[data.moduleId] = { name: data.fileName || 'Arquivo' };
        }
      });

      // Default phase status logic
      const phaseStatus: Record<string, PhaseStatus> = {};
      journeyPhases.forEach((p, idx) => {
        if (idx === 0) phaseStatus[p.id] = 'InProgress';
        else phaseStatus[p.id] = 'Locked';
      });
      
      setProgress({
        completedModules,
        uploadedEvidence,
        quizScores: {},
        meetingStatus: {},
        phaseStatus,
        implantadorNotes: {}
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading]);

  const handleLogout = () => {
    signOut(getAuth());
  };

  if (authLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">Carregando sua jornada...</p>
      </div>
    </div>
  );

  const nextPhase = progress ? journeyPhases.find(p => 
    progress.phaseStatus[p.id] === 'InProgress' || 
    progress.phaseStatus[p.id] === 'NotStarted' ||
    !progress.phaseStatus[p.id]
  ) : null;

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
          <div className="flex items-center gap-3">
            {user?.globalRole === 'client_master' && (
              <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/10 hidden md:flex">
                <Link href="/app/participants"><Users className="w-4 h-4 mr-2" /> Equipe</Link>
              </Button>
            )}
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full border border-white/5">
              <User className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold">{user?.name}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-white/70 hover:text-white hover:bg-red-500/20">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </nav>

        {progress && <ProgressHeader progress={progress} />}

        <main className="flex-1 max-w-7xl mx-auto w-full p-4 py-8">
          {nextPhase && (
            <div className="bg-white rounded-3xl shadow-xl border-none p-8 mb-12 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
              <div className="bg-primary/10 p-6 rounded-2xl relative z-10">
                <Rocket className="w-12 h-12 text-primary" />
              </div>
              <div className="flex-1 text-center md:text-left relative z-10">
                <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-2 flex items-center gap-2 justify-center md:justify-start">
                  <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  Próxima Etapa da sua Jornada
                </h2>
                <h3 className="text-3xl font-bold text-slate-900 mb-2">{nextPhase.title}</h3>
                <p className="text-slate-500 text-sm max-w-xl">
                  {nextPhase.description} Complete os módulos para liberar o treinamento com o especialista.
                </p>
              </div>
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-white font-bold px-12 h-16 rounded-2xl shadow-xl shadow-primary/20 relative z-10">
                <Link href={`/phases/${nextPhase.id}`}>Acessar Agora</Link>
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {journeyPhases.map((phase) => (
              <PhaseCard 
                key={phase.id} 
                phase={phase} 
                status={progress?.phaseStatus[phase.id] || (phase.order === 0 ? 'InProgress' : 'Locked')} 
              />
            ))}
          </div>

          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-12 border-t pt-16">
            <div className="flex gap-5">
              <div className="bg-white p-4 rounded-2xl shadow-md h-fit border-none"><Info className="text-primary w-7 h-7" /></div>
              <div>
                <h4 className="font-bold text-slate-900 mb-2 text-lg">Central de Ajuda</h4>
                <p className="text-sm text-slate-500 leading-relaxed">Acesse manuais e vídeos de suporte para dúvidas técnicas rápidas.</p>
              </div>
            </div>
            <div className="flex gap-5">
              <div className="bg-white p-4 rounded-2xl shadow-md h-fit border-none"><Trophy className="text-primary w-7 h-7" /></div>
              <div>
                <h4 className="font-bold text-slate-900 mb-2 text-lg">Selo de Qualidade</h4>
                <p className="text-sm text-slate-500 leading-relaxed">Concluir a jornada garante 100% de aproveitamento do sistema 2tech.</p>
              </div>
            </div>
            <div className="flex gap-5">
              <div className="bg-white p-4 rounded-2xl shadow-md h-fit border-none"><Settings className="text-primary w-7 h-7" /></div>
              <div>
                <h4 className="font-bold text-slate-900 mb-2 text-lg">Suporte Especializado</h4>
                <p className="text-sm text-slate-500 leading-relaxed">Nossos implantadores validam cada etapa para sua segurança operacional.</p>
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
