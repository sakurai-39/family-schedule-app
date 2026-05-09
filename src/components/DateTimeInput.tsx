import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { formatDateInput, formatTimeInput, parseDateTimeOrFallback } from '../utils/dateTimeFormat';

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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const pickerValue = parseDateTimeOrFallback(dateText, timeText, new Date());

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (event.type === 'set' && selectedDate) {
      onChangeDate(formatDateInput(selectedDate));
    }
  };

  const handleTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowTimePicker(false);
    if (event.type === 'set' && selectedDate) {
      onChangeTime(formatTimeInput(selectedDate));
    }
  };

  return (
    <View style={[styles.container, disabled && styles.disabledContainer]}>
      <View style={styles.field}>
        <Text style={styles.label}>日付</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="日付を選ぶ"
          disabled={disabled}
          onPress={() => setShowDatePicker(true)}
          style={[styles.input, disabled && styles.disabledInput]}
        >
          <Text style={[styles.value, !dateText && styles.placeholder]}>
            {dateText || '日付を選ぶ'}
          </Text>
        </Pressable>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>時刻</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="時刻を選ぶ"
          disabled={disabled}
          onPress={() => setShowTimePicker(true)}
          style={[styles.input, disabled && styles.disabledInput]}
        >
          <Text style={[styles.value, !timeText && styles.placeholder]}>
            {timeText || '時刻を選ぶ'}
          </Text>
        </Pressable>
      </View>
      {showDatePicker ? (
        <DateTimePicker mode="date" value={pickerValue} onChange={handleDateChange} />
      ) : null}
      {showTimePicker ? (
        <DateTimePicker mode="time" value={pickerValue} is24Hour onChange={handleTimeChange} />
      ) : null}
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
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 12,
  },
  disabledInput: {
    backgroundColor: '#edf0ed',
  },
  value: {
    color: '#202124',
    fontSize: 16,
  },
  placeholder: {
    color: '#8f9791',
  },
});
