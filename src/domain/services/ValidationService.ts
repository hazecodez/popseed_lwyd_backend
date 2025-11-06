export interface IValidationService {
  validateEmail(email: string): boolean;
  validateSubdomain(subdomain: string): ValidationResult;
  validateOrganizationName(name: string): ValidationResult;
  validatePhoneNumber(phone: string): ValidationResult;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export class ValidationError extends Error {
  constructor(public field: string, message: string) {
    super(`Validation error for ${field}: ${message}`);
    this.name = 'ValidationError';
  }
}

export const VALIDATION_RULES = {
  email: {
    pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    maxLength: 254
  },
  subdomain: {
    pattern: /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/,
    minLength: 3,
    maxLength: 50
  },
  organizationName: {
    minLength: 2,
    maxLength: 100
  },
  phoneNumber: {
    pattern: /^\+?[1-9]\d{1,14}$/
  }
};