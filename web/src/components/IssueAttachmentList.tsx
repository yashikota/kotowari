import { ActionIcon, Anchor, Box, Group, Image, Stack, Text } from '@mantine/core';
import { IconPaperclip, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { CommentAttachment } from '../types.ts';

export function formatAttachmentSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let size = bytes / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unit]}`;
}

export function IssueAttachmentList({
  identifier,
  attachments,
  onRemove,
}: {
  identifier: string;
  attachments: CommentAttachment[];
  onRemove?: (id: string) => void;
}) {
  const { t } = useTranslation();
  if (attachments.length === 0) return null;
  return (
    <Stack gap="xs">
      {attachments.map((attachment) => {
        const src = `/api/issues/${encodeURIComponent(identifier)}/attachments/${encodeURIComponent(attachment.id)}`;
        const mediaType = attachment.mediaType.split(';')[0];
        const isPreviewImage = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(
          mediaType,
        );
        const isPreviewVideo = ['video/mp4', 'video/webm'].includes(mediaType);
        const content = isPreviewImage ? (
          <Anchor
            href={src}
            target="_blank"
            rel="noreferrer"
            aria-label={t('issueAttachments.imagePreview', { name: attachment.name })}
            style={{ width: 'fit-content', maxWidth: '100%' }}
          >
            <Image src={src} alt={attachment.name} maw={420} mah={320} fit="contain" radius="sm" />
          </Anchor>
        ) : isPreviewVideo ? (
          <Box
            component="video"
            src={src}
            controls
            preload="metadata"
            aria-label={attachment.name}
            style={{ maxWidth: 'min(100%, 420px)', maxHeight: 320 }}
          />
        ) : (
          <Anchor href={src} download={attachment.name} style={{ width: 'fit-content' }}>
            <Group gap="xs" wrap="nowrap">
              <IconPaperclip size={16} aria-hidden="true" />
              <Text size="sm">{attachment.name}</Text>
              <Text size="xs" c="dimmed">
                {t('issueAttachments.fileSize', { size: formatAttachmentSize(attachment.size) })}
              </Text>
            </Group>
          </Anchor>
        );
        return (
          <Group key={attachment.id} gap="xs" wrap="nowrap" align="flex-start">
            {content}
            {onRemove ? (
              <ActionIcon
                type="button"
                variant="subtle"
                color="gray"
                size="sm"
                aria-label={t('issueAttachments.removeIssueAttachment', {
                  name: attachment.name,
                })}
                onClick={() => onRemove(attachment.id)}
              >
                <IconTrash size={14} aria-hidden="true" />
              </ActionIcon>
            ) : null}
          </Group>
        );
      })}
    </Stack>
  );
}
