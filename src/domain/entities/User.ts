export interface User {
  userId: string;
  email: string;
  password: string; // hashed
  fullName: string;
  role: string; // "not_defined" | "admin" | "manager" | "employee" | etc.
  team?: string; // "Design" | "AM" | "Accounts" | "Creative" | "Management"
  status: string; // "not_approved" | "approved" | "rejected"
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  invitedBy?: string; // Admin who invited them
  approvedBy?: string; // Admin who approved them
  approvedAt?: Date;
  lastLoginAt?: Date;
  // OAuth fields
  googleId?: string;
  microsoftId?: string;
  // Workload tracking fields
  ongoingTasks?: number;
  workloadScore?: number;
  taskDifficulties?: Array<{
    taskId: string;
    starRating: number;
  }>;
}

export enum UserRole {
  NOT_DEFINED = 'not_defined',
  ADMIN = 'admin',
  MANAGER = 'manager',
  EMPLOYEE = 'employee'
}

export enum UserStatus {
  NOT_APPROVED = 'not_approved',
  APPROVED = 'approved', 
  REJECTED = 'rejected'
}

export interface CreateUserRequest {
  email: string;
  password: string;
  fullName: string;
  organizationId: string;
  role?: string;
  status?: string;
}

export interface EmployeeSignupRequest {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  organizationId: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId: string;
  isActive: boolean;
}