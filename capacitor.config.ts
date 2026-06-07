import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yemen.telecom',
  appName: 'يمن تيليكوم',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: ['10.0.0.*', 'localhost:4000', 'localhost:3000', 'yemen-telecom-api.onrender.com', 'yemen-telecom-1699.web.app'],
  },
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['phone', 'google.com', 'password'],
    },
  },
};

export default config;
