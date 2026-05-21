
'use client';

import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc 
} from "firebase/firestore";
import { journeyPhases } from "@/data/journeyData";
import { ImplementationMember, ProgressState } from "@/types/journey";

export interface UnlockStatus {
  canUnlock: boolean;
  pendingUsers: {
    uid?: string;
    name: string;
    email: string;
    missingModules: string[];
  }[];
}

/**
 * Verifica se um encontro guiado pode ser desbloqueado para agendamento.
 * Regra: Todos os participantes obrigatórios das áreas do encontro devem ter concluído os módulos obrigatórios.
 */
export async function canUnlockMeeting(
  implementationId: string, 
  meetingType: string
): Promise<UnlockStatus> {
  const db = getFirestore();
  
  // 1. Localizar a fase e os módulos obrigatórios para este encontro
  const phase = journeyPhases.find(p => p.meetingType === meetingType);
  if (!phase) return { canUnlock: true, pendingUsers: [] };

  const requiredModules = phase.modules.filter(m => m.isRequired);

  // 2. Buscar membros da implantação
  const membersRef = collection(db, "implementationMembers");
  const membersQuery = query(
    membersRef, 
    where("implementationId", "==", implementationId),
    where("active", "==", true)
  );
  const membersSnap = await getDocs(membersQuery);
  const members = membersSnap.docs.map(d => ({ id: d.id, ...d.data() } as ImplementationMember));

  // 3. Filtrar membros obrigatórios para este encontro específico
  // O Cliente Master é sempre considerado obrigatório
  const mandatoryMembers = members.filter(m => 
    m.role === 'implementation_master' || 
    m.isRequiredParticipant || 
    (m.requiredForMeetings && m.requiredForMeetings.includes(meetingType))
  );

  // 4. Buscar progresso de todos os membros obrigatórios
  const pendingUsers: UnlockStatus['pendingUsers'] = [];

  for (const member of mandatoryMembers) {
    if (!member.uid) {
      // Participante ainda não aceitou o convite
      pendingUsers.push({
        name: member.name,
        email: member.email,
        missingModules: requiredModules.map(m => m.title)
      });
      continue;
    }

    const progressQuery = query(
      collection(db, "moduleProgress"),
      where("implementationId", "==", implementationId),
      where("uid", "==", member.uid),
      where("status", "==", "completed")
    );
    const progressSnap = await getDocs(progressQuery);
    const completedIds = progressSnap.docs.map(d => d.data().moduleId);

    // Filtrar módulos que este usuário específico deveria ter feito (baseado na área)
    // Se o usuário tem acesso à área do módulo, ele deve completá-lo
    const userModules = requiredModules.filter(m => 
      member.areas.includes(m.area) || member.areas.includes('todos')
    );

    const missing = userModules.filter(m => !completedIds.includes(m.id));

    if (missing.length > 0) {
      pendingUsers.push({
        uid: member.uid,
        name: member.name,
        email: member.email,
        missingModules: missing.map(m => m.title)
      });
    }
  }

  return {
    canUnlock: pendingUsers.length === 0,
    pendingUsers
  };
}
