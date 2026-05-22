"use client";

import { useParams, useRouter } from "next/navigation";
import { journeyPhases } from "@/data/journeyData";
import { useJourneyStore } from "@/hooks/useJourneyStore";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, Info } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

export default function CheckpointPage() {
  const { phaseId } = useParams();
  const router = useRouter();
  const { isLoaded, saveQuizScore } = useJourneyStore();
  const { toast } = useToast();

  const phase = journeyPhases.find(p => p.id === phaseId);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);

  if (!isLoaded || !phase) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-primary" />
    </div>
  );

  const handleSubmit = async () => {
    const questionsCount = phase.quiz.length || 1;
    if (Object.keys(answers).length < questionsCount) {
       toast({ title: "Incompleto", description: "Por favor, responda todas as questões antes de enviar.", variant: "destructive" });
       return;
    }

    setIsSubmitting(true);
    
    // Simulação de cálculo de score (MVP aceita respostas abertas como 100%)
    const score = 100; 
    const passed = true;
    
    try {
      await saveQuizScore(phase.id, score, answers);
      setResult({ score, passed });
      toast({ title: "Checkpoint Finalizado", description: "Seus dados foram salvos com sucesso." });
    } catch (e) {
      toast({ variant: "destructive", title: "Erro ao salvar", description: "Não foi possível registrar seu checkpoint." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full text-center p-12 border-none shadow-2xl">
          <div className="bg-green-100 text-green-600 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-headline font-bold text-slate-900 mb-2">Excelente Trabalho!</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">Você validou seus conhecimentos na fase <strong>{phase.title}</strong> e está pronto para avançar.</p>
          <Button asChild className="w-full h-14 text-lg font-bold bg-primary shadow-xl shadow-primary/20">
            <Link href={`/phases/${phase.id}`}>Prosseguir com a Jornada</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
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
             Responda as questões abaixo com base no que você aprendeu nos módulos anteriores. Esta etapa é fundamental para garantir que você está pronto para operar o sistema com segurança.
           </p>
        </div>

        {phase.quiz.length > 0 ? (
          phase.quiz.map((q, idx) => (
            <Card key={q.id} className="border-none shadow-sm bg-white overflow-hidden">
              <div className="bg-slate-50 px-6 py-3 border-b">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Questão {idx + 1}</span>
              </div>
              <CardHeader>
                <CardTitle className="text-base font-bold text-slate-800">{q.question}</CardTitle>
              </CardHeader>
              <CardContent>
                <textarea 
                  className="w-full text-sm p-4 rounded-xl border-2 bg-slate-50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 min-h-[120px] resize-none outline-none transition-all"
                  placeholder="Descreva sua resposta aqui de forma clara..."
                  onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})}
                  value={answers[q.id] || ""}
                />
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="py-20 text-center text-slate-400 border-dashed border-2">
            <p>Esta fase não requer uma validação por escrito específica.</p>
            <p className="text-xs">Basta confirmar abaixo para prosseguir.</p>
          </Card>
        )}

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
  );
}
