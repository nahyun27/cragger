/**
 * 사용자 이름 옆에 붙는 대표 뱃지 아이콘.
 * 사용:
 *   <FeaturedBadgeChip badgeKey={author.featured_badge_key} size={14} />
 * badgeKey 가 null 이거나 알 수 없는 키면 아무것도 렌더하지 않음.
 */
import React from 'react';

import { BadgeIcon } from '@/components/ui/badge-icon';
import { BADGES_BY_KEY } from '@/constants/badges';

export function FeaturedBadgeChip({
  badgeKey,
  size = 14,
}: {
  badgeKey: string | null | undefined;
  size?: number;
}) {
  if (!badgeKey) return null;
  const badge = BADGES_BY_KEY[badgeKey];
  if (!badge) return null;
  return <BadgeIcon icon={badge.icon} color={badge.color} size={size} />;
}
