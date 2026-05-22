"use client";

import { useParams, useRouter } from "next/navigation";
import { journeyPhases } from "@/data/journeyData";
import { useJourneyStore } from "@/hooks/useJourneyStore";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { useState, useEffect, use } from "react";
import { ArrowLeft, CheckCircle2, Loader2, Info, AlertTriangle, XCircle, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useCurrentImplementationMember } from "@/hooks/useCurrentImplementationMember";
import { canAccessModule } from "@/utils/permissions";
import { AccessDeniedCard } from "@/components/journey/AccessDeniedCard";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export default function CheckpointPage() {
  const { phaseId } = useParams();
  const router = useRouter();
  const { progress, isLoaded, saveQuizScore } = useJourneyStore();
  const { effectiveAreas, loading: memberLoading, member } = useCurrentImplementationMember();
  const { toast } = useToast();

  const phase = journeyPhases.find(p => p.id === phaseId);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);
  const [pendingRequirement, setPendingRequirement] = useState<boolean>(false);

  // 1. Filtrar módulos obrigatórios acessíveis ao usuário nesta fase
  const accessibleMandatoryModules = phase?.modules.filter(m => 
    m.isRequired && canAccessModule(member?.role as any, effectiveAreas, m)
  ) || [];

  // 2. Verificar se todos os obrigatórios estão concluídos
  useEffect(() => {
    if (isLoaded && !memberLoading && phase) {
      const allDone = accessibleMandatoryModules.every(m => 
        progress.completedModules.includes(m.id)
      );
      setPendingRequirement(!allDone);
    }
  }, [isLoaded, memberLoading, phase, progress.completedModules, accessibleMandatoryModules]);

  if (!isLoaded || memberLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-primary w-10 h-10" />
        <p className="text-slate-500 font-medium">Carregando validação...</p>
      </div>
    </div>
  );

  // Proteção de acesso básico
  if (!phase || !member) return <AccessDeniedCard />;

  // Se o usuário não tem acesso a nenhum módulo da fase, ele não deveria estar aqui
  if (accessibleMandatoryModules.length === 0 && phase.modules.length > 0) {
    return <AccessDeniedCard />;
  }

  // Trava de Requisitos Pendentes
  if (pendingRequirement) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full text-center p-8 border-none shadow-xl">
          <div className="bg-orange-100 text-orange-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Validação ainda não liberada</h2>
          <p className="text-slate-500 mb-6">Você precisa concluir todos os módulos obrigatórios das suas áreas nesta fase antes de realizar a validação.</p>
          <Button asChild className="w-full">
            <Link href={`/phases/${phase.id}`}><ChevronLeft className="w-4 h-4 mr-2" /> Voltar para a Fase</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const handleSubmit = async () => {
    const questions = phase.quiz || [];
    
    // Validar se todas foram respondidas
    if (Object.keys(answers).length < questions.length) {
       toast({ title: "Incompleto", description: "Por favor, responda todas as questões.", variant: "destructive" });
       return;
    }

    // Validar perguntas abertas (min 5 chars)
    const openQuestions = questions.filter(q => !q.options || q.options.length === 0);
    const hasInvalidOpen = openQuestions.some(q => (answers[q.id]?.length || 0) < 5);
    if (hasInvalidOpen) {
       toast({ title: "Resposta curta", description: "Suas respostas dissertativas devem ter pelo menos 5 caracteres.", variant: "destructive" });
       return;
    }

    setIsSubmitting(true);

    // Cálculo de Score
    const objectiveQuestions = questions.filter(q => q.options && q.options.length > 0);
    let score = 100;

    if (objectiveQuestions.length > 0) {
      const correctCount = objectiveQuestions.filter(q => answers[q.id] === q.correctAnswer).length;
      score = Math.round((correctCount / objectiveQuestions.length) * 100);
    }

    const passed = score >= 70;
    
    try {
      await saveQuizScore(phase.id, score, answers);
      setResult({ score, passed });
      toast({ 
        title: passed ? "Excelente!" : "Atenção", 
        description: passed ? "Sua validação foi enviada e aprovada." : "Você não atingiu a pontuação mínima. Revise os materiais.",
        variant: passed ? "default" : "destructive" 
      });
    } catch (e) {
      toast({ variant: "destructive", title: "Erro ao salvar", description: "Falha na comunicação com o servidor." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (result?.passed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full text-center p-12 border-none shadow-2xl">
          <div className="bg-green-100 text-green-600 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-headline font-bold text-slate-900 mb-2">Validação Concluída!</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            Suas respostas foram registradas com sucesso. 
            {phase.hasMeeting 
              ? " Agora você pode agendar seu encontro individual com o implantador." 
              : " Esta fase foi concluída e a próxima etapa foi liberada para você."}
          </p>
          <Button asChild className="w-full h-14 text-lg font-bold bg-primary shadow-xl shadow-primary/20">
            <Link href={`/phases/${phase.id}`}>Prosseguir com a Jornada</Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (result && !result.passed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full text-center p-12 border-none shadow-2xl">
          <div className="bg-red-100 text-red-600 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-headline font-bold text-slate-900 mb-2">Validação não concluída</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            Você atingiu <strong>{result.score}%</strong> de acerto. A pontuação mínima é 70%. Revise o conteúdo da fase e tente novamente.
          </p>
          <Button onClick={() => setResult(null)} className="w-full h-14 text-lg font-bold">
            Tentar Novamente
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <AuthGuard allowedRoles={['client_master', 'client_participant']}>
      <div className="min-h-screen bg-slate-50 pb-12">
        <div className="bg-white border-b py-6 mb-8 shadow-sm">
          <div className="max-w-3xl mx-auto px-4">
            <Button variant="ghost" size="sm" asChild className="mb-4 text-slate-400 hover:text-primary transition-colors">
              <Link href={`/phases/${phase.id}`}><ArrowLeft className="w-4 h-4 mr-2" /> Voltar para a Fase</Link>
            </Button>
            <div className="flex items-center gap-3">
               <div className="bg-primary/10 p-2 rounded-lg">
                 <CheckCircle2 className="w-6 h-6 text-primary" />
               </div>
               <div>
                 <h1 className="text-2xl font-headline font-bold text-slate-900">Validação de Conhecimento</h1>
                 <p className="text-slate-500 text-sm">{phase.title}</p>
               </div>
            </div>
          </div>
        </div>

        <main className="max-w-3xl mx-auto px-4 space-y-6">
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3 mb-8">
             <Info className="w-5 h-5 text-blue-600 mt-0.5" />
             <p className="text-xs text-blue-800 leading-relaxed">
               Responda as questões abaixo com base no que você aprendeu. Sua jornada individual depende dessa validação para avançar.
             </p>
          </div>

          {phase.quiz.map((q, idx) => (
            <Card key={q.id} className="border-none shadow-sm bg-white overflow-hidden">
              <div className="bg-slate-50 px-6 py-3 border-b">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Questão {idx + 1}</span>
              </div>
              <CardHeader>
                <CardTitle className="text-base font-bold text-slate-800">{q.question}</CardTitle>
              </CardHeader>
              <CardContent>
                {q.options && q.options.length > 0 ? (
                  <RadioGroup onValueChange={(val) => setAnswers({...answers, [q.id]: val})} value={answers[q.id]} className="space-y-3">
                    {q.options.map((opt) => (
                      <div key={opt} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-slate-50 transition-colors">
                        <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                        <Label htmlFor={`${q.id}-${opt}`} className="text-sm cursor-pointer flex-1">{opt}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <textarea 
                    className="w-full text-sm p-4 rounded-xl border-2 bg-slate-50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 min-h-[120px] resize-none outline-none transition-all"
                    placeholder="Descreva sua resposta aqui (mínimo 5 caracteres)..."
                    onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})}
                    value={answers[q.id] || ""}
                  />
                )}
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-end pt-8">
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-white font-bold px-16 h-14 rounded-2xl shadow-xl shadow-primary/20" 
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : null}
              Finalizar e Enviar Validação
            </Button>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
