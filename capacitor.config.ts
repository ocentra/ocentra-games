import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ocentra.claim',
  appName: 'Ocentra',
  webDir: 'dist',
  android: { path: 'platforms/mobile/android' },
  ios: { path: 'platforms/mobile/ios' },
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#000000',
      showSpinner: false,
    },
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google.com', 'password'],
    },
  },
};

export default config;
