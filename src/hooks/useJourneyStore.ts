
"use client";

import { useState, useEffect } from 'react';
import { ProgressState, PhaseStatus, AreaType } from '@/types/journey';
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
  getDoc 
} from 'firebase/firestore';
import { useUser } from '@/firebase';

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
  const [isLoaded, setIsLoaded] = useState(false);

  const getModuleProgressId = (moduleId: string) => 
    `${user?.implementationId}_${user?.uid}_${moduleId}`;
  const getPhaseProgressId = (phaseId: string) => 
    `${user?.implementationId}_${user?.uid}_${phaseId}`;
  const getMeetingId = (phaseId: string) => 
    `${user?.implementationId}_${user?.uid}_${phaseId}`;
  const getQuizSubmissionId = (phaseId: string) => 
    `${user?.implementationId}_${user?.uid}_${phaseId}`;

  useEffect(() => {
    if (!user?.uid || !user?.implementationId) {
      if (!user && !isLoaded) setIsLoaded(true);
      return;
    }

    const db = getFirestore();
    const { uid, implementationId, companyId, globalRole } = user;

    const initFirstPhase = async () => {
      if (globalRole === 'admin_2tech' || globalRole === 'implantador' || globalRole === 'client_pending') return;
      
      const firstPhaseId = "fase-0";
      const phaseRef = doc(db, "phaseProgress", getPhaseProgressId(firstPhaseId));
      const phaseSnap = await getDoc(phaseRef);
      
      if (!phaseSnap.exists()) {
        await setDoc(phaseRef, {
          uid,
          implementationId,
          companyId: companyId || "",
          phaseId: firstPhaseId,
          status: "InProgress",
          progressPercent: 0,
          completedModulesCount: 0,
          totalModulesCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
    };
    initFirstPhase();

    const moduleQuery = query(
      collection(db, "moduleProgress"),
      where("implementationId", "==", implementationId),
      where("uid", "==", uid)
    );

    const unsubscribeModules = onSnapshot(moduleQuery, (snapshot) => {
      const completedModules: string[] = [];
      const uploadedEvidence: Record<string, any> = {};
      const validationAnswers: Record<string, string> = {};

      snapshot.docs.forEach(d => {
        const data = d.data();
        if (data.status === 'completed') {
          completedModules.push(data.moduleId);
        }
        if (data.validationAnswer) {
          validationAnswers[data.moduleId] = data.validationAnswer;
        }
        if (data.evidenceStatus) {
          uploadedEvidence[data.moduleId] = { 
            name: data.fileName || 'Arquivo',
            status: data.evidenceStatus,
            implantadorComment: data.implantadorComment || ""
          };
        }
      });

      const phaseQuery = query(
        collection(db, "phaseProgress"),
        where("implementationId", "==", implementationId),
        where("uid", "==", uid)
      );

      const unsubscribePhases = onSnapshot(phaseQuery, (phaseSnap) => {
        const phaseStatus: Record<string, PhaseStatus> = {};
        
        phaseSnap.docs.forEach(d => {
          const data = d.data();
          phaseStatus[data.phaseId] = data.status;
        });

        const meetingsQuery = query(
          collection(db, "meetings"),
          where("implementationId", "==", implementationId),
          where("uid", "==", uid)
        );

        const unsubscribeMeetings = onSnapshot(meetingsQuery, (meetSnap) => {
          const meetingStatus: Record<string, any> = {};
          meetSnap.docs.forEach(d => {
            const data = d.data();
            meetingStatus[data.phaseId] = {
              status: data.status,
              scheduledDate: data.scheduledDate,
              scheduledTime: data.scheduledTime,
              notes: data.notes,
              implantadorComment: data.implantadorComment
            };
          });

          setProgress(prev => ({
            ...prev,
            completedModules,
            uploadedEvidence,
            phaseStatus,
            meetingStatus,
            validationAnswers,
            isLoaded: true
          }));
          setIsLoaded(true);
        });

        return () => unsubscribeMeetings();
      });

      return () => unsubscribePhases();
    });

    return () => {
      unsubscribeModules();
    };
  }, [user?.uid, user?.implementationId]);

  const unlockNextPhase = async (currentPhaseId: string) => {
    if (!user?.uid || !user?.implementationId) return;
    const db = getFirestore();
    const currentIndex = journeyPhases.findIndex(p => p.id === currentPhaseId);
    const nextPhase = journeyPhases[currentIndex + 1];

    if (nextPhase) {
      const nextPhaseRef = doc(db, "phaseProgress", getPhaseProgressId(nextPhase.id));
      const nextPhaseSnap = await getDoc(nextPhaseRef);
      
      if (!nextPhaseSnap.exists() || nextPhaseSnap.data().status === 'Locked') {
        await setDoc(nextPhaseRef, {
          uid: user.uid,
          implementationId: user.implementationId,
          companyId: user.companyId || "",
          phaseId: nextPhase.id,
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

    const requiredModules = phase.modules.filter(m => 
      m.isRequired && (effectiveAreas.includes(m.area) || effectiveAreas.includes('todos'))
    );

    const q = query(
      collection(db, "moduleProgress"),
      where("uid", "==", user.uid),
      where("implementationId", "==", user.implementationId),
      where("phaseId", "==", phaseId),
      where("status", "==", "completed")
    );
    const snap = await getDocs(q);
    const doneIds = snap.docs.map(d => d.data().moduleId);

    const isDone = requiredModules.length > 0 ? requiredModules.every(m => doneIds.includes(m.id)) : true;
    
    const phaseRef = doc(db, "phaseProgress", getPhaseProgressId(phaseId));
    const currentPhaseDoc = await getDoc(phaseRef);
    const currentStatus = currentPhaseDoc.exists() ? currentPhaseDoc.data().status : 'InProgress';

    const totalCount = requiredModules.length;
    const doneCount = doneIds.length;
    const percent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 100;

    let newStatus = currentStatus;

    if (isDone && (currentStatus === 'InProgress' || currentStatus === 'NotStarted' || currentStatus === 'Locked')) {
      newStatus = "WaitingCheckpoint";
    } else if (!isDone && (currentStatus === 'InProgress' || currentStatus === 'NotStarted')) {
      newStatus = "InProgress";
    }

    await setDoc(phaseRef, {
      uid: user.uid,
      implementationId: user.implementationId,
      companyId: user.companyId || "",
      phaseId,
      status: newStatus,
      progressPercent: percent,
      completedModulesCount: doneCount,
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
      validationAnsweredAt: serverTimestamp(),
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });

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
      evidenceSubmittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
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

    if (passed) {
      const newStatus = phase?.hasMeeting ? "ReadyToSchedule" : "Completed";
      await setDoc(doc(db, "phaseProgress", getPhaseProgressId(phaseId)), {
        status: newStatus,
        completedAt: !phase?.hasMeeting ? serverTimestamp() : null,
        updatedAt: serverTimestamp()
      }, { merge: true });

      if (!phase?.hasMeeting) {
        await unlockNextPhase(phaseId);
      }
    }
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

  return {
    progress,
    isLoaded,
    completeModule,
    uploadEvidence,
    saveQuizScore,
    scheduleMeeting,
    recalculatePhaseProgress
  };
}
