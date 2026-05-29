import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

type BadgeIconProps = {
  icon: string;
  color: string;
  size?: number;
};

export function BadgeIcon({ icon, color, size = 20 }: BadgeIconProps) {
  if (icon.startsWith('medal-')) {
    const num = icon.split('-')[1];
    const isGold = num === '100';
    const isSilver = num === '50';
    const medalColor = isGold ? '#eab308' : isSilver ? '#94a3b8' : '#d97706'; // Gold, Silver, Bronze

    return (
      <View style={[
        styles.medalContainer,
        {
          width: size * 1.6,
          height: size * 1.6,
          borderRadius: size * 0.8,
          backgroundColor: medalColor,
          shadowColor: medalColor,
        }
      ]}>
        <Text style={[styles.medalText, { fontSize: size * 0.55 }]}>{num}</Text>
      </View>
    );
  }

  if (icon.startsWith('V') || icon.startsWith('5.')) {
    return <Text style={[styles.textIcon, { color, fontSize: size * 0.7 }]}>{icon}</Text>;
  }

  // Known feather icon mapping fallback just in case
  const featherName = [
    'target', 'award', 'star', 'calendar', 'clock', 'activity',
    'aperture', 'layers', 'edit-2', 'message-circle', 'pie-chart',
    'users', 'flag', 'coffee', 'shield', 'trending-up', 'zap'
  ].includes(icon) ? icon : 'star';

  return <Feather name={featherName as any} size={size} color={color} />;
}

const styles = StyleSheet.create({
  medalContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowOpacity: 0.4,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  medalText: {
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  textIcon: {
    fontWeight: '900',
  },
});
