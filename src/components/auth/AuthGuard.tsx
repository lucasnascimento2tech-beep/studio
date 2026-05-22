
"use client";

import { useUser } from "@/firebase";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, ReactNode } from "react";
import { GlobalRole } from "@/types/journey";

interface AuthGuardProps {
  children: ReactNode;
  allowedRoles?: GlobalRole[];
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const { user, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    // Bloqueio rígido de client_pending fora da página de aprovação
    if (user.globalRole === 'client_pending' && pathname !== '/pending-approval') {
      router.push("/pending-approval");
      return;
    }

    // Redirecionamento por Papel (Acesso Indevido)
    if (allowedRoles && !allowedRoles.includes(user.globalRole as GlobalRole)) {
      if (user.globalRole === 'admin_2tech') {
        router.push("/admin");
      } else if (user.globalRole === 'implantador') {
        router.push("/implantador");
      } else if (user.globalRole === 'client_pending') {
        router.push("/pending-approval");
      } else {
        router.push("/");
      }
    }

    // Caso específico: admin tentando acessar /implantador está OK, mas implantador tentando acessar /admin NÃO
    if (pathname === '/admin' && user.globalRole !== 'admin_2tech') {
      router.push("/implantador");
    }
    
  }, [user, loading, router, allowedRoles, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Verificando segurança...</p>
        </div>
      </div>
    );
  }

  // Não renderiza nada se não estiver autorizado (evita flash de conteúdo)
  if (!user) return null;
  if (user.globalRole === 'client_pending' && pathname !== '/pending-approval') return null;
  if (allowedRoles && !allowedRoles.includes(user.globalRole as GlobalRole)) return null;
  if (pathname === '/admin' && user.globalRole !== 'admin_2tech') return null;

  return <>{children}</>;
}
