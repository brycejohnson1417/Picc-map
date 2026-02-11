import { NotionPage, NotionDatabase, NotionBot } from '../types';
import { MOCK_NOTION_PAGES } from '../constants';

export interface NotionResponse {
  docs: NotionPage[];
  error?: string;
  source: 'api' | 'mock';
}

const callNotionProxy = async (endpoint: string, method: string, body?: any) => {
  const options: RequestInit = {
    method: method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body && method !== 'GET' && method !== 'HEAD') {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`/api/notion${endpoint}`, options);

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") === -1) {
      throw new Error("Received non-JSON response. Ensure your Vercel deployment has NOTION_API_KEY set.");
    }

    if (!response.ok) {
      const errorText = await response.text();
      try {
        const jsonErr = JSON.parse(errorText);
        throw new Error(`Notion API Error: ${jsonErr.message || jsonErr.error || response.statusText}`);
      } catch (e) {
        throw new Error(`Proxy Error: ${response.status} ${errorText}`);
      }
    }

    return await response.json();
  } catch (err) {
    throw err;
  }
};

const mapInternalToNotionProperties = (page: Partial<NotionPage>) => {
  const properties: any = {};

  if (page.title) {
    properties['Name'] = {
      title: [{ text: { content: page.title } }]
    };
  }

  if (page.category) {
    properties['Category'] = {
      select: { name: page.category }
    };
  }

  if (page.tags) {
    properties['Tags'] = {
      multi_select: page.tags.map(tag => ({ name: tag }))
    };
  }

  return properties;
};

export const validateNotionToken = async (): Promise<NotionBot | null> => {
  try {
    const data = await callNotionProxy('/users/me', 'GET');
    return {
      name: data.name,
      icon: data.avatar_url || '🤖',
      workspaceName: data.bot?.owner?.workspace ? 'Notion Workspace' : undefined
    };
  } catch (error) {
    console.error("Token Validation Error:", error);
    return null;
  }
};

export const searchDatabases = async (): Promise<NotionDatabase[]> => {
  try {
    const data = await callNotionProxy('/search', 'POST', {
      filter: {
        value: 'database',
        property: 'object'
      },
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time'
      }
    });

    return data.results.map((db: any) => ({
      id: db.id,
      title: db.title?.[0]?.plain_text || 'Untitled Database',
      icon: db.icon?.emoji || '📅',
      url: db.url,
      lastEdited: db.last_edited_time
    }));
  } catch (error) {
    console.error("Database Search Error:", error);
    return [];
  }
};

export const validateNotionConnection = async (dbId: string): Promise<boolean> => {
  try {
    const response = await fetch(`/api/notion/databases/${dbId}`, {
      method: 'GET',
    });
    return response.ok;
  } catch (error) {
    console.error("Validation Error:", error);
    return false;
  }
};

export const getNotionDocs = async (): Promise<NotionResponse> => {
  const dbId = localStorage.getItem('notion_db_id');

  if (!dbId) {
    return { docs: MOCK_NOTION_PAGES, source: 'mock' };
  }

  try {
    const data = await callNotionProxy(`/databases/${dbId}/query`, 'POST', {
      page_size: 100,
      sorts: [{ property: 'Last Edited', direction: 'descending' }]
    });

    const docs: NotionPage[] = data.results.map((page: any) => ({
      id: page.id,
      title: page.properties?.Name?.title?.[0]?.plain_text || 'Untitled Page',
      category: page.properties?.Category?.select?.name || 'General',
      icon: page.icon?.emoji || '📄',
      lastEdited: page.last_edited_time ? new Date(page.last_edited_time).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      content: "Content loaded via Notion API",
      tags: page.properties?.Tags?.multi_select?.map((t: any) => t.name) || [],
      syncStatus: 'synced',
      notionUrl: page.url
    }));

    return { docs, source: 'api' };

  } catch (error) {
    console.error("Notion Sync Failed:", error);
    return {
      docs: MOCK_NOTION_PAGES,
      error: `Sync Failed: ${(error as Error).message}`,
      source: 'mock'
    };
  }
};

export const createNotionPage = async (page: Partial<NotionPage>): Promise<{ success: boolean; id?: string; error?: string }> => {
  const dbId = localStorage.getItem('notion_db_id');
  if (!dbId) return { success: false, error: 'Missing Database ID' };

  const payload = {
    parent: { database_id: dbId },
    icon: { emoji: page.icon || "🆕" },
    properties: mapInternalToNotionProperties(page),
    children: [
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ text: { content: page.content || "New content created via PICC Platform." } }]
        }
      }
    ]
  };

  try {
    const data = await callNotionProxy('/pages', 'POST', payload);
    return { success: true, id: data.id };
  } catch (error) {
    console.error("Create Page Failed:", error);
    return { success: false, error: (error as Error).message };
  }
};

export const updateNotionPage = async (id: string, updates: Partial<NotionPage>): Promise<boolean> => {
  const payload = {
    properties: mapInternalToNotionProperties(updates),
    icon: updates.icon ? { emoji: updates.icon } : undefined
  };

  try {
    await callNotionProxy(`/pages/${id}`, 'PATCH', payload);
    return true;
  } catch (error) {
    console.error("Update Page Failed:", error);
    return false;
  }
};
