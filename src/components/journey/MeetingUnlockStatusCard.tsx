
"use client";

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Unlock, Calendar, CheckCircle2, AlertCircle, Clock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Phase, ImplementationMember } from "@/types/journey";

interface MeetingUnlockStatusCardProps {
  phase: Phase;
  members: ImplementationMember[];
  memberProgress: Record<string, any>; // memberUid -> progress data
  isClientMaster: boolean;
  onSchedule: () => void;
}

export function MeetingUnlockStatusCard({ phase, members, memberProgress, isClientMaster, onSchedule }: MeetingUnlockStatusCardProps) {
  const requiredMembers = members.filter(m => 
    m.role === 'implementation_master' || 
    m.isRequiredParticipant || 
    m.requiredForMeetings.includes(phase.meetingType || '')
  );

  const pendingMembers = requiredMembers.filter(m => {
    if (!m.uid) return true; // Invite pending
    const progress = memberProgress[m.uid];
    if (!progress) return true;
    
    // Check modules for the relevant area
    const phaseModules = phase.modules.filter(mod => m.areas.includes(mod.area) || m.areas.includes('todos'));
    const completedCount = phaseModules.filter(mod => progress.completedModules.includes(mod.id)).length;
    return completedCount < phaseModules.length;
  });

  const isUnlocked = pendingMembers.length === 0;

  return (
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
              {phase.meetingTitle}
            </CardTitle>
            <p className="text-sm text-slate-500">
              {isUnlocked ? "Requisitos coletivos preenchidos." : "Aguardando conclusão da equipe obrigatória."}
            </p>
          </div>
        </div>
        <Badge variant={isUnlocked ? "default" : "outline"} className={isUnlocked ? "bg-green-600" : ""}>
          {isUnlocked ? "Liberado" : "Bloqueado"}
        </Badge>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-4">
        <div className="bg-white rounded-lg border p-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Status dos Participantes Obrigatórios</h4>
          <div className="space-y-3">
            {requiredMembers.map(m => {
              const progress = m.uid ? memberProgress[m.uid] : null;
              const phaseModules = phase.modules.filter(mod => m.areas.includes(mod.area) || m.areas.includes('todos'));
              const completedCount = progress ? phaseModules.filter(mod => progress.completedModules.includes(mod.id)).length : 0;
              const isUserDone = completedCount >= phaseModules.length && phaseModules.length > 0;
              const hasNoModules = phaseModules.length === 0;

              return (
                <div key={m.id} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold">
                      {m.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">{m.name} {m.role === 'implementation_master' && <span className="text-[10px] text-blue-600">(Master)</span>}</p>
                      <p className="text-[10px] text-slate-400">{m.areas.join(', ')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!m.uid ? (
                      <Badge variant="outline" className="text-[10px] text-orange-500 border-orange-200 bg-orange-50">Convite Pendente</Badge>
                    ) : hasNoModules ? (
                      <Badge variant="outline" className="text-[10px] text-slate-400">Nenhum módulo</Badge>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500">{completedCount}/{phaseModules.length}</span>
                        {isUserDone ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Clock className="w-4 h-4 text-slate-300" />}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>

      <CardFooter className="bg-white/50 border-t p-4 flex justify-between items-center">
        {isUnlocked ? (
          <>
            <p className="text-sm text-slate-600 max-w-[200px]">
              {isClientMaster 
                ? "Você já pode realizar o agendamento." 
                : "Aguardando agendamento pelo Cliente Master."}
            </p>
            {isClientMaster && (
              <Button className="bg-primary hover:bg-primary/90 font-bold" onClick={onSchedule}>
                Agendar Encontro Guiado <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 text-slate-400 text-sm italic">
            <AlertCircle className="w-4 h-4" />
            Aguardando conclusão de {pendingMembers.length} participante(s).
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
