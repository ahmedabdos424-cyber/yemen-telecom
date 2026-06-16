import * as admin from 'firebase-admin';

let initialized = false;

export function getFirebaseAdmin() {
  if (!initialized) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    if (!projectId || !privateKey || !clientEmail) {
      throw new Error('Firebase credentials missing: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL must be set');
    }
    const serviceAccount = {
      type: 'service_account',
      project_id: projectId,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || '',
      private_key: privateKey.replace(/\\n/g, '\n'),
      client_email: clientEmail,
      client_id: process.env.FIREBASE_CLIENT_ID || '',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL || '',
    };
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
    });
    initialized = true;
  }
  return admin;
}

export function getBucket() {
  return getFirebaseAdmin().storage().bucket();
}
