import { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

type BottomNavBarProps = {
  onOpenInbox: () => void;
  onOpenSettings: () => void;
  onAddEvent: () => void;
  onAddInbox: () => void;
  bottomInset: number;
};

export function BottomNavBar({
  onOpenInbox,
  onOpenSettings,
  onAddEvent,
  onAddInbox,
  bottomInset,
}: BottomNavBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  const toggleMenu = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    Animated.timing(animation, {
      toValue: nextOpen ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    setIsOpen(false);
    Animated.timing(animation, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const handleAddEvent = () => {
    closeMenu();
    onAddEvent();
  };

  const handleAddInbox = () => {
    closeMenu();
    onAddInbox();
  };

  const rotate = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });
  const popupTranslateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });
  const popupOpacity = animation;

  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      {isOpen ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="メニューを閉じる"
          onPress={closeMenu}
          style={styles.backdrop}
        />
      ) : null}

      <Animated.View
        pointerEvents={isOpen ? 'auto' : 'none'}
        style={[
          styles.popupArea,
          {
            bottom: bottomInset + 80,
            opacity: popupOpacity,
            transform: [{ translateY: popupTranslateY }],
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          onPress={handleAddEvent}
          style={[styles.popupButton, styles.popupButtonPrimary]}
        >
          <Text style={styles.popupButtonText}>予定を追加</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={handleAddInbox}
          style={[styles.popupButton, styles.popupButtonSecondary]}
        >
          <Text style={styles.popupButtonTextSecondary}>とりあえずメモ</Text>
        </Pressable>
      </Animated.View>

      <View style={[styles.bar, { paddingBottom: bottomInset }]}>
        <Pressable accessibilityRole="button" onPress={onOpenInbox} style={styles.sideButton}>
          <Text style={styles.sideButtonIcon}>📋</Text>
          <Text style={styles.sideButtonLabel}>未整理</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="予定またはメモを追加"
          onPress={toggleMenu}
          style={styles.fab}
        >
          <Animated.Text style={[styles.fabIcon, { transform: [{ rotate }] }]}>+</Animated.Text>
        </Pressable>

        <Pressable accessibilityRole="button" onPress={onOpenSettings} style={styles.sideButton}>
          <Text style={styles.sideButtonIcon}>⚙</Text>
          <Text style={styles.sideButtonLabel}>設定</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: -2000,
  },
  popupArea: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    left: 0,
    paddingHorizontal: 20,
    position: 'absolute',
    right: 0,
  },
  popupButton: {
    alignItems: 'center',
    borderRadius: 999,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  popupButtonPrimary: {
    backgroundColor: '#205f4b',
  },
  popupButtonSecondary: {
    backgroundColor: '#ffffff',
    borderColor: '#205f4b',
    borderWidth: 1.5,
  },
  popupButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  popupButtonTextSecondary: {
    color: '#205f4b',
    fontSize: 14,
    fontWeight: '800',
  },
  bar: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderTopColor: '#e0e6e1',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  sideButton: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 6,
  },
  sideButtonIcon: {
    color: '#205f4b',
    fontSize: 22,
    lineHeight: 26,
  },
  sideButtonLabel: {
    color: '#65706a',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  fab: {
    alignItems: 'center',
    backgroundColor: '#205f4b',
    borderRadius: 32,
    elevation: 6,
    height: 64,
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    width: 64,
  },
  fabIcon: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 36,
  },
});
