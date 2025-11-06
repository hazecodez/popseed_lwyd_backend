export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RequestWithUser extends Request {
  user?: {
    id: string;
    email: string;
    organizationId: string;
    role: string;
  };
}

export type AsyncRequestHandler<T = any> = (
  req: any,
  res: any,
  next: any
) => Promise<T>;