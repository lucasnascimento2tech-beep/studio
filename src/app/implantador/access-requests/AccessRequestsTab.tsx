
"use client";

import { useEffect, useState } from "react";
import { 
  getFirestore, 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  getDocs, 
  addDoc, 
  serverTimestamp,
  getDoc 
} from "firebase/firestore";
import { useUser } from "@/firebase";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { AccessRequest, AreaType } from "@/types/journey";
import { Loader2, Info, Building, MapPin, CheckCircle2 } from "lucide-react";

export function AccessRequestsTab() {
  const { user: currentUser } = useUser();
  const db = getFirestore();
  const { toast } = useToast();
  
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [implementations, setImplementations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');

  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);
  const [approvalType, setApprovalType] = useState<'master' | 'participant' | 'reject' | null>(null);
  const [targetCompanyId, setTargetCompanyId] = useState<string>("");
  const [targetImplId, setTargetImplId] = useState<string>("");
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [reviewComment, setReviewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const qReq = query(collection(db, "accessRequests"));
    const unsubscribeReq = onSnapshot(qReq, (snapshot) => {
      setRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AccessRequest)));
      setLoading(false);
    });

    const fetchData = async () => {
      const compSnap = await getDocs(collection(db, "companies"));
      setCompanies(compSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const implSnap = await getDocs(collection(db, "implementations"));
      setImplementations(implSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchData();

    return () => unsubscribeReq();
  }, [db]);

  const handleProcess = async () => {
    if (!selectedRequest || !approvalType) return;
    setSubmitting(true);

    try {
      const userRef = doc(db, "users", selectedRequest.uid);
      const requestRef = doc(db, "accessRequests", selectedRequest.id);

      if (approvalType === 'reject') {
        await updateDoc(requestRef, { 
          status: "rejected", 
          reviewedByUid: currentUser?.uid, 
          reviewComment: reviewComment || "Solicitação não aprovada.",
          updatedAt: serverTimestamp() 
        });
        await updateDoc(userRef, { approvalStatus: "rejected", active: false, updatedAt: serverTimestamp() });
        toast({ title: "Solicitação Rejeitada" });
      } 
      else if (approvalType === 'master') {
        let companyId = targetCompanyId;
        let implId = targetImplId;

        // Create new company if "none" selected
        if (!companyId || companyId === 'none') {
          const newCompanyRef = await addDoc(collection(db, "companies"), {
            name: selectedRequest.companyName,
            cnpj: selectedRequest.cnpj,
            city: selectedRequest.city,
            state: selectedRequest.state,
            website: selectedRequest.website || "",
            status: "implementation",
            mainContactUid: selectedRequest.uid,
            mainImplantadorUid: currentUser?.uid,
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
            startedAt: serverTimestamp(),
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
          clientAccessType: "master",
          areas: ["todos"],
          inviteStatus: "accepted",
          active: true,
          acceptedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        await updateDoc(requestRef, {
          status: "approved",
          reviewedByUid: currentUser?.uid,
          reviewComment,
          matchedCompanyId: companyId,
          matchedImplementationId: implId,
          updatedAt: serverTimestamp()
        });
        toast({ title: "Aprovado como Master" });
      } 
      else if (approvalType === 'participant') {
        if (!targetCompanyId || !targetImplId) {
          toast({ title: "Erro", description: "Selecione a empresa e implantação.", variant: "destructive" });
          setSubmitting(false);
          return;
        }

        await updateDoc(userRef, {
          globalRole: "client_participant",
          active: true,
          approvalStatus: "approved",
          companyId: targetCompanyId,
          implementationId: targetImplId,
          updatedAt: serverTimestamp()
        });

        await addDoc(collection(db, "implementationMembers"), {
          implementationId: targetImplId,
          companyId: targetCompanyId,
          uid: selectedRequest.uid,
          name: selectedRequest.name,
          email: selectedRequest.email,
          role: "participant",
          clientAccessType: "participant",
          areas: selectedAreas,
          inviteStatus: "accepted",
          active: true,
          acceptedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        await updateDoc(requestRef, {
          status: "approved",
          reviewedByUid: currentUser?.uid,
          reviewComment,
          matchedCompanyId: targetCompanyId,
          matchedImplementationId: targetImplId,
          updatedAt: serverTimestamp()
        });
        toast({ title: "Participante Aprovado" });
      }

      setSelectedRequest(null);
      setApprovalType(null);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRequests = requests.filter(r => r.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex justify-center gap-4 mb-8">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? <Loader2 className="animate-spin mx-auto col-span-full" /> : 
         filteredRequests.length === 0 ? <p className="text-center text-slate-500 col-span-full py-20">Nenhuma solicitação encontrada.</p> :
         filteredRequests.map(req => (
          <Card key={req.id} className="border-none shadow-md">
            <CardHeader>
              <div className="flex justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">{req.name}</CardTitle>
                  <p className="text-xs text-slate-400">{req.email}</p>
                </div>
                <Badge variant={req.status === 'pending' ? 'secondary' : 'default'}>{req.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="font-bold text-slate-400">EMPRESA</p>
                  <p className="font-medium">{req.companyName}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-400">LOCAL</p>
                  <p className="font-medium">{req.city}/{req.state}</p>
                </div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg text-xs italic">
                "{req.justification}"
              </div>
            </CardContent>
            {req.status === 'pending' && (
              <CardFooter className="bg-slate-50 p-4 border-t">
                <Button className="w-full" onClick={() => {
                  setSelectedRequest(req);
                  setApprovalType(null);
                  setSelectedAreas(req.requestedAreas || []);
                }}>Avaliar Solicitação</Button>
              </CardFooter>
            )}
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader><CardTitle>Avaliar: {selectedRequest?.name}</CardTitle></DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Aprovar como:</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button variant={approvalType === 'master' ? 'default' : 'outline'} onClick={() => setApprovalType('master')}>Master</Button>
                <Button variant={approvalType === 'participant' ? 'default' : 'outline'} onClick={() => setApprovalType('participant')}>Participante</Button>
                <Button variant={approvalType === 'reject' ? 'destructive' : 'outline'} onClick={() => setApprovalType('reject')}>Rejeitar</Button>
              </div>
            </div>

            {(approvalType === 'master' || approvalType === 'participant') && (
              <div className="space-y-4 p-4 bg-slate-50 rounded-xl">
                <div className="space-y-2">
                  <Label>Vincular a Empresa</Label>
                  <Select onValueChange={setTargetCompanyId} value={targetCompanyId}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Criar Nova Empresa</SelectItem>
                      {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {targetCompanyId && targetCompanyId !== 'none' && (
                  <div className="space-y-2">
                    <Label>Implantação Ativa</Label>
                    <Select onValueChange={setTargetImplId} value={targetImplId}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {implementations.filter(i => i.companyId === targetCompanyId).map(i => (
                          <SelectItem key={i.id} value={i.id}>Ref: {i.id.substring(0,8)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {approvalType === 'participant' && (
                  <div className="space-y-2">
                    <Label>Áreas Liberadas</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {['cadastros', 'operacional', 'financeiro', 'relatorios', 'gestao'].map(a => (
                        <div key={a} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`area-${a}`} 
                            checked={selectedAreas.includes(a)}
                            onCheckedChange={(c) => {
                              if(c) setSelectedAreas([...selectedAreas, a]);
                              else setSelectedAreas(selectedAreas.filter(x => x !== a));
                            }}
                          />
                          <Label htmlFor={`area-${a}`} className="capitalize text-xs">{a}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Comentário Interno / Rejeição</Label>
              <Textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Opcional..." />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full" disabled={submitting || !approvalType} onClick={handleProcess}>
              {submitting ? "Processando..." : "Confirmar Avaliação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
