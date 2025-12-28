const admin = require('firebase-admin');
require('dotenv').config();

// Option 1: Use a service account file (Recommended for local dev)
// const serviceAccount = require('./serviceAccountKey.json');

// Option 2: Use Environment Variables (Recommended for production/deployment)
// Construct the credential object from env vars
const serviceAccount = {
  "type": "service_account",
  "project_id": process.env.FIREBASE_PROJECT_ID,
  "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID,
  // Handle newlines in private key string
  "private_key": process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
  "client_email": process.env.FIREBASE_CLIENT_EMAIL,
  "client_id": process.env.FIREBASE_CLIENT_ID,
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": process.env.FIREBASE_CLIENT_CERT_URL
};

// Initialize Firebase Admin
try {
    // Check if we have credentials
    if (serviceAccount.project_id && serviceAccount.private_key && serviceAccount.client_email) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET
        });
        console.log('🔥 Firebase Admin Initialized');
    } else {
        console.warn('⚠️ Firebase Admin NOT initialized: Missing credentials in .env');
        // Initialize with default application credentials (good for Google Cloud hosting)
        // admin.initializeApp(); 
    }
} catch (error) {
    console.error('❌ Firebase Admin Initialization Error:', error);
}

const getFirestore = () => {
  return admin.firestore();
};

const getAuth = () => {
  return admin.auth();
};

const getStorage = () => {
  return admin.storage();
};

module.exports = {
  admin,
  getFirestore,
  getAuth,
  getStorage
};