declare module 'express-validator' {
  export interface ValidationError {
    param: string;
    msg: string;
    value?: any;
    location?: string;
  }

  export function body(field: string): any;
  export function validationResult(req: any): { isEmpty: () => boolean; array: () => ValidationError[] };
  export function check(field: string): any;
  export function query(field: string): any;
  export function param(field: string): any;
  export function header(field: string): any;
  export function cookie(field: string): any;
} 