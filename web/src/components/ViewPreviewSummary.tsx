import { Box, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';

/** A readable counterpart to the non-interactive visual list/board preview. */
export function ViewPreviewSummary({ titles }: { titles: string[] }) {
  const { t } = useTranslation();
  return (
    <Box component="section" aria-label={t('viewBuilder.previewResults')} px="md" py="xs">
      <Text size="sm" fw={600} role="status">
        {t('viewBuilder.previewCount', { count: titles.length })}
      </Text>
      {titles.length > 0 ? (
        <Box component="details" mt="xs">
          <Text component="summary" size="sm" style={{ cursor: 'pointer' }}>
            {t('viewBuilder.reviewResults')}
          </Text>
          <Box
            tabIndex={0}
            role="region"
            aria-label={t('viewBuilder.resultTitles')}
            mah={240}
            style={{ overflowY: 'auto', overflowWrap: 'anywhere' }}
          >
            <ul>
              {titles.map((title, index) => (
                <li key={index}>{title}</li>
              ))}
            </ul>
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}
