import { NotionPage, NotionDatabase, NotionBot } from '../types';
import { MOCK_NOTION_PAGES } from '../constants';

export interface NotionResponse {
  docs: NotionPage[];
  error?: string;
  source: 'api' | 'mock';
}

/**
 * PROXY HELPER
 * Calls our own backend server (/api/notion) which forwards the request to Notion.
 */
const callNotionProxy = async (endpoint: string, method: string, body?: any, tokenOverride?: string) => {
  const apiKey = tokenOverride || localStorage.getItem('notion_api_key');
  
  if (!apiKey) {
    throw new Error("Missing Notion API Key");
  }

  // Build the Fetch Options Object safely
  const options: RequestInit = {
    method: method,
    headers: {
      'Content-Type': 'application/json',
      'X-Notion-Token': apiKey,
    },
  };

  // Only add body if it exists and method is not GET/HEAD to avoid TypeErrors
  if (body && method !== 'GET' && method !== 'HEAD') {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`/api/notion${endpoint}`, options);

    // Handle HTML responses (e.g. 404 from Vite if Proxy isn't working)
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") === -1) {
       // If it's not JSON, it's likely a Vite/Server error page
       throw new Error("Server not reachable. Please run 'node server.js' in a new terminal.");
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Proxy Error: ${response.status} ${response.statusText}`;
      
      // Try to parse clean error from JSON if possible
      try {
          const jsonErr = JSON.parse(errorText);
          // Notion usually returns { object: 'error', message: '...' }
          if (jsonErr.message) {
              errorMessage = jsonErr.message;
          } else if (jsonErr.error) {
              errorMessage = typeof jsonErr.error === 'string' ? jsonErr.error : JSON.stringify(jsonErr.error);
          }
      } catch (e) {
          // If parsing fails, use the raw text if it's short, otherwise generic error
          if (errorText && errorText.length < 200) {
              errorMessage = errorText;
          }
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (err: any) {
      // Handle Network Errors (Server down) specifically
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
          throw new Error("Cannot connect to server. Is 'node server.js' running?");
      }
      throw err;
  }
};

/**
 * Maps our internal app structure to the specific JSON schema required by Notion's API
 */
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

/**
 * Validates connection and returns Bot Info
 * Returns object with success status and data/error
 */
export const validateNotionToken = async (apiKey: string): Promise<{ success: boolean; bot?: NotionBot; error?: string }> => {
  try {
    const data = await callNotionProxy('/users/me', 'GET', undefined, apiKey);
    return {
      success: true,
      bot: {
        name: data.name,
        icon: data.avatar_url || '🤖',
        workspaceName: data.bot?.owner?.workspace ? 'Notion Workspace' : undefined 
      }
    };
  } catch (error: any) {
    console.error("Token Validation Error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * SEARCH DATABASES
 * Returns a list of all databases the integration has access to
 */
export const searchDatabases = async (apiKey: string): Promise<NotionDatabase[]> => {
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
        }, apiKey);

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

export const validateNotionConnection = async (apiKey: string, dbId: string): Promise<boolean> => {
  try {
    const response = await fetch(`/api/notion/databases/${dbId}`, {
      method: 'GET',
      headers: { 'X-Notion-Token': apiKey }
    });
    return response.ok;
  } catch (error) {
    console.error("Validation Error:", error);
    return false;
  }
};

/**
 * FETCH (READ): Queries the database
 */
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

  } catch (error: any) {
    console.error("Notion Sync Failed:", error);
    return { 
      docs: MOCK_NOTION_PAGES, 
      error: `Sync Failed: ${error.message}`,
      source: 'mock'
    };
  }
};

/**
 * CREATE: Creates a new page in the database
 */
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
  } catch (error: any) {
    console.error("Create Page Failed:", error);
    return { success: false, error: error.message };
  }
};

/**
 * UPDATE: Updates properties of an existing page
 */
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
