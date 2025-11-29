// Type declarations for auth.api.js

export interface SignupData {
  name: string;
  email: string;
  mobile: string;
  password: string;
  confirmPassword: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export function signupUser(data: SignupData): Promise<any>;
export function loginUser(data: LoginData): Promise<any>;
