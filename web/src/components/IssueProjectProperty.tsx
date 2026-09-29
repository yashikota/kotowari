import { Box, Text } from '@mantine/core';
import { IconFolder } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { Issue, Project } from '../types.ts';
import styles from './IssuePropertiesPanel.module.css';
import { IssuePropertyRow, IssuePropertySelect } from './IssuePropertyControls.tsx';

export function IssueProjectProperty({
  issue,
  projects,
  onChange,
}: {
  issue: Issue;
  projects: Project[];
  onChange: (value: string | null) => void;
}) {
  const { t } = useTranslation();
  const projectValueLabel =
    projects.find((project) => project.id === issue.projectId)?.name ??
    t('issueProperties.addToProject');

  return (
    <Box
      role="group"
      aria-label={t('field.project')}
      className={`${styles.section} ${styles.projectSection}`}
    >
      <Text component="h3" className={styles.heading}>
        {t('field.project')}
      </Text>
      <IssuePropertyRow
        label={t('field.project')}
        icon={<IconFolder size={14} stroke={1.7} />}
        className={styles.projectRow}
      >
        <IssuePropertySelect
          compactChars={18}
          compactLabel={projectValueLabel}
          aria-label={t('field.project')}
          value={issue.projectId != null ? String(issue.projectId) : 'none'}
          onChange={onChange}
          data={[
            { value: 'none', label: t('issueProperties.addToProject') },
            ...projects.map((project) => ({ value: String(project.id), label: project.name })),
          ]}
          renderOption={({ option }) => (
            <span>{option.value === 'none' ? t('issueProperties.noProject') : option.label}</span>
          )}
          searchable
          nothingFoundMessage={t('issueProperties.noProjectsFound')}
        />
      </IssuePropertyRow>
    </Box>
  );
}
