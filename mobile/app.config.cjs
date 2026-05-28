/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  expo: {
    name: 'FloodSight',
    slug: 'floodsight-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    scheme: 'floodsight',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#0c4a6e'
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'vn.id.floodsight.mobile'
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#0c4a6e'
      },
      package: 'vn.id.floodsight.mobile',
      edgeToEdgeEnabled: true
    },
    plugins: [
      'expo-router',
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'FloodSight cần vị trí để hiển thị bạn trên bản đồ ngập TP.HCM.'
        }
      ],
      [
        'expo-image-picker',
        {
          photosPermission:
            'FloodSight cần truy cập thư viện ảnh để đính kèm hình hiện trường vào báo cáo.',
          cameraPermission:
            'FloodSight cần camera để chụp ảnh hiện trường khi báo cáo ngập.'
        }
      ]
    ],
    extra: {
      apiBaseUrl:
        process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.floodsight.id.vn'
    }
  }
};
