import { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-purple-100 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-purple-600 dark:text-purple-400 dark:text-purple-400">
            CliniHOF
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Gestão Inteligente para Clínicas de Estética</p>
        </div>
        {children}
      </div>
    </div>
  );
}
