import { UserRole } from '@prisma/client';

// Permission levels for different features
export const PERMISSIONS = {
  // Master: Platform owner - same as Admin
  MASTER: {
    canAccessSettings: true,
    canManageUsers: true,
    canViewFinancials: true,
    canEditFinancials: true,
    canViewReports: true,
    canManageAppointments: true,
    canManagePatients: true,
    canManageSales: true,
    canManageCosts: true,
    canManageCollaborators: true,
    canManageProcedures: true,
    canManageSupplies: true,
  },
  // Admin: Full access
  ADMIN: {
    canAccessSettings: true,
    canManageUsers: true,
    canViewFinancials: true,
    canEditFinancials: true,
    canViewReports: true,
    canManageAppointments: true,
    canManagePatients: true,
    canManageSales: true,
    canManageCosts: true,
    canManageCollaborators: true,
    canManageProcedures: true,
    canManageSupplies: true,
  },
  // Manager: Reports, sales, appointments, patients (no system settings)
  MANAGER: {
    canAccessSettings: false,
    canManageUsers: false,
    canViewFinancials: true,
    canEditFinancials: true,
    canViewReports: true,
    canManageAppointments: true,
    canManagePatients: true,
    canManageSales: true,
    canManageCosts: true,
    canManageCollaborators: true,
    canManageProcedures: true,
    canManageSupplies: true,
  },
  // User: Appointments, patients, own sales
  USER: {
    canAccessSettings: false,
    canManageUsers: false,
    canViewFinancials: false,
    canEditFinancials: false,
    canViewReports: false,
    canManageAppointments: true,
    canManagePatients: true,
    canManageSales: true,
    canManageCosts: false,
    canManageCollaborators: false,
    canManageProcedures: false,
    canManageSupplies: false,
  },
  // Receptionist: Appointments, patients (read-only financials)
  RECEPTIONIST: {
    canAccessSettings: false,
    canManageUsers: false,
    canViewFinancials: true,
    canEditFinancials: false,
    canViewReports: false,
    canManageAppointments: true,
    canManagePatients: true,
    canManageSales: false,
    canManageCosts: false,
    canManageCollaborators: false,
    canManageProcedures: false,
    canManageSupplies: false,
  },
} as const;

export type Permission = keyof typeof PERMISSIONS.ADMIN;

// Check if user has a specific permission
export function hasPermission(role: UserRole | undefined, permission: Permission): boolean {
  if (!role) return false;
  return PERMISSIONS[role]?.[permission] ?? false;
}

// Get user permissions
export function getUserPermissions(role: UserRole | undefined) {
  if (!role) return PERMISSIONS.RECEPTIONIST; // Default to most restrictive
  return PERMISSIONS[role] ?? PERMISSIONS.RECEPTIONIST;
}

// Role labels in Portuguese
export const roleLabels: Record<UserRole, string> = {
  MASTER: 'Master',
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  USER: 'Usuário',
  RECEPTIONIST: 'Recepcionista',
};

// Role descriptions
export const roleDescriptions: Record<UserRole, string> = {
  MASTER: 'Dono da plataforma — acesso total a tudo',
  ADMIN: 'Acesso total ao sistema, incluindo configurações e gerenciamento de usuários',
  MANAGER: 'Acesso a relatórios, vendas, agendamentos e pacientes (sem configurações)',
  USER: 'Acesso a agendamentos, pacientes e vendas próprias',
  RECEPTIONIST: 'Acesso a agendamentos e pacientes (somente leitura em financeiro)',
};
