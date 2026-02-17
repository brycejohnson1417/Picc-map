import { MOCK_NOTION_PAGES } from '../constants';
import { NotionPage, NotionDatabase, NotionBot, SyncStatus } from '../types';
import { IntegrationModuleKey } from '../integrations/types';
import { integrationService } from './integrationService';

export interface NotionResponse {
  docs: NotionPage[];
  error?: string;
  source: 'api' | 'mock';
}

const safeCryptoId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const validateNotionToken = async (): Promise<NotionBot | null> => {
  try {
    const config = await integrationService.getConfig();
    const source = config.sources.find((source) => source.type === 'notion' && source.isActive);
    if (!source) {
      return null;
    }
    const result = await integrationService.notionValidate(source.id);
    return {
      name: result.name || 'Notion Integration',
      icon: result.icon || '🤖',
      workspaceName: result.workspaceName
    };
  } catch (error) {
    console.error('Notion validation failed:', error);
    return null;
  }
};

export const searchDatabases = async (): Promise<NotionDatabase[]> => {
  try {
    const config = await integrationService.getConfig();
    const source = config.sources.find((entry) => entry.type === 'notion' && entry.isActive);
    if (!source) {
      return [];
    }
    const entries = await integrationService.notionListDatabases(source.id);
    return entries.map((entry) => ({
      id: entry.id,
      title: entry.title || entry.id,
      icon: '🗂️',
      url: entry.url,
      lastEdited: entry.lastEdited || new Date().toISOString()
    }));
  } catch (error) {
    console.error('Notion database search error:', error);
    return [];
  }
};

export const validateNotionConnection = async (dbId: string): Promise<boolean> => {
  try {
    const modules = await integrationService.getConfig();
    const source = modules.sources.find((entry) => entry.type === 'notion' && entry.id === dbId) || modules.sources.find((entry) => entry.type === 'notion');
    if (!source || !source.targetId) {
      return false;
    }
    await integrationService.notionQuery(source.id, {
      module: 'wiki' as IntegrationModuleKey,
      page_size: 1,
      filterAfter: undefined
    });
    return true;
  } catch (error) {
    console.error('validateNotionConnection error', error);
    return false;
  }
};

export const getNotionDocs = async (): Promise<NotionResponse> => {
  try {
    const config = await integrationService.getConfig();
    const source = config.sources.find((entry) => entry.type === 'notion' && entry.isActive);
    if (!source || source.module !== 'wiki') {
      return { docs: MOCK_NOTION_PAGES, source: 'mock' };
    }

    const response = await integrationService.notionQuery(source.id, { module: 'wiki' });
    const docs = response.results.map((entry) => ({
      id: entry.id,
      title: entry.title,
      category: (entry.category as NotionPage['category']) || 'General',
      icon: '📄',
      tags: entry.tags || [],
      content: entry.content || 'No content.',
      syncStatus: 'synced' as SyncStatus,
      notionUrl: entry.notionUrl,
      lastEdited: entry.lastEdited || new Date().toISOString().split('T')[0]
    }));

    if (docs.length === 0) {
      return {
        docs: [],
        source: 'api'
      };
    }

    return {
      docs,
      source: 'api'
    };
  } catch (error) {
    console.error('Notion sync failed:', error);
    return {
      docs: MOCK_NOTION_PAGES,
      source: 'mock',
      error: `Sync Failed: ${(error as Error).message}`
    };
  }
};

export const createNotionPage = async (
  page: Partial<NotionPage>
): Promise<{ success: boolean; id?: string; error?: string }> => {
  try {
    const config = await integrationService.getConfig();
    const source = config.sources.find((entry) => entry.type === 'notion' && entry.isActive && entry.module === 'wiki');
    if (!source) {
      return { success: false, error: 'Missing notion source for wiki module.' };
    }

    const result = (await integrationService.notionCreatePage(
      source.id,
      'wiki',
      page,
      safeCryptoId()
    )) as { id?: string; pageId?: string };

    return { success: true, id: result.id || result.pageId || undefined };
  } catch (error) {
    console.error('Create Notion page failed:', error);
    return { success: false, error: (error as Error).message };
  }
};

export const updateNotionPage = async (id: string, updates: Partial<NotionPage>): Promise<boolean> => {
  try {
    const config = await integrationService.getConfig();
    const source = config.sources.find((entry) => entry.type === 'notion' && entry.isActive && entry.module === 'wiki');
    if (!source) {
      return false;
    }
    await integrationService.notionUpdatePage(source.id, id, 'wiki', updates, safeCryptoId());
    return true;
  } catch (error) {
    console.error('Update Notion page failed:', error);
    return false;
  }
};

export const getNotionDocsForModule = async (module: IntegrationModuleKey): Promise<NotionPage[]> => {
  const source = (await integrationService.getConfig()).sources.find(
    (entry) => entry.type === 'notion' && entry.isActive && entry.module === module
  );
  if (!source) {
    return [];
  }
  const response = await integrationService.notionQuery(source.id, { module });
  return response.results.map((entry) => ({
    id: entry.id,
    title: entry.title,
    category: (entry.category as NotionPage['category']) || 'General',
    tags: entry.tags || [],
    content: entry.content || '',
    icon: '📄',
    notionUrl: entry.notionUrl,
    lastEdited: entry.lastEdited || new Date().toISOString().split('T')[0],
    syncStatus: 'synced'
  }));
};
