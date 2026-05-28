import { useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProfileAvatarBadge, { PROFILE_AVATAR_OUTER } from './ProfileAvatarBadge';
import ProfilePersonalCard from './ProfilePersonalCard';
import UserRoundCogIcon from './UserRoundCogIcon';
import TabHeaderGradient from './TabHeaderGradient';
import GradientPressable from './GradientPressable';
import { curvedBodySection, curvedHeaderText, curvedTabScreen } from './curvedTabScreen';
import {
  PROFILE_AVATAR_COMPACT_SCALE,
  PROFILE_SCROLL_COLLAPSE
} from '../constants/profileScrollHeader';
import { colors } from '../theme';

const CURVED_PAGE_BG = '#e9f2fb';
const CURVED_BODY_BG = '#f2f2f7';
const TITLE_ROW_HEIGHT = 34;
/** Đồng bộ với `topActionBtn` trang chủ (index.tsx) */
const HEADER_ACTION_BTN_SIZE = 34;
const HEADER_ACTION_ICON_COLOR = '#ffffff';
const EDIT_GAP_COLLAPSED = 10;

type Props = {
  tabBarInset: number;
  loading: boolean;
  error: string | null;
  name: string;
  username: string;
  email: string;
  phone: string;
  roleLabel: string;
  avatarUrl: string | null;
  initials: string;
  onPressAvatar: () => void;
  onPressEdit: () => void;
  onLogout: () => void;
  refreshing?: boolean;
  onRefresh?: () => void | Promise<void>;
};

export default function ProfileAuthenticatedScroll({
  tabBarInset,
  loading,
  error,
  name,
  username,
  email,
  phone,
  roleLabel,
  avatarUrl,
  initials,
  onPressAvatar,
  onPressEdit,
  onLogout,
  refreshing = false,
  onRefresh
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

  const compactAvatarHalf = (PROFILE_AVATAR_OUTER * PROFILE_AVATAR_COMPACT_SCALE) / 2;
  const editHeaderOpacity = scrollY.interpolate({
    inputRange: [0, collapse * 0.4],
    outputRange: [1, 0],
    extrapolate: 'clamp'
  });
  const editCollapsedOpacity = scrollY.interpolate({
    inputRange: [collapse * 0.35, collapse],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });
  const editCollapsedTop = layout.collapsedCenterY - HEADER_ACTION_BTN_SIZE / 2;
  const editCollapsedLeft =
    layout.collapsedCenterX -
    compactAvatarHalf -
    EDIT_GAP_COLLAPSED -
    HEADER_ACTION_BTN_SIZE;

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
        <View style={styles.headerRow}>
          <Animated.View style={[styles.titleWrap, { paddingRight: titlePadRight }]}>
            <Text style={[curvedHeaderText.topTitle, styles.topTitle]}>Tài khoản</Text>
          </Animated.View>
          <Animated.View style={{ opacity: editHeaderOpacity }}>
            <Pressable
              style={styles.headerActionBtn}
              onPress={onPressEdit}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Chỉnh sửa thông tin"
            >
              <UserRoundCogIcon
                size={20}
                color={HEADER_ACTION_ICON_COLOR}
                strokeWidth={2.2}
              />
            </Pressable>
          </Animated.View>
        </View>
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

        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.editHostCollapsed,
            {
              opacity: editCollapsedOpacity,
              top: editCollapsedTop,
              left: editCollapsedLeft,
              width: HEADER_ACTION_BTN_SIZE,
              height: HEADER_ACTION_BTN_SIZE
            }
          ]}
        >
          <Pressable
            style={styles.headerActionBtn}
            onPress={onPressEdit}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Chỉnh sửa thông tin"
          >
            <UserRoundCogIcon
              size={20}
              color={HEADER_ACTION_ICON_COLOR}
              strokeWidth={2.2}
            />
          </Pressable>
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
          alwaysBounceVertical
          bounces
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void onRefresh()}
                tintColor={colors.primary}
                colors={[colors.primary]}
                progressViewOffset={Platform.OS === 'android' ? 12 : 0}
              />
            ) : undefined
          }
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: false
          })}
        >
          {refreshing ? (
            <View style={styles.refreshRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.refreshRowText}>Đang tải lại…</Text>
            </View>
          ) : null}

          {loading ? (
            <ActivityIndicator color={colors.primary} style={styles.profileLoader} />
          ) : (
            <ProfilePersonalCard
              name={name}
              username={username}
              email={email}
              phone={phone}
              roleLabel={roleLabel}
              heroOpacity={heroOpacity}
            />
          )}

          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

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
  root: { flex: 1, backgroundColor: CURVED_PAGE_BG },
  topSection: {
    position: 'relative',
    overflow: 'hidden',
    zIndex: 2,
    paddingHorizontal: curvedTabScreen.headerPaddingHorizontal
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: TITLE_ROW_HEIGHT,
    marginBottom: 8,
    zIndex: 2
  },
  titleWrap: { flex: 1 },
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
  editHostCollapsed: {
    position: 'absolute',
    zIndex: 45,
    elevation: 45
  },
  headerActionBtn: {
    width: HEADER_ACTION_BTN_SIZE,
    height: HEADER_ACTION_BTN_SIZE,
    borderRadius: HEADER_ACTION_BTN_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)'
  },
  bodySection: {
    ...curvedBodySection(CURVED_BODY_BG),
    zIndex: 1
  },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: CURVED_BODY_BG
  },
  refreshRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12
  },
  refreshRowText: { fontSize: 14, color: colors.textMuted, fontWeight: '500' },
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
