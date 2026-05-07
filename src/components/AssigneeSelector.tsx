import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AssigneeValue } from '../types/CalendarItem';

export type AssigneeOption = {
  label: string;
  value: AssigneeValue;
};

type AssigneeSelectorProps = {
  value: AssigneeValue | null;
  options: AssigneeOption[];
  onChange: (value: AssigneeValue) => void;
};

export function AssigneeSelector({ value, options, onChange }: AssigneeSelectorProps) {
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    backgroundColor: '#ffffff',
    borderColor: '#cfd6d1',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  activeOption: {
    backgroundColor: '#205f4b',
    borderColor: '#205f4b',
  },
  optionText: {
    color: '#4d5751',
    fontSize: 14,
    fontWeight: '800',
  },
  activeOptionText: {
    color: '#ffffff',
  },
});
