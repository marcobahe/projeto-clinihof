'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cake, Phone, Gift } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface Birthday {
  id: string;
  name: string;
  phone: string;
  formattedBirthday: string;
  daysUntil: number;
}

export function BirthdayWidget() {
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBirthdays = async () => {
      try {
        const response = await fetch('/api/patients/birthdays?days=30');
        if (response.ok) {
          const data = await response.json();
          setBirthdays(data.birthdays || []);
        }
      } catch (error) {
        console.error('Error fetching birthdays:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBirthdays();
  }, []);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  const getDaysLabel = (days: number) => {
    if (days === 0) return 'Hoje!';
    if (days === 1) return 'Amanhã';
    return `Em ${days} dias`;
  };

  const getBadgeColor = (days: number) => {
    if (days === 0) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    if (days <= 7) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 1.6 }}
    >
      <Card className="p-6 bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-900/10 dark:to-purple-900/10 border-2 border-pink-100 dark:border-pink-800/50">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center">
          <Cake className="h-5 w-5 mr-2 text-pink-500" />
          🎂 Aniversariantes do Mês
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Próximos 30 dias
        </p>

        {birthdays.length > 0 ? (
          <div className="space-y-3 max-h-[320px] overflow-y-auto">
            {birthdays.slice(0, 10).map((patient) => (
              <Link
                key={patient.id}
                href={`/patients/${patient.id}`}
                className="block"
              >
                <div
                  className={`flex items-center justify-between p-3 rounded-lg transition-all hover:shadow-md ${
                    patient.daysUntil === 0
                      ? 'bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border-2 border-green-300 dark:border-green-700'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        patient.daysUntil === 0
                          ? 'bg-green-500 text-white'
                          : 'bg-pink-100 dark:bg-pink-900/30 text-pink-600'
                      }`}
                    >
                      {patient.daysUntil === 0 ? (
                        <Gift className="h-5 w-5" />
                      ) : (
                        <Cake className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {patient.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{patient.formattedBirthday}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {patient.phone}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge className={getBadgeColor(patient.daysUntil)}>
                    {getDaysLabel(patient.daysUntil)}
                  </Badge>
                </div>
              </Link>
            ))}
            {birthdays.length > 10 && (
              <p className="text-center text-sm text-gray-500 py-2">
                +{birthdays.length - 10} mais aniversariantes
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Cake className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhum aniversário nos próximos 30 dias</p>
            <p className="text-xs mt-1">Cadastre datas de nascimento dos pacientes</p>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
