import { StyleSheet, Text, View } from 'react-native';

export type AssigneeBadgeTone = 'self' | 'partner' | 'both' | 'whoever' | 'unknown';

type AssigneeBadgeProps = {
  label: string;
  tone: AssigneeBadgeTone;
};

export function AssigneeBadge({ label, tone }: AssigneeBadgeProps) {
  return (
    <View style={[styles.badge, toneStyles[tone]]}>
      <Text style={[styles.label, labelStyles[tone]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
});

const toneStyles = StyleSheet.create({
  self: {
    backgroundColor: '#e4f3ec',
    borderColor: '#8fc7aa',
  },
  partner: {
    backgroundColor: '#fde8ef',
    borderColor: '#eba6bd',
  },
  both: {
    backgroundColor: '#efe8ff',
    borderColor: '#b8a2e6',
  },
  whoever: {
    backgroundColor: '#fff3cf',
    borderColor: '#e2bd55',
  },
  unknown: {
    backgroundColor: '#edf0ef',
    borderColor: '#c4cbc7',
  },
});

const labelStyles = StyleSheet.create({
  self: {
    color: '#205f4b',
  },
  partner: {
    color: '#9a3154',
  },
  both: {
    color: '#60409f',
  },
  whoever: {
    color: '#765a09',
  },
  unknown: {
    color: '#555f59',
  },
});
