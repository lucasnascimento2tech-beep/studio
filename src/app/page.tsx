
"use client";

import { useEffect, useState } from "react";
import { getFirestore, collection, query, where, onSnapshot } from "firebase/firestore";
import { useUser } from "@/firebase";
import { journeyPhases } from "@/data/journeyData";
import { ProgressHeader } from "@/components/journey/ProgressHeader";
import { PhaseCard } from "@/components/journey/PhaseCard";
import { Button } from "@/components/ui/button";
import { Settings, Info, Trophy, Rocket, LogOut, User } from "lucide-react";
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
        .filter(d => d.data().status === 'completed')
        .map(d => d.data().moduleId);
      
      const uploadedEvidence: any = {};
      snapshot.docs.forEach(d => {
        const data = d.data();
        if (data.evidenceStatus === 'submitted') {
          uploadedEvidence[data.moduleId] = { name: data.fileName || 'Arquivo' };
        }
      });

      // Simple mapping for phase status - in a real app this would come from phasesProgress collection
      const phaseStatus: Record<string, PhaseStatus> = { 'fase-0': 'InProgress' };
      
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

  if (authLoading || loading) return <div className="p-8 text-center">Carregando sua jornada...</div>;

  const nextPhase = progress ? journeyPhases.find(p => 
    progress.phaseStatus[p.id] === 'InProgress' || 
    progress.phaseStatus[p.id] === 'NotStarted' ||
    !progress.phaseStatus[p.id]
  ) : null;

  return (
    <AuthGuard allowedRoles={['client_master', 'client_participant']}>
      <div className="min-h-screen flex flex-col">
        <nav className="bg-primary text-white py-3 px-6 border-b border-white/10 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-3">
            <span className="font-bold text-xl tracking-tight">2tech</span>
            <span className="text-white/40 text-sm hidden md:inline">| Portal do Cliente</span>
          </div>
          <div className="flex items-center gap-3">
            {(user?.globalRole === 'admin_2tech' || user?.globalRole === 'implantador') && (
              <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/10">
                <Link href="/implantador">Modo Especialista</Link>
              </Button>
            )}
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full border border-white/5">
              <User className="w-4 h-4" />
              <span className="text-xs font-medium">{user?.name}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-white/70 hover:text-white">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </nav>

        {progress && <ProgressHeader progress={progress} />}

        <main className="flex-1 max-w-6xl mx-auto w-full p-4 py-8">
          {nextPhase && (
            <div className="bg-white rounded-2xl shadow-sm border p-6 mb-10 flex flex-col md:flex-row items-center gap-6 border-l-8 border-l-secondary">
              <div className="bg-secondary/10 p-5 rounded-2xl">
                <Rocket className="w-10 h-10 text-secondary" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Próxima Etapa</h2>
                <h3 className="text-2xl font-bold text-primary mb-1">{nextPhase.title}</h3>
                <p className="text-slate-500 text-sm">A implantação guiada garante que seu time esteja pronto para operar com segurança.</p>
              </div>
              <Button asChild size="lg" className="bg-secondary text-primary hover:bg-secondary/90 font-bold px-10 h-14 rounded-xl shadow-lg shadow-secondary/20">
                <Link href={`/phases/${nextPhase.id}`}>Continuar Agora</Link>
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

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-10 border-t pt-10">
            <div className="flex gap-4">
              <div className="bg-white p-3 rounded-2xl shadow-sm h-fit border"><Info className="text-primary w-6 h-6" /></div>
              <div>
                <h4 className="font-bold text-primary mb-1 text-lg">Central de Ajuda</h4>
                <p className="text-sm text-slate-500 leading-relaxed">Acesse manuais e vídeos de suporte para dúvidas técnicas rápidas.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="bg-white p-3 rounded-2xl shadow-sm h-fit border"><Trophy className="text-primary w-6 h-6" /></div>
              <div>
                <h4 className="font-bold text-primary mb-1 text-lg">Seu Sucesso</h4>
                <p className="text-sm text-slate-500 leading-relaxed">Concluir a jornada reduz em 40% erros operacionais na primeira semana.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="bg-white p-3 rounded-2xl shadow-sm h-fit border"><Settings className="text-primary w-6 h-6" /></div>
              <div>
                <h4 className="font-bold text-primary mb-1 text-lg">Configuração</h4>
                <p className="text-sm text-slate-500 leading-relaxed">O implantador analisa cada etapa para garantir a integridade dos seus dados.</p>
              </div>
            </div>
          </div>
        </main>

        <footer className="bg-slate-50 border-t py-10 text-center text-slate-400 text-sm mt-auto">
          <p className="font-medium">&copy; 2024 2tech - Gestão Inteligente de Crédito</p>
          <p className="text-xs mt-1">Plataforma de Sucesso do Cliente</p>
        </footer>
      </div>
    </AuthGuard>
  );
}
