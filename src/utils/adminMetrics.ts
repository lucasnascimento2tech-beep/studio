
import { differenceInDays, isAfter, subDays, startOfMonth } from 'date-fns';
import { AreaType, Phase, Module, PhaseStatus, GlobalRole } from "@/types/journey";
import { journeyPhases } from "@/data/journeyData";

export interface AdminStats {
  activeImplementations: number;
  completedImplementations: number;
  startedThisMonth: number;
  avgTimeDays: string;
  pendingMeetings: number;
  pendingEvidence: number;
  stalledClients: number;
  pendingRequests: number;
}

export interface ImplantadorStat {
  uid: string;
  name: string;
  email: string;
  assigned: number;
  inProgress: number;
  completed: number;
  pendingMeetings: number;
  pendingEvidence: number;
  stalled: number;
  avgTime: string;
  workload: 'Baixa' | 'Normal' | 'Alta';
}

export interface ImplementationAlert {
  id: string;
  type: string;
  companyName: string;
  implementadorName: string;
  severity: 'low' | 'medium' | 'high';
  lastActivity: string;
  action: string;
}

export function getDateFromFirestore(value: any): Date | null {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string') return new Date(value);
  if (value.seconds) return new Date(value.seconds * 1000);
  return null;
}

export function getLastActivityDate(implId: string, relatedData: {
  implementations: any[],
  phaseProgress: any[],
  moduleProgress: any[],
  meetings: any[],
  quizSubmissions: any[]
}): Date | null {
  const impl = relatedData.implementations.find(i => i.id === implId);
  const phases = relatedData.phaseProgress.filter(p => p.implementationId === implId);
  const modules = relatedData.moduleProgress.filter(p => p.implementationId === implId);
  const meets = relatedData.meetings.filter(p => p.implementationId === implId);
  const quizes = relatedData.quizSubmissions.filter(p => p.implementationId === implId);

  const dates: (Date | null)[] = [
    getDateFromFirestore(impl?.updatedAt),
    ...phases.map(p => getDateFromFirestore(p.updatedAt)),
    ...modules.map(p => getDateFromFirestore(p.updatedAt)),
    ...meets.map(p => getDateFromFirestore(p.updatedAt)),
    ...quizes.map(p => getDateFromFirestore(p.submittedAt))
  ];

  const validDates = dates.filter(d => d !== null) as Date[];
  if (validDates.length === 0) return null;

  return new Date(Math.max(...validDates.map(d => d.getTime())));
}

export function calculateImplementationCurrentPhase(implId: string, phaseProgress: any[]): string {
  const progress = phaseProgress.filter(p => p.implementationId === implId);
  if (progress.length === 0) return "Não iniciada";

  const allCompleted = progress.every(p => p.status === 'Completed');
  if (allCompleted && progress.length >= journeyPhases.length) return "Concluída";

  // Encontrar a fase não concluída de menor ordem que tem algum progresso
  const sortedPhases = [...journeyPhases].sort((a, b) => a.order - b.order);
  for (const phase of sortedPhases) {
    const p = progress.find(pp => pp.phaseId === phase.id);
    if (p && p.status !== 'Completed') {
      return phase.title;
    }
  }

  return "Em andamento";
}

export function calculateImplementationRisk(implId: string, relatedData: {
  implementations: any[],
  phaseProgress: any[],
  moduleProgress: any[],
  meetings: any[],
  quizSubmissions: any[]
}): 'Baixo' | 'Médio' | 'Alto' {
  const lastActivity = getLastActivityDate(implId, relatedData);
  const impl = relatedData.implementations.find(i => i.id === implId);
  
  if (!lastActivity) return 'Alto'; // Sem atividade nenhuma é alto risco

  const daysSinceActivity = differenceInDays(new Date(), lastActivity);
  const pendingMeets = relatedData.meetings.filter(m => m.implementationId === implId && m.status === 'WaitingApproval');
  const rejectedEvidence = relatedData.moduleProgress.filter(m => m.implementationId === implId && (m.evidenceStatus === 'adjustment_requested' || m.evidenceStatus === 'rejected'));

  if (daysSinceActivity > 7 || !impl?.assignedImplantadorUid) return 'Alto';
  if (daysSinceActivity > 3 || pendingMeets.length > 0 || rejectedEvidence.length > 0) return 'Médio';
  
  return 'Baixo';
}

export function calculateAverageImplementationTime(implementations: any[]): string {
  const completed = implementations.filter(i => i.status === 'completed' && i.completedAt && (i.startedAt || i.createdAt));
  if (completed.length === 0) return "Sem histórico";

  const totalDays = completed.reduce((acc, curr) => {
    const end = getDateFromFirestore(curr.completedAt);
    const start = getDateFromFirestore(curr.startedAt || curr.createdAt);
    if (end && start) return acc + differenceInDays(end, start);
    return acc;
  }, 0);

  return `${Math.round(totalDays / completed.length)} dias`;
}

export function getImplementationAlerts(implId: string, relatedData: {
  implementations: any[],
  companies: any[],
  users: any[],
  phaseProgress: any[],
  moduleProgress: any[],
  meetings: any[],
  accessRequests: any[]
}): ImplementationAlert[] {
  const impl = relatedData.implementations.find(i => i.id === implId);
  const company = relatedData.companies.find(c => c.id === impl?.companyId);
  const implantador = relatedData.users.find(u => u.uid === impl?.assignedImplantadorUid);
  const alerts: ImplementationAlert[] = [];

  if (!impl) return [];

  const lastActivityDate = getLastActivityDate(implId, relatedData);
  const lastActivityStr = lastActivityDate ? lastActivityDate.toLocaleDateString('pt-BR') : 'Sem data';

  // 1. Sem implantador
  if (!impl.assignedImplantadorUid) {
    alerts.push({
      id: `${implId}_no_imp`,
      type: "Sem implantador responsável",
      companyName: company?.name || "Empresa desconhecida",
      implementadorName: "Nenhum",
      severity: 'high',
      lastActivity: lastActivityStr,
      action: "Atribuir implantador responsável"
    });
  }

  // 2. Sem avanço
  if (lastActivityDate && differenceInDays(new Date(), lastActivityDate) > 7) {
    alerts.push({
      id: `${implId}_stalled`,
      type: "Sem avanço há mais de 7 dias",
      companyName: company?.name || "Empresa desconhecida",
      implementadorName: implantador?.name || "Sem responsável",
      severity: 'medium',
      lastActivity: lastActivityStr,
      action: "Cobrar retorno do cliente"
    });
  }

  // 3. Encontro pendente
  const pendingMeets = relatedData.meetings.filter(m => m.implementationId === implId && m.status === 'WaitingApproval');
  if (pendingMeets.length > 0) {
    alerts.push({
      id: `${implId}_meet_pend`,
      type: "Encontro aguardando aprovação",
      companyName: company?.name || "Empresa desconhecida",
      implementadorName: implantador?.name || "Sem responsável",
      severity: 'medium',
      lastActivity: lastActivityStr,
      action: "Aprovar encontro ou solicitar ajuste"
    });
  }

  // 4. Evidência pendente
  const pendingEvid = relatedData.moduleProgress.filter(m => m.implementationId === implId && m.evidenceStatus === 'submitted');
  if (pendingEvid.length > 0) {
    alerts.push({
      id: `${implId}_evid_pend`,
      type: "Evidência aguardando análise",
      companyName: company?.name || "Empresa desconhecida",
      implementadorName: implantador?.name || "Sem responsável",
      severity: 'low',
      lastActivity: lastActivityStr,
      action: "Revisar evidências pendentes"
    });
  }

  return alerts;
}
