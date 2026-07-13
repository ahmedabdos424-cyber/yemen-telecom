import { execSync } from 'child_process';
import fs from 'fs';
import https from 'https';
import { URL } from 'url';

const TAG = 'v1.0.0';
const RELEASE_NAME = 'Yemen Telecom v1.0.0';
const RELEASE_BODY = `
# إصدار يمن تيليكوم النسخة v1.0.0 🟢

تطبيق يمن تيليكوم لإدارة خطوط SIM، الوكلاء، والبائعين على الهواتف الذكية بنظام أندرويد.

## 📱 محتويات الإصدار
- **ملف APK للتثبيت المباشر**: [app-release.apk](https://github.com/ahmedabdos424-cyber/yemen-telecom/releases/download/v1.0.0/app-release.apk)
- **حزمة AAB للنشر على Play Store**: [app-release.aab](https://github.com/ahmedabdos424-cyber/yemen-telecom/releases/download/v1.0.0/app-release.aab)

## 🛠️ تفاصيل البناء والتوافق
- **الحد الأدنى للنظام (minSdkVersion)**: Android 5.0+ (API 24)
- **إصدار التجميع (targetSdkVersion)**: Android 15 (API 36)
- **المنصة التقنية**: React + Capacitor 6 + Vite
- **التحقق الأمني**:
  - تعطيل حركة مرور البيانات النصية غير المشفرة (Cleartext Traffic) بالكامل.
  - حصر الاتصال بنطاق واجهة برمجة التطبيقات الآمن \`yemen-telecom-api.onrender.com\`.
  - تفعيل التوقيع الرقمي والتأمين الكامل ضد الاختراق.

## 📝 تعليمات التثبيت
1. قم بتحميل ملف **app-release.apk**.
2. اسمح بالتثبيت من مصادر غير معروفة إذا طلب منك النظام ذلك.
3. افتح التطبيق وسجل الدخول باستخدام بيانات الوكيل أو البائع الخاصة بك.
`;

const APK_PATH = 'android/app/build/outputs/apk/release/app-release.apk';
const AAB_PATH = 'android/app/build/outputs/bundle/release/app-release.aab';

function getGitRemote() {
  try {
    const url = execSync('git remote get-url origin').toString().trim();
    console.log(`Git remote URL: ${url}`);
    
    // Match HTTPS URLs with token
    // e.g. https://owner:token@github.com/owner/repo.git
    const httpsTokenMatch = url.match(/https:\/\/([^:]+):([^@]+)@github\.com\/([^/]+)\/([^.]+)/);
    if (httpsTokenMatch) {
      return {
        token: httpsTokenMatch[2],
        owner: httpsTokenMatch[3],
        repo: httpsTokenMatch[4],
      };
    }
    
    // Fallback: match standard HTTPS URL
    // e.g. https://github.com/owner/repo.git
    const httpsMatch = url.match(/https:\/\/github\.com\/([^/]+)\/([^.]+)/);
    if (httpsMatch) {
      return {
        token: process.env.GITHUB_TOKEN,
        owner: httpsMatch[1],
        repo: httpsMatch[2],
      };
    }
    
    throw new Error('Unsupported Git remote format');
  } catch (err) {
    console.error('Failed to get Git remote info:', err.message);
    process.exit(1);
  }
}

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data ? JSON.parse(data) : {});
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function uploadAsset(uploadUrl, filePath, fileName, token) {
  return new Promise((resolve, reject) => {
    const stats = fs.statSync(filePath);
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': fileName.endsWith('.apk') ? 'application/vnd.android.package-archive' : 'application/octet-stream',
        'Content-Length': stats.size,
        'User-Agent': 'Node-Release-Publisher',
      },
    };

    // Parse the upload URL
    const cleanUrl = uploadUrl.replace('{?name,label}', '') + `?name=${fileName}`;
    const urlObj = new URL(cleanUrl);

    options.hostname = urlObj.hostname;
    options.path = urlObj.pathname + urlObj.search;

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Upload HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(req);
  });
}

async function main() {
  const { token, owner, repo } = getGitRemote();
  if (!token) {
    console.error('GitHub token not found. Please set GITHUB_TOKEN environment variable or verify Git remote URL.');
    process.exit(1);
  }

  console.log(`Repository: ${owner}/${repo}`);

  // 1. Tag and push git tag
  console.log(`\nCreating and pushing tag ${TAG}...`);
  try {
    execSync(`git tag -d ${TAG} 2>null || true`);
    execSync(`git push origin :refs/tags/${TAG} 2>null || true`);
  } catch (e) {}

  try {
    execSync(`git tag -a ${TAG} -m "Release ${TAG}"`);
    execSync(`git push origin ${TAG}`);
    console.log(`Successfully pushed tag ${TAG} to origin`);
  } catch (err) {
    console.error(`Tagging command failed: ${err.message}`);
    process.exit(1);
  }

  const apiHeaders = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Node-Release-Publisher',
    'Content-Type': 'application/json',
  };

  // 2. Check if release already exists
  let releaseId = null;
  let uploadUrl = null;
  console.log(`\nChecking if release for tag ${TAG} exists...`);
  try {
    const existingRelease = await request({
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}/releases/tags/${TAG}`,
      method: 'GET',
      headers: apiHeaders,
    });
    releaseId = existingRelease.id;
    console.log(`Release exists with ID ${releaseId}. We will delete it to create a fresh one.`);
    
    // Delete existing release
    await request({
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}/releases/${releaseId}`,
      method: 'DELETE',
      headers: apiHeaders,
    });
    console.log(`Successfully deleted existing release ID ${releaseId}`);
  } catch (err) {
    console.log(`No existing release found for tag ${TAG}.`);
  }

  // 3. Create new Release
  console.log(`\nCreating new GitHub Release for tag ${TAG}...`);
  const createPayload = {
    tag_name: TAG,
    target_commitish: 'production-deploy-20260630',
    name: RELEASE_NAME,
    body: RELEASE_BODY,
    draft: false,
    prerelease: false,
  };

  const newRelease = await request({
    hostname: 'api.github.com',
    path: `/repos/${owner}/${repo}/releases`,
    method: 'POST',
    headers: apiHeaders,
  }, createPayload);

  releaseId = newRelease.id;
  uploadUrl = newRelease.upload_url;
  console.log(`Release created successfully! ID: ${releaseId}`);

  // 4. Upload APK asset
  if (fs.existsSync(APK_PATH)) {
    console.log(`\nUploading APK asset: ${APK_PATH}...`);
    try {
      const asset = await uploadAsset(uploadUrl, APK_PATH, 'app-release.apk', token);
      console.log(`APK Uploaded! Download URL: ${asset.browser_download_url}`);
    } catch (err) {
      console.error('Failed to upload APK:', err.message);
    }
  } else {
    console.error(`APK file not found at ${APK_PATH}`);
  }

  // 5. Upload AAB asset
  if (fs.existsSync(AAB_PATH)) {
    console.log(`\nUploading AAB asset: ${AAB_PATH}...`);
    try {
      const asset = await uploadAsset(uploadUrl, AAB_PATH, 'app-release.aab', token);
      console.log(`AAB Uploaded! Download URL: ${asset.browser_download_url}`);
    } catch (err) {
      console.error('Failed to upload AAB:', err.message);
    }
  } else {
    console.error(`AAB file not found at ${AAB_PATH}`);
  }

  console.log('\nGitHub Release process completed successfully!');
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
