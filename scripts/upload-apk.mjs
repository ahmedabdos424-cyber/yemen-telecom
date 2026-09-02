#!/usr/bin/env node
/**
 * Upload APK to Supabase Storage and print metadata.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=<new_key> node scripts/upload-apk.mjs
 *
 * Requires: @supabase/supabase-js (already in server/node_modules)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, statSync } from 'fs';
import { createHash } from 'crypto';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APK_PATH = resolve(__dirname, '../apk-releases/yemen-telecom-v1.1.0.apk');
const SUPABASE_URL = 'https://qxroquilskugfemzmrzp.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'apk-releases';
const OBJECT_PATH = 'releases/app-1.1.0.apk';

if (!SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  console.error('Usage: SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/upload-apk.mjs');
  process.exit(1);
}

async function main() {
  console.log('📦 Reading APK file...');
  const apkBuffer = readFileSync(APK_PATH);
  const { size } = statSync(APK_PATH);
  const sha256 = createHash('sha256').update(apkBuffer).digest('hex').toUpperCase();

  console.log(`   File: ${APK_PATH}`);
  console.log(`   Size: ${size.toLocaleString()} bytes`);
  console.log(`   SHA-256: ${sha256}`);

  console.log('\n🔑 Connecting to Supabase...');
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`\n☁️  Uploading to ${BUCKET}/${OBJECT_PATH}...`);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(OBJECT_PATH, apkBuffer, {
      contentType: 'application/vnd.android.package-archive',
      upsert: true,
    });

  if (error) {
    console.error('❌ Upload failed:', error.message);
    process.exit(1);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(OBJECT_PATH);
  const publicUrl = data.publicUrl;

  console.log('\n✅ Upload successful!');
  console.log('\n📋 Metadata to update in render.yaml and server/.env.example:');
  console.log('─'.repeat(60));
  console.log(`APP_APK_SHA256=${sha256}`);
  console.log(`APP_APK_SIZE=${size}`);
  console.log(`APP_APK_URL=${publicUrl}`);
  console.log('─'.repeat(60));
  console.log(`\n🔗 Public URL: ${publicUrl}`);
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
