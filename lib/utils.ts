import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

/**
 * Formata números no padrão brasileiro (vírgula para decimais, ponto para milhares)
 * @param value - Número a ser formatado
 * @param decimals - Número de casas decimais (padrão: 2)
 * @returns String formatada no padrão brasileiro
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Formata valores monetários no padrão brasileiro (R$ 1.000,50)
 * @param value - Valor a ser formatado
 * @returns String formatada como moeda brasileira
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Formata porcentagens no padrão brasileiro (10,5%)
 * @param value - Valor a ser formatado (ex: 10.5 para 10,5%)
 * @param decimals - Número de casas decimais (padrão: 1)
 * @returns String formatada como porcentagem
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${formatNumber(value, decimals)}%`;
}