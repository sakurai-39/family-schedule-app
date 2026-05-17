import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CalendarItem } from '../types/CalendarItem';
import { AssigneeBadge, AssigneeBadgeTone } from './AssigneeBadge';
import { formatTaskTargetPeriod } from '../utils/taskTargetPeriod';

type CalendarItemCardProps = {
  item: CalendarItem;
  assigneeLabel: string;
  assigneeTone: AssigneeBadgeTone;
  onToggleCompleted: (item: CalendarItem) => Promise<void> | void;
  onPress?: (item: CalendarItem) => void;
  isUpdating?: boolean;
};

export function CalendarItemCard({
  item,
  assigneeLabel,
  assigneeTone,
  onToggleCompleted,
  onPress,
  isUpdating = false,
}: CalendarItemCardProps) {
  const itemKindLabel = item.type === 'event' ? '予定' : 'タスク';
  const timeLabel = formatItemTime(item);
  const targetPeriodLabel = getTargetPeriodLabel(item);

  return (
    <View
      style={[
        styles.card,
        item.type === 'event' ? styles.eventCard : item.dueAt ? styles.taskCard : styles.todoCard,
        item.isCompleted && styles.completedCard,
      ]}
    >
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.isCompleted, disabled: isUpdating }}
        disabled={isUpdating}
        onPress={() => onToggleCompleted(item)}
        style={[styles.checkbox, item.isCompleted && styles.checkboxChecked]}
      >
        <Text style={styles.checkboxText}>{item.isCompleted ? '✓' : ''}</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        disabled={!onPress}
        onPress={() => onPress?.(item)}
        style={styles.body}
      >
        <View style={styles.metaRow}>
          <Text style={styles.kindLabel}>{itemKindLabel}</Text>
          {timeLabel ? <Text style={styles.timeLabel}>{timeLabel}</Text> : null}
          {targetPeriodLabel ? <Text style={styles.timeLabel}>{targetPeriodLabel}</Text> : null}
        </View>
        <Text style={[styles.title, item.isCompleted && styles.completedTitle]}>{item.title}</Text>
        {item.memo ? <Text style={styles.memo}>{item.memo}</Text> : null}
        <AssigneeBadge label={assigneeLabel} tone={assigneeTone} />
      </Pressable>
    </View>
  );
}

function getTargetPeriodLabel(item: CalendarItem): string | null {
  if (item.type !== 'task' || item.dueAt !== null) return null;
  const label = formatTaskTargetPeriod(item.targetPeriod);
  return label && label !== '目安なし' ? `目安 ${label}` : null;
}

function formatItemTime(item: CalendarItem): string | null {
  const date = item.startAt ?? item.dueAt;
  if (!date) return null;

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#d8ded9',
    borderLeftWidth: 5,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  eventCard: {
    borderLeftColor: '#cfd6d1',
  },
  taskCard: {
    borderLeftColor: '#cfd6d1',
  },
  todoCard: {
    borderLeftColor: '#cfd6d1',
  },
  completedCard: {
    opacity: 0.62,
  },
  checkbox: {
    alignItems: 'center',
    borderColor: '#9aa49e',
    borderRadius: 11,
    borderWidth: 2,
    height: 22,
    justifyContent: 'center',
    marginTop: 2,
    width: 22,
  },
  checkboxChecked: {
    backgroundColor: '#205f4b',
    borderColor: '#205f4b',
  },
  checkboxText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 16,
  },
  body: {
    flex: 1,
    gap: 8,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  kindLabel: {
    color: '#5e6761',
    fontSize: 12,
    fontWeight: '700',
  },
  timeLabel: {
    color: '#5e6761',
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
  completedTitle: {
    textDecorationLine: 'line-through',
  },
  memo: {
    color: '#5d625e',
    fontSize: 13,
    lineHeight: 19,
  },
});
