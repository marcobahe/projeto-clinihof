'use client';

import { ReactNode, useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
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
          <h1 className="text-lg font-bold text-purple-600 dark:text-purple-400">
            CliniHOF
          </h1>
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
