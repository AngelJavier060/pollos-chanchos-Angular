export interface SystemError {
  type: string;
  message: string;
  details?: any;
}

export interface SystemHealth {
  auth: boolean;
  api: boolean;
  storage: boolean;
  details: {
    localStorage: any;
    tokens: any;
    apiStatus: any;
    errors: SystemError[];
  };
}
