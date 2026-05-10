import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ScheduleDraftKind } from '../utils/scheduleDraft';

type ItemTypeSelectorProps = {
  value: ScheduleDraftKind;
  onChange: (value: ScheduleDraftKind) => void;
};

const options: { value: ScheduleDraftKind; label: string }[] = [
  { value: 'event', label: '予定' },
  { value: 'task', label: 'タスク' },
];

export function ItemTypeSelector({ value, onChange }: ItemTypeSelectorProps) {
  return (
    <View style={styles.container}>
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <Pressable
            accessibilityRole="button"
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.option, isActive && styles.activeOption]}
          >
            <Text style={[styles.optionText, isActive && styles.activeOptionText]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#e7ece8',
    borderRadius: 8,
    flexDirection: 'row',
    padding: 4,
  },
  option: {
    alignItems: 'center',
    borderRadius: 6,
    flex: 1,
    minHeight: 42,
    justifyContent: 'center',
  },
  activeOption: {
    backgroundColor: '#ffffff',
  },
  optionText: {
    color: '#65706a',
    fontSize: 14,
    fontWeight: '800',
  },
  activeOptionText: {
    color: '#205f4b',
  },
});
