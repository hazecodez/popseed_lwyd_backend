import { SignupSession, CreateSignupSessionRequest, UpdateSignupSessionRequest } from '../entities/SignupSession';

export interface ISignupSessionRepository {
  create(sessionData: CreateSignupSessionRequest): Promise<SignupSession>;
  findBySessionId(sessionId: string): Promise<SignupSession | null>;
  update(sessionId: string, updates: UpdateSignupSessionRequest): Promise<SignupSession | null>;
  updateStatus(sessionId: string, status: string, additionalData?: any): Promise<SignupSession | null>;
  delete(sessionId: string): Promise<boolean>;
  cleanup(): Promise<number>; // Remove expired sessions
}