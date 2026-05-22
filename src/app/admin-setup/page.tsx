"use client";

import { Card, CardTitle, CardContent } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

export default function ForbiddenSetup() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="max-w-md w-full text-center py-12">
        <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <CardTitle>Acesso Restrito</CardTitle>
        <CardContent className="text-slate-500 mt-2">
          A criação de administradores agora deve ser feita exclusivamente via terminal utilizando o script oficial:
          <div className="bg-slate-900 text-slate-300 p-3 rounded-lg mt-4 font-mono text-xs">
            npm run create:admin
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
