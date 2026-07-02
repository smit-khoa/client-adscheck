// Auth & User types
export interface User {
  id: string;
  email?: string;
  name?: string;
  role?: string;
  balance?: number;
  email_verified?: boolean;
  language?: string;
  phone?: string;
  phone_country?: string;
  phone_number?: string;
  phone_verified?: boolean;
}

export interface AuthenticationResponse {
  isLogin?: boolean;
  last_visit?: string;
  user?: User | null;
}

export interface AdscheckFeature {
  id?: string | number;
  code?: string;
  name?: string;
  has_expired?: boolean;
  usable?: boolean;
  [key: string]: unknown;
}

export interface AdscheckManager {
  success?: boolean;
  session_actived?: boolean;
  session_limited?: number;
  session_used?: number;
  features?: AdscheckFeature[];
  message?: string;
  subcode?: string;
  [key: string]: unknown;
}

export interface AdscheckAuthResponse extends AdscheckManager {
  features: AdscheckFeature[];
}

export interface AdscheckProductResponse {
  success?: boolean;
  message?: string;
  [key: string]: unknown;
}

export interface ActivateSessionResponse {
  success?: boolean;
  message?: string;
  [key: string]: unknown;
}

// Remote app status
export type RemoteStatus = 'idle' | 'loading' | 'ready' | 'error';
