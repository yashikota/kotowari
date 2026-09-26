import { describe, expect, it } from 'vite-plus/test';
import { convertTextEmoticons, defaultHomeHref, parsePersonalPreferences } from './preferences.ts';
import { sidebarNavigation } from './sidebar.ts';

describe('personal preferences', () => {
  it('falls back safely when stored settings are missing, malformed, or outdated', () => {
    expect(parsePersonalPreferences(null)).toEqual({
      defaultHome: 'home',
      fontSize: 'default',
      commentSubmitShortcut: 'modEnter',
      sidebarLocations: {
        '/': 'primary',
        '/inbox': 'primary',
        '/reminders': 'more',
        '/my-issues': 'primary',
        '/agent': 'primary',
        '/issues': 'primary',
        '/board': 'more',
        '/cycles': 'primary',
        '/projects': 'primary',
        '/initiatives': 'primary',
        '/adrs': 'more',
        '/pages': 'more',
        '/templates': 'more',
        '/recurring': 'more',
      },
      sidebarOrder: [
        '/',
        '/inbox',
        '/reminders',
        '/my-issues',
        '/agent',
        '/issues',
        '/board',
        '/cycles',
        '/projects',
        '/initiatives',
        '/adrs',
        '/pages',
        '/templates',
        '/recurring',
      ],
      convertEmoticons: true,
      underlineLinks: false,
      pointerCursors: false,
    });
    expect(parsePersonalPreferences('{')).toEqual(parsePersonalPreferences(null));
    expect(
      parsePersonalPreferences(
        JSON.stringify({ defaultHome: '/inbox', fontSize: 'huge', commentSubmitShortcut: 'space' }),
      ),
    ).toEqual(parsePersonalPreferences(null));
  });

  it('keeps valid settings and maps the chosen home view to a route', () => {
    expect(
      parsePersonalPreferences(
        JSON.stringify({
          defaultHome: 'cycles',
          fontSize: 'large',
          commentSubmitShortcut: 'enter',
        }),
      ),
    ).toMatchObject({ defaultHome: 'cycles', fontSize: 'large', commentSubmitShortcut: 'enter' });
    expect(defaultHomeHref('home')).toBe('/');
    expect(defaultHomeHref('agent')).toBe('/agent');
    expect(defaultHomeHref('issues')).toBe('/issues');
  });

  it('moves sidebar entries between primary and More and preserves their order', () => {
    const preferences = parsePersonalPreferences(null);
    preferences.sidebarLocations['/projects'] = 'more';
    preferences.sidebarLocations['/adrs'] = 'primary';
    preferences.sidebarOrder = [
      '/adrs',
      ...preferences.sidebarOrder.filter((id) => id !== '/adrs'),
    ];

    const navigation = sidebarNavigation(preferences);
    expect(navigation.workspace.map((item) => item.to)).toContain('/cycles');
    expect(navigation.workspace.map((item) => item.to)).not.toContain('/board');
    expect(navigation.more.map((item) => item.to)).toContain('/board');
    expect(navigation.workspace.map((item) => item.to)).toContain('/adrs');
    expect(navigation.workspace.map((item) => item.to)).not.toContain('/projects');
    expect(navigation.more.map((item) => item.to)).toContain('/projects');
    expect(navigation.workspace[0]?.to).toBe('/adrs');
  });

  it('converts text emoticons without changing ordinary URL punctuation', () => {
    expect(convertTextEmoticons('Great :) nice ;-) love <3!')).toBe('Great 🙂 nice 😉 love ❤️!');
    expect(convertTextEmoticons('See https://example.com/a:b')).toBe('See https://example.com/a:b');
  });
});
