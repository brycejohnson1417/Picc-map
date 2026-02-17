import { IntegrationSource } from './types';

const NOTION_API_VERSION = '2022-06-28';

const getApiBase = (path: string) => `https://api.notion.com/v1${path}`;

const notionHeaders = () => {
  const notionToken = process.env.NOTION_API_KEY;
  if (!notionToken) {
    throw new Error('Missing NOTION_API_KEY environment variable.');
  }

  return {
    Authorization: `Bearer ${notionToken}`,
    'Notion-Version': NOTION_API_VERSION,
    'Content-Type': 'application/json'
  };
};

const notionFetch = async (path: string, options: RequestInit = {}): Promise<unknown> => {
  const response = await fetch(getApiBase(path), {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...notionHeaders()
    }
  });

  const text = await response.text();
  if (!response.ok) {
    const message = text || response.statusText;
    throw new Error(`Notion API error ${response.status}: ${message}`);
  }

  try {
    return text ? JSON.parse(text) : null;
  } catch (error) {
    throw new Error(`Unable to parse Notion response: ${(error as Error).message}`);
  }
};

export const notionSearchDatabases = async (): Promise<unknown[]> => {
  const data = (await notionFetch('/search', {
    method: 'POST',
    body: JSON.stringify({
      filter: { value: 'database', property: 'object' },
      sort: { direction: 'descending', timestamp: 'last_edited_time' }
    })
  })) as { results: unknown[] };

  return data?.results || [];
};

export const notionValidate = async (): Promise<{ name: string; workspaceName?: string; icon?: string }> => {
  const data = (await notionFetch('/users/me', { method: 'GET' })) as {
    name?: string;
    bot?: { owner?: { workspace?: { name?: string } } };
    avatar_url?: string;
  };

  return {
    name: data?.name || 'Notion Bot',
    workspaceName: data?.bot?.owner?.workspace?.name,
    icon: data?.avatar_url
  };
};

export const notionQueryDatabase = async (source: IntegrationSource, body: Record<string, unknown>): Promise<{ results: unknown[]; has_more: boolean; next_cursor: string | null }> => {
  if (!source.targetId) {
    throw new Error('Source does not have a target database ID configured.');
  }
  const endpoint = `/databases/${source.targetId}/query`;
  const payload = {
    page_size: 100,
    sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
    ...body
  };
  return (await notionFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(payload)
  })) as { results: unknown[]; has_more: boolean; next_cursor: string | null };
};

export const notionCreatePage = async (
  source: IntegrationSource,
  properties: Record<string, unknown>,
  content = 'Created via PICC integration.'
): Promise<string> => {
  if (!source.targetId) {
    throw new Error('Source does not have a target database ID configured.');
  }

  const body = {
    parent: { database_id: source.targetId },
    properties,
    children: [
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ text: { content } }]
        }
      }
    ]
  };

  const data = (await notionFetch('/pages', {
    method: 'POST',
    body: JSON.stringify(body)
  })) as { id?: string };

  if (!data?.id) {
    throw new Error('Notion response did not return a page id.');
  }

  return data.id;
};

export const notionUpdatePage = async (
  source: IntegrationSource,
  pageId: string,
  payload: Record<string, unknown>
): Promise<void> => {
  await notionFetch(`/pages/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
};
