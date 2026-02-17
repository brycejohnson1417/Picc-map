import { Dispensary } from '../types';
import { integrationService } from './integrationService';

export const getSheetData = async (): Promise<Dispensary[]> => {
  try {
    const source = await integrationService.getSourceForModule('ppp_onboarding');
    if (!source || source.type !== 'sheets' || !source.targetId) {
      return [];
    }
    return await integrationService.getPrimaryDispensariesFromSheets();
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    return [];
  }
};
