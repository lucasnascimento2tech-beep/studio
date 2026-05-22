
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
import { Rocket, ShieldCheck, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AreaType } from "@/types/journey";

const participationOptions = [
  { label: "Responsável principal pela implantação", areas: ["todos"] as AreaType[] },
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
      const { user } = await createUserWithEmailAndPassword(auth, formData.email, formData.password);

      const requestedAreas = Array.from(new Set(
        participationOptions
          .filter(opt => selectedParticipations.includes(opt.label))
          .flatMap(opt => opt.areas)
      ));

      // 1. Create User Document with pending status
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

      // 2. Create Access Request
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
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({ 
        title: "Solicitação enviada!", 
        description: "Seus dados foram registrados. Aguarde a validação." 
      });
      
      router.push("/pending-approval");
    } catch (error: any) {
      console.error(error);
      toast({ 
        variant: "destructive", 
        title: "Erro ao cadastrar", 
        description: error.message || "Ocorreu um erro ao processar sua solicitação." 
      });
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
          <h1 className="text-3xl font-headline font-bold text-slate-900">Solicitar Acesso</h1>
          <p className="text-slate-500 mt-2 max-w-md mx-auto">
            Preencha os dados abaixo para iniciar sua jornada 2tech.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <Card className="border-none shadow-md">
              <CardHeader><CardTitle className="text-lg">1. Dados Pessoais</CardTitle></CardHeader>
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

            <Card className="border-none shadow-md">
              <CardHeader><CardTitle className="text-lg">2. Dados da Empresa</CardTitle></CardHeader>
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
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardHeader><CardTitle className="text-lg">3. Participação na Implantação</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Qual será sua participação?</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {participationOptions.map((opt) => (
                      <div key={opt.label} className="flex items-center space-x-2 border p-2 rounded-lg hover:bg-slate-50 transition-colors">
                        <Checkbox 
                          id={`opt-${opt.label}`} 
                          checked={selectedParticipations.includes(opt.label)}
                          onCheckedChange={() => handleParticipationToggle(opt.label)}
                        />
                        <Label htmlFor={`opt-${opt.label}`} className="text-xs cursor-pointer">{opt.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="justification">Por que você precisa de acesso?</Label>
                  <Textarea id="justification" value={formData.justification} onChange={handleInputChange} required className="min-h-[100px]" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md">
              <CardHeader><CardTitle className="text-lg">4. Segurança</CardTitle></CardHeader>
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
                  Enviar Solicitação
                </Button>
              </CardFooter>
            </Card>
          </div>
        </form>
      </div>
    </div>
  );
}
