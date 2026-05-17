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
    backgroundColor: '#eef0f3',
    borderColor: '#2f3a45',
  },
  whoever: {
    backgroundColor: '#e4f4ef',
    borderColor: '#00876c',
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
    color: '#1f2933',
  },
  whoever: {
    color: '#005f4c',
  },
  unknown: {
    color: '#475569',
  },
});
