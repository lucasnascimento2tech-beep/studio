
"use client";

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Unlock, Calendar, CheckCircle2, AlertCircle, Clock, ArrowRight, Info, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Phase, ImplementationMember } from "@/types/journey";

interface MeetingStatusCardProps {
  phase: Phase;
  userProgress: {
    completedModules: string[];
    uploadedEvidence: Record<string, any>;
    status: string;
  };
  userAreas: string[];
  isClientMaster: boolean;
  members?: ImplementationMember[];
  memberProgress?: Record<string, any>;
  onSchedule: () => void;
}

export function MeetingStatusCard({ 
  phase, 
  userProgress, 
  userAreas, 
  isClientMaster, 
  members = [], 
  memberProgress = {},
  onSchedule 
}: MeetingStatusCardProps) {
  
  // Requisitos individuais baseados nas áreas do usuário logado
  const individualRequiredModules = phase.modules.filter(mod => 
    mod.isRequired && (userAreas.includes(mod.area) || userAreas.includes('todos'))
  );

  const completedCount = individualRequiredModules.filter(mod => 
    userProgress.completedModules.includes(mod.id)
  ).length;

  const missingModules = individualRequiredModules.filter(mod => 
    !userProgress.completedModules.includes(mod.id)
  );

  const missingEvidence = individualRequiredModules.filter(mod => 
    mod.requiresEvidence && !userProgress.uploadedEvidence[mod.id]
  );

  // O encontro é liberado se o usuário cumpriu seus próprios requisitos
  const isIndividualReady = completedCount === individualRequiredModules.length && individualRequiredModules.length > 0 && missingEvidence.length === 0;
  
  // O encontro é liberado se os requisitos individuais estão ok OU se o status da fase já avançou
  const isUnlocked = isIndividualReady || userProgress.status === 'ReadyToSchedule' || userProgress.status === 'Scheduled' || userProgress.status === 'Completed';

  return (
    <div className="space-y-6">
      <Card className={cn(
        "border-2 shadow-lg transition-all",
        isUnlocked ? "border-green-200 bg-green-50/20" : "border-slate-200 bg-slate-50/50"
      )}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-3 rounded-xl",
              isUnlocked ? "bg-green-100 text-green-600" : "bg-slate-200 text-slate-500"
            )}>
              {isUnlocked ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-800">
                {isUnlocked ? "Encontro Liberado" : "Encontro ainda não liberado"}
              </CardTitle>
              <p className="text-sm text-slate-500">
                {isUnlocked 
                  ? "Você concluiu seus requisitos individuais. Já pode agendar." 
                  : "Conclua seus módulos e checkpoints para liberar o agendamento."}
              </p>
            </div>
          </div>
          <Badge variant={isUnlocked ? "default" : "outline"} className={isUnlocked ? "bg-green-600" : ""}>
            {isUnlocked ? "Liberado para Você" : "Bloqueado"}
          </Badge>
        </CardHeader>
        
        <CardContent className="space-y-4 pt-4">
          {!isUnlocked && (
            <div className="bg-white rounded-lg border p-4 space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Info className="w-3.5 h-3.5" /> Suas Pendências Individuais
              </h4>
              <div className="space-y-2">
                {missingModules.map(mod => (
                  <div key={mod.id} className="flex items-center gap-2 text-sm text-slate-600">
                    <Clock className="w-3.5 h-3.5 text-slate-300" />
                    <span>Módulo Pendente: {mod.title}</span>
                  </div>
                ))}
                {missingEvidence.map(mod => (
                  <div key={mod.id} className="flex items-center gap-2 text-sm text-orange-600 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Evidência Pendente: {mod.title}</span>
                  </div>
                ))}
                {individualRequiredModules.length === 0 && (
                  <p className="text-xs text-slate-500 italic">Esta fase não possui requisitos obrigatórios para suas áreas.</p>
                )}
              </div>
            </div>
          )}

          {isUnlocked && (
            <div className="bg-green-100/50 rounded-lg border border-green-200 p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <p className="text-sm font-bold text-green-800">Você concluiu os requisitos desta fase. Agora já pode agendar o encontro com o implantador.</p>
            </div>
          )}
        </CardContent>

        <CardFooter className="bg-white/50 border-t p-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-slate-600 text-sm">
            {isUnlocked ? (
              <div className="flex items-center gap-2 text-green-700 font-bold text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Agendamento disponível.
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-400 italic text-xs">
                <AlertCircle className="w-3.5 h-3.5" />
                Conclua os requisitos individuais acima para agendar.
              </div>
            )}
          </div>
          <Button 
            className={cn("w-full md:w-auto font-bold h-12 shadow-md", isUnlocked ? "bg-primary hover:bg-primary/90" : "bg-slate-200 text-slate-400")} 
            onClick={onSchedule}
            disabled={!isUnlocked}
          >
            {isUnlocked ? "Agendar Encontro" : "Concluir Requisitos Individuais"} <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardFooter>
      </Card>

      {isClientMaster && members.length > 0 && (
        <Card className="border-slate-200 bg-white shadow-md overflow-hidden">
          <CardHeader className="py-4 bg-slate-50 border-b">
            <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Users className="w-4 h-4" /> Acompanhamento da Equipe (Informativo)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[300px] overflow-y-auto">
              {members.map(m => {
                const prog = m.uid ? memberProgress[m.uid] : null;
                const mAreas = m.areas || ['todos'];
                const mRequired = phase.modules.filter(mod => 
                  mod.isRequired && (mAreas.includes(mod.area) || mAreas.includes('todos'))
                );
                const mCompleted = prog?.completedModules?.length || 0;
                const mDone = mRequired.length > 0 && mCompleted >= mRequired.length;

                return (
                  <div key={m.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 border">
                        {m.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700">{m.name}</p>
                        <p className="text-[9px] text-slate-400 capitalize">{m.areas.join(', ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-500">{mCompleted}/{mRequired.length}</p>
                        <div className="w-16 h-1 bg-slate-100 rounded-full mt-1">
                          <div 
                            className={cn("h-full transition-all", mDone ? "bg-green-500" : "bg-primary")} 
                            style={{ width: `${mRequired.length > 0 ? (mCompleted / mRequired.length) * 100 : 0}%` }} 
                          />
                        </div>
                      </div>
                      {mDone ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Clock className="w-4 h-4 text-slate-200" />}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="p-3 bg-blue-50 text-[10px] text-blue-700 font-medium text-center border-t">
              O progresso da equipe não bloqueia seu avanço individual.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
