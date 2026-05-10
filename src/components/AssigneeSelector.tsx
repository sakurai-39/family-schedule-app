import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AssigneeValue } from '../types/CalendarItem';
import {
  AssigneeRole,
  deriveRoleSet,
  resolveAssigneeValue,
  toggleRole,
} from '../utils/assigneeMapping';

type AssigneeSelectorProps = {
  value: AssigneeValue | null;
  selfId: string;
  selfLabel: string;
  partnerId: string | null;
  partnerLabel: string;
  onChange: (value: AssigneeValue | null) => void;
};

export function AssigneeSelector({
  value,
  selfId,
  selfLabel,
  partnerId,
  partnerLabel,
  onChange,
}: AssigneeSelectorProps) {
  const roles = deriveRoleSet(value, selfId, partnerId);

  const handleToggle = (role: AssigneeRole) => {
    const next = toggleRole(roles, role);
    onChange(resolveAssigneeValue(next, selfId, partnerId));
  };

  return (
    <View style={styles.container}>
      <Toggle active={roles.has('self')} label={selfLabel} onPress={() => handleToggle('self')} />
      {partnerId ? (
        <Toggle
          active={roles.has('partner')}
          label={partnerLabel}
          onPress={() => handleToggle('partner')}
        />
      ) : null}
      <View style={styles.spacer} />
      <Toggle
        active={roles.has('whoever')}
        label="どちらか"
        onPress={() => handleToggle('whoever')}
      />
    </View>
  );
}

type ToggleProps = {
  active: boolean;
  label: string;
  onPress: () => void;
};

function Toggle({ active, label, onPress }: ToggleProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.option, active && styles.activeOption]}
    >
      <Text style={[styles.optionText, active && styles.activeOptionText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  spacer: {
    width: 4,
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
