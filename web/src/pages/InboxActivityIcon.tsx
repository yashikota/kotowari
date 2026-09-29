import {
  IconBell,
  IconCircleDot,
  IconInbox,
  IconMessage,
  IconPaperclip,
} from '@tabler/icons-react';

export function InboxActivityIcon({ action, size = 15 }: { action: string; size?: number }) {
  if (action.startsWith('cycle_issue_')) return <IconCircleDot size={size} aria-hidden />;
  if (action.startsWith('comment')) return <IconMessage size={size} aria-hidden />;
  if (action.includes('reaction')) return <IconBell size={size} aria-hidden />;
  if (action.startsWith('attachment_')) return <IconPaperclip size={size} aria-hidden />;
  if (action === 'status_changed') return <IconCircleDot size={size} aria-hidden />;
  return <IconInbox size={size} aria-hidden />;
}
