export interface SignupSession {
  id: string;
  sessionId: string;
  email: string;
  password: string; // hashed
  firstName: string;
  lastName: string;
  organizationName: string;
  subdomain: string;
  phoneNumber?: string;
  companySize?: string;
  industry?: string;
  planType: string;
  stripeSessionId?: string;
  status: SignupStatus;
  expiresAt: Date;
  createdAt: Date;
}

export enum SignupStatus {
  EMAIL_CREATED = 'EMAIL_CREATED',
  PLAN_SELECTED = 'PLAN_SELECTED',
  ORG_DETAILS = 'ORG_DETAILS',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  COMPLETED = 'COMPLETED'
}

export interface CreateSignupSessionRequest {
  email: string;
  password: string;
}

export interface UpdateSignupSessionRequest {
  sessionId: string;
  firstName?: string;
  lastName?: string;
  organizationName?: string;
  subdomain?: string;
  phoneNumber?: string;
  companySize?: string;
  industry?: string;
  planType?: string;
  stripeSessionId?: string;
  status?: SignupStatus;
}