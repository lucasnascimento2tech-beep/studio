
export type AreaType = 'cadastros' | 'operacional' | 'financeiro' | 'relatorios' | 'gestao' | 'todos';

export type ModuleType = 'Material' | 'Checkpoint' | 'Task' | 'Evidence' | 'Pre-Meeting';

export interface QuizQuestion {
  id: string;
  question: string;
  options?: string[];
  correctAnswer: string;
}

export interface Module {
  id: string;
  title: string;
  area: AreaType;
  type: ModuleType;
  objective: string;
  audience: string;
  estimatedTime: string;
  isRequired: boolean;
  requiresEvidence: boolean;
  evidenceDescription?: string;
  content: string;
  steps: string[];
  commonMistakes?: string[];
  practicalTask: string;
  validationQuestion: string;
  expectedAnswer: string;
}

export interface Phase {
  id: string;
  title: string;
  description: string;
  order: number;
  hasMeeting: boolean;
  meetingId?: string;
  meetingType?: 'meeting_1_parametrizacao' | 'meeting_2_operacao' | 'meeting_3_financeiro';
  meetingTitle?: string;
  requiredAreas?: AreaType[];
  modules: Module[];
  quiz: QuizQuestion[];
}

export type PhaseStatus = 'Locked' | 'NotStarted' | 'InProgress' | 'WaitingEvidence' | 'ReadyToSchedule' | 'Scheduled' | 'WaitingApproval' | 'Completed' | 'PendingAdjustments';

export type GlobalRole = 'admin_2tech' | 'implantador' | 'client_master' | 'client_participant';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  globalRole: GlobalRole;
  companyId?: string;
  implementationId?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ImplementationMember {
  id: string;
  implementationId: string;
  companyId: string;
  uid?: string;
  name: string;
  email: string;
  role: 'implementation_master' | 'participant' | 'observer';
  areas: AreaType[];
  requiredForMeetings: string[];
  isRequiredParticipant: boolean;
  inviteStatus: 'pending' | 'accepted' | 'expired' | 'canceled';
  active: boolean;
}

export interface ProgressState {
  completedModules: string[];
  uploadedEvidence: Record<string, { name: string; date: string; status: string }>;
  quizScores: Record<string, number>;
  meetingStatus: Record<string, string>;
  phaseStatus: Record<string, PhaseStatus>;
  implantadorNotes: Record<string, string>;
}
