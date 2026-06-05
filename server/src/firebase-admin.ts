import admin from 'firebase-admin';
import path from 'path';

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(process.cwd(), 'firebase-service-account.json');

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (projectId) {
    admin.initializeApp({
      projectId,
      credential: admin.credential.applicationDefault(),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
    });
  } else if (require('fs').existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || serviceAccount.project_id + '.appspot.com',
    });
  } else {
    console.warn('Firebase Admin: No service account found. Firebase features disabled.');
    console.warn(`Place your service account key at: ${serviceAccountPath}`);
    console.warn('Or set FIREBASE_PROJECT_ID for ADC (Application Default Credentials).');
  }
}

export const auth = admin.auth();
export const storage = admin.storage();
export const firestore = admin.firestore();
export default admin;
