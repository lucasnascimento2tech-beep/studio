
"use client";

import { useState, useEffect } from 'react';
import { ProgressState, PhaseStatus } from '@/types/journey';
import { journeyPhases } from '@/data/journeyData';

const STORAGE_KEY = 'guia_2tech_progress';

const initialProgress: ProgressState = {
  completedModules: [],
  uploadedEvidence: {},
  quizAnswers: {},
  quizScores: {},
  meetingStatus: {},
  phaseStatus: {
    'fase-0': 'InProgress'
  },
  implantadorNotes: {}
};

export function useJourneyStore() {
  const [progress, setProgress] = useState<ProgressState>(initialProgress);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setProgress(JSON.parse(saved));
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    }
  }, [progress, isLoaded]);

  const completeModule = (moduleId: string, phaseId: string) => {
    setProgress(prev => {
      if (prev.completedModules.includes(moduleId)) return prev;
      
      const newCompleted = [...prev.completedModules, moduleId];
      const newState = { ...prev, completedModules: newCompleted };
      
      // Update phase status if needed
      const phase = journeyPhases.find(p => p.id === phaseId);
      if (phase) {
        const allCompleted = phase.modules.every(m => newCompleted.includes(m.id));
        const currentStatus = prev.phaseStatus[phaseId];
        
        if (allCompleted && currentStatus === 'InProgress') {
           newState.phaseStatus[phaseId] = 'WaitingEvidence'; // Just a transition
        }
      }
      
      return newState;
    });
  };

  const uploadEvidence = (moduleId: string, fileName: string) => {
    setProgress(prev => ({
      ...prev,
      uploadedEvidence: {
        ...prev.uploadedEvidence,
        [moduleId]: { name: fileName, date: new Date().toISOString() }
      }
    }));
  };

  const saveQuizScore = (phaseId: string, score: number) => {
    setProgress(prev => {
      const newState = {
        ...prev,
        quizScores: { ...prev.quizScores, [phaseId]: score }
      };
      
      // Logic to unlock meeting or next phase
      const phase = journeyPhases.find(p => p.id === phaseId);
      if (score >= 70) {
        if (phase?.hasMeeting) {
          newState.phaseStatus[phaseId] = 'ReadyToSchedule';
        } else {
          newState.phaseStatus[phaseId] = 'Completed';
          unlockNextPhase(phaseId, newState);
        }
      }
      
      return newState;
    });
  };

  const unlockNextPhase = (currentPhaseId: string, state: ProgressState) => {
    const currentIndex = journeyPhases.findIndex(p => p.id === currentPhaseId);
    if (currentIndex < journeyPhases.length - 1) {
      const nextPhase = journeyPhases[currentIndex + 1];
      if (!state.phaseStatus[nextPhase.id]) {
        state.phaseStatus[nextPhase.id] = 'NotStarted';
      }
      // If previous is completed, next becomes InProgress
      if (state.phaseStatus[currentPhaseId] === 'Completed') {
         state.phaseStatus[nextPhase.id] = 'InProgress';
      }
    }
  };

  const scheduleMeeting = (phaseId: string) => {
    setProgress(prev => ({
      ...prev,
      meetingStatus: { ...prev.meetingStatus, [phaseId]: 'Scheduled' },
      phaseStatus: { ...prev.phaseStatus, [phaseId]: 'Scheduled' }
    }));
  };

  const resetProgress = () => {
    setProgress(initialProgress);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Implantador Actions
  const approvePhase = (phaseId: string) => {
    setProgress(prev => {
      const newState = {
        ...prev,
        phaseStatus: { ...prev.phaseStatus, [phaseId]: 'Completed' },
        meetingStatus: { ...prev.meetingStatus, [phaseId]: 'Approved' }
      };
      unlockNextPhase(phaseId, newState);
      return newState;
    });
  };

  const rejectPhase = (phaseId: string, notes: string) => {
    setProgress(prev => ({
      ...prev,
      phaseStatus: { ...prev.phaseStatus, [phaseId]: 'PendingAdjustments' },
      implantadorNotes: { ...prev.implantadorNotes, [phaseId]: notes }
    }));
  };

  return {
    progress,
    isLoaded,
    completeModule,
    uploadEvidence,
    saveQuizScore,
    scheduleMeeting,
    resetProgress,
    approvePhase,
    rejectPhase
  };
}
