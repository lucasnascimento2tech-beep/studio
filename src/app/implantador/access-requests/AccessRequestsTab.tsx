
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
  where,
  setDoc
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
import { AccessRequest } from "@/types/journey";
import { Loader2, AlertTriangle, MessageSquare, Info, ShieldCheck } from "lucide-react";

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
  const [requesterVisibleComment, setRequesterVisibleComment] = useState("");
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
    
    // 0. Prevent re-processing
    if (selectedRequest.status !== 'pending') {
      toast({ title: "Erro", description: "Esta solicitação já foi processada.", variant: "destructive" });
      setSelectedRequest(null);
      return;
    }

    // 1. Mandatory validations
    if (approvalType === 'reject' && !reviewComment) {
      toast({ title: "Erro", description: "Informe o motivo da rejeição.", variant: "destructive" });
      return;
    }

    if (approvalType === 'participant') {
      if (!targetCompanyId || targetCompanyId === 'none') {
        toast({ title: "Erro", description: "Selecione a empresa.", variant: "destructive" });
        return;
      }
      if (!targetImplId) {
        toast({ title: "Erro", description: "Selecione a implantação.", variant: "destructive" });
        return;
      }
      if (selectedAreas.length === 0) {
        toast({ title: "Erro", description: "Selecione ao menos uma área de acesso.", variant: "destructive" });
        return;
      }
    }

    if (approvalType === 'master' && targetCompanyId && targetCompanyId !== 'none' && !targetImplId) {
      toast({ title: "Erro", description: "Selecione uma implantação ativa para o Cliente Master.", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    try {
      const userRef = doc(db, "users", selectedRequest.uid);
      const requestRef = doc(db, "accessRequests", selectedRequest.id);

      if (approvalType === 'reject') {
        await updateDoc(requestRef, { 
          status: "rejected", 
          reviewedByUid: currentUser?.uid, 
          reviewComment,
          requesterVisibleComment,
          reviewedAt: serverTimestamp(),
          updatedAt: serverTimestamp() 
        });
        await updateDoc(userRef, { 
          approvalStatus: "rejected", 
          active: false, 
          updatedAt: serverTimestamp() 
        });
        toast({ title: "Solicitação Rejeitada" });
      } 
      else if (approvalType === 'master') {
        let finalCompanyId = targetCompanyId;
        let finalImplId = targetImplId;

        // Scenario: Create New Company
        if (!finalCompanyId || finalCompanyId === 'none') {
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
          finalCompanyId = newCompanyRef.id;
          await updateDoc(newCompanyRef, { id: finalCompanyId });

          const newImplRef = await addDoc(collection(db, "implementations"), {
            companyId: finalCompanyId,
            status: "in_progress",
            currentPhaseId: "fase-0",
            assignedImplantadorUid: currentUser?.uid,
            progressPercent: 0,
            startedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          finalImplId = newImplRef.id;
          await updateDoc(newImplRef, { id: finalImplId });
          await updateDoc(newCompanyRef, { activeImplementationId: finalImplId });
        } else {
          // Scenario: Use Existing Company
          // Ensure assignedImplantadorUid logic
          const implRef = doc(db, "implementations", finalImplId);
          const implSnap = await getDocs(query(collection(db, "implementations"), where("id", "==", finalImplId)));
          if (!implSnap.empty) {
            const implData = implSnap.docs[0].data();
            if (!implData.assignedImplantadorUid && (currentUser?.globalRole === 'implantador' || currentUser?.globalRole === 'admin_2tech')) {
              await updateDoc(implRef, { assignedImplantadorUid: currentUser?.uid });
            }
          }
        }

        // Final Security Check
        if (!finalCompanyId || !finalImplId) throw new Error("Falha ao gerar vínculos de empresa/implantação.");

        await updateDoc(userRef, {
          globalRole: "client_master",
          active: true,
          approvalStatus: "approved",
          companyId: finalCompanyId,
          implementationId: finalImplId,
          updatedAt: serverTimestamp()
        });

        // Upsert Member (Master)
        const memberQ = query(
          collection(db, "implementationMembers"), 
          where("implementationId", "==", finalImplId),
          where("uid", "==", selectedRequest.uid)
        );
        const memberSnap = await getDocs(memberQ);
        
        const memberData = {
          implementationId: finalImplId,
          companyId: finalCompanyId,
          uid: selectedRequest.uid,
          name: selectedRequest.name,
          email: selectedRequest.email,
          role: "implementation_master",
          clientAccessType: "master",
          areas: ["todos"],
          inviteStatus: "accepted",
          active: true,
          acceptedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        if (memberSnap.empty) {
          await addDoc(collection(db, "implementationMembers"), { ...memberData, createdAt: serverTimestamp() });
        } else {
          await updateDoc(doc(db, "implementationMembers", memberSnap.docs[0].id), memberData);
        }

        await updateDoc(requestRef, {
          status: "approved",
          reviewedByUid: currentUser?.uid,
          reviewedAt: serverTimestamp(),
          reviewComment,
          requesterVisibleComment,
          matchedCompanyId: finalCompanyId,
          matchedImplementationId: finalImplId,
          updatedAt: serverTimestamp()
        });
        toast({ title: "Aprovado como Cliente Master" });
      } 
      else if (approvalType === 'participant') {
        await updateDoc(userRef, {
          globalRole: "client_participant",
          active: true,
          approvalStatus: "approved",
          companyId: targetCompanyId,
          implementationId: targetImplId,
          updatedAt: serverTimestamp()
        });

        // Upsert Member (Participant)
        const memberQ = query(
          collection(db, "implementationMembers"), 
          where("implementationId", "==", targetImplId),
          where("uid", "==", selectedRequest.uid)
        );
        const memberSnap = await getDocs(memberQ);

        const memberData = {
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
          updatedAt: serverTimestamp()
        };

        if (memberSnap.empty) {
          await addDoc(collection(db, "implementationMembers"), { ...memberData, createdAt: serverTimestamp() });
        } else {
          await updateDoc(doc(db, "implementationMembers", memberSnap.docs[0].id), memberData);
        }

        await updateDoc(requestRef, {
          status: "approved",
          reviewedByUid: currentUser?.uid,
          reviewedAt: serverTimestamp(),
          reviewComment,
          requesterVisibleComment,
          matchedCompanyId: targetCompanyId,
          matchedImplementationId: targetImplId,
          updatedAt: serverTimestamp()
        });
        toast({ title: "Participante Aprovado" });
      }

      // Cleanup and Close
      setSelectedRequest(null);
      setApprovalType(null);
      setTargetCompanyId("");
      setTargetImplId("");
      setSelectedAreas([]);
      setReviewComment("");
      setRequesterVisibleComment("");
    } catch (e: any) {
      console.error("Approval Error:", e);
      toast({ title: "Erro na Operação", description: e.message, variant: "destructive" });
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
            className="rounded-full px-8 capitalize font-bold"
          >
            {f === 'pending' ? 'Pendentes' : f === 'approved' ? 'Aprovadas' : 'Rejeitadas'}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? <div className="col-span-full py-20 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div> : 
         filteredRequests.length === 0 ? <p className="text-center text-slate-500 col-span-full py-20">Nenhuma solicitação encontrada.</p> :
         filteredRequests.map(req => (
          <Card key={req.id} className="border-none shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-800">{req.name}</CardTitle>
                  <p className="text-xs text-slate-400 font-medium">{req.email}</p>
                </div>
                <Badge variant={req.status === 'pending' ? 'secondary' : 'default'} className="capitalize">
                  {req.status === 'pending' ? 'Pendente' : req.status === 'approved' ? 'Aprovada' : 'Rejeitada'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-2 rounded-lg">
                  <p className="font-bold text-slate-400 uppercase text-[9px] mb-1">EMPRESA</p>
                  <p className="font-bold text-slate-700">{req.companyName}</p>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg">
                  <p className="font-bold text-slate-400 uppercase text-[9px] mb-1">LOCAL</p>
                  <p className="font-bold text-slate-700">{req.city}/{req.state}</p>
                </div>
              </div>
              <div className="bg-blue-50/50 p-3 rounded-xl text-xs italic text-slate-600 border border-blue-100">
                <MessageSquare className="w-3 h-3 mb-1 text-blue-400" />
                "{req.justification}"
              </div>
            </CardContent>
            {req.status === 'pending' && (
              <CardFooter className="bg-slate-50/50 p-4 border-t">
                <Button className="w-full font-bold shadow-sm" onClick={() => {
                  setSelectedRequest(req);
                  setApprovalType(null);
                  setSelectedAreas(req.requestedAreas || []);
                }}>Avaliar Solicitação</Button>
              </CardFooter>
            )}
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedRequest} onOpenChange={(o) => !o && !submitting && setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-primary" />
              Avaliar: {selectedRequest?.name}
            </CardTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Decisão de Acesso</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  variant={approvalType === 'master' ? 'default' : 'outline'} 
                  onClick={() => setApprovalType('master')}
                  className="font-bold h-12"
                >
                  Aprovar Master
                </Button>
                <Button 
                  variant={approvalType === 'participant' ? 'default' : 'outline'} 
                  onClick={() => setApprovalType('participant')}
                  className="font-bold h-12"
                >
                  Aprovar Membro
                </Button>
                <Button 
                  variant={approvalType === 'reject' ? 'destructive' : 'outline'} 
                  onClick={() => setApprovalType('reject')}
                  className="font-bold h-12"
                >
                  Rejeitar
                </Button>
              </div>
            </div>

            {(approvalType === 'master' || approvalType === 'participant') && (
              <div className="space-y-4 p-5 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Vincular à Empresa</Label>
                  <Select onValueChange={setTargetCompanyId} value={targetCompanyId}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Criar Nova Empresa (Usar dados da solicitação)</SelectItem>
                      {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {targetCompanyId && targetCompanyId !== 'none' && (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold">Implantação Ativa</Label>
                    <Select onValueChange={setTargetImplId} value={targetImplId}>
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione a implantação" /></SelectTrigger>
                      <SelectContent>
                        {implementations.filter(i => i.companyId === targetCompanyId).map(i => (
                          <SelectItem key={i.id} value={i.id}>
                            Fase: {i.currentPhaseId} - Ref: {i.id.substring(0,8)}
                          </SelectItem>
                        ))}
                        {implementations.filter(i => i.companyId === targetCompanyId).length === 0 && (
                          <SelectItem value="null" disabled>Nenhuma implantação encontrada</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {approvalType === 'participant' && (
                  <div className="space-y-3 pt-2">
                    <Label className="text-xs font-bold flex items-center gap-2">
                      <Info className="w-3 h-3 text-primary" /> Áreas Liberadas para a Jornada
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {['cadastros', 'operacional', 'financeiro', 'relatorios', 'gestao'].map(a => (
                        <div key={a} className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg border">
                          <Checkbox 
                            id={`area-${a}`} 
                            checked={selectedAreas.includes(a)}
                            onCheckedChange={(c) => {
                              if(c) setSelectedAreas([...selectedAreas, a]);
                              else setSelectedAreas(selectedAreas.filter(x => x !== a));
                            }}
                          />
                          <Label htmlFor={`area-${a}`} className="capitalize text-xs font-medium cursor-pointer">{a}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold flex items-center gap-2">
                  Comentário Interno <Badge variant="outline" className="text-[8px] uppercase">Apenas 2tech</Badge>
                </Label>
                <Textarea 
                  value={reviewComment} 
                  onChange={(e) => setReviewComment(e.target.value)} 
                  placeholder="Observação para a equipe interna..."
                  className="min-h-[100px] text-xs bg-slate-50/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold flex items-center gap-2">
                  Mensagem ao Solicitante <Badge variant="secondary" className="text-[8px] uppercase">Visível ao cliente</Badge>
                </Label>
                <Textarea 
                  value={requesterVisibleComment} 
                  onChange={(e) => setRequesterVisibleComment(e.target.value)} 
                  placeholder="Mensagem que o usuário verá ao acessar o portal..."
                  className="min-h-[100px] text-xs bg-slate-50/50"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="bg-slate-50 -mx-6 -mb-6 p-6 rounded-b-lg border-t">
            <Button 
              className="w-full font-bold h-12 shadow-lg" 
              disabled={submitting || !approvalType} 
              onClick={handleProcess}
            >
              {submitting ? (
                <> <Loader2 className="animate-spin mr-2" /> Processando... </>
              ) : (
                "Confirmar Avaliação de Acesso"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

