import { IValidationService, ValidationResult, VALIDATION_RULES } from '@/domain/services/ValidationService';

export class ValidationService implements IValidationService {
  validateEmail(email: string): boolean {
    if (!email || email.length > VALIDATION_RULES.email.maxLength) {
      return false;
    }
    return VALIDATION_RULES.email.pattern.test(email);
  }

  validateSubdomain(subdomain: string): ValidationResult {
    if (!subdomain) {
      return { isValid: false, error: 'Subdomain is required' };
    }

    if (subdomain.length < VALIDATION_RULES.subdomain.minLength) {
      return { 
        isValid: false, 
        error: `Subdomain must be at least ${VALIDATION_RULES.subdomain.minLength} characters long` 
      };
    }

    if (subdomain.length > VALIDATION_RULES.subdomain.maxLength) {
      return { 
        isValid: false, 
        error: `Subdomain must be less than ${VALIDATION_RULES.subdomain.maxLength} characters` 
      };
    }

    if (!VALIDATION_RULES.subdomain.pattern.test(subdomain)) {
      return { 
        isValid: false, 
        error: 'Subdomain can only contain letters, numbers, and hyphens (no spaces or special characters)' 
      };
    }

    // Reserved subdomains
    const reserved = ['www', 'api', 'admin', 'app', 'mail', 'support', 'help', 'blog', 'docs'];
    if (reserved.includes(subdomain.toLowerCase())) {
      return { isValid: false, error: 'This subdomain is reserved' };
    }

    return { isValid: true };
  }

  validateOrganizationName(name: string): ValidationResult {
    if (!name) {
      return { isValid: false, error: 'Organization name is required' };
    }

    const trimmedName = name.trim();

    if (trimmedName.length < VALIDATION_RULES.organizationName.minLength) {
      return { 
        isValid: false, 
        error: `Organization name must be at least ${VALIDATION_RULES.organizationName.minLength} characters long` 
      };
    }

    if (trimmedName.length > VALIDATION_RULES.organizationName.maxLength) {
      return { 
        isValid: false, 
        error: `Organization name must be less than ${VALIDATION_RULES.organizationName.maxLength} characters` 
      };
    }

    return { isValid: true };
  }

  validatePhoneNumber(phone: string): ValidationResult {
    if (!phone) {
      return { isValid: true }; // Phone is optional
    }

    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

    if (!VALIDATION_RULES.phoneNumber.pattern.test(cleanPhone)) {
      return { 
        isValid: false, 
        error: 'Please enter a valid phone number' 
      };
    }

    return { isValid: true };
  }
}