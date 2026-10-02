import { Box, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import styles from './ViewPreviewSummary.module.css';

/** A readable counterpart to the non-interactive visual list/board preview. */
export function ViewPreviewSummary({ titles }: { titles: string[] }) {
  const { t } = useTranslation();
  return (
    <Box
      component="section"
      className={styles.summary}
      onKeyDown={(event) => {
        if (
          [
            'Enter',
            ' ',
            'ArrowUp',
            'ArrowDown',
            'ArrowLeft',
            'ArrowRight',
            'Home',
            'End',
            'PageUp',
            'PageDown',
          ].includes(event.key)
        )
          event.stopPropagation();
      }}
      aria-label={t('viewBuilder.previewResults')}
      px="md"
      py="xs"
    >
      <Text size="sm" fw={600} role="status">
        {t('viewBuilder.previewCount', { count: titles.length })}
      </Text>
      {titles.length > 0 ? (
        <Box component="details" mt="xs">
          <Text component="summary" size="sm" className={styles.disclosure}>
            {t('viewBuilder.reviewResults')}
          </Text>
          <Box
            tabIndex={0}
            role="region"
            aria-label={t('viewBuilder.resultTitles')}
            className={styles.results}
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
