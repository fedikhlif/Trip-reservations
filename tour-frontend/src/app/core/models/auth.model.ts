export interface CustomerProfile {
  id: number;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'customer' | 'admin';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirm: string;
}
