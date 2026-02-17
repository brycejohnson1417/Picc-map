import { IntegrationModuleKey } from './types';

interface NotionPropertyValue {
  [name: string]: unknown;
}

interface NotionTextToken {
  plain_text?: unknown;
}

interface NotionSelectValue {
  name?: unknown;
}

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

export interface NotionCanonicalDoc {
  id: string;
  title: string;
  category?: string;
  tags?: string[];
  content?: string;
  syncStatus?: 'synced' | 'pending' | 'error' | 'local_only';
  notionUrl?: string;
  lastEdited?: string;
}

const safeText = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }
  return value;
};

const pickText = (propertyValue: NotionPropertyValue | undefined): string => {
  if (!propertyValue) {
    return '';
  }

  const titleValue = propertyValue as Record<string, unknown>;
  const titleItems = asArray(titleValue.title);
  const titleText = titleItems[0] as NotionTextToken | undefined;
  if (titleText && titleText.plain_text) {
    return safeText(titleText.plain_text);
  }

  const richTextItems = asArray(titleValue.rich_text);
  const richText = richTextItems[0] as NotionTextToken | undefined;
  if (richText?.plain_text) {
    return safeText(richText.plain_text);
  }

  const textValue = toRecord(titleValue.text);
  if (textValue.content) {
    return safeText(textValue.content);
  }

  return '';
};

const pickSelect = (propertyValue: NotionPropertyValue | undefined): string => {
  if (!propertyValue) {
    return '';
  }
  const value = toRecord(propertyValue.select);
  if (!value.name) {
    return '';
  }
  return safeText(value.name);
};

const pickMultiSelect = (propertyValue: NotionPropertyValue | undefined): string[] => {
  const values = asArray(propertyValue?.multi_select);
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .map((entry) => safeText((toRecord(entry).name as NotionSelectValue['name']) || ''))
    .filter(Boolean);
};

const resolveField = (mapping: Record<string, string>, key: string): string =>
  mapping[key] || key;

export const notionPageToCanonical = (
  module: IntegrationModuleKey,
  page: { [key: string]: unknown },
  propertyMap: Record<string, string> = {}
): NotionCanonicalDoc => {
  const properties = (page?.properties as Record<string, NotionPropertyValue>) || {};

  const titleField = resolveField(propertyMap, 'title');
  const categoryField = resolveField(propertyMap, 'category');
  const tagsField = resolveField(propertyMap, 'tags');
  const contentField = resolveField(propertyMap, 'content');

  const doc: NotionCanonicalDoc = {
    id: safeText(page.id),
    title: pickText(properties[titleField]),
    category: pickSelect(properties[categoryField]) || 'General',
    tags: pickMultiSelect(properties[tagsField]),
    content: pickText(properties[contentField]),
    notionUrl: safeText(page.url),
    lastEdited: safeText(page.last_edited_time),
    syncStatus: 'synced'
  };

  if (module !== 'wiki') {
    return {
      ...doc,
      category: doc.category || undefined,
      tags: doc.tags && doc.tags.length > 0 ? doc.tags : undefined
    };
  }

  return doc;
};

const asNotionProperty = (
  value: unknown,
  propertyType: 'title' | 'select' | 'multi_select' | 'rich_text'
): Record<string, unknown> | null => {
  if (propertyType === 'title') {
    if (!value) {
      return null;
    }
    return {
      title: [{ text: { content: String(value) } }]
    };
  }

  if (propertyType === 'select') {
    if (!value || !String(value).trim()) {
      return null;
    }
    return {
      select: { name: String(value) }
    };
  }

  if (propertyType === 'multi_select') {
    const tokens = Array.isArray(value)
      ? value.map((entry) => String(entry))
      : String(value || '').split(',').map((token) => token.trim()).filter(Boolean);
    return {
      multi_select: tokens.map((token) => ({ name: token }))
    };
  }

  return {
    rich_text: [{ text: { content: String(value || '') } }]
  };
};

export const canonicalToNotionProperties = (
  module: IntegrationModuleKey,
  canonical: Record<string, unknown>,
  propertyMap: Record<string, string> = {}
): Record<string, unknown> => {
  const titleField = resolveField(propertyMap, 'title');
  const categoryField = resolveField(propertyMap, 'category');
  const tagsField = resolveField(propertyMap, 'tags');
  const contentField = resolveField(propertyMap, 'content');

  const properties: Record<string, unknown> = {};

  if (module === 'wiki' || module === 'crm') {
    const titleProp = asNotionProperty(canonical.title, 'title');
    if (titleProp) {
      properties[titleField] = titleProp;
    }

    const categoryProp = asNotionProperty(canonical.category, 'select');
    if (categoryProp) {
      properties[categoryField] = categoryProp;
    }

    const tagsProp = asNotionProperty(canonical.tags, 'multi_select');
    if (tagsProp) {
      properties[tagsField] = tagsProp;
    }

    const contentProp = asNotionProperty(canonical.content, 'rich_text');
    if (contentProp) {
      properties[contentField] = contentProp;
    }
  } else {
    Object.entries(canonical).forEach(([key, value]) => {
      const notionField = resolveField(propertyMap, key);
      if (!notionField || value === undefined) {
        return;
      }
      properties[notionField] = asNotionProperty(value, 'rich_text');
    });
  }

  return properties;
};
