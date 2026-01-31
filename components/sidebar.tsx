'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Users,
  Stethoscope,
  UserCircle,
  LogOut,
  Loader2,
  Package,
  UsersRound,
  DollarSign,
  Tag,
  TrendingUp,
  X,
  FileText,
  Settings,
  Shield,
  Percent,
} from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ThemeToggle } from './theme-toggle';
import { useEffect, useState } from 'react';

const navigation = [
  { name: 'Painel', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Atendimentos', href: '/appointments', icon: Calendar },
  { name: 'Agenda', href: '/agenda', icon: CalendarDays },
  { name: 'Agendamentos Futuros', href: '/agenda/futuros', icon: CalendarDays },
  { name: 'Pacientes', href: '/patients', icon: Users },
  { name: 'Orçamentos', href: '/quotes', icon: FileText },
  { name: 'Comissões', href: '/comissoes', icon: Percent },
  { name: 'Custos', href: '/costs', icon: DollarSign },
  { name: 'Fluxo de Caixa', href: '/cashflow', icon: TrendingUp },
  { name: 'Insumos', href: '/supplies', icon: Package },
  { name: 'Colaboradores', href: '/collaborators', icon: UsersRound },
  { name: 'Procedimentos', href: '/procedures', icon: Stethoscope },
  { name: 'Precificação (Pacotes)', href: '/packages', icon: Tag },
  { name: 'Sessões de Pacotes', href: '/pacotes-sessoes', icon: Package },
  { name: 'Configurações', href: '/configuracoes', icon: Settings },
  { name: 'Usuários', href: '/usuarios', icon: Shield },
  { name: 'Administração', href: '/admin', icon: Settings },
  { name: 'Minha Conta', href: '/account', icon: UserCircle },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined' && window.innerWidth < 1024) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!mounted) {
    return (
      <div className="hidden lg:flex h-screen w-64 flex-col bg-gradient-to-b from-gray-900 to-gray-800 dark:from-gray-950 dark:to-gray-900 text-white">
        <div className="flex h-16 items-center px-6 border-b border-gray-700 dark:border-gray-800">
          <Link href="/dashboard" className="text-2xl font-bold text-purple-400 hover:text-purple-300 transition-colors cursor-pointer">
            CliniHOF
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => (
            <div
              key={item.name}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-300"
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </div>
          ))}
        </nav>
        <div className="border-t border-gray-700 dark:border-gray-800 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-gray-700 animate-pulse" />
            <div className="flex-1 min-w-0">
              <div className="h-4 bg-gray-700 rounded animate-pulse mb-1" />
              <div className="h-3 bg-gray-700 rounded animate-pulse w-2/3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <SidebarContent pathname={pathname} isOpen={isOpen} onClose={onClose} />
    </>
  );
}

function SidebarContent({ 
  pathname, 
  isOpen, 
  onClose 
}: { 
  pathname: string;
  isOpen: boolean;
  onClose?: () => void;
}) {
  const { data: session, status } = useSession() || {};

  const user = session?.user;
  const userInitials = user?.name
    ?.split(' ')
    ?.map((n) => n?.[0])
    ?.join('')
    ?.toUpperCase() ?? 'U';

  return (
    <div 
      className={cn(
        'fixed lg:static inset-y-0 left-0 z-50 flex h-screen w-64 flex-col bg-gradient-to-b from-gray-900 to-gray-800 dark:from-gray-950 dark:to-gray-900 text-white transition-transform duration-300 ease-in-out lg:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-6 border-b border-gray-700 dark:border-gray-800">
        <Link href="/dashboard" className="text-2xl font-bold text-purple-400 hover:text-purple-300 transition-colors cursor-pointer">
          CliniHOF
        </Link>
        {/* Close button for mobile */}
        <button
          onClick={onClose}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-700/50 transition-colors"
          aria-label="Fechar menu"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => {
                // Close sidebar on mobile when clicking a link
                if (window.innerWidth < 1024) {
                  onClose?.();
                }
              }}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-purple-600 dark:bg-purple-700 text-white shadow-lg'
                  : 'text-gray-300 dark:text-gray-400 hover:bg-gray-700/50 dark:hover:bg-gray-800/50 hover:text-white'
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="border-t border-gray-700 dark:border-gray-800 p-4 space-y-3">
        {/* Theme Toggle */}
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-medium text-gray-400">Tema</span>
          <ThemeToggle />
        </div>

        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={user?.image ?? undefined} />
            <AvatarFallback className="bg-purple-500 dark:bg-purple-600 text-white">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.name ?? 'Usuário'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
              {user?.email ?? ''}
            </p>
          </div>
        </div>
        <Button
          onClick={() => signOut({ callbackUrl: '/login' })}
          variant="ghost"
          className="w-full justify-start text-gray-300 dark:text-gray-400 hover:text-white hover:bg-gray-700/50 dark:hover:bg-gray-800/50"
          size="sm"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </div>
    </div>
  );
}