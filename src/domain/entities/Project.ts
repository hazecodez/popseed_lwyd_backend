export interface Project {
  projectId: string;
  organizationId: string;
  projectName: string;
  clientId: string; // Reference to Client entity
  campaignName?: string; // Optional
  projectType?: string;
  dueDate: Date;
  dueTime?: string; // Time in HH:MM format (e.g., "14:30")
  poNumber?: string;
  estimateNumber?: string;
  assignedAM: string; // User ID
  assignedDesignLead?: string; // User ID
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  riskStatus: 'LOW' | 'MEDIUM' | 'HIGH';
  progress: number; // 0-100
  budget: number; // Required field
  description: string; // Brief/Description
  brief: string; // Alias for description for form clarity
  assets: string[]; // Array of file URLs/paths
  status: 'ACTIVE' | 'REVIEW' | 'ONHOLD' | 'COMPLETED';
  projectLead: string; // User ID - person who created the project
  createdBy: string; // User ID
  createdAt: Date;
  updatedAt: Date;
}