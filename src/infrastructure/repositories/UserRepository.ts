import { IUserRepository } from '@/domain/repositories/IUserRepository';
import { User, CreateUserRequest } from '@/domain/entities/User';
import { UserModel } from '@/infrastructure/database/models/UserModel';
import { PasswordService } from '@/infrastructure/services/PasswordService';

export class UserRepository implements IUserRepository {
  private passwordService: PasswordService;

  constructor() {
    this.passwordService = new PasswordService();
  }

  async create(userData: CreateUserRequest): Promise<User> {
    try {
      // Hash password before storing
      const hashedPassword = await this.passwordService.hash(userData.password);

      const user = new UserModel({
        ...userData,
        password: hashedPassword
      });

      const savedUser = await user.save();
      return this.mapToEntity(savedUser);
    } catch (error) {
      if ((error as any).code === 11000) {
        throw new Error('User with this email already exists in the organization');
      }
      throw new Error(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      // Try to find by MongoDB ObjectId first
      let user = null;
      
      // Check if it's a valid ObjectId format
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        user = await UserModel.findById(id);
      }
      
      // If not found and it looks like a UUID, search by other fields
      // For now, return null as we don't have a UUID field in User model
      // This is a temporary fix - in production, we should have consistent ID strategy
      
      return user ? this.mapToEntity(user) : null;
    } catch (error) {
      throw new Error(`Failed to find user by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByEmail(email: string, organizationId: string): Promise<User | null> {
    try {
      const user = await UserModel.findOne({ email, organizationId });
      return user ? this.mapToEntity(user) : null;
    } catch (error) {
      throw new Error(`Failed to find user by email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByOrganizationId(organizationId: string): Promise<User[]> {
    try {
      const users = await UserModel.find({ organizationId });
      return users.map(user => this.mapToEntity(user));
    } catch (error) {
      throw new Error(`Failed to find users by organization: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async update(id: string, updates: Partial<User>): Promise<User | null> {
    try {
      // If password is being updated, hash it
      if (updates.password) {
        updates.password = await this.passwordService.hash(updates.password);
      }

      const user = await UserModel.findByIdAndUpdate(
        id,
        { ...updates, updatedAt: new Date() },
        { new: true }
      );

      return user ? this.mapToEntity(user) : null;
    } catch (error) {
      throw new Error(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateWorkload(id: string, updates: any): Promise<User | null> {
    try {
      // This method allows MongoDB atomic operations like $inc, $push, $pull
      const user = await UserModel.findByIdAndUpdate(
        id,
        updates,
        { new: true }
      );

      return user ? this.mapToEntity(user) : null;
    } catch (error) {
      throw new Error(`Failed to update user workload: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await UserModel.findByIdAndDelete(id);
      return !!result;
    } catch (error) {
      throw new Error(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async exists(email: string, organizationId: string): Promise<boolean> {
    try {
      const count = await UserModel.countDocuments({ email, organizationId });
      return count > 0;
    } catch (error) {
      throw new Error(`Failed to check user existence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private mapToEntity(userDoc: any): User {
    return {
      userId: userDoc._id.toString(),
      email: userDoc.email,
      password: userDoc.password,
      fullName: userDoc.fullName,
      role: userDoc.role,
      team: userDoc.team,
      status: userDoc.status,
      organizationId: userDoc.organizationId,
      createdAt: userDoc.createdAt,
      updatedAt: userDoc.updatedAt,
      invitedBy: userDoc.invitedBy,
      approvedBy: userDoc.approvedBy,
      approvedAt: userDoc.approvedAt,
      lastLoginAt: userDoc.lastLoginAt,
      googleId: userDoc.googleId,
      microsoftId: userDoc.microsoftId,
      ongoingTasks: userDoc.ongoingTasks,
      workloadScore: userDoc.workloadScore,
      taskDifficulties: userDoc.taskDifficulties
    };
  }
}