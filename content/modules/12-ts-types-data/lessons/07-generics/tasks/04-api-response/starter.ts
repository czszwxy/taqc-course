export interface ApiResponse<T> {
  status: number;
  data: T;
}

export const ERROR_STATUS = 400;

export function unwrap<T>(response: ApiResponse<T>): T {
  // твій код тут
}

// твій код тут: export function pluck<T, K extends keyof T>(…)
