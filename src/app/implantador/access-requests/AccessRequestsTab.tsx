
"use client";

import { useEffect, useState } from "react";
import { getFirestore, collection, query, onSnapshot, doc, updateDoc, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { useUser } from "@/firebase";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AccessRequest, AreaType } from "@/types/journey";
import { Loader2, UserX, Info, Building, MapPin, CheckCircle2, Users } from "lucide-react";

export function AccessRequestsTab() {
  const { user: currentUser } = useUser();
  const db = getFirestore();
  const { toast } = useToast();
  
  const [isMounted, setIsMounted] = useState(false);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [implementations, setImplementations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');

  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);
  const [approvalType, setApprovalType] = useState<'master' | 'participant' | 'reject' | null>(null);
  const [targetCompanyId, setTargetCompanyId] = useState<string>("");
  const [targetImplId, setTargetImplId] = useState<string>("");
  const [reviewComment, setReviewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // 1. Escutar solicitações
    const qReq = query(collection(db, "accessRequests"));
    const unsubscribeReq = onSnapshot(qReq, (snapshot) => {
      const reqList = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AccessRequest));
      setRequests(reqList);
      setLoading(false);
    }, (err) => {
      console.error("Erro ao buscar solicitações:", err);
      setLoading(false);
    });

    // 2. Buscar empresas e implantações para os selects
    const fetchData = async () => {
      try {
        const compSnap = await getDocs(collection(db, "companies"));
        setCompanies(compSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        const implSnap = await getDocs(collection(db, "implementations"));
        setImplementations(implSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Erro ao buscar dados auxiliares:", err);
      }
    };
    fetchData();

    return () => unsubscribeReq();
  }, [db]);

  if (!isMounted) return null;

  const resetForm = () => {
    setApprovalType(null);
    setTargetCompanyId("");
    setTargetImplId("");
    setReviewComment("");
    setSelectedRequest(null);
  };

  const handleProcessRequest = async () => {
    if (!selectedRequest || !approvalType) return;
    setSubmitting(true);

    try {
      const requestRef = doc(db, "accessRequests", selectedRequest.id);
      const userRef = doc(db, "users", selectedRequest.uid);

      if (approvalType === 'reject') {
        await updateDoc(requestRef, {
          status: "rejected",
          reviewedByUid: currentUser?.uid,
          reviewComment: reviewComment || "Solicitação não aprovada.",
          updatedAt: serverTimestamp()
        });
        await updateDoc(userRef, {
          active: false,
          approvalStatus: "rejected",
          updatedAt: serverTimestamp()
        });
        toast({ title: "Solicitação Rejeitada" });
      } 
      else if (approvalType === 'master') {
        let companyId = targetCompanyId;
        let implId = targetImplId;

        if (!companyId || companyId === 'none') {
          const newCompanyRef = await addDoc(collection(db, "companies"), {
            name: selectedRequest.companyName || "Nova Empresa",
            cnpj: selectedRequest.cnpj || "",
            status: "implementation",
            mainContactUid: selectedRequest.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          companyId = newCompanyRef.id;
          await updateDoc(newCompanyRef, { id: companyId });

          const newImplRef = await addDoc(collection(db, "implementations"), {
            companyId,
            status: "in_progress",
            currentPhaseId: "fase-0",
            assignedImplantadorUid: currentUser?.uid,
            progressPercent: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          implId = newImplRef.id;
          await updateDoc(newImplRef, { id: implId });
          await updateDoc(newCompanyRef, { activeImplementationId: implId });
        }

        await updateDoc(userRef, {
          globalRole: "client_master",
          active: true,
          approvalStatus: "approved",
          companyId,
          implementationId: implId,
          updatedAt: serverTimestamp()
        });

        await addDoc(collection(db, "implementationMembers"), {
          implementationId: implId,
          companyId,
          uid: selectedRequest.uid,
          name: selectedRequest.name,
          email: selectedRequest.email,
          role: "implementation_master",
          areas: ["todos"],
          inviteStatus: "accepted",
          active: true,
          createdAt: serverTimestamp()
        });

        await updateDoc(requestRef, {
          status: "approved",
          reviewedByUid: currentUser?.uid,
          reviewComment,
          updatedAt: serverTimestamp()
        });
        toast({ title: "Aprovado como Master" });
      }

      resetForm();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRequests = requests.filter(r => r && r.status === filter);

  const formatDate = (ts: any) => {
    if (!ts) return "...";
    try {
      if (ts.toDate) return ts.toDate().toLocaleDateString();
      if (typeof ts === 'string') return new Date(ts).toLocaleDateString();
    } catch (e) {
      return "...";
    }
    return "...";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-center gap-4 mb-4">
        {['pending', 'approved', 'rejected'].map((f) => (
          <Button 
            key={f}
            variant={filter === f ? 'default' : 'outline'} 
            onClick={() => setFilter(f as any)}
            className="rounded-full px-8 capitalize"
          >
            {f === 'pending' ? 'Pendentes' : f === 'approved' ? 'Aprovadas' : 'Rejeitadas'}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
      ) : filteredRequests.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-dashed">
          <Info className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-500">Nenhuma solicitação encontrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredRequests.map(req => (
            <Card key={req.id} className="border-none shadow-md overflow-hidden bg-white">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-bold">{req.name || 'Sem Nome'}</CardTitle>
                    <p className="text-xs text-slate-400">{req.email}</p>
                  </div>
                  <Badge variant={req.status === 'pending' ? 'secondary' : 'default'}>{req.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <p className="font-bold text-slate-400 uppercase">Empresa</p>
                    <p className="font-medium flex items-center gap-1"><Building className="w-3 h-3" /> {req.companyName || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-400 uppercase">Solicitado em</p>
                    <p className="font-medium">{formatDate(req.createdAt)}</p>
                  </div>
                </div>
              </CardContent>
              {req.status === 'pending' && (
                <CardFooter className="bg-slate-50 p-4 border-t">
                  <Dialog onOpenChange={(open) => { if(!open) resetForm(); }}>
                    <DialogTrigger asChild>
                      <Button className="w-full font-bold" onClick={() => setSelectedRequest(req)}>
                        Avaliar Solicitação
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader><DialogTitle>Processar: {req?.name}</DialogTitle></DialogHeader>
                      <div className="space-y-6 py-4">
                        <div className="space-y-3">
                          <Label>Como deseja aprovar?</Label>
                          <div className="grid grid-cols-3 gap-3">
                            <Button variant={approvalType === 'master' ? 'default' : 'outline'} onClick={() => setApprovalType('master')}>Aprovar Master</Button>
                            <Button variant={approvalType === 'reject' ? 'destructive' : 'outline'} onClick={() => setApprovalType('reject')}>Rejeitar</Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Comentário</Label>
                          <Textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={handleProcessRequest} disabled={submitting || !approvalType}>
                          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
