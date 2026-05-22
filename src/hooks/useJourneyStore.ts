
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
    if (!user?.uid || !user?.implementationId) {
      if (!user) setIsLoaded(true);
      return;
    }

    const db = getFirestore();
    
    // Listen to module progress (Individual)
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
        if (data.evidenceStatus === 'submitted' || data.evidenceStatus === 'approved') {
          uploadedEvidence[data.moduleId] = { 
            name: data.fileName || 'Arquivo',
            status: data.evidenceStatus 
          };
        }
      });

      // Listen to Individual Phase Progress
      const phaseQuery = query(
        collection(db, "phaseProgress"),
        where("implementationId", "==", user.implementationId),
        where("uid", "==", user.uid)
      );

      const unsubscribePhases = onSnapshot(phaseQuery, (phaseSnap) => {
        const phaseStatus: Record<string, PhaseStatus> = { 'fase-0': 'InProgress' };
        
        phaseSnap.docs.forEach(d => {
          const data = d.data();
          phaseStatus[data.phaseId] = data.status;
        });

        // Listen to Meetings (Individual)
        const meetingsQuery = query(
          collection(db, "meetings"),
          where("implementationId", "==", user.implementationId),
          where("uid", "==", user.uid)
        );

        const unsubscribeMeetings = onSnapshot(meetingsQuery, (meetSnap) => {
          const meetingStatus: Record<string, string> = {};
          meetSnap.docs.forEach(d => {
            const data = d.data();
            meetingStatus[data.phaseId] = data.status;
          });

          setProgress(prev => ({
            ...prev,
            completedModules,
            uploadedEvidence,
            phaseStatus,
            meetingStatus
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
    
    await setDoc(doc(db, "moduleProgress", progressId), {
      uid: user.uid,
      implementationId: user.implementationId,
      companyId: user.companyId,
      phaseId,
      moduleId,
      fileName,
      evidenceStatus: "submitted",
      updatedAt: serverTimestamp(),
    }, { merge: true });
  };

  const saveQuizScore = async (phaseId: string, score: number) => {
    if (!user?.uid || !user?.implementationId) return;
    const db = getFirestore();
    
    await setDoc(doc(db, "quizSubmissions", `${user.uid}_${phaseId}`), {
      uid: user.uid,
      implementationId: user.implementationId,
      companyId: user.companyId,
      phaseId,
      score,
      passed: score >= 70,
      submittedAt: serverTimestamp()
    });

    // Update individual phase status after quiz
    if (score >= 70) {
      await setDoc(doc(db, "phaseProgress", `${user.uid}_${phaseId}`), {
        uid: user.uid,
        implementationId: user.implementationId,
        companyId: user.companyId,
        phaseId,
        status: "ReadyToSchedule",
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
  };

  const scheduleMeeting = async (phaseId: string, details?: any) => {
    if (!user?.uid || !user?.implementationId) return;
    const db = getFirestore();
    
    await setDoc(doc(db, "meetings", `${user.uid}_${phaseId}`), {
      uid: user.uid,
      implementationId: user.implementationId,
      companyId: user.companyId,
      phaseId,
      status: "scheduled",
      scheduledAt: details?.date || serverTimestamp(),
      notes: details?.notes || "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    await setDoc(doc(db, "phaseProgress", `${user.uid}_${phaseId}`), {
      uid: user.uid,
      implementationId: user.implementationId,
      companyId: user.companyId,
      phaseId,
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
    scheduleMeeting
  };
}
