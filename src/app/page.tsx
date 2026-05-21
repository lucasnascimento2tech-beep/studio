
"use client";

import { useJourneyStore } from "@/hooks/useJourneyStore";
import { journeyPhases } from "@/data/journeyData";
import { ProgressHeader } from "@/components/journey/ProgressHeader";
import { PhaseCard } from "@/components/journey/PhaseCard";
import { Button } from "@/components/ui/button";
import { Settings, Info, Trophy, Rocket } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const { progress, isLoaded } = useJourneyStore();

  if (!isLoaded) return null;

  const nextPhase = journeyPhases.find(p => progress.phaseStatus[p.id] === 'InProgress' || progress.phaseStatus[p.id] === 'NotStarted');

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-primary text-white py-3 px-4 border-b border-white/10 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xl tracking-tight">2tech</span>
          <span className="text-white/40 text-sm">| Jornada</span>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/10">
            <Link href="/implantador">Modo Implantador</Link>
          </Button>
        </div>
      </nav>

      <ProgressHeader progress={progress} />

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 py-8">
        {/* Recommended Next Step Hero */}
        {nextPhase && (
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-8 flex flex-col md:flex-row items-center gap-6 border-l-4 border-l-secondary">
            <div className="bg-secondary/10 p-4 rounded-full">
              <Rocket className="w-8 h-8 text-secondary" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-1">Próximo passo recomendado</h2>
              <h3 className="text-xl font-bold text-primary mb-1">{nextPhase.title}</h3>
              <p className="text-muted-foreground text-sm">Siga para a próxima etapa e avance na sua implantação guiada.</p>
            </div>
            <Button asChild size="lg" className="bg-secondary text-primary hover:bg-secondary/90 font-bold px-8">
              <Link href={`/phases/${nextPhase.id}`}>Continuar Jornada</Link>
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {journeyPhases.map((phase) => (
            <PhaseCard 
              key={phase.id} 
              phase={phase} 
              status={progress.phaseStatus[phase.id] || (phase.order === 0 ? 'InProgress' : 'Locked')} 
            />
          ))}
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 border-t pt-8">
          <div className="flex gap-4">
            <div className="bg-white p-2 rounded-lg shadow-sm h-fit"><Info className="text-primary w-5 h-5" /></div>
            <div>
              <h4 className="font-bold text-primary mb-1">Dúvidas?</h4>
              <p className="text-sm text-muted-foreground">Consulte nossa base de materiais ou aguarde o encontro agendado.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="bg-white p-2 rounded-lg shadow-sm h-fit"><Trophy className="text-primary w-5 h-5" /></div>
            <div>
              <h4 className="font-bold text-primary mb-1">Marcos</h4>
              <p className="text-sm text-muted-foreground">Cada fase concluída é um marco na profissionalização do seu negócio.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="bg-white p-2 rounded-lg shadow-sm h-fit"><Settings className="text-primary w-5 h-5" /></div>
            <div>
              <h4 className="font-bold text-primary mb-1">Suporte</h4>
              <p className="text-sm text-muted-foreground">O implantador acompanhará cada aprovação para garantir a segurança dos dados.</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t py-6 mt-12 text-center text-muted-foreground text-sm">
        <p>&copy; 2024 2tech - Gestão Inteligente de Crédito. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
