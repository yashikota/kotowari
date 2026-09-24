import { useCallback, useEffect, useState } from 'react';
import type { Issue } from './types.ts';
import {
  DEFAULT_CODING_PROMPT_TEMPLATE,
  issueBranchName,
  renderIssuePrompt,
} from './issue-actions.ts';

export const CODING_TOOLS_KEY = 'kotowari.coding-tools.v1';
export const CODING_TOOLS_EVENT = 'kotowari:coding-tools-changed';
export type CodingToolPreferences = {
  promptTemplate: string;
  customLinkEnabled: boolean;
  customLinkName: string;
  customLinkURL: string;
};

export const DEFAULT_CODING_TOOL_PREFERENCES: CodingToolPreferences = {
  promptTemplate: DEFAULT_CODING_PROMPT_TEMPLATE,
  customLinkEnabled: false,
  customLinkName: 'Custom link',
  customLinkURL: '',
};

export function parseCodingToolPreferences(value: string | null): CodingToolPreferences {
  if (!value) return { ...DEFAULT_CODING_TOOL_PREFERENCES };
  try {
    const parsed = JSON.parse(value) as Partial<CodingToolPreferences>;
    return {
      promptTemplate:
        typeof parsed.promptTemplate === 'string' && parsed.promptTemplate.length <= 10000
          ? parsed.promptTemplate
          : DEFAULT_CODING_PROMPT_TEMPLATE,
      customLinkEnabled:
        typeof parsed.customLinkEnabled === 'boolean' ? parsed.customLinkEnabled : false,
      customLinkName:
        typeof parsed.customLinkName === 'string' && parsed.customLinkName.trim()
          ? parsed.customLinkName.trim().slice(0, 100)
          : DEFAULT_CODING_TOOL_PREFERENCES.customLinkName,
      customLinkURL:
        typeof parsed.customLinkURL === 'string' && parsed.customLinkURL.length <= 2048
          ? parsed.customLinkURL.trim()
          : '',
    };
  } catch {
    return { ...DEFAULT_CODING_TOOL_PREFERENCES };
  }
}

export function getCodingToolPreferences(): CodingToolPreferences {
  if (typeof window === 'undefined') return { ...DEFAULT_CODING_TOOL_PREFERENCES };
  try {
    return parseCodingToolPreferences(window.localStorage.getItem(CODING_TOOLS_KEY));
  } catch {
    return { ...DEFAULT_CODING_TOOL_PREFERENCES };
  }
}

export function saveCodingToolPreferences(
  changes: Partial<CodingToolPreferences>,
): CodingToolPreferences {
  const next = parseCodingToolPreferences(
    JSON.stringify({ ...getCodingToolPreferences(), ...changes }),
  );
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(CODING_TOOLS_KEY, JSON.stringify(next));
    } catch {
      // Keep the current page usable if browser storage is unavailable.
    }
    window.dispatchEvent(new Event(CODING_TOOLS_EVENT));
  }
  return next;
}

export function useCodingToolPreferences() {
  const [preferences, setPreferences] = useState(getCodingToolPreferences);
  useEffect(() => {
    const refresh = () => setPreferences(getCodingToolPreferences());
    window.addEventListener(CODING_TOOLS_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(CODING_TOOLS_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);
  const update = useCallback((changes: Partial<CodingToolPreferences>) => {
    const next = saveCodingToolPreferences(changes);
    setPreferences(next);
    return next;
  }, []);
  return { preferences, update };
}

export function buildCodingToolURL(
  issue: Issue,
  settings: CodingToolPreferences,
  issueURL: string,
): string | null {
  if (!settings.customLinkEnabled || !isWebCodingToolURLTemplate(settings.customLinkURL))
    return null;
  const prompt = renderIssuePrompt(issue, settings.promptTemplate, issueURL);
  const variables: Record<string, string> = {
    prompt,
    'issue.identifier': issue.identifier,
    'issue.title': issue.title,
    'issue.branchName': issueBranchName(issue),
  };
  const populated = settings.customLinkURL.replace(
    /\{\{\s*([^{}]+?)\s*\}\}/g,
    (_match, key: string) => encodeURIComponent(variables[key] ?? ''),
  );
  try {
    const url = new URL(populated);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

export function isWebCodingToolURLTemplate(value: string): boolean {
  if (!value.trim() || value.length > 2048) return false;
  const sample = value.replace(/\{\{\s*[^{}]+?\s*\}\}/g, 'placeholder');
  try {
    const url = new URL(sample);
    return (url.protocol === 'http:' || url.protocol === 'https:') && !/{{|}}/.test(sample);
  } catch {
    return false;
  }
}
