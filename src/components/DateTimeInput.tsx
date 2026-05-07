import { StyleSheet, Text, TextInput, View } from 'react-native';

type DateTimeInputProps = {
  dateText: string;
  timeText: string;
  disabled?: boolean;
  onChangeDate: (value: string) => void;
  onChangeTime: (value: string) => void;
};

export function DateTimeInput({
  dateText,
  timeText,
  disabled = false,
  onChangeDate,
  onChangeTime,
}: DateTimeInputProps) {
  return (
    <View style={[styles.container, disabled && styles.disabledContainer]}>
      <View style={styles.field}>
        <Text style={styles.label}>日付</Text>
        <TextInput
          editable={!disabled}
          keyboardType="numbers-and-punctuation"
          onChangeText={onChangeDate}
          placeholder="2026-05-08"
          placeholderTextColor="#8f9791"
          style={[styles.input, disabled && styles.disabledInput]}
          value={dateText}
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>時刻</Text>
        <TextInput
          editable={!disabled}
          keyboardType="numbers-and-punctuation"
          onChangeText={onChangeTime}
          placeholder="09:30"
          placeholderTextColor="#8f9791"
          style={[styles.input, disabled && styles.disabledInput]}
          value={timeText}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
  },
  disabledContainer: {
    opacity: 0.45,
  },
  field: {
    flex: 1,
    gap: 7,
  },
  label: {
    color: '#202124',
    fontSize: 13,
    fontWeight: '800',
  },
  input: {
    backgroundColor: '#fbfcfb',
    borderColor: '#cfd6d1',
    borderRadius: 8,
    borderWidth: 1,
    color: '#202124',
    fontSize: 16,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  disabledInput: {
    backgroundColor: '#edf0ed',
  },
});
