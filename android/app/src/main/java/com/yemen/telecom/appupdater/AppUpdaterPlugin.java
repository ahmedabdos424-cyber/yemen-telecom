package com.yemen.telecom.appupdater;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.content.pm.SigningInfo;
import android.net.Uri;
import android.os.Build;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {

    private static final String PROVIDER_AUTH = "com.yemen.telecom.fileprovider";
    // Abort if no progress is made for this long (mitigates hung connections).
    private static final long DOWNLOAD_TIMEOUT_MS = 90_000;

    private DownloadManager downloadManager;
    private long downloadId = -1;
    private PluginCall pendingCall;
    private BroadcastReceiver downloadReceiver;
    private ScheduledExecutorService watchdog;
    private long lastProgressTs = 0;

    @Override
    public void load() {
        downloadManager = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
        // Clean up any leftover update APK from a previous (possibly cancelled) install.
        deleteStaleUpdates();
    }

    private File updatesDir() {
        File dir = new File(getContext().getExternalCacheDir(), "updates");
        if (!dir.exists()) dir.mkdirs();
        return dir;
    }

    private void deleteStaleUpdates() {
        File dir = updatesDir();
        File[] files = dir.listFiles();
        if (files == null) return;
        for (File f : files) {
            if (f.getName().endsWith(".apk")) f.delete();
        }
    }

    /**
     * Begin downloading the APK. Progress is streamed via the "progress" listener.
     * On completion the file integrity (size + SHA-256) is verified before install.
     * options: { url, fileName?, sha256?, size? }
     */
    @PluginMethod
    public void downloadApk(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("Missing apk url");
            return;
        }
        final String fileName = call.getString("fileName", "yemen-telecom-update.apk");
        final String expectedSha = call.getString("sha256", null);
        final long expectedSize = call.getDouble("size", 0.0).longValue();

        File apkFile = new File(updatesDir(), fileName);
        if (apkFile.exists() && !apkFile.delete()) {
            call.reject("Cannot prepare download file");
            return;
        }

        Uri uri = Uri.parse(url);
        DownloadManager.Request request = new DownloadManager.Request(uri)
                .setTitle("يمن تيليكوم — تحديث")
                .setDescription("جاري تنزيل الإصدار الجديد")
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                .setDestinationUri(Uri.fromFile(apkFile))
                .setAllowedOverMetered(true)
                .setAllowedOverRoaming(true);

        pendingCall = call;

        downloadId = downloadManager.enqueue(request);
        lastProgressTs = System.currentTimeMillis();

        downloadReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                if (id != downloadId) return;
                try {
                    getContext().unregisterReceiver(this);
                } catch (Exception ignored) {
                }
                stopWatchdog();
                handleDownloadComplete(apkFile, expectedSha, expectedSize);
            }
        };
        getContext().registerReceiver(downloadReceiver, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE));

        emitProgress(0, 0, 0);
        startProgressPolling();
        startWatchdog();
    }

    private void startWatchdog() {
        stopWatchdog();
        watchdog = Executors.newSingleThreadScheduledExecutor();
        watchdog.schedule(() -> {
            if (downloadId == -1) return;
            long idle = System.currentTimeMillis() - lastProgressTs;
            if (idle >= DOWNLOAD_TIMEOUT_MS) {
                cancelDownload();
                finalizeCallWithError("انتهت مهلة التنزيل.");
            }
        }, DOWNLOAD_TIMEOUT_MS, TimeUnit.MILLISECONDS);
    }

    private void stopWatchdog() {
        if (watchdog != null && !watchdog.isShutdown()) {
            watchdog.shutdownNow();
        }
        watchdog = null;
    }

    private void cancelDownload() {
        if (downloadId != -1) {
            try {
                downloadManager.remove(downloadId);
            } catch (Exception ignored) {
            }
            downloadId = -1;
        }
        if (downloadReceiver != null) {
            try {
                getContext().unregisterReceiver(downloadReceiver);
            } catch (Exception ignored) {
            }
        }
    }

    private void startProgressPolling() {
        new Thread(() -> {
            while (downloadId != -1) {
                try {
                    Thread.sleep(500);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    return;
                }
                int status = queryStatus();
                if (status == DownloadManager.STATUS_SUCCESSFUL) {
                    emitProgress(100, queryDownloaded(), queryTotal());
                    break;
                } else if (status == DownloadManager.STATUS_FAILED) {
                    emitProgress(-1, queryDownloaded(), queryTotal());
                    finalizeCallWithError("فشل تنزيل التحديث.");
                    return;
                } else if (status == DownloadManager.STATUS_PENDING || status == DownloadManager.STATUS_RUNNING) {
                    long downloaded = queryDownloaded();
                    long total = queryTotal();
                    if (downloaded > 0) lastProgressTs = System.currentTimeMillis();
                    emitProgress(total > 0 ? (int) ((downloaded * 100) / total) : 0, downloaded, total);
                }
            }
        }).start();
    }

    private int queryStatus() {
        android.database.Cursor c = downloadManager.query(new DownloadManager.Query().setFilterById(downloadId));
        int status = -1;
        if (c != null && c.moveToFirst()) {
            status = c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
        }
        if (c != null) c.close();
        return status;
    }

    private long queryDownloaded() {
        android.database.Cursor c = downloadManager.query(new DownloadManager.Query().setFilterById(downloadId));
        long v = 0;
        if (c != null && c.moveToFirst()) {
            v = c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
        }
        if (c != null) c.close();
        return v;
    }

    private long queryTotal() {
        android.database.Cursor c = downloadManager.query(new DownloadManager.Query().setFilterById(downloadId));
        long v = 0;
        if (c != null && c.moveToFirst()) {
            v = c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES));
        }
        if (c != null) c.close();
        return v;
    }

    private void emitProgress(int percent, long downloaded, long total) {
        JSObject ret = new JSObject();
        ret.put("progress", percent);
        ret.put("downloaded", downloaded);
        ret.put("total", total);
        notifyListeners("progress", ret);
    }

    private void handleDownloadComplete(File apkFile, String expectedSha, long expectedSize) {
        if (!apkFile.exists()) {
            finalizeCallWithError("ملف التحديث تالف.");
            return;
        }
        // 1) Size guard (catches truncated/interrupted downloads).
        if (expectedSize > 0 && apkFile.length() != expectedSize) {
            apkFile.delete();
            finalizeCallWithError("ملف التحديث تالف.");
            return;
        }
        // 2) SHA-256 verification (catches corruption + tampered/compromised APK).
        if (expectedSha != null && !expectedSha.isEmpty()) {
            String actual = sha256Hex(apkFile);
            if (actual == null || !actual.equalsIgnoreCase(expectedSha)) {
                apkFile.delete();
                finalizeCallWithError("ملف التحديث تالف.");
                return;
            }
        }
        // 3) Signing-certificate verification. Even if the server is compromised and
        //    serves a valid-hash APK, it must be signed by the SAME key as this app,
        //    otherwise we refuse to install.
        if (!signatureMatchesApp(apkFile)) {
            apkFile.delete();
            finalizeCallWithError("ملف التحديث تالف.");
            return;
        }
        // 4) Launch install via FileProvider.
        try {
            Uri apkUri = FileProvider.getUriForFile(getContext(), PROVIDER_AUTH, apkFile);
            Intent installIntent = new Intent(Intent.ACTION_INSTALL_PACKAGE);
            installIntent.setData(apkUri);
            installIntent.setFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(installIntent);

            JSObject ret = new JSObject();
            ret.put("progress", 100);
            ret.put("path", apkFile.getAbsolutePath());
            ret.put("installed", true);
            ret.put("verified", true);
            if (pendingCall != null) {
                pendingCall.resolve(ret);
                pendingCall = null;
            }
            downloadId = -1;
        } catch (Exception e) {
            finalizeCallWithError("تعذّر تثبيت التحديث: " + e.getMessage());
        }
    }

    private String sha256Hex(File file) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            InputStream fis = new FileInputStream(file);
            byte[] buffer = new byte[8192];
            int read;
            while ((read = fis.read(buffer)) != -1) {
                digest.update(buffer, 0, read);
            }
            fis.close();
            byte[] hash = digest.digest();
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                sb.append(String.format(Locale.US, "%02X", b));
            }
            return sb.toString();
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Verify the downloaded APK is signed by the SAME certificate as the currently
     * installed app. This defeats a compromised server that serves a valid-hash but
     * differently-signed (malicious) APK. Returns true only if signatures match.
     */
    private boolean signatureMatchesApp(File apkFile) {
        try {
            PackageManager pm = getContext().getPackageManager();

            // Installed app signing info.
            PackageInfo installed = pm.getPackageInfo(
                    getContext().getPackageName(),
                    Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                            ? PackageManager.GET_SIGNING_CERTIFICATES
                            : PackageManager.GET_SIGNATURES);
            byte[] installedCert = firstCertBytes(installed);
            if (installedCert == null) return false;

            // Downloaded APK signing info.
            PackageInfo archive = pm.getPackageArchiveInfo(
                    apkFile.getAbsolutePath(),
                    Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                            ? PackageManager.GET_SIGNING_CERTIFICATES
                            : PackageManager.GET_SIGNATURES);
            if (archive == null) return false;
            byte[] downloadedCert = firstCertBytes(archive);
            if (downloadedCert == null) return false;

            return java.util.Arrays.equals(installedCert, downloadedCert);
        } catch (Exception e) {
            return false;
        }
    }

    private byte[] firstCertBytes(PackageInfo info) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            SigningInfo si = info.signingInfo;
            if (si == null) return null;
            if (si.hasMultipleSigners()) {
                // Match any of the certs (lineage) — acceptable for our single-signer app.
                for (Signature s : si.getApkContentsSigners()) {
                    return s.toByteArray();
                }
                return null;
            }
            Signature[] sigs = si.getSigningCertificateHistory();
            if (sigs == null || sigs.length == 0) return null;
            return sigs[0].toByteArray();
        } else {
            // Deprecated path for API < 28.
            Signature[] sigs = info.signatures;
            if (sigs == null || sigs.length == 0) return null;
            return sigs[0].toByteArray();
        }
    }

    private void finalizeCallWithError(String message) {
        stopWatchdog();
        cancelDownload();
        if (pendingCall != null) {
            pendingCall.reject(message);
            pendingCall = null;
        }
    }

    @PluginMethod
    public void deleteApk(PluginCall call) {
        String path = call.getString("path");
        boolean deleted = false;
        if (path != null) {
            deleted = new File(path).delete();
        } else {
            File dir = updatesDir();
            File[] files = dir.listFiles();
            if (files != null) {
                for (File f : files) deleted |= f.delete();
            }
        }
        JSObject ret = new JSObject();
        ret.put("deleted", deleted);
        call.resolve(ret);
    }

    @PluginMethod
    public void canRequestPackageInstalls(PluginCall call) {
        boolean can = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            can = getContext().getPackageManager().canRequestPackageInstalls();
        }
        JSObject ret = new JSObject();
        ret.put("allowed", can);
        call.resolve(ret);
    }

    @PluginMethod
    public void openInstallSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent intent = new Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        stopWatchdog();
        cancelDownload();
    }
}
