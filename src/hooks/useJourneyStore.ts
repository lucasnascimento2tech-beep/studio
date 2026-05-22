
"use client";

import { useState, useEffect } from 'react';
import { ProgressState, PhaseStatus, AreaType } from '@/types/journey';
import { journeyPhases } from '@/data/journeyData';
import { getFirestore, doc, setDoc, updateDoc, serverTimestamp, collection, query, where, onSnapshot, getDocs, getDoc } from 'firebase/firestore';
import { useUser } from '@/firebase';

export function useJourneyStore() {
  const { user } = useUser();
  const [progress, setProgress] = useState<ProgressState>({
    completedModules: [],
    uploadedEvidence: {},
    quizScores: {},
    meetingStatus: {},
    phaseStatus: {},
    implantadorNotes: {}
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!user?.uid || !user?.implementationId) {
      if (!user) setIsLoaded(true);
      return;
    }

    const db = getFirestore();
    
    // 1. Escuta progresso de módulos INDIVIDUAL
    const moduleQuery = query(
      collection(db, "moduleProgress"),
      where("implementationId", "==", user.implementationId),
      where("uid", "==", user.uid)
    );

    const unsubscribeModules = onSnapshot(moduleQuery, (snapshot) => {
      const completedModules: string[] = [];
      const uploadedEvidence: Record<string, any> = {};

      snapshot.docs.forEach(d => {
        const data = d.data();
        if (data.status === 'completed') {
          completedModules.push(data.moduleId);
        }
        if (data.evidenceStatus) {
          uploadedEvidence[data.moduleId] = { 
            name: data.fileName || 'Arquivo',
            status: data.evidenceStatus,
            implantadorComment: data.implantadorComment || ""
          };
        }
      });

      // 2. Escuta progresso de fases INDIVIDUAL
      const phaseQuery = query(
        collection(db, "phaseProgress"),
        where("implementationId", "==", user.implementationId),
        where("uid", "==", user.uid)
      );

      const unsubscribePhases = onSnapshot(phaseQuery, (phaseSnap) => {
        const phaseStatus: Record<string, PhaseStatus> = {};
        
        // Inicializa a fase 0 como InProgress se nada existir
        if (phaseSnap.empty) {
          phaseStatus['fase-0'] = 'InProgress';
        }

        phaseSnap.docs.forEach(d => {
          const data = d.data();
          phaseStatus[data.phaseId] = data.status;
        });

        // 3. Escuta Encontros/Meetings INDIVIDUAL
        const meetingsQuery = query(
          collection(db, "meetings"),
          where("implementationId", "==", user.implementationId),
          where("uid", "==", user.uid)
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
  }, [user]);

  const unlockNextPhase = async (currentPhaseId: string) => {
    if (!user?.uid || !user?.implementationId) return;
    const db = getFirestore();
    const currentIndex = journeyPhases.findIndex(p => p.id === currentPhaseId);
    const nextPhase = journeyPhases[currentIndex + 1];

    if (nextPhase) {
      await setDoc(doc(db, "phaseProgress", `${user.uid}_${nextPhase.id}`), {
        uid: user.uid,
        implementationId: user.implementationId,
        companyId: user.companyId || "",
        phaseId: nextPhase.id,
        status: "InProgress",
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
  };

  const recalculatePhaseProgress = async (phaseId: string, effectiveAreas: AreaType[]) => {
    if (!user?.uid || !user?.implementationId) return;
    const db = getFirestore();
    const phase = journeyPhases.find(p => p.id === phaseId);
    if (!phase) return;

    // Busca módulos obrigatórios acessíveis
    const requiredModules = phase.modules.filter(m => 
      m.isRequired && (effectiveAreas.includes(m.area) || effectiveAreas.includes('todos'))
    );

    // Busca progresso atual do Firestore para garantir precisão
    const q = query(
      collection(db, "moduleProgress"),
      where("uid", "==", user.uid),
      where("phaseId", "==", phaseId),
      where("status", "==", "completed")
    );
    const snap = await getDocs(q);
    const doneIds = snap.docs.map(d => d.data().moduleId);

    const isDone = requiredModules.every(m => doneIds.includes(m.id));
    
    const currentPhaseDoc = await getDoc(doc(db, "phaseProgress", `${user.uid}_${phaseId}`));
    const currentStatus = currentPhaseDoc.exists() ? currentPhaseDoc.data().status : 'InProgress';

    // Se concluiu módulos, mas ainda está em InProgress, move para WaitingCheckpoint
    if (isDone && (currentStatus === 'InProgress' || currentStatus === 'NotStarted')) {
      await updateDoc(doc(db, "phaseProgress", `${user.uid}_${phaseId}`), {
        status: "WaitingCheckpoint",
        progressPercent: 100,
        updatedAt: serverTimestamp()
      });
    } else if (!isDone && currentStatus !== 'Locked') {
      const perc = requiredModules.length > 0 ? Math.round((doneIds.length / requiredModules.length) * 100) : 100;
      await setDoc(doc(db, "phaseProgress", `${user.uid}_${phaseId}`), {
        uid: user.uid,
        implementationId: user.implementationId,
        companyId: user.companyId || "",
        phaseId,
        status: "InProgress",
        progressPercent: perc,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
  };

  const completeModule = async (moduleId: string, phaseId: string, effectiveAreas: AreaType[]) => {
    if (!user?.uid || !user?.implementationId) return;

    const db = getFirestore();
    const progressId = `${user.uid}_${moduleId}`;
    
    await setDoc(doc(db, "moduleProgress", progressId), {
      uid: user.uid,
      implementationId: user.implementationId,
      companyId: user.companyId || "",
      phaseId,
      moduleId,
      status: "completed",
      updatedAt: serverTimestamp(),
    }, { merge: true });

    await recalculatePhaseProgress(phaseId, effectiveAreas);
  };

  const uploadEvidence = async (moduleId: string, fileName: string, phaseId: string) => {
    if (!user?.uid || !user?.implementationId) return;

    const db = getFirestore();
    const progressId = `${user.uid}_${moduleId}`;
    
    await setDoc(doc(db, "moduleProgress", progressId), {
      uid: user.uid,
      implementationId: user.implementationId,
      companyId: user.companyId || "",
      phaseId,
      moduleId,
      fileName,
      evidenceStatus: "submitted",
      updatedAt: serverTimestamp(),
    }, { merge: true });
  };

  const saveQuizScore = async (phaseId: string, score: number, answers: any) => {
    if (!user?.uid || !user?.implementationId) return;
    const db = getFirestore();
    const phase = journeyPhases.find(p => p.id === phaseId);
    
    const passed = score >= 70;

    await setDoc(doc(db, "quizSubmissions", `${user.uid}_${phaseId}`), {
      uid: user.uid,
      implementationId: user.implementationId,
      companyId: user.companyId || "",
      phaseId,
      score,
      passed,
      answers,
      submittedAt: serverTimestamp()
    });

    if (passed) {
      const newStatus = phase?.hasMeeting ? "ReadyToSchedule" : "Completed";
      await updateDoc(doc(db, "phaseProgress", `${user.uid}_${phaseId}`), {
        status: newStatus,
        completedAt: !phase?.hasMeeting ? serverTimestamp() : null,
        updatedAt: serverTimestamp()
      });

      if (!phase?.hasMeeting) {
        await unlockNextPhase(phaseId);
      }
    }
  };

  const scheduleMeeting = async (phaseId: string, meetingData: { date: string, time: string, notes: string }) => {
    if (!user?.uid || !user?.implementationId) return;
    const db = getFirestore();
    const phase = journeyPhases.find(p => p.id === phaseId);
    
    const meetingRef = doc(db, "meetings", `${user.uid}_${phaseId}`);
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
    });

    await updateDoc(doc(db, "phaseProgress", `${user.uid}_${phaseId}`), {
      status: "Scheduled",
      updatedAt: serverTimestamp()
    });
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
