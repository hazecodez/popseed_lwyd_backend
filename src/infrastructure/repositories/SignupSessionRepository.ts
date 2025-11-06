import { ISignupSessionRepository } from '@/domain/repositories/ISignupSessionRepository';
import { SignupSession, CreateSignupSessionRequest, UpdateSignupSessionRequest } from '@/domain/entities/SignupSession';
import { SignupSessionModel } from '@/infrastructure/database/models/SignupSessionModel';
import { PasswordService } from '@/infrastructure/services/PasswordService';
import { v4 as uuidv4 } from 'uuid';

export class SignupSessionRepository implements ISignupSessionRepository {
  private passwordService: PasswordService;

  constructor() {
    this.passwordService = new PasswordService();
  }

  async create(sessionData: CreateSignupSessionRequest): Promise<SignupSession> {
    try {
      // Hash password before storing
      const hashedPassword = await this.passwordService.hash(sessionData.password);

      const session = new SignupSessionModel({
        sessionId: uuidv4(),
        email: sessionData.email,
        password: hashedPassword
      });

      const savedSession = await session.save();
      return this.mapToEntity(savedSession);
    } catch (error) {
      throw new Error(`Failed to create signup session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findBySessionId(sessionId: string): Promise<SignupSession | null> {
    try {
      const session = await SignupSessionModel.findOne({
        sessionId,
        expiresAt: { $gt: new Date() }
      });
      return session ? this.mapToEntity(session) : null;
    } catch (error) {
      throw new Error(`Failed to find signup session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async update(sessionId: string, updates: UpdateSignupSessionRequest): Promise<SignupSession | null> {
    try {
      const session = await SignupSessionModel.findOneAndUpdate(
        { sessionId, expiresAt: { $gt: new Date() } },
        { ...updates },
        { new: true }
      );
      return session ? this.mapToEntity(session) : null;
    } catch (error) {
      throw new Error(`Failed to update signup session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateStatus(sessionId: string, status: string, additionalData?: any): Promise<SignupSession | null> {
    try {
      const updateData: any = { status };
      if (additionalData) {
        Object.assign(updateData, additionalData);
      }

      const session = await SignupSessionModel.findOneAndUpdate(
        { sessionId, expiresAt: { $gt: new Date() } },
        updateData,
        { new: true }
      );

      return session ? this.mapToEntity(session) : null;
    } catch (error) {
      throw new Error(`Failed to update session status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(sessionId: string): Promise<boolean> {
    try {
      const result = await SignupSessionModel.findOneAndDelete({ sessionId });
      return !!result;
    } catch (error) {
      throw new Error(`Failed to delete signup session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async cleanup(): Promise<number> {
    try {
      const result = await SignupSessionModel.deleteMany({
        expiresAt: { $lt: new Date() }
      });
      return result.deletedCount || 0;
    } catch (error) {
      throw new Error(`Failed to cleanup expired sessions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private mapToEntity(sessionDoc: any): SignupSession {
    return {
      id: sessionDoc._id.toString(),
      sessionId: sessionDoc.sessionId,
      email: sessionDoc.email,
      password: sessionDoc.password,
      firstName: sessionDoc.firstName,
      lastName: sessionDoc.lastName,
      organizationName: sessionDoc.organizationName,
      subdomain: sessionDoc.subdomain,
      phoneNumber: sessionDoc.phoneNumber,
      companySize: sessionDoc.companySize,
      industry: sessionDoc.industry,
      planType: sessionDoc.planType,
      stripeSessionId: sessionDoc.stripeSessionId,
      status: sessionDoc.status,
      expiresAt: sessionDoc.expiresAt,
      createdAt: sessionDoc.createdAt
    };
  }
}