import { ISignupSessionRepository } from '@/domain/repositories/ISignupSessionRepository';
import { IValidationService } from '@/domain/services/ValidationService';
import { IPasswordService } from '@/domain/services/PasswordService';
import { SignupSession } from '@/domain/entities/SignupSession';

export interface CreateAccountRequest {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface CreateAccountResponse {
  sessionId: string;
  message: string;
}

export class CreateAccountUseCase {
  constructor(
    private signupSessionRepository: ISignupSessionRepository,
    private validationService: IValidationService,
    private passwordService: IPasswordService
  ) {}

  async execute(request: CreateAccountRequest): Promise<CreateAccountResponse> {
    // Validate input
    this.validateInput(request);

    // Validate email format
    if (!this.validationService.validateEmail(request.email)) {
      throw new Error('Invalid email format');
    }

    // Validate password
    const passwordValidation = this.passwordService.validate(request.password);
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    // Check password confirmation
    if (request.password !== request.confirmPassword) {
      throw new Error('Passwords do not match');
    }

    // Create signup session
    const session = await this.signupSessionRepository.create({
      email: request.email.toLowerCase().trim(),
      password: request.password
    });

    return {
      sessionId: session.sessionId,
      message: 'Account created successfully'
    };
  }

  private validateInput(request: CreateAccountRequest): void {
    if (!request.email) {
      throw new Error('Email is required');
    }
    if (!request.password) {
      throw new Error('Password is required');
    }
    if (!request.confirmPassword) {
      throw new Error('Password confirmation is required');
    }
  }
}