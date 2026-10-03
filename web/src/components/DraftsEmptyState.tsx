import { Stack, Text } from '@mantine/core';

export function DraftsEmptyState({ message }: { message: string }) {
  return (
    <Stack
      component="section"
      data-testid="drafts-empty-state"
      align="center"
      justify="center"
      gap={10}
      style={{ flex: 1, minHeight: 0, width: '100%' }}
    >
      <svg
        data-testid="drafts-empty-illustration"
        aria-hidden="true"
        width="120"
        height="124"
        viewBox="0 0 120 124"
        fill="none"
        stroke="var(--mantine-color-text)"
        strokeWidth="1.25"
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ opacity: 0.82 }}
      >
        <path d="m17 69 48-14 36 18-49 15-35-19Z" opacity=".44" />
        <path d="M17 69v8l35 19 49-15v-8" opacity=".44" />
        <path d="m15 60 49-15 37 18-49 15L15 60Z" opacity=".62" />
        <path d="M15 60v8l37 19 49-15v-9" opacity=".62" />
        <path d="m17 35 45-14c3-1 6 0 8 3l19 23c2 3 1 6-2 8L53 69c-3 1-6 1-8-1L17 50c-4-3-4-11 0-15Z" />
        <path d="m24 39 36-11M29 46l34-10M35 52l27-9" />
        <path d="m66 42 35-35c2-2 5-1 6 1l3 4c1 2 1 4-1 6L74 53" />
        <path d="m66 42 8 11m35-41-8-7" />
      </svg>
      <Text size="sm" c="dimmed" ta="center">
        {message}
      </Text>
    </Stack>
  );
}
