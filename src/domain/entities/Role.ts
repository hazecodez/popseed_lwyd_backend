export interface Role {
  roleId: string;
  roleName: string;
  displayName: string;
  level: string; // L1, L2, L3
  team: string;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRoleRequest {
  roleName: string;
  displayName: string;
  level: string;
  team: string;
  permissions: string[];
}

// Predefined permissions
export const PERMISSIONS = {
  // Admin permissions
  ALL_PERMISSIONS: 'all_permissions',
  
  // Project management
  CREATE_PROJECT: 'createProject',
  
  // Assignment permissions
  ASSIGN_TO_DESIGN_LEAD: 'assignToDesignLead',
  ASSIGN_TO_DESIGN_HEAD: 'assignToDesignHead',
  ASSIGN_TO_DESIGNER: 'assignToDesigner',
  ASSIGN_TO_CREATIVE_HEAD: 'assignToCreativeHead',
  ASSIGN_TO_COPY_HEAD: 'assignToCopyHead',
  ASSIGN_TO_COPYWRITER: 'assignToCopywriter',
  ASSIGN_TO_STRATEGIST: 'assignToStrategist',
  
  // Communication permissions
  SEND_TO_CLIENT: 'sendToClient',
  SEND_TO_ADMINS: 'sendToAdmins',
  SEND_TO_AM: 'sendToAM',
  SEND_TO_DESIGNER_LEAD: 'sendToDesignerLead',
  SEND_TO_ACCOUNTS_HEAD: 'sendToAccountsHead',
  
  // Task management
  CREATE_TASK: 'createTask',
  
  // Finance permissions
  RAISE_PO: 'raisePO',
  RAISE_INVOICE: 'raiseInvoice'
} as const;

// Teams
export const TEAMS = {
  ADMINISTRATION: 'Administration',
  MANAGEMENT_TEAM: 'Management Team',
  CREATIVE_STRATEGY_TEAM: 'Creative Strategy Team',
  DESIGN_TEAM: 'Design Team',
  FINANCE_TEAM: 'Finance Team'
} as const;

// Levels
export const LEVELS = {
  L1: 'L1',
  L2: 'L2', 
  L3: 'L3'
} as const;