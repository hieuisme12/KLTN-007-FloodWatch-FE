import { Animated, StyleSheet, Text, View } from 'react-native';
import { PROFILE_AVATAR_OUTER } from './ProfileAvatarBadge';
import { PROFILE_HERO_TOP_GAP } from '../constants/profileScrollHeader';
import { curvedTabScreen } from './curvedTabScreen';

type Props = {
  name: string;
  username: string;
  email: string;
  phone: string;
  roleLabel: string;
  heroOpacity?: Animated.AnimatedInterpolation<number>;
};

const AVATAR_SPACER_HEIGHT =
  Math.abs(curvedTabScreen.bodyOverlap) + PROFILE_AVATAR_OUTER / 2 + PROFILE_HERO_TOP_GAP;

export default function ProfilePersonalCard({
  name,
  username,
  email,
  phone,
  roleLabel,
  heroOpacity
}: Props) {
  const heroFade = heroOpacity ?? 1;
  const showUsername =
    username.trim().length > 0 && username.trim().toLowerCase() !== name.trim().toLowerCase();

  const rows: Array<{ label: string; value: string }> = [
    { label: 'Họ và tên', value: name },
    ...(showUsername ? [{ label: 'Tên đăng nhập', value: username }] : []),
    { label: 'Email', value: email },
    { label: 'Số điện thoại', value: phone },
    { label: 'Vai trò', value: roleLabel }
  ];

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.heroText, { opacity: heroFade }]}>
        <Text style={styles.name}>{name}</Text>
      </Animated.View>

      <View style={styles.infoCard}>
        {rows.map((row, index) => (
          <View key={row.label}>
            {index > 0 ? <View style={styles.divider} /> : null}
            <InfoRow label={row.label} value={row.value} />
          </View>
        ))}
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
    marginTop: AVATAR_SPACER_HEIGHT,
    marginBottom: 14,
    zIndex: 1
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
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
  row: { gap: 4 },
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
    backgroundColor: '#f1f5f9',
    marginBottom: 12
  }
});
