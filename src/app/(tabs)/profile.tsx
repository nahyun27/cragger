import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

function ColorChip({ colorClass, name }: { colorClass: string; name: string }) {
  return (
    <View className="flex-row items-center mb-2.5">
      <View className={`w-12 h-12 rounded-md border border-border-default mr-4 ${colorClass}`} />
      <Text className="text-text-primary text-base font-medium">{name}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-8">
      <Text className="text-brand-primary text-xl font-bold mb-4 border-b border-border-subtle pb-1">
        {title}
      </Text>
      {children}
    </View>
  );
}

export default function ProfileScreen() {
  const { session } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-background-primary" edges={['top']}>
      <ScrollView className="flex-1" contentContainerClassName="p-4">
        <View className="mb-8 p-4 bg-background-secondary rounded-md gap-3">
          <Text className="text-text-tertiary text-sm">로그인 계정</Text>
          <Text className="text-text-primary text-base">
            {session?.user.email ?? '—'}
          </Text>
          <Pressable
            onPress={() => supabase.auth.signOut()}
            className="border border-border-default rounded-md p-3 items-center self-start"
          >
            <Text className="text-text-primary">로그아웃</Text>
          </Pressable>
        </View>

        <Text className="text-text-primary text-3xl font-bold mb-6">Design Tokens</Text>

        <Section title="Background Colors">
          <ColorChip colorClass="bg-background-primary" name="Primary" />
          <ColorChip colorClass="bg-background-secondary" name="Secondary" />
          <ColorChip colorClass="bg-background-tertiary" name="Tertiary" />
        </Section>

        <Section title="Text Colors">
          <Text className="text-text-primary text-lg mb-2">Text Primary</Text>
          <Text className="text-text-secondary text-lg mb-2">Text Secondary</Text>
          <Text className="text-text-tertiary text-lg mb-2">Text Tertiary</Text>
          <Text className="text-text-muted text-lg mb-2">Text Muted</Text>
        </Section>

        <Section title="Border Colors">
          <View className="border border-border-default p-4 rounded-md mb-2">
            <Text className="text-text-primary">Border Default</Text>
          </View>
          <View className="border border-border-subtle p-4 rounded-md">
            <Text className="text-text-primary">Border Subtle</Text>
          </View>
        </Section>

        <Section title="Brand Colors">
          <ColorChip colorClass="bg-brand-primary" name="Brand Primary" />
          <ColorChip colorClass="bg-brand-accent" name="Brand Accent" />
        </Section>

        <Section title="Status Colors">
          <ColorChip colorClass="bg-status-success" name="Success" />
          <ColorChip colorClass="bg-status-warning" name="Warning" />
          <ColorChip colorClass="bg-status-danger" name="Danger" />
          <ColorChip colorClass="bg-status-info" name="Info" />
        </Section>

        <Section title="Climbing Colors">
          <ColorChip colorClass="bg-climb-colors-red" name="Red" />
          <ColorChip colorClass="bg-climb-colors-orange" name="Orange" />
          <ColorChip colorClass="bg-climb-colors-yellow" name="Yellow" />
          <ColorChip colorClass="bg-climb-colors-green" name="Green" />
          <ColorChip colorClass="bg-climb-colors-blue" name="Blue" />
          <ColorChip colorClass="bg-climb-colors-purple" name="Purple" />
          <ColorChip colorClass="bg-climb-colors-pink" name="Pink" />
          <ColorChip colorClass="bg-climb-colors-black" name="Black" />
          <ColorChip colorClass="bg-climb-colors-white" name="White" />
          <ColorChip colorClass="bg-climb-colors-gray" name="Gray" />
        </Section>

        <Section title="Typography (Size & Weight)">
          <Text className="text-text-primary text-xs font-normal mb-1">text-xs font-normal (12px)</Text>
          <Text className="text-text-primary text-sm font-medium mb-1">text-sm font-medium (14px)</Text>
          <Text className="text-text-primary text-base font-normal mb-1">text-base font-normal (16px)</Text>
          <Text className="text-text-primary text-lg font-semibold mb-1">text-lg font-semibold (18px)</Text>
          <Text className="text-text-primary text-xl font-bold mb-1">text-xl font-bold (20px)</Text>
          <Text className="text-text-primary text-2xl font-bold mb-1">text-2xl font-bold (24px)</Text>
          <Text className="text-text-primary text-3xl font-bold mb-1">text-3xl font-bold (30px)</Text>
        </Section>

        <Section title="Spacing Guide">
          <View className="flex-row items-end mb-2">
            <View className="bg-brand-accent w-1 h-0.5 mr-2" />
            <Text className="text-text-secondary text-xs">0.5 (2px)</Text>
          </View>
          <View className="flex-row items-end mb-2">
            <View className="bg-brand-accent w-3 h-1.5 mr-2" />
            <Text className="text-text-secondary text-xs">1.5 (6px)</Text>
          </View>
          <View className="flex-row items-end mb-2">
            <View className="bg-brand-accent w-5 h-2.5 mr-2" />
            <Text className="text-text-secondary text-xs">2.5 (10px)</Text>
          </View>
          <View className="flex-row items-end mb-2">
            <View className="bg-brand-accent w-8 h-4 mr-2" />
            <Text className="text-text-secondary text-xs">4 (16px)</Text>
          </View>
        </Section>

        <Section title="Border Radius Guide">
          <View className="flex-row flex-wrap gap-4">
            <View className="w-16 h-16 bg-brand-primary rounded-sm items-center justify-center">
              <Text className="text-background-primary text-xs">sm</Text>
            </View>
            <View className="w-16 h-16 bg-brand-primary rounded-md items-center justify-center">
              <Text className="text-background-primary text-xs">md</Text>
            </View>
            <View className="w-16 h-16 bg-brand-primary rounded-lg items-center justify-center">
              <Text className="text-background-primary text-xs">lg</Text>
            </View>
            <View className="w-16 h-16 bg-brand-primary rounded-xl items-center justify-center">
              <Text className="text-background-primary text-xs">xl</Text>
            </View>
            <View className="w-16 h-16 bg-brand-primary rounded-full items-center justify-center">
              <Text className="text-background-primary text-xs">full</Text>
            </View>
          </View>
        </Section>

        <Section title="Elevation (Custom Utility)">
          <View className="flex-row flex-wrap gap-4 p-2 pb-6">
            <View className="w-20 h-20 bg-background-primary rounded-md items-center justify-center elevation-sm">
              <Text className="text-text-primary text-xs">sm</Text>
            </View>
            <View className="w-20 h-20 bg-background-primary rounded-md items-center justify-center elevation-md">
              <Text className="text-text-primary text-xs">md</Text>
            </View>
            <View className="w-20 h-20 bg-background-primary rounded-md items-center justify-center elevation-lg">
              <Text className="text-text-primary text-xs">lg</Text>
            </View>
          </View>
        </Section>
        
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
