import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.arshi.enterprise.erp',
  appName: 'Arshi Enterprise ERP',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
