import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yemen.telecom',
  appName: 'يمن تيليكوم',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: false,
    allowNavigation: ['yemen-telecom.onrender.com', 'yemen-telecom-1699.web.app'],
  },
  plugins: {
    CapacitorPreferences: {},
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0e1a',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
