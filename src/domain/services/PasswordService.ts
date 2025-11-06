export interface IPasswordService {
  hash(password: string): Promise<string>;
  compare(password: string, hashedPassword: string): Promise<boolean>;
  validate(password: string): ValidationResult;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class PasswordValidationError extends Error {
  constructor(public errors: string[]) {
    super(`Password validation failed: ${errors.join(', ')}`);
    this.name = 'PasswordValidationError';
  }
}

export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false
};