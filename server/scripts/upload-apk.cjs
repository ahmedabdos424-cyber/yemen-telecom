const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in server/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const bucket = 'uploads';
const objectPath = 'releases/app-1.0.18.apk';
const apkPath = path.resolve(__dirname, '../../android/app/build/outputs/apk/release/app-release.apk');

async function uploadApk() {
  console.log(`Uploading APK to Supabase Storage...`);
  console.log(`Bucket: ${bucket}`);
  console.log(`Object: ${objectPath}`);
  console.log(`Local file: ${apkPath}`);

  if (!fs.existsSync(apkPath)) {
    console.error('APK file not found!');
    process.exit(1);
  }

  const fileBuffer = fs.readFileSync(apkPath);
  const fileSize = fileBuffer.length;
  console.log(`File size: ${fileSize} bytes`);

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(objectPath, fileBuffer, {
      contentType: 'application/vnd.android.package-archive',
      upsert: true
    });

  if (error) {
    console.error('Upload failed:', error);
    process.exit(1);
  }

  console.log('Upload successful:', data);

  // Generate a signed URL to verify
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(objectPath, 60 * 60); // 1 hour

  if (signedUrlError) {
    console.error('Signed URL generation failed:', signedUrlError);
  } else {
    console.log(`Signed URL (1h): ${signedUrlData.signedUrl}`);
  }

  console.log('\n--- Render Environment Variables to Update ---');
  console.log(`APP_VERSION=1.0.18`);
  console.log(`APP_VERSION_CODE=23`);
  console.log(`APP_APK_BUCKET=${bucket}`);
  console.log(`APP_APK_OBJECT=${objectPath}`);
  console.log(`APP_APK_SHA256=60B61008D89AE51054860DCED608DBBF71F0488CEFFB6493FF1475AFE124D21F`);
  console.log(`APP_APK_SIZE=${fileSize}`);
}

uploadApk();