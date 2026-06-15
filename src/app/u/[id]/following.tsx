import { useLocalSearchParams } from '@/lib/router';
import React from 'react';
import { FollowListScreen } from '@/components/follows/follow-list-screen';

export default function FollowingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <FollowListScreen userId={id} initialTab="following" />;
}
