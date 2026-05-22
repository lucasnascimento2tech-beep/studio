
import { Phase, Module, AreaType, GlobalRole } from "@/types/journey";

/**
 * Retorna os módulos acessíveis ao usuário baseados em suas áreas e papel.
 */
export function getAccessibleModulesForAreas(
  phase: Phase,
  effectiveAreas: AreaType[],
  userRole: GlobalRole
): Module[] {
  // Master ou Staff acessam tudo
  if (userRole === 'admin_2tech' || userRole === 'implantador' || userRole === 'client_master' || effectiveAreas.includes('todos')) {
    return phase.modules;
  }
  
  // Participantes acessam apenas sua área
  return phase.modules.filter(m => effectiveAreas.includes(m.area));
}

/**
 * Retorna apenas os módulos obrigatórios acessíveis ao usuário.
 */
export function getRequiredAccessibleModules(
  phase: Phase,
  effectiveAreas: AreaType[],
  userRole: GlobalRole
): Module[] {
  return getAccessibleModulesForAreas(phase, effectiveAreas, userRole).filter(m => m.isRequired);
}

/**
 * Verifica se a fase está pronta para o checkpoint (todos obrigatórios concluídos).
 */
export function isPhaseReadyForCheckpoint(
  phase: Phase,
  effectiveAreas: AreaType[],
  userRole: GlobalRole,
  completedModuleIds: string[]
): boolean {
  const required = getRequiredAccessibleModules(phase, effectiveAreas, userRole);
  if (required.length === 0) return true;
  
  const completedCount = required.filter(m => completedModuleIds.includes(m.id)).length;
  return completedCount === required.length;
}

/**
 * Verifica se todos os módulos obrigatórios acessíveis já foram APROVADOS pelo implantador.
 */
export function isPhaseReadyForNextStepAfterReview(
  phase: Phase,
  effectiveAreas: AreaType[],
  userRole: GlobalRole,
  moduleProgress: any[]
): boolean {
  const required = getRequiredAccessibleModules(phase, effectiveAreas, userRole);
  if (required.length === 0) return true;

  return required.every(rm => {
    const prog = moduleProgress.find(p => p.moduleId === rm.id);
    return prog?.moduleReviewStatus === 'approved';
  });
}

/**
 * Calcula o progresso global de módulos para o usuário.
 */
export function calculateModuleProgressForUser(
  journeyPhases: Phase[],
  effectiveAreas: AreaType[],
  userRole: GlobalRole,
  completedModuleIds: string[]
) {
  let total = 0;
  let completed = 0;

  journeyPhases.forEach(phase => {
    const accessible = getAccessibleModulesForAreas(phase, effectiveAreas, userRole);
    total += accessible.length;
    completed += accessible.filter(m => completedModuleIds.includes(m.id)).length;
  });

  return {
    total,
    completed,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0
  };
}
