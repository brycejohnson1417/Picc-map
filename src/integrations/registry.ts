import { IntegrationModuleKey } from './types';

export type ModuleSourcePriority = 'notion' | 'sheets' | 'hybrid';

export interface ModuleSpec {
  key: IntegrationModuleKey;
  label: string;
  description: string;
  primarySource: ModuleSourcePriority;
  readOnly: boolean;
  syncStrategy: 'incremental' | 'polling';
}

export const INTEGRATION_MODULES: ModuleSpec[] = [
  {
    key: 'wiki',
    label: 'Knowledge Base',
    description: 'Internal documentation and operational notes in Notion.',
    primarySource: 'notion',
    readOnly: false,
    syncStrategy: 'incremental'
  },
  {
    key: 'ppp_onboarding',
    label: 'PPP Onboarding',
    description: 'Live onboarding status from Google Sheets.',
    primarySource: 'sheets',
    readOnly: true,
    syncStrategy: 'polling'
  },
  {
    key: 'work_orders',
    label: 'Work Orders',
    description: 'Order records (currently Notion-backed scaffold).',
    primarySource: 'notion',
    readOnly: false,
    syncStrategy: 'incremental'
  },
  {
    key: 'crm',
    label: 'CRM',
    description: 'CRM-style records in Notion.',
    primarySource: 'notion',
    readOnly: false,
    syncStrategy: 'incremental'
  },
  {
    key: 'vendor_days',
    label: 'Vendor Days',
    description: 'Vendor operations and availability schedules.',
    primarySource: 'notion',
    readOnly: false,
    syncStrategy: 'incremental'
  }
];

export const getModuleSpec = (key: IntegrationModuleKey): ModuleSpec | undefined =>
  INTEGRATION_MODULES.find((module) => module.key === key);
