'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Globe, Users } from 'lucide-react';
import { motion } from 'framer-motion';

interface OriginStat {
  origin: string;
  label: string;
  count: number;
}

const COLORS = ['#9333ea', '#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff', '#f3e8ff', '#faf5ff'];

export function OriginStatsWidget() {
  const [stats, setStats] = useState<OriginStat[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/patients/stats/origin');
        if (response.ok) {
          const data = await response.json();
          setStats(data.stats || []);
          setTotal(data.total || 0);
        }
      } catch (error) {
        console.error('Error fetching origin stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </Card>
    );
  }

  const chartData = stats.filter((s) => s.count > 0);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 1.5 }}
    >
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center">
          <Globe className="h-5 w-5 mr-2 text-purple-600" />
          Origem dos Pacientes
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Como seus pacientes conheceram a clínica
        </p>

        {chartData.length > 0 ? (
          <>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="label"
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${value} pacientes (${((value / total) * 100).toFixed(1)}%)`,
                      name,
                    ]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{total}</p>
              <p className="text-sm text-gray-500">pacientes cadastrados</p>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhum paciente com origem informada</p>
            <p className="text-xs mt-1">Atualize os cadastros para ver as estatísticas</p>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
