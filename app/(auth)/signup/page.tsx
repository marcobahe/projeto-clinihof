'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Lock, ArrowLeft } from 'lucide-react';

export default function SignupPage() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8">
      <div className="flex items-center justify-center mb-6">
        <div className="w-20 h-20 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
          <Lock className="w-10 h-10 text-purple-600 dark:text-purple-400" />
        </div>
      </div>
      
      <h2 className="text-2xl font-bold text-center mb-3 text-gray-900 dark:text-white">
        Cadastro Restrito
      </h2>
      
      <p className="text-center text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
        O cadastro de novas contas é feito exclusivamente pelo administrador da plataforma.
        <br />
        Entre em contato com o administrador para solicitar acesso.
      </p>

      <Link href="/login">
        <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Login
        </Button>
      </Link>
    </div>
  );
}
