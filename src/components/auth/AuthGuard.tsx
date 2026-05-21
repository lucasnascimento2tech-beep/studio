
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
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (allowedRoles && !allowedRoles.includes(user.globalRole as GlobalRole)) {
        // Redirect if role is not allowed
        if (user.globalRole === 'implantador' || user.globalRole === 'admin_2tech') {
          router.push("/implantador");
        } else {
          router.push("/");
        }
      }
    }
  }, [user, loading, router, allowedRoles]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
