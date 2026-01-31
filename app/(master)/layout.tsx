'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { MasterSidebar } from '@/components/master-sidebar';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserRole } from '@prisma/client';

export default function MasterLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading

    if (!session) {
      router.push('/login');
      return;
    }

    if ((session.user as any)?.role !== UserRole.MASTER) {
      router.push('/dashboard');
      return;
    }
  }, [session, status, router]);

  // Show loading while checking auth
  if (status === 'loading' || !session || (session.user as any)?.role !== UserRole.MASTER) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <MasterSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">
        {/* Mobile Header with Hamburger */}
        <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
            className="p-2"
            aria-label="Abrir menu"
          >
            <Menu className="h-6 w-6 text-gray-700 dark:text-gray-300" />
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-purple-600 dark:text-purple-400">
              CliniHOF
            </h1>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
              Master
            </span>
          </div>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        {/* Content */}
        <div className="container max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}