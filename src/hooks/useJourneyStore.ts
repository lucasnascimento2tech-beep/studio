
"use client";

import { useState, useEffect, useCallback } from 'react';
import { ProgressState, PhaseStatus, AreaType, ModuleReviewStatus } from '@/types/journey';
import { journeyPhases } from '@/data/journeyData';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  serverTimestamp, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  getDocs, 
  getDoc,
  updateDoc
} from 'firebase/firestore';
import { useUser } from '@/firebase';
import { getRequiredAccessibleModules, isPhaseReadyForCheckpoint } from '@/utils/journeyProgress';

export function useJourneyStore() {
  const { user } = useUser();
  const [progress, setProgress] = useState<ProgressState>({
    completedModules: [],
    uploadedEvidence: {},
    quizScores: {},
    meetingStatus: {},
    phaseStatus: {},
    implantadorNotes: {},
    validationAnswers: {}
  });
  
  const [loadedSections, setLoadedSections] = useState({
    modules: false,
    phases: false,
    meetings: false
  });

  const isLoaded = loadedSections.modules && loadedSections.phases && loadedSections.meetings;

  // Helpers para IDs padronizados
  const getModuleProgressId = (modId: string) => 
    `${user?.implementationId}_${user?.uid}_${modId}`;
  const getPhaseProgressId = (phaseId: string) => 
    `${user?.implementationId}_${user?.uid}_${phaseId}`;
  const getMeetingId = (phaseId: string) => 
    `${user?.implementationId}_${user?.uid}_${phaseId}`;
  const getQuizSubmissionId = (phaseId: string) => 
    `${user?.implementationId}_${user?.uid}_${phaseId}`;

  const getGenericPhaseProgressId = (implId: string, uid: string, phaseId: string) => 
    `${implId}_${uid}_${phaseId}`;
  const getGenericMeetingId = (implId: string, uid: string, phaseId: string) => 
    `${implId}_${uid}_${phaseId}`;
  const getGenericModuleProgressId = (implId: string, uid: string, modId: string) => 
    `${implId}_${uid}_${modId}`;

  // 1. Efeito de Inicialização (Fase 0)
  useEffect(() => {
    if (!user?.uid || !user?.implementationId) return;
    const role = user.globalRole;
    if (['admin_2tech', 'implantador', 'client_pending'].includes(role)) return;

    const db = getFirestore();
    const initFirstPhase = async () => {
      const firstPhaseId = "fase-0";
      const phaseRef = doc(db, "phaseProgress", getPhaseProgressId(firstPhaseId));
      const phaseSnap = await getDoc(phaseRef);
      
      if (!phaseSnap.exists()) {
        await setDoc(phaseRef, {
          uid: user.uid,
          implementationId: user.implementationId,
          companyId: user.companyId || "",
          phaseId: firstPhaseId,
          status: "InProgress",
          progressPercent: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
    };
    initFirstPhase();
  }, [user?.uid, user?.implementationId, user?.globalRole]);

  // 2. Listeners
  useEffect(() => {
    if (!user?.uid || !user?.implementationId || ['admin_2tech', 'implantador', 'client_pending'].includes(user.globalRole)) {
      setLoadedSections({ modules: true, phases: true, meetings: true });
      return;
    }

    const db = getFirestore();
    
    // Listener Modules
    const unsubModules = onSnapshot(query(
      collection(db, "moduleProgress"),
      where("implementationId", "==", user.implementationId),
      where("uid", "==", user.uid)
    ), (snap) => {
      const completedModules: string[] = [];
      const uploadedEvidence: Record<string, any> = {};
      const validationAnswers: Record<string, string> = {};
      snap.docs.forEach(d => {
        const data = d.data();
        if (data.status === 'completed') completedModules.push(data.moduleId);
        if (data.validationAnswer) validationAnswers[data.moduleId] = data.validationAnswer;
        if (data.evidenceStatus || data.moduleReviewStatus) {
          uploadedEvidence[data.moduleId] = { 
            name: data.fileName || 'Arquivo',
            status: data.evidenceStatus,
            reviewStatus: data.moduleReviewStatus,
            implantadorComment: data.reviewComment || ""
          };
        }
      });
      setProgress(prev => ({ ...prev, completedModules, uploadedEvidence, validationAnswers }));
      setLoadedSections(prev => ({ ...prev, modules: true }));
    });

    // Listener Phases
    const unsubPhases = onSnapshot(query(
      collection(db, "phaseProgress"),
      where("implementationId", "==", user.implementationId),
      where("uid", "==", user.uid)
    ), (snap) => {
      const phaseStatus: Record<string, PhaseStatus> = {};
      snap.docs.forEach(d => {
        const data = d.data();
        phaseStatus[data.phaseId] = data.status;
      });
      setProgress(prev => ({ ...prev, phaseStatus }));
      setLoadedSections(prev => ({ ...prev, phases: true }));
    });

    // Listener Meetings
    const unsubMeetings = onSnapshot(query(
      collection(db, "meetings"),
      where("implementationId", "==", user.implementationId),
      where("uid", "==", user.uid)
    ), (snap) => {
      const meetingStatus: Record<string, any> = {};
      snap.docs.forEach(d => {
        const data = d.data();
        meetingStatus[data.phaseId] = {
          status: data.status,
          scheduledDate: data.scheduledDate,
          scheduledTime: data.scheduledTime,
          notes: data.notes,
          implantadorComment: data.reviewComment || ""
        };
      });
      setProgress(prev => ({ ...prev, meetingStatus }));
      setLoadedSections(prev => ({ ...prev, meetings: true }));
    });

    return () => { unsubModules(); unsubPhases(); unsubMeetings(); };
  }, [user?.uid, user?.implementationId, user?.globalRole]);

  // Autocorreção de consistência
  const ensureCurrentProgressConsistency = useCallback(async (effectiveAreas: AreaType[]) => {
    if (!user?.uid || !user?.implementationId || !isLoaded) return;
    const db = getFirestore();

    for (const phase of journeyPhases) {
      const currentStatus = progress.phaseStatus[phase.id] || (phase.id === 'fase-0' ? 'InProgress' : 'Locked');
      
      const readyForCheckpoint = isPhaseReadyForCheckpoint(
        phase, 
        effectiveAreas, 
        user.globalRole as any, 
        progress.completedModules
      );

      if (readyForCheckpoint && ['InProgress', 'NotStarted', 'Locked'].includes(currentStatus)) {
        await setDoc(doc(db, "phaseProgress", getPhaseProgressId(phase.id)), {
          status: "WaitingModuleApproval",
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
    }
  }, [user, progress.phaseStatus, progress.completedModules, isLoaded]);

  const unlockNextPhaseForUser = async (targetUid: string, targetImplId: string, targetCompId: string, currentPhaseId: string) => {
    const db = getFirestore();
    const currentIndex = journeyPhases.findIndex(p => p.id === currentPhaseId);
    const nextPhase = journeyPhases[currentIndex + 1];

    if (nextPhase) {
      const nextPhaseId = nextPhase.id;
      const nextPhaseRef = doc(db, "phaseProgress", getGenericPhaseProgressId(targetImplId, targetUid, nextPhaseId));
      const nextPhaseSnap = await getDoc(nextPhaseRef);
      
      const existingStatus = nextPhaseSnap.exists() ? nextPhaseSnap.data().status : null;
      const protectedStatuses = ['Completed', 'Scheduled', 'WaitingApproval', 'PendingAdjustments', 'ReadyToSchedule'];
      
      if (!nextPhaseSnap.exists() || !protectedStatuses.includes(existingStatus)) {
        await setDoc(nextPhaseRef, {
          uid: targetUid,
          implementationId: targetImplId,
          companyId: targetCompId || "",
          phaseId: nextPhaseId,
          status: "InProgress",
          progressPercent: 0,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
    }
  };

  const recalculatePhaseProgress = async (phaseId: string, effectiveAreas: AreaType[]) => {
    if (!user?.uid || !user?.implementationId) return;
    const db = getFirestore();
    const phase = journeyPhases.find(p => p.id === phaseId);
    if (!phase) return;

    const requiredModules = getRequiredAccessibleModules(phase, effectiveAreas, user.globalRole as any);
    const completedRequiredCount = requiredModules.filter(m => progress.completedModules.includes(m.id)).length;
    const isDone = requiredModules.length > 0 ? completedRequiredCount === requiredModules.length : true;
    
    const phaseRef = doc(db, "phaseProgress", getPhaseProgressId(phaseId));
    const currentPhaseDoc = await getDoc(phaseRef);
    const currentStatus = currentPhaseDoc.exists() ? currentPhaseDoc.data().status : 'InProgress';

    const totalCount = requiredModules.length;
    const percent = totalCount > 0 ? Math.round((completedRequiredCount / totalCount) * 100) : 100;

    let newStatus = currentStatus;
    const nonReversible = ['ReadyToSchedule', 'Scheduled', 'WaitingApproval', 'Completed', 'PendingAdjustments'];

    if (!nonReversible.includes(currentStatus)) {
      newStatus = isDone ? "WaitingModuleApproval" : "InProgress";
    }

    await setDoc(phaseRef, {
      uid: user.uid,
      implementationId: user.implementationId,
      companyId: user.companyId || "",
      phaseId,
      status: newStatus,
      progressPercent: percent,
      completedModulesCount: completedRequiredCount,
      totalModulesCount: totalCount,
      updatedAt: serverTimestamp()
    }, { merge: true });
  };

  const completeModule = async (moduleId: string, phaseId: string, effectiveAreas: AreaType[], validationAnswer: string) => {
    if (!user?.uid || !user?.implementationId) return;
    const db = getFirestore();
    const progressRef = doc(db, "moduleProgress", getModuleProgressId(moduleId));
    
    await setDoc(progressRef, {
      uid: user.uid,
      implementationId: user.implementationId,
      companyId: user.companyId || "",
      phaseId,
      moduleId,
      status: "completed",
      validationAnswer,
      moduleReviewStatus: "pending_review",
      validationAnsweredAt: serverTimestamp(),
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    setProgress(prev => ({
      ...prev,
      completedModules: [...prev.completedModules, moduleId]
    }));

    await recalculatePhaseProgress(phaseId, effectiveAreas);
  };

  const uploadEvidence = async (moduleId: string, fileName: string, phaseId: string) => {
    if (!user?.uid || !user?.implementationId) return;
    const db = getFirestore();
    const progressRef = doc(db, "moduleProgress", getModuleProgressId(moduleId));
    
    await setDoc(progressRef, {
      uid: user.uid,
      implementationId: user.implementationId,
      companyId: user.companyId || "",
      phaseId,
      moduleId,
      fileName,
      evidenceStatus: "submitted",
      moduleReviewStatus: "pending_review",
      evidenceSubmittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  };

  const approveModuleReview = async (params: { 
    uid: string, 
    implId: string, 
    compId: string, 
    phaseId: string, 
    moduleId: string, 
    comment?: string 
  }) => {
    const db = getFirestore();
    const progressId = getGenericModuleProgressId(params.implId, params.uid, params.moduleId);
    const progressRef = doc(db, "moduleProgress", progressId);
    
    await updateDoc(progressRef, {
      moduleReviewStatus: "approved",
      evidenceStatus: "approved",
      reviewedByUid: user?.uid,
      reviewedAt: serverTimestamp(),
      reviewComment: params.comment || "Módulo aprovado.",
      updatedAt: serverTimestamp()
    });

    await recalculatePhaseAfterModuleReview({
      uid: params.uid,
      implId: params.implId,
      compId: params.compId,
      phaseId: params.phaseId
    });
  };

  const requestModuleAdjustments = async (params: { 
    uid: string, 
    implId: string, 
    compId: string, 
    phaseId: string, 
    moduleId: string, 
    comment: string 
  }) => {
    const db = getFirestore();
    const progressId = getGenericModuleProgressId(params.implId, params.uid, params.moduleId);
    const progressRef = doc(db, "moduleProgress", progressId);
    
    await updateDoc(progressRef, {
      moduleReviewStatus: "adjustment_requested",
      evidenceStatus: "adjustment_requested",
      reviewedByUid: user?.uid,
      reviewedAt: serverTimestamp(),
      reviewComment: params.comment,
      updatedAt: serverTimestamp()
    });

    const phaseRef = doc(db, "phaseProgress", getGenericPhaseProgressId(params.implId, params.uid, params.phaseId));
    await updateDoc(phaseRef, {
      status: "PendingAdjustments",
      updatedAt: serverTimestamp()
    });
  };

  const rejectModuleReview = async (params: { 
    uid: string, 
    implId: string, 
    compId: string, 
    phaseId: string, 
    moduleId: string, 
    comment: string 
  }) => {
    const db = getFirestore();
    const progressId = getGenericModuleProgressId(params.implId, params.uid, params.moduleId);
    const progressRef = doc(db, "moduleProgress", progressId);
    
    await updateDoc(progressRef, {
      moduleReviewStatus: "rejected",
      evidenceStatus: "rejected",
      reviewedByUid: user?.uid,
      reviewedAt: serverTimestamp(),
      reviewComment: params.comment,
      updatedAt: serverTimestamp()
    });

    const phaseRef = doc(db, "phaseProgress", getGenericPhaseProgressId(params.implId, params.uid, params.phaseId));
    await updateDoc(phaseRef, {
      status: "PendingAdjustments",
      updatedAt: serverTimestamp()
    });
  };

  const recalculatePhaseAfterModuleReview = async (params: { uid: string, implId: string, compId: string, phaseId: string }) => {
    const db = getFirestore();
    const phase = journeyPhases.find(p => p.id === params.phaseId);
    if (!phase) return;

    // Obter áreas do usuário (Master vs Participant)
    let areas: AreaType[] = ["todos"];
    const memberSnap = await getDocs(query(
      collection(db, "implementationMembers"),
      where("implementationId", "==", params.implId),
      where("uid", "==", params.uid)
    ));
    
    if (!memberSnap.empty) {
      const mData = memberSnap.docs[0].data();
      if (mData.role !== 'implementation_master') {
        areas = mData.areas || [];
      }
    }

    const requiredModules = getRequiredAccessibleModules(phase, areas, "client_participant");
    const modSnap = await getDocs(query(
      collection(db, "moduleProgress"),
      where("implementationId", "==", params.implId),
      where("uid", "==", params.uid),
      where("phaseId", "==", params.phaseId)
    ));

    const progressDocs = modSnap.docs.map(d => d.data());
    const allApproved = requiredModules.every(rm => 
      progressDocs.find(p => p.moduleId === rm.id)?.moduleReviewStatus === 'approved'
    );

    if (allApproved) {
      const phaseRef = doc(db, "phaseProgress", getGenericPhaseProgressId(params.implId, params.uid, params.phaseId));
      if (phase.hasMeeting) {
        await updateDoc(phaseRef, {
          status: "ReadyToSchedule",
          progressPercent: 100,
          updatedAt: serverTimestamp()
        });
      } else {
        await updateDoc(phaseRef, {
          status: "Completed",
          progressPercent: 100,
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        await unlockNextPhaseForUser(params.uid, params.implId, params.compId, params.phaseId);
      }
    }
  };

  const saveQuizScore = async (phaseId: string, score: number, answers: any) => {
    if (!user?.uid || !user?.implementationId) return;
    const db = getFirestore();
    const phase = journeyPhases.find(p => p.id === phaseId);
    const passed = score >= 70;

    await setDoc(doc(db, "quizSubmissions", getQuizSubmissionId(phaseId)), {
      uid: user.uid,
      implementationId: user.implementationId,
      companyId: user.companyId || "",
      phaseId,
      score,
      passed,
      answers,
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });

    // O Quiz deixa de ser o gatilho principal, mas mantemos o registro histórico
  };

  const scheduleMeeting = async (phaseId: string, meetingData: { date: string, time: string, notes: string }) => {
    if (!user?.uid || !user?.implementationId) return;
    const db = getFirestore();
    const phase = journeyPhases.find(p => p.id === phaseId);
    const meetingRef = doc(db, "meetings", getMeetingId(phaseId));

    await setDoc(meetingRef, {
      uid: user.uid,
      implementationId: user.implementationId,
      companyId: user.companyId || "",
      phaseId,
      meetingType: phase?.meetingType || "general",
      title: phase?.meetingTitle || "Encontro Guiado",
      status: "Scheduled",
      scheduledDate: meetingData.date,
      scheduledTime: meetingData.time,
      notes: meetingData.notes,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });

    await setDoc(doc(db, "phaseProgress", getPhaseProgressId(phaseId)), {
      status: "Scheduled",
      updatedAt: serverTimestamp()
    }, { merge: true });
  };

  const markMeetingReadyForApproval = async (phaseId: string) => {
    if (!user?.uid || !user?.implementationId) return;
    const db = getFirestore();
    const meetingRef = doc(db, "meetings", getMeetingId(phaseId));

    await setDoc(meetingRef, {
      status: "WaitingApproval",
      readyForApprovalAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });

    await setDoc(doc(db, "phaseProgress", getPhaseProgressId(phaseId)), {
      status: "WaitingApproval",
      updatedAt: serverTimestamp()
    }, { merge: true });
  };

  const approveMeeting = async (params: { uid: string, implId: string, compId: string, phaseId: string, comment?: string }) => {
    const db = getFirestore();
    const meetingRef = doc(db, "meetings", getGenericMeetingId(params.implId, params.uid, params.phaseId));
    
    await setDoc(meetingRef, {
      status: "Completed",
      reviewedByUid: user?.uid,
      reviewedAt: serverTimestamp(),
      reviewComment: params.comment || "Etapa aprovada.",
      updatedAt: serverTimestamp()
    }, { merge: true });

    const phaseRef = doc(db, "phaseProgress", getGenericPhaseProgressId(params.implId, params.uid, params.phaseId));
    await setDoc(phaseRef, {
      status: "Completed",
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });

    await unlockNextPhaseForUser(params.uid, params.implId, params.compId, params.phaseId);
  };

  const requestMeetingAdjustments = async (params: { uid: string, implId: string, compId: string, phaseId: string, comment: string }) => {
    if (!params.comment) throw new Error("Comentário de ajuste é obrigatório.");
    const db = getFirestore();
    const meetingRef = doc(db, "meetings", getGenericMeetingId(params.implId, params.uid, params.phaseId));
    
    await setDoc(meetingRef, {
      status: "PendingAdjustments",
      reviewedByUid: user?.uid,
      reviewedAt: serverTimestamp(),
      reviewComment: params.comment,
      updatedAt: serverTimestamp()
    }, { merge: true });

    const phaseRef = doc(db, "phaseProgress", getGenericPhaseProgressId(params.implId, params.uid, params.phaseId));
    await setDoc(phaseRef, {
      status: "PendingAdjustments",
      updatedAt: serverTimestamp()
    }, { merge: true });
  };

  return {
    progress,
    isLoaded,
    completeModule,
    uploadEvidence,
    saveQuizScore,
    scheduleMeeting,
    markMeetingReadyForApproval,
    approveModuleReview,
    requestModuleAdjustments,
    rejectModuleReview,
    approveMeeting,
    requestMeetingAdjustments,
    recalculatePhaseProgress,
    ensureCurrentProgressConsistency
  };
}
