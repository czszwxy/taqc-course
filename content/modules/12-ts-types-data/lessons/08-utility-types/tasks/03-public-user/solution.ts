export interface UserRecord {
  id: number;
  name: string;
  email: string;
  password: string;
}

export type PublicUser = Omit<UserRecord, 'password'>;
export type UserPreview = Pick<UserRecord, 'id' | 'name'>;

export function toPublic(user: UserRecord): PublicUser {
  const { password, ...rest } = user;
  void password;
  return rest;
}

export function toPreview(user: UserRecord): UserPreview {
  return { id: user.id, name: user.name };
}
