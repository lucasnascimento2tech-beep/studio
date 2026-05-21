
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
  area: string;
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
  meetingTitle?: string;
  modules: Module[];
  quiz: QuizQuestion[];
}

export type PhaseStatus = 'Locked' | 'NotStarted' | 'InProgress' | 'WaitingEvidence' | 'ReadyToSchedule' | 'Scheduled' | 'WaitingApproval' | 'Completed' | 'PendingAdjustments';

export type ModuleStatus = 'NotStarted' | 'InProgress' | 'MaterialCompleted' | 'EvidencePending' | 'Completed';

export interface ProgressState {
  completedModules: string[]; // moduleId[]
  uploadedEvidence: Record<string, { name: string; date: string }>; // moduleId -> data
  quizAnswers: Record<string, string>; // questionId -> answer
  quizScores: Record<string, number>; // phaseId -> score
  meetingStatus: Record<string, 'None' | 'Scheduled' | 'Approved' | 'Rejected'>; // phaseId -> status
  phaseStatus: Record<string, PhaseStatus>; // phaseId -> status
  implantadorNotes: Record<string, string>; // phaseId -> notes
}
