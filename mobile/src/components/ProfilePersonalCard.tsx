import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import UserRoundCogIcon from './UserRoundCogIcon';
import { PROFILE_AVATAR_OUTER } from './ProfileAvatarBadge';
import { PROFILE_HERO_TOP_GAP } from '../constants/profileScrollHeader';
import { curvedTabScreen } from './curvedTabScreen';

type Props = {
  name: string;
  email: string;
  phone: string;
  onPressEdit: () => void;
  heroOpacity?: Animated.AnimatedInterpolation<number>;
};

/** Khoảng từ đầu scroll tới tên — avatar nằm trên mép body overlap */
const HERO_OFFSET =
  Math.abs(curvedTabScreen.bodyOverlap) + PROFILE_AVATAR_OUTER / 2 + PROFILE_HERO_TOP_GAP;

export default function ProfilePersonalCard({
  name,
  email,
  phone,
  onPressEdit,
  heroOpacity
}: Props) {
  const heroFade = heroOpacity ?? 1;

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.heroText, { opacity: heroFade }]}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.subtitle}>{email}</Text>
      </Animated.View>

      <View style={styles.infoCard}>
        <Pressable style={styles.editFab} onPress={onPressEdit} hitSlop={8}>
          <UserRoundCogIcon size={18} color="#0f172a" strokeWidth={2} />
        </Pressable>

        <InfoRow label="Email" value={email} />
        <View style={styles.divider} />
        <InfoRow label="Số điện thoại" value={phone} />
      </View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16
  },
  heroText: {
    alignItems: 'center',
    marginTop: HERO_OFFSET,
    marginBottom: 14,
    zIndex: 1
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center'
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e8eef4',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3
  },
  editFab: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(148,163,184,0.15)',
    zIndex: 2
  },
  row: { gap: 4, paddingRight: 40 },
  rowLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.4
  },
  rowValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a'
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9'
  }
});
