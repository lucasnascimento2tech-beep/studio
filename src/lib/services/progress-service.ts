
import { 
  getFirestore, 
  doc, 
  updateDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  serverTimestamp,
  increment
} from "firebase/firestore";
import { ProgressState, PhaseStatus } from "@/types/journey";

export async function updateModuleProgress(
  uid: string, 
  implementationId: string, 
  moduleId: string, 
  phaseId: string, 
  data: any
) {
  const db = getFirestore();
  const progressId = `${uid}_${moduleId}`;
  const progressRef = doc(db, "moduleProgress", progressId);

  await setDoc(progressRef, {
    uid,
    implementationId,
    moduleId,
    phaseId,
    status: "completed",
    updatedAt: serverTimestamp(),
    ...data
  }, { merge: true });

  // Update total progress count on implementation if needed
  const implRef = doc(db, "implementations", implementationId);
  await updateDoc(implRef, {
    updatedAt: serverTimestamp()
  });
}

export async function checkCollectiveUnlock(implementationId: string, meetingType: string) {
  const db = getFirestore();
  
  // 1. Get mandatory members for this meeting
  const membersQ = query(
    collection(db, "implementationMembers"), 
    where("implementationId", "==", implementationId),
    where("active", "==", true)
  );
  const membersSnap = await getDocs(membersQ);
  const members = membersSnap.docs.map(d => d.data());
  
  const requiredMembers = members.filter(m => 
    m.role === 'implementation_master' || 
    m.isRequiredParticipant || 
    (m.requiredForMeetings && m.requiredForMeetings.includes(meetingType))
  );

  // 2. Check if all have completed their specific modules
  // This is a simplified check for MVP: check if they have at least 1 module progress record for this phase
  // In a real scenario, we'd cross-reference with journeyData
  
  return {
    canUnlock: true, // Placeholder for logic
    pendingMembers: [] 
  };
}
