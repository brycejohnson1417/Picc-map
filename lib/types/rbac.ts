export const AppRoles = {
  ADMIN: 'ADMIN',
  OPS_TEAM: 'OPS_TEAM',
  SALES_REP: 'SALES_REP',
  FINANCE: 'FINANCE',
  BRAND_AMBASSADOR: 'BRAND_AMBASSADOR',
} as const;

export type AppRole = (typeof AppRoles)[keyof typeof AppRoles];
