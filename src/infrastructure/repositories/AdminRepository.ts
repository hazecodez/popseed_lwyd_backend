import bcrypt from 'bcryptjs';
import { IAdminRepository } from '@/domain/repositories/IAdminRepository';
import { Admin, CreateAdminRequest, UpdateAdminRequest } from '@/domain/entities/Admin';
import { AdminModel } from '@/infrastructure/database/models/AdminModel';

export class AdminRepository implements IAdminRepository {
  async create(adminData: CreateAdminRequest): Promise<Admin> {
    try {
      // Hash the password only if it's not already hashed
      let passwordHash: string;
      if (adminData.isPasswordHashed) {
        passwordHash = adminData.password; // Already hashed
      } else {
        const saltRounds = 12;
        passwordHash = await bcrypt.hash(adminData.password, saltRounds);
      }

      const admin = new AdminModel({
        ...adminData,
        passwordHash
      });

      const savedAdmin = await admin.save();
      return this.mapToEntity(savedAdmin);
    } catch (error) {
      if ((error as any).code === 11000) {
        throw new Error('Admin with this email already exists for this organization');
      }
      throw new Error(`Failed to create admin: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findById(adminId: string): Promise<Admin | null> {
    try {
      const admin = await AdminModel.findOne({ adminId });
      return admin ? this.mapToEntity(admin) : null;
    } catch (error) {
      throw new Error(`Failed to find admin by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByEmail(email: string): Promise<Admin | null> {
    try {
      const admin = await AdminModel.findOne({ email: email.toLowerCase() });
      return admin ? this.mapToEntity(admin) : null;
    } catch (error) {
      throw new Error(`Failed to find admin by email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByEmailAndOrganization(email: string, organizationId: string): Promise<Admin | null> {
    try {
      const admin = await AdminModel.findOne({ 
        email: email.toLowerCase(), 
        organizationId 
      });
      return admin ? this.mapToEntity(admin) : null;
    } catch (error) {
      throw new Error(`Failed to find admin by email and organization: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByOrganizationId(organizationId: string): Promise<Admin[]> {
    try {
      const admins = await AdminModel.find({ organizationId });
      return admins.map(admin => this.mapToEntity(admin));
    } catch (error) {
      throw new Error(`Failed to find admins by organization: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async update(adminId: string, updates: UpdateAdminRequest): Promise<Admin | null> {
    try {
      const updateData: any = { ...updates };

      // Hash password if provided
      if (updates.password) {
        const saltRounds = 12;
        updateData.passwordHash = await bcrypt.hash(updates.password, saltRounds);
        delete updateData.password;
      }

      updateData.updatedAt = new Date();

      const admin = await AdminModel.findOneAndUpdate(
        { adminId },
        updateData,
        { new: true }
      );
      return admin ? this.mapToEntity(admin) : null;
    } catch (error) {
      throw new Error(`Failed to update admin: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateLastLogin(adminId: string): Promise<boolean> {
    try {
      const result = await AdminModel.findOneAndUpdate(
        { adminId },
        { lastLoginAt: new Date() }
      );
      return !!result;
    } catch (error) {
      throw new Error(`Failed to update last login: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(adminId: string): Promise<boolean> {
    try {
      const result = await AdminModel.findOneAndDelete({ adminId });
      return !!result;
    } catch (error) {
      throw new Error(`Failed to delete admin: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async validateCredentials(email: string, password: string, organizationId?: string): Promise<Admin | null> {
    try {
      const query: any = { 
        email: email.toLowerCase(),
        isActive: true 
      };
      
      if (organizationId) {
        query.organizationId = organizationId;
      }

      const admin = await AdminModel.findOne(query).select('+passwordHash');
      if (!admin) {
        return null;
      }

      const isValidPassword = await bcrypt.compare(password, admin.passwordHash);
      if (!isValidPassword) {
        return null;
      }

      return this.mapToEntity(admin);
    } catch (error) {
      throw new Error(`Failed to validate credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private mapToEntity(adminDoc: any): Admin {
    return {
      adminId: adminDoc.adminId,
      email: adminDoc.email,
      passwordHash: adminDoc.passwordHash, // Keep for validation, but exclude in toJSON
      name: adminDoc.name,
      role: adminDoc.role,
      organizationId: adminDoc.organizationId,
      isActive: adminDoc.isActive,
      lastLoginAt: adminDoc.lastLoginAt,
      createdAt: adminDoc.createdAt,
      updatedAt: adminDoc.updatedAt
    };
  }
}