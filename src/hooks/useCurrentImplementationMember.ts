"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/firebase";
import { getFirestore, collection, query, where, onSnapshot } from "firebase/firestore";
import { ImplementationMember, AreaType } from "@/types/journey";

export function useCurrentImplementationMember() {
  const { user, loading: authLoading } = useUser();
  const [member, setMember] = useState<ImplementationMember | null>(null);
  const [effectiveAreas, setEffectiveAreas] = useState<AreaType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setLoading(false);
      setEffectiveAreas([]);
      return;
    }

    // 1. Admins e Implantadores: Acesso total imediato
    if (user.globalRole === "admin_2tech" || user.globalRole === "implantador") {
      setEffectiveAreas(["todos"]);
      setLoading(false);
      return;
    }

    // 2. Usuários Pendentes: Sem áreas
    if (user.globalRole === "client_pending") {
      setEffectiveAreas([]);
      setLoading(false);
      return;
    }

    // 3. Cliente Master: Acesso total se tiver implementação vinculada
    if (user.globalRole === "client_master") {
      if (user.implementationId) {
        setEffectiveAreas(["todos"]);
      } else {
        setEffectiveAreas([]);
      }
      setLoading(false);
      return;
    }

    // 4. Participantes: Buscar áreas no implementationMembers (Exige implementationId)
    if (user.globalRole === "client_participant") {
      if (!user.implementationId) {
        setMember(null);
        setEffectiveAreas([]);
        setError("Vínculo de implantação não encontrado.");
        setLoading(false);
        return;
      }

      const db = getFirestore();
      const q = query(
        collection(db, "implementationMembers"),
        where("implementationId", "==", user.implementationId),
        where("uid", "==", user.uid),
        where("active", "==", true)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const memberData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as ImplementationMember;
          setMember(memberData);
          setEffectiveAreas(memberData.areas || []);
          setError(null);
        } else {
          setMember(null);
          setEffectiveAreas([]); // NUNCA usar fallback "todos" para participante
          setError("Vínculo de participante não encontrado.");
        }
        setLoading(false);
      }, (err) => {
        console.error("Erro ao buscar membro:", err);
        setError("Falha ao validar áreas de acesso.");
        setLoading(false);
      });

      return () => unsubscribe();
    }

    // Fallback de segurança
    setLoading(false);
  }, [user, authLoading]);

  return {
    member,
    effectiveAreas,
    loading: authLoading || loading,
    error,
    isMaster: user?.globalRole === "client_master",
    isParticipant: user?.globalRole === "client_participant",
    canAccessAllAreas: effectiveAreas.includes("todos")
  };
}
