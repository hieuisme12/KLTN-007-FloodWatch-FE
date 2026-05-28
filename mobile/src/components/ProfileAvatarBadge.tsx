import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TabHeaderGradient from './TabHeaderGradient';
import { tabGradient } from '../theme';

export const PROFILE_AVATAR_SIZE = 100;
const AVATAR_RING = 4;
const GROOVE_PAD = 7;
/** Đường kính ngoài (groove + avatar) — căn mép header/body */
export const PROFILE_AVATAR_OUTER = PROFILE_AVATAR_SIZE + (AVATAR_RING + GROOVE_PAD) * 2;

type Props = {
  avatarUrl: string | null;
  initials: string;
  onPress: () => void;
  cameraOpacity?: Animated.AnimatedInterpolation<number>;
};

/** Avatar nổi trên ranh giới header xanh ↔ nội dung (render ở lớp root, không trong body) */
export default function ProfileAvatarBadge({
  avatarUrl,
  initials,
  onPress,
  cameraOpacity
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.press}
      accessibilityRole="button"
      accessibilityLabel="Đổi ảnh đại diện"
    >
      <View style={styles.groove}>
        <View style={styles.ring}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.image} />
          ) : (
            <View style={styles.fallback}>
              <TabHeaderGradient />
              <Text style={styles.initials}>{initials}</Text>
            </View>
          )}
        </View>
      </View>
      <Animated.View style={[styles.cameraBadge, cameraOpacity != null && { opacity: cameraOpacity }]}>
        <Ionicons name="camera" size={14} color="#fff" />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  press: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  groove: {
    padding: GROOVE_PAD,
    borderRadius: PROFILE_AVATAR_OUTER / 2 + GROOVE_PAD,
    backgroundColor: '#e9f2fb'
  },
  ring: {
    width: PROFILE_AVATAR_SIZE,
    height: PROFILE_AVATAR_SIZE,
    borderRadius: PROFILE_AVATAR_SIZE / 2,
    borderWidth: AVATAR_RING,
    borderColor: '#ffffff',
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 12
  },
  image: {
    width: '100%',
    height: '100%'
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  initials: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '700',
    zIndex: 1
  },
  cameraBadge: {
    position: 'absolute',
    right: GROOVE_PAD + 4,
    bottom: GROOVE_PAD + 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: tabGradient.bottom,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff'
  }
});
