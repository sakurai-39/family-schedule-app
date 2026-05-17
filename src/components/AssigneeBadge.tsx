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
    backgroundColor: '#e8f2ff',
    borderColor: '#005ab5',
  },
  partner: {
    backgroundColor: '#fff0e0',
    borderColor: '#d55e00',
  },
  both: {
    backgroundColor: '#f2f3f5',
    borderColor: '#111827',
  },
  whoever: {
    backgroundColor: '#e5f7f8',
    borderColor: '#007c89',
  },
  unknown: {
    backgroundColor: '#ffffff',
    borderColor: '#94a3b8',
  },
});

const labelStyles = StyleSheet.create({
  self: {
    color: '#004c99',
  },
  partner: {
    color: '#9f4300',
  },
  both: {
    color: '#111827',
  },
  whoever: {
    color: '#005a63',
  },
  unknown: {
    color: '#475569',
  },
});
