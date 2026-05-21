
"use client";

import { useState, useEffect } from 'react';
import { ProgressState, PhaseStatus } from '@/types/journey';
import { journeyPhases } from '@/data/journeyData';
import { getFirestore, doc, setDoc, updateDoc, serverTimestamp, collection, query, where, onSnapshot } from 'firebase/firestore';
import { useUser } from '@/firebase';

export function useJourneyStore() {
  const { user } = useUser();
  const [progress, setProgress] = useState<ProgressState>({
    completedModules: [],
    uploadedEvidence: {},
    quizScores: {},
    meetingStatus: {},
    phaseStatus: { 'fase-0': 'InProgress' },
    implantadorNotes: {}
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!user?.implementationId) {
      setIsLoaded(true);
      return;
    }

    const db = getFirestore();
    
    // Listen to module progress
    const moduleQuery = query(
      collection(db, "moduleProgress"),
      where("implementationId", "==", user.implementationId)
    );

    const unsubscribeModules = onSnapshot(moduleQuery, (snapshot) => {
      const completedModules: string[] = [];
      const uploadedEvidence: Record<string, any> = {};

      snapshot.docs.forEach(d => {
        const data = d.data();
        if (data.uid === user.uid && data.status === 'completed') {
          completedModules.push(data.moduleId);
        }
        if (data.evidenceStatus === 'submitted' || data.evidenceStatus === 'approved') {
          uploadedEvidence[data.moduleId] = { 
            name: data.fileName || 'Arquivo',
            status: data.evidenceStatus 
          };
        }
      });

      setProgress(prev => ({
        ...prev,
        completedModules,
        uploadedEvidence
      }));
      setIsLoaded(true);
    });

    // Listen to implementation status for phases
    const implRef = doc(db, "implementations", user.implementationId);
    const unsubscribeImpl = onSnapshot(implRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Here we could map actual phase status if stored in a collection
        // For MVP, we'll keep a basic mapping
      }
    });

    return () => {
      unsubscribeModules();
      unsubscribeImpl();
    };
  }, [user]);

  const completeModule = async (moduleId: string, phaseId: string) => {
    if (!user?.uid || !user?.implementationId) return;

    const db = getFirestore();
    const progressId = `${user.uid}_${moduleId}`;
    
    await setDoc(doc(db, "moduleProgress", progressId), {
      uid: user.uid,
      implementationId: user.implementationId,
      companyId: user.companyId,
      phaseId,
      moduleId,
      status: "completed",
      updatedAt: serverTimestamp(),
    }, { merge: true });
  };

  const uploadEvidence = async (moduleId: string, fileName: string, phaseId: string) => {
    if (!user?.uid || !user?.implementationId) return;

    const db = getFirestore();
    const progressId = `${user.uid}_${moduleId}`;
    
    await updateDoc(doc(db, "moduleProgress", progressId), {
      fileName,
      evidenceStatus: "submitted",
      updatedAt: serverTimestamp(),
    });
  };

  const saveQuizScore = async (phaseId: string, score: number) => {
    if (!user?.uid || !user?.implementationId) return;
    const db = getFirestore();
    
    await setDoc(doc(db, "quizSubmissions", `${user.uid}_${phaseId}`), {
      uid: user.uid,
      implementationId: user.implementationId,
      phaseId,
      score,
      passed: score >= 70,
      submittedAt: serverTimestamp()
    });
  };

  const scheduleMeeting = async (phaseId: string, details: any) => {
    if (!user?.implementationId) return;
    const db = getFirestore();
    
    await setDoc(doc(db, "meetings", `${user.implementationId}_${phaseId}`), {
      implementationId: user.implementationId,
      companyId: user.companyId,
      phaseId,
      status: "scheduled",
      scheduledAt: details.date,
      notes: details.notes,
      createdAt: serverTimestamp()
    });
  };

  return {
    progress,
    isLoaded,
    completeModule,
    uploadEvidence,
    saveQuizScore,
    scheduleMeeting
  };
}
