import {
  IconBolt,
  IconBookmark,
  IconBug,
  IconCalendar,
  IconChartBar,
  IconCircle,
  IconFlag,
  IconList,
  IconRocket,
  IconSparkles,
  IconStar,
  IconTarget,
} from '@tabler/icons-react';
import type { ViewIconName } from '../types.ts';

const VIEW_ICON_COMPONENTS = {
  list: IconList,
  circle: IconCircle,
  bolt: IconBolt,
  target: IconTarget,
  bug: IconBug,
  rocket: IconRocket,
  bookmark: IconBookmark,
  flag: IconFlag,
  star: IconStar,
  sparkles: IconSparkles,
  chart: IconChartBar,
  calendar: IconCalendar,
} satisfies Record<ViewIconName, typeof IconList>;

export function ViewIcon({ name, size = 16 }: { name?: string; size?: number }) {
  const Icon = VIEW_ICON_COMPONENTS[(name as ViewIconName) ?? 'list'] ?? IconList;
  return <Icon size={size} stroke={1.7} aria-hidden="true" />;
}

export const VIEW_ICON_NAMES = Object.keys(VIEW_ICON_COMPONENTS) as ViewIconName[];
