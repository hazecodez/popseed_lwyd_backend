import { ISignupSessionRepository } from '@/domain/repositories/ISignupSessionRepository';
import { IOrganizationRepository } from '@/domain/repositories/IOrganizationRepository';
import { IValidationService } from '@/domain/services/ValidationService';
import { SignupStatus } from '@/domain/entities/SignupSession';

export interface SaveOrganizationDetailsRequest {
  sessionId: string;
  organizationName: string;
  firstName: string;
  lastName: string;
  subdomain: string;
  phoneNumber?: string;
  companySize?: string;
  industry?: string;
}

export interface SaveOrganizationDetailsResponse {
  sessionId: string;
  message: string;
}

export class SaveOrganizationDetailsUseCase {
  constructor(
    private signupSessionRepository: ISignupSessionRepository,
    private organizationRepository: IOrganizationRepository,
    private validationService: IValidationService
  ) {}

  async execute(request: SaveOrganizationDetailsRequest): Promise<SaveOrganizationDetailsResponse> {
    // Validate input
    this.validateInput(request);

    // Find session
    const session = await this.signupSessionRepository.findBySessionId(request.sessionId);
    if (!session) {
      throw new Error('Invalid or expired session');
    }

    if (session.status !== SignupStatus.PLAN_SELECTED) {
      throw new Error('Plan must be selected before saving organization details');
    }

    // Validate organization name
    const nameValidation = this.validationService.validateOrganizationName(request.organizationName);
    if (!nameValidation.isValid) {
      throw new Error(nameValidation.error || 'Invalid organization name');
    }

    // Validate subdomain
    const subdomainValidation = this.validationService.validateSubdomain(request.subdomain);
    if (!subdomainValidation.isValid) {
      throw new Error(subdomainValidation.error || 'Invalid subdomain');
    }

    // Check subdomain availability
    const availability = await this.organizationRepository.checkSubdomainAvailability(request.subdomain);
    if (!availability.available) {
      const suggestions = availability.suggestions || [];
      throw new Error(`Subdomain is not available. Try: ${suggestions.join(', ')}`);
    }

    // Validate phone number if provided
    if (request.phoneNumber) {
      const phoneValidation = this.validationService.validatePhoneNumber(request.phoneNumber);
      if (!phoneValidation.isValid) {
        throw new Error(phoneValidation.error || 'Invalid phone number');
      }
    }

    // Update session with organization details
    const updatedSession = await this.signupSessionRepository.updateStatus(
      request.sessionId,
      SignupStatus.ORG_DETAILS,
      {
        organizationName: request.organizationName.trim(),
        firstName: request.firstName.trim(),
        lastName: request.lastName.trim(),
        subdomain: request.subdomain.toLowerCase().trim(),
        phoneNumber: request.phoneNumber?.trim() || '',
        companySize: request.companySize || '',
        industry: request.industry || ''
      }
    );

    if (!updatedSession) {
      throw new Error('Failed to update session');
    }

    return {
      sessionId: request.sessionId,
      message: 'Organization details saved successfully'
    };
  }

  private validateInput(request: SaveOrganizationDetailsRequest): void {
    const requiredFields = ['sessionId', 'organizationName', 'firstName', 'lastName', 'subdomain'];
    
    for (const field of requiredFields) {
      if (!request[field as keyof SaveOrganizationDetailsRequest]) {
        throw new Error(`${field} is required`);
      }
    }
  }
}