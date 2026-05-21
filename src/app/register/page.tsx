
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, serverTimestamp, collection, addDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Rocket, ShieldCheck, ArrowRight, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AreaType } from "@/types/journey";

const participationOptions = [
  { label: "Responsável principal pela implantação", areas: ["gestao", "todos"] as AreaType[] },
  { label: "Financeiro", areas: ["financeiro", "relatorios"] as AreaType[] },
  { label: "Operacional", areas: ["operacional"] as AreaType[] },
  { label: "Comercial", areas: ["cadastros", "operacional", "relatorios"] as AreaType[] },
  { label: "Gestão/Diretoria", areas: ["gestao", "relatorios"] as AreaType[] },
  { label: "Cadastros/Administração", areas: ["cadastros", "gestao"] as AreaType[] },
  { label: "Relatórios/Gestão de indicadores", areas: ["relatorios", "gestao"] as AreaType[] },
  { label: "Outro", areas: [] as AreaType[] },
];

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    position: "",
    password: "",
    confirmPassword: "",
    companyName: "",
    cnpj: "",
    city: "",
    state: "",
    website: "",
    mainContactName: "",
    mainContactEmail: "",
    justification: "",
  });

  const [selectedParticipations, setSelectedParticipations] = useState<string[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleParticipationToggle = (label: string) => {
    setSelectedParticipations(prev => 
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (formData.password !== formData.confirmPassword) {
      toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }
    if (formData.password.length < 6) {
      toast({ title: "Erro", description: "A senha deve ter no mínimo 6 caracteres.", variant: "destructive" });
      return;
    }
    if (selectedParticipations.length === 0) {
      toast({ title: "Erro", description: "Selecione pelo menos uma participação.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const auth = getAuth();
    const db = getFirestore();

    try {
      // 1. Create Auth User
      const { user } = await createUserWithEmailAndPassword(auth, formData.email, formData.password);

      // 2. Map requested areas
      const requestedAreas = Array.from(new Set(
        participationOptions
          .filter(opt => selectedParticipations.includes(opt.label))
          .flatMap(opt => opt.areas)
      ));

      // 3. Create User Document
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        globalRole: "client_pending",
        active: false,
        approvalStatus: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 4. Create Access Request Document
      await addDoc(collection(db, "accessRequests"), {
        uid: user.uid,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        position: formData.position,
        companyName: formData.companyName,
        cnpj: formData.cnpj,
        city: formData.city,
        state: formData.state,
        website: formData.website,
        mainContactName: formData.mainContactName,
        mainContactEmail: formData.mainContactEmail,
        requestedAreas,
        requestedParticipationLabels: selectedParticipations,
        justification: formData.justification,
        status: "pending",
        source: "self_registration",
        reviewedByUid: null,
        reviewComment: null,
        matchedCompanyId: null,
        matchedImplementationId: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({ 
        title: "Solicitação enviada!", 
        description: "Seus dados foram registrados com sucesso. Aguarde a análise da nossa equipe." 
      });
      
      router.push("/pending-approval");
    } catch (error: any) {
      console.error(error);
      toast({ 
        variant: "destructive", 
        title: "Erro ao cadastrar", 
        description: error.message || "Ocorreu um erro ao processar sua solicitação." 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center">
          <Link href="/login" className="inline-flex items-center text-sm text-slate-500 hover:text-primary mb-6">
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar para o Login
          </Link>
          <div className="bg-primary text-white w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Rocket className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-headline font-bold text-slate-900">Solicitar acesso à implantação</h1>
          <p className="text-slate-500 mt-2 max-w-md mx-auto">
            Preencha os dados abaixo para solicitar acesso à Jornada Guiada de Implantação 2tech. 
            Nossa equipe validará as informações antes de liberar seu acesso.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Seção 1: Dados Pessoais */}
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">1. Dados Pessoais</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo</Label>
                  <Input id="name" value={formData.name} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail corporativo</Label>
                  <Input id="email" type="email" value={formData.email} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone / WhatsApp</Label>
                  <Input id="phone" value={formData.phone} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Cargo / Função</Label>
                  <Input id="position" value={formData.position} onChange={handleInputChange} required />
                </div>
              </CardContent>
            </Card>

            {/* Seção 2: Dados da Empresa */}
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">2. Dados da Empresa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Nome da empresa</Label>
                    <Input id="companyName" value={formData.companyName} onChange={handleInputChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input id="cnpj" value={formData.cnpj} onChange={handleInputChange} required />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input id="city" value={formData.city} onChange={handleInputChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">Estado (UF)</Label>
                    <Input id="state" value={formData.state} onChange={handleInputChange} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Site (opcional)</Label>
                  <Input id="website" value={formData.website} onChange={handleInputChange} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="mainContactName">Nome do responsável (se souber)</Label>
                    <Input id="mainContactName" value={formData.mainContactName} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mainContactEmail">E-mail do responsável</Label>
                    <Input id="mainContactEmail" value={formData.mainContactEmail} onChange={handleInputChange} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Seção 3: Participação */}
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">3. Participação na Implantação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Qual será sua participação na implantação?</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {participationOptions.map((opt) => (
                      <div key={opt.label} className="flex items-center space-x-2 border p-2 rounded-lg hover:bg-slate-50 transition-colors">
                        <Checkbox 
                          id={`part-${opt.label}`} 
                          checked={selectedParticipations.includes(opt.label)}
                          onCheckedChange={() => handleParticipationToggle(opt.label)}
                        />
                        <Label htmlFor={`part-${opt.label}`} className="text-xs cursor-pointer">{opt.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="justification">Justificativa</Label>
                  <Textarea 
                    id="justification" 
                    placeholder="Exemplo: Sou responsável pelo financeiro da empresa e vou participar da configuração de comissões e fechamentos."
                    className="min-h-[100px]"
                    value={formData.justification}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {/* Seção 4: Segurança */}
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">4. Segurança</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Crie uma Senha</Label>
                  <Input id="password" type="password" value={formData.password} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirme a Senha</Label>
                  <Input id="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleInputChange} required />
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50 rounded-b-lg py-6 border-t">
                <Button type="submit" className="w-full h-12 font-bold text-lg" disabled={loading}>
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ShieldCheck className="w-5 h-5 mr-2" />}
                  {loading ? "Enviando solicitação..." : "Enviar solicitação de acesso"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </form>

        <p className="text-center text-xs text-slate-400">
          Esse cadastro não libera acesso automaticamente. A entrada na implantação depende de aprovação da equipe responsável.
        </p>
      </div>
    </div>
  );
}
