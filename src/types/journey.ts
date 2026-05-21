
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

export type GlobalRole = 'admin_2tech' | 'implantador' | 'client_master' | 'client_participant' | 'client_pending';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  globalRole: GlobalRole;
  companyId?: string;
  implementationId?: string;
  active: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  createdAt: any;
  updatedAt: any;
}

export interface ImplementationMember {
  id: string;
  implementationId: string;
  companyId: string;
  uid?: string;
  name: string;
  email: string;
  role: 'implementation_master' | 'participant' | 'observer';
  clientAccessType?: 'master' | 'participant';
  areas: AreaType[];
  requiredForMeetings: string[];
  isRequiredParticipant: boolean;
  inviteStatus: 'pending' | 'accepted' | 'expired' | 'canceled';
  active: boolean;
  acceptedAt?: any;
  createdAt: any;
  updatedAt: any;
}

export interface AccessRequest {
  id: string;
  uid: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  companyName: string;
  cnpj: string;
  city: string;
  state: string;
  website?: string;
  mainContactName?: string;
  mainContactEmail?: string;
  requestedAreas: AreaType[];
  requestedParticipationLabels: string[];
  justification: string;
  status: 'pending' | 'approved' | 'rejected';
  source: 'self_registration';
  reviewedByUid?: string | null;
  reviewComment?: string | null;
  matchedCompanyId?: string | null;
  matchedImplementationId?: string | null;
  createdAt: any;
  updatedAt: any;
}

export interface ProgressState {
  completedModules: string[];
  uploadedEvidence: Record<string, { name: string; date?: string; status?: string }>;
  quizScores: Record<string, number>;
  meetingStatus: Record<string, string>;
  phaseStatus: Record<string, PhaseStatus>;
  implantadorNotes: Record<string, string>;
}
