
import { Progress } from "@/components/ui/progress";
import { journeyPhases } from "@/data/journeyData";
import { ProgressState } from "@/types/journey";

interface ProgressHeaderProps {
  progress: ProgressState;
}

export function ProgressHeader({ progress }: ProgressHeaderProps) {
  const completedCount = journeyPhases.filter(p => progress.phaseStatus[p.id] === 'Completed').length;
  const percentage = Math.round((completedCount / journeyPhases.length) * 100);

  return (
    <div className="bg-white border-b sticky top-0 z-10 py-6">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-headline font-bold text-primary">Jornada Guiada de Implantação 2tech</h1>
            <p className="text-muted-foreground text-sm">Acompanhe seu progresso e conclua as etapas para iniciar sua operação.</p>
          </div>
          <div className="flex items-center gap-4 min-w-[240px]">
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1 font-medium">
                <span>Progresso Total</span>
                <span>{percentage}%</span>
              </div>
              <Progress value={percentage} className="h-2" />
            </div>
            <div className="bg-primary/5 px-3 py-1 rounded-full border border-primary/10">
              <span className="text-primary font-bold text-lg">{completedCount}</span>
              <span className="text-primary/60 text-xs ml-1">/ {journeyPhases.length} Fases</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
