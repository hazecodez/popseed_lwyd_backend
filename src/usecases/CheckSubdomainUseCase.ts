import { IOrganizationRepository } from '@/domain/repositories/IOrganizationRepository';
import { IValidationService } from '@/domain/services/ValidationService';
import { SubdomainAvailability } from '@/domain/entities/Organization';

export interface CheckSubdomainRequest {
  subdomain: string;
}

export class CheckSubdomainUseCase {
  constructor(
    private organizationRepository: IOrganizationRepository,
    private validationService: IValidationService
  ) {}

  async execute(request: CheckSubdomainRequest): Promise<SubdomainAvailability> {
    const subdomain = request.subdomain.toLowerCase().trim();

    // Validate subdomain format
    const validation = this.validationService.validateSubdomain(subdomain);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid subdomain format');
    }

    // Check availability
    return await this.organizationRepository.checkSubdomainAvailability(subdomain);
  }
}