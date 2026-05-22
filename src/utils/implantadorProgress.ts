
import { AreaType, Phase, Module } from "@/types/journey";

export interface UserProgressStats {
  totalModules: number;
  completedModules: number;
  percent: number;
  currentPhaseId: string;
  currentStatus: string;
}

export interface ImplementationStats {
  averageProgress: number;
  totalParticipants: number;
  completedParticipants: number;
  inProgressParticipants: number;
  pendingAdjustments: number;
}

/**
 * Calcula o progresso de um usuário específico em uma fase ou jornada total.
 */
export function calculateUserProgress(
  uid: string, 
  userAreas: AreaType[], 
  moduleProgress: any[], 
  journeyPhases: Phase[]
): UserProgressStats {
  // Coletar todos os módulos obrigatórios que o usuário deve fazer baseados em suas áreas
  let requiredModules: Module[] = [];
  journeyPhases.forEach(phase => {
    const accessible = phase.modules.filter(m => 
      m.isRequired && (userAreas.includes(m.area) || userAreas.includes('todos'))
    );
    requiredModules = [...requiredModules, ...accessible];
  });

  const completedCount = moduleProgress.filter(p => 
    p.uid === uid && 
    p.status === 'completed' && 
    requiredModules.some(rm => rm.id === p.moduleId)
  ).length;

  const totalCount = requiredModules.length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

  return {
    totalModules: totalCount,
    completedModules: completedCount,
    percent,
    currentPhaseId: "N/A", // Seria necessário cruzar com phaseProgress para precisão
    currentStatus: "N/A"
  };
}

/**
 * Consolida estatísticas da implantação como um todo (Apenas informativo)
 */
export function calculateImplementationProgress(
  members: any[],
  moduleProgress: any[],
  phaseProgress: any[],
  journeyPhases: Phase[]
): ImplementationStats {
  if (members.length === 0) return { averageProgress: 0, totalParticipants: 0, completedParticipants: 0, inProgressParticipants: 0, pendingAdjustments: 0 };

  const progresses = members.map(m => {
    const stats = calculateUserProgress(m.uid || m.email, m.areas || [], moduleProgress, journeyPhases);
    return stats.percent;
  });

  const avg = progresses.reduce((acc, curr) => acc + curr, 0) / members.length;
  
  const completed = phaseProgress.filter(p => p.status === 'Completed').length; // Simplificado
  const adjustments = phaseProgress.filter(p => p.status === 'PendingAdjustments').length;

  return {
    averageProgress: Math.round(avg),
    totalParticipants: members.length,
    completedParticipants: 0, // Precisaria de lógica por usuário total
    inProgressParticipants: members.length,
    pendingAdjustments: adjustments
  };
}
