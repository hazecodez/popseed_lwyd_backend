export interface StatusChange {
  status: 'brief_submitted' | 'rework_requested' | 'designer_assigned' | 'picked_up' | 'hold_by_designer' | 'draft_submitted' | 'internal_approved' | 'sent_to_client' | 'client_approved' | 'client_feedback';
  changedAt: Date;
  changedBy: string; // User ID
  notes?: string;
}

export interface ActivityComment {
  byWho: string; // User ID
  comment: string;
  time: Date;
  type: 'brief_submitted' | 'brief_rework' | 'design_rework' | 'designer_feedback' | 'client_feedback' | 'internal_feedback' | 'rework_requested' | 'designer_assigned' | 'designer_changed' | 'internal_discussion' | 'hold_by_designer';
  asset?: string; // Optional: Cloudinary image URL
}

export interface Deliverable {
  deliverable: string; // URL or link
  submittedBy: string; // User ID
  submittedAt: Date; // Timestamp
}

export interface Task {
  taskId: string;
  projectId: string; // Foreign key to Project
  organizationId: string;
  taskName: string;
  description: string; // Keep existing description for backward compatibility
  brief: string; // New field for detailed task brief
  taskType: 'graphic_design' | 'motion_graphic_design' | '3d_design' | 'ai_generation' | 'web_design' | 'copy_writing' | 'strategy_thinking';
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH'; // Optional - determined by star rating when assigned
  assignedDesigner?: string; // User ID - Individual designer assigned by Head/Lead (who is currently doing the task)
  designers?: string[]; // Array of User IDs - All designers who have worked on this task
  designLead?: string; // User ID - Head/Lead who assigned the task to designer
  reworkDesigner?: string; // User ID - If rework assigned to different designer
  createdBy: string; // User ID - who created the task (AM)
  priority: 'low' | 'medium' | 'high' | 'urgent';
  starRate?: number; // 0-5 star difficulty rating assigned by Lead
  status: 'brief_submitted' | 'rework_requested' | 'designer_assigned' | 'picked_up' | 'draft_submitted' | 'internal_approved' | 'sent_to_client' | 'client_approved' | 'client_feedback' | 'hold_by_designer';
  statusHistory: StatusChange[]; // Time tracking of status changes
  dueDate: Date;
  dueTime?: string; // Time in HH:MM format (e.g., "14:30")
  estimatedHours?: number;
  actualHours?: number;
  tags: string[]; // e.g., ['design', 'copywriting', 'review']
  assets: string[]; // Task assets uploaded during creation
  references: string[]; // Reference materials (array of strings)
  attachments: string[]; // File URLs/paths (keep for backward compatibility)
  dependencies: string[]; // Array of taskIds that this task depends on
  
  // Rework fields
  isRework: boolean;
  originalTaskId?: string; // Reference to original task if this is a rework
  reworkSuggestions?: string; // Rework brief for rework tasks
  
  // Activity and comments
  activityAndComments: ActivityComment[];
  
  // Client review
  clientEmail?: string;
  deliverables: Deliverable[]; // Assets uploaded by designer as final deliverables with metadata
  
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}