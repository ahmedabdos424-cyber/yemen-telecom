import * as admin from 'firebase-admin';
import * as path from 'path';

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.resolve(process.cwd(), '..', 'firebase-service-account.json');

let initialized = false;

export function getFirebaseAdmin() {
  if (!initialized) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.appspot.com`,
    });
    initialized = true;
  }
  return admin;
}

export function getBucket() {
  return getFirebaseAdmin().storage().bucket();
}
