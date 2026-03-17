export type ApiResponse<T> = {
  data: T | null
  error: string | null
}

export type PaginatedResponse<T> = {
  data: T[]
  count: number
  page: number
  pageSize: number
}

export type UserRole = 'owner' | 'manager' | 'staff'