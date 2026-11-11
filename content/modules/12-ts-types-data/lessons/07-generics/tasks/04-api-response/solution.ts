export interface ApiResponse<T> {
  status: number;
  data: T;
}

export const ERROR_STATUS = 400;

export function unwrap<T>(response: ApiResponse<T>): T {
  if (response.status >= ERROR_STATUS) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.data;
}

export function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {
  return items.map((item) => item[key]);
}
