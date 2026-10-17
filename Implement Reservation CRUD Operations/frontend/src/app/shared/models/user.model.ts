export type UserRole = 'CUSTOMER' | 'ADMIN';

export interface User {
  id: number;
  email: string;
  displayName: string;
  role: UserRole;
  accessToken?: string;
}
