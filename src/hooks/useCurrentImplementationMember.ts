
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

    if (!user || !user.implementationId) {
      setLoading(false);
      setEffectiveAreas([]);
      return;
    }

    // Admins e Implantadores sempre têm acesso a tudo
    if (user.globalRole === "admin_2tech" || user.globalRole === "implantador") {
      setEffectiveAreas(["todos"]);
      setLoading(false);
      return;
    }

    // Masters têm acesso a tudo da própria empresa
    if (user.globalRole === "client_master") {
      setEffectiveAreas(["todos"]);
      setLoading(false);
      return;
    }

    // Participantes: Buscar áreas no implementationMembers
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
        setEffectiveAreas([]); // NENHUM fallback para participante sem registro
        setError("Vínculo de participante não encontrado.");
      }
      setLoading(false);
    }, (err) => {
      console.error("Erro ao buscar membro:", err);
      setError("Falha ao validar áreas de acesso.");
      setLoading(false);
    });

    return () => unsubscribe();
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
