
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

  const isIndividualReady = completedCount === individualRequiredModules.length && individualRequiredModules.length > 0 && missingEvidence.length === 0;
  
  // The meeting is ready if user finished modules or if the global status says so (e.g. after quiz)
  const isUnlocked = isIndividualReady || userProgress.status === 'ReadyToSchedule' || userProgress.status === 'Scheduled' || userProgress.status === 'Completed';

  return (
    <div className="space-y-6">
      <Card className={cn(
        "border-2",
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
                {phase.meetingTitle || "Encontro Guiado"}
              </CardTitle>
              <p className="text-sm text-slate-500">
                {isUnlocked ? "Você concluiu seus requisitos individuais." : "Aguardando seus requisitos individuais."}
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
                <Info className="w-3.5 h-3.5" /> Suas Pendências para o Encontro
              </h4>
              <div className="space-y-2">
                {missingModules.map(mod => (
                  <div key={mod.id} className="flex items-center gap-2 text-sm text-slate-600">
                    <Clock className="w-3.5 h-3.5 text-slate-300" />
                    <span>Módulo: {mod.title}</span>
                  </div>
                ))}
                {missingEvidence.map(mod => (
                  <div key={mod.id} className="flex items-center gap-2 text-sm text-orange-600 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Evidência Pendente: {mod.title}</span>
                  </div>
                ))}
                {individualRequiredModules.length === 0 && (
                  <p className="text-xs text-slate-500 italic">Nenhum módulo obrigatório para sua área nesta fase.</p>
                )}
              </div>
            </div>
          )}

          {isUnlocked && (
            <div className="bg-green-100/50 rounded-lg border border-green-200 p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <p className="text-sm font-medium text-green-800">Parabéns! Você já pode agendar seu encontro com o implantador.</p>
            </div>
          )}
        </CardContent>

        <CardFooter className="bg-white/50 border-t p-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-slate-600 text-sm">
            {isUnlocked ? (
              <div className="flex items-center gap-2 text-green-700 font-medium text-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Agendamento individual disponível.
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-400 italic text-xs">
                <AlertCircle className="w-3.5 h-3.5" />
                Conclua os requisitos acima para agendar.
              </div>
            )}
          </div>
          {isUnlocked && (
            <Button className="w-full md:w-auto bg-primary hover:bg-primary/90 font-bold" onClick={onSchedule}>
              Agendar Encontro <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </CardFooter>
      </Card>

      {isClientMaster && members.length > 0 && (
        <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
          <CardHeader className="py-4 bg-slate-50 border-b">
            <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Users className="w-4 h-4" /> Progresso da Equipe (Informativo)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {members.map(m => {
                const progress = m.uid ? memberProgress[m.uid] : null;
                const mAreas = m.areas;
                const mRequired = phase.modules.filter(mod => 
                  mod.isRequired && (mAreas.includes(mod.area) || mAreas.includes('todos'))
                );
                const mCompleted = progress?.completedModules?.length || 0;
                const mDone = mCompleted >= mRequired.length && mRequired.length > 0;

                return (
                  <div key={m.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                        {m.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700">{m.name}</p>
                        <p className="text-[10px] text-slate-400 capitalize">{m.areas.join(', ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-500">{mCompleted}/{mRequired.length}</p>
                        <div className="w-16 h-1 bg-slate-100 rounded-full mt-1">
                          <div 
                            className="h-full bg-primary transition-all" 
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
