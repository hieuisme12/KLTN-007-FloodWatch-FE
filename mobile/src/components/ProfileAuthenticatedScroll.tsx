import { useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProfileAvatarBadge, { PROFILE_AVATAR_OUTER } from './ProfileAvatarBadge';
import ProfilePersonalCard from './ProfilePersonalCard';
import TabHeaderGradient from './TabHeaderGradient';
import GradientPressable from './GradientPressable';
import EmergencySubscriptionsSection from './EmergencySubscriptionsSection';
import { curvedBodySection, curvedHeaderText, curvedTabScreen } from './curvedTabScreen';
import {
  PROFILE_AVATAR_COMPACT_SCALE,
  PROFILE_SCROLL_COLLAPSE
} from '../constants/profileScrollHeader';
import { colors } from '../theme';

const TITLE_ROW_HEIGHT = 34;

type Props = {
  tabBarInset: number;
  loading: boolean;
  error: string | null;
  name: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  initials: string;
  onPressAvatar: () => void;
  onPressEdit: () => void;
  onLogout: () => void;
};

export default function ProfileAuthenticatedScroll({
  tabBarInset,
  loading,
  error,
  name,
  email,
  phone,
  avatarUrl,
  initials,
  onPressAvatar,
  onPressEdit,
  onLogout
}: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollY = useRef(new Animated.Value(0)).current;

  const expandedPad = PROFILE_AVATAR_OUTER / 2 + 16;
  const collapsedPad = curvedTabScreen.headerPaddingBottom;
  const collapse = PROFILE_SCROLL_COLLAPSE;

  const layout = useMemo(() => {
    const titleBottom = insets.top + 12 + TITLE_ROW_HEIGHT;
    const expandedCenterY = titleBottom + expandedPad;
    const collapsedCenterY = insets.top + 12 + 22;
    const collapsedCenterX = width - curvedTabScreen.headerPaddingHorizontal - 22;
    return {
      expandedCenterY,
      collapsedCenterY,
      collapsedCenterX,
      avatarLeft: width / 2 - PROFILE_AVATAR_OUTER / 2,
      avatarTop: expandedCenterY - PROFILE_AVATAR_OUTER / 2,
      translateXEnd: collapsedCenterX - width / 2,
      translateYEnd: collapsedCenterY - expandedCenterY
    };
  }, [expandedPad, insets.top, width]);

  const headerPaddingBottom = scrollY.interpolate({
    inputRange: [0, collapse],
    outputRange: [expandedPad, collapsedPad],
    extrapolate: 'clamp'
  });

  const titlePadRight = scrollY.interpolate({
    inputRange: [0, collapse],
    outputRange: [0, 58],
    extrapolate: 'clamp'
  });

  const heroOpacity = scrollY.interpolate({
    inputRange: [0, collapse * 0.72],
    outputRange: [1, 0],
    extrapolate: 'clamp'
  });

  const avatarTranslateX = scrollY.interpolate({
    inputRange: [0, collapse],
    outputRange: [0, layout.translateXEnd],
    extrapolate: 'clamp'
  });

  const avatarTranslateY = scrollY.interpolate({
    inputRange: [0, collapse],
    outputRange: [0, layout.translateYEnd],
    extrapolate: 'clamp'
  });

  const avatarScale = scrollY.interpolate({
    inputRange: [0, collapse],
    outputRange: [1, PROFILE_AVATAR_COMPACT_SCALE],
    extrapolate: 'clamp'
  });

  const cameraOpacity = scrollY.interpolate({
    inputRange: [0, collapse * 0.45],
    outputRange: [1, 0],
    extrapolate: 'clamp'
  });

  return (
    <View style={styles.root}>
      <Animated.View
        style={[
          styles.topSection,
          {
            paddingTop: insets.top + 12,
            paddingBottom: headerPaddingBottom
          }
        ]}
      >
        <TabHeaderGradient />
        <Animated.View style={{ paddingRight: titlePadRight, zIndex: 2 }}>
          <Text style={[curvedHeaderText.topTitle, styles.topTitle]}>Tài khoản</Text>
        </Animated.View>
      </Animated.View>

      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.avatarHost,
            {
              left: layout.avatarLeft,
              top: layout.avatarTop,
              transform: [
                { translateX: avatarTranslateX },
                { translateY: avatarTranslateY },
                { scale: avatarScale }
              ]
            }
          ]}
        >
          <ProfileAvatarBadge
            avatarUrl={avatarUrl}
            initials={initials}
            onPress={onPressAvatar}
            cameraOpacity={cameraOpacity}
          />
        </Animated.View>
      </View>

      <View style={styles.bodySection}>
        <Animated.ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: tabBarInset + 20 }
          ]}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: false
          })}
        >
          {loading ? (
            <ActivityIndicator color={colors.primary} style={styles.profileLoader} />
          ) : (
            <ProfilePersonalCard
              name={name}
              email={email}
              phone={phone}
              onPressEdit={onPressEdit}
              heroOpacity={heroOpacity}
            />
          )}

          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

          <View style={styles.sectionPad}>
            <EmergencySubscriptionsSection />
          </View>

          <View style={styles.sectionPad}>
            <GradientPressable variant="red" style={styles.logoutButton} onPress={onLogout}>
              <Text style={styles.logoutText}>Đăng xuất</Text>
            </GradientPressable>
          </View>
        </Animated.ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topSection: {
    position: 'relative',
    overflow: 'hidden',
    zIndex: 2,
    paddingHorizontal: curvedTabScreen.headerPaddingHorizontal
  },
  topTitle: { marginBottom: 0 },
  avatarHost: {
    position: 'absolute',
    width: PROFILE_AVATAR_OUTER,
    height: PROFILE_AVATAR_OUTER,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
    elevation: 40
  },
  bodySection: {
    ...curvedBodySection(colors.background),
    zIndex: 1
  },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: colors.background
  },
  sectionPad: { paddingHorizontal: 16, marginTop: 16 },
  profileLoader: { marginTop: 48 },
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center'
  },
  logoutButton: { paddingVertical: 14, width: '100%' },
  logoutText: { color: '#fff', fontWeight: '600', fontSize: 16 }
});
