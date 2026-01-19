import type { CapacitorConfig } from '@capacitor/cli';

// PRODUCTION URL - Your deployed app
const SERVER_URL = 'https://po-verse.vercel.app';

// For local development, uncomment this line instead:
// const SERVER_URL = 'http://192.168.0.6:3000';

const config: CapacitorConfig = {
  appId: 'com.poverse.app',
  appName: 'PO-VERSE',
  webDir: 'out',
  server: {
    url: SERVER_URL,
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
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
  },
};

export default config;
