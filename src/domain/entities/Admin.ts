export interface Admin {
  adminId: string;
  email: string;
  passwordHash: string;
  name: string;
  role: string; // e.g., "CEO", "Admin", etc.
  organizationId: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAdminRequest {
  email: string;
  password: string; // Plain password, will be hashed
  name: string;
  role: string;
  organizationId: string;
  isPasswordHashed?: boolean; // Flag to indicate if password is already hashed
}

export interface UpdateAdminRequest {
  email?: string;
  password?: string; // Plain password, will be hashed
  name?: string;
  role?: string;
  organizationId?: string;
  isActive?: boolean;
}

export interface AdminLoginRequest {
  email: string;
  password: string;
  organizationId?: string; // For multi-tenant validation
}

export interface AdminLoginResponse {
  adminId: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
  token: string; // JWT token
}