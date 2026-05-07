import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CalendarItem } from '../types/CalendarItem';

type InboxItemProps = {
  item: CalendarItem;
  onPress: (item: CalendarItem) => void;
};

export function InboxItem({ item, onPress }: InboxItemProps) {
  return (
    <Pressable accessibilityRole="button" onPress={() => onPress(item)} style={styles.card}>
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>未整理</Text>
        <Text style={styles.metaText}>{formatCreatedAt(item.createdAt)}</Text>
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.actionText}>整理する</Text>
    </Pressable>
  );
}

function formatCreatedAt(date: Date): string {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#d8ded9',
    borderRadius: 8,
    borderWidth: 1,
    gap: 9,
    padding: 14,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    color: '#205f4b',
    fontSize: 12,
    fontWeight: '800',
  },
  metaText: {
    color: '#68706b',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  title: {
    color: '#202124',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 23,
  },
  actionText: {
    color: '#205f4b',
    fontSize: 13,
    fontWeight: '800',
  },
});
