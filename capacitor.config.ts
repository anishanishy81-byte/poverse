import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.poverse.app',
  appName: 'PO-VERSE',
  webDir: 'out',
  android: {
    allowMixedContent: true,
    useLegacyBridge: true,
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      releaseType: 'APK',
    },
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#667eea',
      showSpinner: true,
      spinnerColor: '#ffffff',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#667eea',
      sound: 'default',
    },
    BackgroundGeolocation: {
      // iOS-specific options
      desiredAccuracy: 'high',
      distanceFilter: 10,
      stale: false,
    },
  },
};

export default config;
