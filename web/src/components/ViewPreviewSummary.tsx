import { Box, Text, VisuallyHidden } from '@mantine/core';
import { useTranslation } from 'react-i18next';

/** A readable counterpart to the non-interactive visual list/board preview. */
export function ViewPreviewSummary({ titles }: { titles: string[] }) {
  const { t } = useTranslation();
  return (
    <Box component="section" aria-label={t('viewBuilder.previewResults')} px="md" py="xs">
      <Text size="sm" fw={600} role="status">
        {t('viewBuilder.previewCount', { count: titles.length })}
      </Text>
      <VisuallyHidden>
        <ul>
          {titles.map((title, index) => (
            <li key={index}>{title}</li>
          ))}
        </ul>
      </VisuallyHidden>
    </Box>
  );
}
