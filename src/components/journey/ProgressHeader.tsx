
import { Progress } from "@/components/ui/progress";
import { journeyPhases } from "@/data/journeyData";
import { ProgressState } from "@/types/journey";

interface ProgressHeaderProps {
  progress: ProgressState;
  totalAccessibleModules: number;
  completedAccessibleModules: number;
}

export function ProgressHeader({ progress, totalAccessibleModules, completedAccessibleModules }: ProgressHeaderProps) {
  const completedPhasesCount = journeyPhases.filter(p => progress.phaseStatus[p.id] === 'Completed').length;
  const phasePercentage = Math.round((completedPhasesCount / journeyPhases.length) * 100);
  const modulePercentage = totalAccessibleModules > 0 ? Math.round((completedAccessibleModules / totalAccessibleModules) * 100) : 0;

  return (
    <div className="bg-white border-b sticky top-0 z-10 py-6">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-headline font-bold text-primary leading-tight">Jornada Guiada de Implantação 2tech</h1>
            <p className="text-muted-foreground text-sm mt-1">Conclua seus módulos para liberar as próximas etapas da operação.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-6 min-w-[300px]">
            <div className="flex-1 space-y-1.5">
              <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <span>Progresso dos Módulos</span>
                <span>{completedAccessibleModules} / {totalAccessibleModules}</span>
              </div>
              <Progress value={modulePercentage} className="h-2.5" />
            </div>
            
            <div className="bg-primary/5 px-4 py-2 rounded-2xl border border-primary/10 flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] font-bold text-primary/60 uppercase leading-none">Fases Concluídas</p>
                <p className="text-lg font-bold text-primary leading-none mt-1">{completedPhasesCount} / {journeyPhases.length}</p>
              </div>
              <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary flex items-center justify-center text-[10px] font-bold text-primary">
                {phasePercentage}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
