export interface UserRecord {
  id: number;
  name: string;
  email: string;
  password: string;
}

// твій код тут: export type PublicUser = …
// твій код тут: export type UserPreview = …

export function toPublic(user: UserRecord): PublicUser {
  // твій код тут
}

export function toPreview(user: UserRecord): UserPreview {
  // твій код тут
}
