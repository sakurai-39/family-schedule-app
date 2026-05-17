import { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

type BottomNavBarProps = {
  onOpenInbox: () => void;
  onOpenUndatedTasks: () => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onAddEvent: () => void;
  onAddInbox: () => void;
  bottomInset: number;
  undatedTaskCount: number;
};

export function BottomNavBar({
  onOpenInbox,
  onOpenUndatedTasks,
  onOpenSearch,
  onOpenSettings,
  onAddEvent,
  onAddInbox,
  bottomInset,
  undatedTaskCount,
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
            bottom: bottomInset + 96,
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
          <Text style={styles.popupButtonText}>予定・タスクを追加</Text>
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
          <NavIcon name="memo" />
          <Text style={styles.sideButtonLabel}>未整理</Text>
          <Text style={styles.sideButtonLabel}>メモ</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={onOpenUndatedTasks}
          style={styles.sideButton}
        >
          <View style={styles.iconWithBadge}>
            <NavIcon name="clock" />
            {undatedTaskCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {undatedTaskCount > 9 ? '9+' : undatedTaskCount}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.sideButtonLabel}>いつかやる</Text>
          <Text style={styles.sideButtonLabel}>タスク</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="予定・タスクまたはメモを追加"
          onPress={toggleMenu}
          style={styles.fab}
        >
          <Animated.Text style={[styles.fabIcon, { transform: [{ rotate }] }]}>+</Animated.Text>
        </Pressable>

        <Pressable accessibilityRole="button" onPress={onOpenSearch} style={styles.sideButton}>
          <NavIcon name="search" />
          <Text style={styles.sideButtonLabel}>検索</Text>
        </Pressable>

        <Pressable accessibilityRole="button" onPress={onOpenSettings} style={styles.sideButton}>
          <NavIcon name="settings" />
          <Text style={styles.sideButtonLabel}>設定</Text>
        </Pressable>
      </View>
    </View>
  );
}

type NavIconName = 'memo' | 'clock' | 'search' | 'settings';

function NavIcon({ name }: { name: NavIconName }) {
  if (name === 'memo') {
    return (
      <View style={styles.iconFrame}>
        <View style={styles.memoSheet}>
          <View style={styles.memoLineShort} />
          <View style={styles.memoLine} />
          <View style={styles.memoLine} />
        </View>
      </View>
    );
  }

  if (name === 'clock') {
    return (
      <View style={styles.iconFrame}>
        <View style={styles.clockCircle}>
          <View style={styles.clockHandHour} />
          <View style={styles.clockHandMinute} />
        </View>
      </View>
    );
  }

  if (name === 'search') {
    return (
      <View style={styles.iconFrame}>
        <View style={styles.searchCircle} />
        <View style={styles.searchHandle} />
      </View>
    );
  }

  return (
    <View style={styles.iconFrame}>
      <View style={styles.gearRing}>
        <View style={[styles.gearTooth, styles.gearToothTop]} />
        <View style={[styles.gearTooth, styles.gearToothRight]} />
        <View style={[styles.gearTooth, styles.gearToothBottom]} />
        <View style={[styles.gearTooth, styles.gearToothLeft]} />
        <View style={styles.gearCenter} />
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
    flexDirection: 'column',
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
    minWidth: 196,
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
    minWidth: 0,
    paddingVertical: 6,
  },
  sideButtonLabel: {
    color: '#65706a',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 11,
  },
  iconFrame: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    marginBottom: 2,
    width: 28,
  },
  iconWithBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  memoSheet: {
    borderColor: '#205f4b',
    borderRadius: 3,
    borderWidth: 2,
    gap: 3,
    height: 22,
    justifyContent: 'center',
    paddingHorizontal: 4,
    width: 18,
  },
  memoLine: {
    backgroundColor: '#205f4b',
    borderRadius: 999,
    height: 2,
    width: 8,
  },
  memoLineShort: {
    backgroundColor: '#205f4b',
    borderRadius: 999,
    height: 2,
    width: 5,
  },
  clockCircle: {
    borderColor: '#205f4b',
    borderRadius: 11,
    borderWidth: 2,
    height: 22,
    width: 22,
  },
  clockHandHour: {
    backgroundColor: '#205f4b',
    borderRadius: 999,
    height: 7,
    left: 9,
    position: 'absolute',
    top: 4,
    width: 2,
  },
  clockHandMinute: {
    backgroundColor: '#205f4b',
    borderRadius: 999,
    height: 2,
    left: 9,
    position: 'absolute',
    top: 10,
    width: 7,
  },
  searchCircle: {
    borderColor: '#205f4b',
    borderRadius: 8,
    borderWidth: 2,
    height: 17,
    left: 4,
    position: 'absolute',
    top: 4,
    width: 17,
  },
  searchHandle: {
    backgroundColor: '#205f4b',
    borderRadius: 999,
    height: 10,
    position: 'absolute',
    right: 3,
    top: 18,
    transform: [{ rotate: '-45deg' }],
    width: 2,
  },
  gearRing: {
    alignItems: 'center',
    borderColor: '#205f4b',
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  gearTooth: {
    backgroundColor: '#205f4b',
    borderRadius: 1,
    height: 5,
    position: 'absolute',
    width: 3,
  },
  gearToothTop: {
    top: -5,
  },
  gearToothRight: {
    right: -4,
    transform: [{ rotate: '90deg' }],
  },
  gearToothBottom: {
    bottom: -5,
  },
  gearToothLeft: {
    left: -4,
    transform: [{ rotate: '90deg' }],
  },
  gearCenter: {
    borderColor: '#205f4b',
    borderRadius: 4,
    borderWidth: 2,
    height: 8,
    width: 8,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: '#205f4b',
    borderColor: '#ffffff',
    borderRadius: 999,
    borderWidth: 1.5,
    minWidth: 18,
    paddingHorizontal: 4,
    position: 'absolute',
    right: -10,
    top: -4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 14,
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
