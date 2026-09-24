import { describe, expect, it } from 'vite-plus/test';
import {
  DEFAULT_CODING_TOOL_PREFERENCES,
  buildCodingToolURL,
  isWebCodingToolURLTemplate,
  parseCodingToolPreferences,
} from './coding-tools.ts';
import { renderIssuePrompt } from './issue-actions.ts';
import type { Issue } from './types.ts';

const issue: Issue = {
  id: 1,
  number: 1,
  identifier: 'KOT-1',
  title: 'Improve navigation',
  body: 'Keep the selected issue visible.',
  status: 'in_progress',
  priority: 2,
  projectId: null,
  milestoneId: null,
  cycleId: null,
  parentId: null,
  depth: 0,
  dueDate: null,
  reminderAt: null,
  sortOrder: 1,
  labels: [],
  adrNumbers: [],
  externalLinks: [],
  relations: [],
  isFavorite: false,
  createdAt: '',
  updatedAt: '',
  completedAt: null,
};

describe('coding tool preferences and issue links', () => {
  it('defaults safely and ignores invalid or oversized settings', () => {
    expect(parseCodingToolPreferences(null)).toEqual(DEFAULT_CODING_TOOL_PREFERENCES);
    expect(parseCodingToolPreferences('{')).toEqual(DEFAULT_CODING_TOOL_PREFERENCES);
    expect(
      parseCodingToolPreferences(
        JSON.stringify({
          promptTemplate: 'x'.repeat(10001),
          customLinkEnabled: 'yes',
          customLinkName: '  Cursor  ',
          customLinkURL: 'javascript:alert(1)',
        }),
      ),
    ).toMatchObject({
      promptTemplate: DEFAULT_CODING_TOOL_PREFERENCES.promptTemplate,
      customLinkEnabled: false,
      customLinkName: 'Cursor',
      customLinkURL: 'javascript:alert(1)',
    });
  });

  it('renders Linear-compatible issue prompt placeholders', () => {
    const prompt = renderIssuePrompt(
      issue,
      '{{issue.identifier}} — {{issue.title}}\n{{issue.branchName}}\n{{context}}',
      'https://kotowari.test/issues/KOT-1',
    );
    expect(prompt).toContain('KOT-1 — Improve navigation');
    expect(prompt).toContain('kot-1-improve-navigation');
    expect(prompt).toContain('Keep the selected issue visible.');
    expect(prompt).toContain('Status: in_progress');
  });

  it('requires a web URL and safely encodes the issue prompt into custom links', () => {
    expect(isWebCodingToolURLTemplate('https://agent.example/run?prompt={{prompt}}')).toBe(true);
    expect(isWebCodingToolURLTemplate('javascript:alert(1)')).toBe(false);
    expect(isWebCodingToolURLTemplate('//agent.example/run')).toBe(false);
    const url = buildCodingToolURL(
      issue,
      {
        ...DEFAULT_CODING_TOOL_PREFERENCES,
        customLinkEnabled: true,
        customLinkName: 'Web agent',
        customLinkURL: 'https://agent.example/run?prompt={{prompt}}&issue={{issue.identifier}}',
      },
      'https://kotowari.test/issues/KOT-1',
    );
    expect(url).toContain('https://agent.example/run?prompt=');
    expect(url).toContain('&issue=KOT-1');
    expect(new URL(url!).searchParams.get('prompt')).toContain('Work on Linear issue KOT-1:');
    expect(
      buildCodingToolURL(
        issue,
        {
          ...DEFAULT_CODING_TOOL_PREFERENCES,
          customLinkEnabled: true,
          customLinkURL: 'javascript:alert({{prompt}})',
        },
        'https://kotowari.test/issues/KOT-1',
      ),
    ).toBeNull();
  });
});
