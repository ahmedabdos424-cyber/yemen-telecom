package com.yemen.telecom.biometricauth;

import android.app.Activity;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.concurrent.Executor;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * Official Android Biometric Authentication via androidx.biometric.BiometricPrompt.
 *
 * This plugin NEVER touches fingerprint data itself: the biometric credentials stay
 * on the device's secure hardware (TEE), managed entirely by the Android system.
 * We only trigger the system prompt and report the outcome (success / cancel / error).
 */
@CapacitorPlugin(name = "BiometricAuth")
public class BiometricAuthPlugin extends Plugin {

    private BiometricPrompt activePrompt;

    private static final int AUTH_BIOMETRIC =
            BiometricManager.Authenticators.BIOMETRIC_STRONG;
    private static final int AUTH_BIOMETRIC_OR_DEVICE_CREDENTIAL =
            BiometricManager.Authenticators.BIOMETRIC_STRONG
                    | BiometricManager.Authenticators.DEVICE_CREDENTIAL;

    private static final String KEYSTORE_ALIAS = "tele_biometric_vault_key";
    private static final String ANDROID_KEYSTORE = "AndroidKeyStore";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";

    /**
     * Reports the device biometric capability WITHOUT opening any prompt.
     * Returns { isAvailable, isEnrolled, hardwarePresent, errorMessage? }.
     */
    @PluginMethod
    public void checkBiometry(PluginCall call) {
        BiometricManager manager = BiometricManager.from(getContext());

        int biometricOnly = manager.canAuthenticate(AUTH_BIOMETRIC);
        int biometricOrCredential = manager.canAuthenticate(AUTH_BIOMETRIC_OR_DEVICE_CREDENTIAL);

        boolean hardwarePresent = biometricOnly != BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE;
        boolean isEnrolled = biometricOnly == BiometricManager.BIOMETRIC_SUCCESS;
        boolean isAvailable = biometricOrCredential == BiometricManager.BIOMETRIC_SUCCESS;

        JSObject ret = new JSObject();
        ret.put("isAvailable", isAvailable);
        ret.put("isEnrolled", isEnrolled);
        ret.put("hardwarePresent", hardwarePresent);

        if (!isEnrolled) {
            ret.put("errorMessage", "لا توجد بصمة مسجلة على هذا الجهاز. سجّل بصمتك من إعدادات جهازك أولاً");
        } else if (!isAvailable) {
            ret.put("errorMessage", "التحقق بالبصمة غير متاح حالياً على هذا الجهاز");
        }
        if (!hardwarePresent) {
            ret.put("errorMessage", "هذا الجهاز لا يدعم التحقق بالبصمة");
        }
        call.resolve(ret);
    }

    /**
     * Opens the official Android BiometricPrompt.
     * options: { reason, androidTitle?, androidSubtitle?, cancelTitle?, allowDeviceCredential? }
     * Resolves { verified: true } on success.
     * Rejects with { code, message } on cancel / error / unavailability.
     */
    @PluginMethod
    public void authenticate(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null || activity.isFinishing() || !(activity instanceof FragmentActivity)) {
            call.reject("Biometric authentication is unavailable right now", "unavailable");
            return;
        }

        BiometricManager manager = BiometricManager.from(getContext());
        int check = manager.canAuthenticate(AUTH_BIOMETRIC_OR_DEVICE_CREDENTIAL);
        if (check != BiometricManager.BIOMETRIC_SUCCESS) {
            call.reject(describeCheck(check), codeForCheck(check));
            return;
        }

        FragmentActivity fragmentActivity = (FragmentActivity) activity;
        Executor executor = ContextCompat.getMainExecutor(fragmentActivity);

        final boolean allowDeviceCredential =
                call.getBoolean("allowDeviceCredential", true);

        BiometricPrompt.PromptInfo.Builder builder = new BiometricPrompt.PromptInfo.Builder()
                .setTitle(call.getString("androidTitle", "الدخول بالبصمة"))
                .setSubtitle(call.getString("androidSubtitle", "استخدم بصمة إصبعك للتحقق من هويتك"))
                .setNegativeButtonText(call.getString("cancelTitle", "إلغاء"));
        if (allowDeviceCredential) {
            builder.setAllowedAuthenticators(AUTH_BIOMETRIC_OR_DEVICE_CREDENTIAL);
        } else {
            builder.setAllowedAuthenticators(AUTH_BIOMETRIC);
        }

        activePrompt = new BiometricPrompt(fragmentActivity, executor, new BiometricPrompt.AuthenticationCallback() {
            @Override
            public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                activePrompt = null;
                JSObject ret = new JSObject();
                ret.put("verified", true);
                call.resolve(ret);
            }

            @Override
            public void onAuthenticationError(int errorCode, CharSequence errString) {
                activePrompt = null;
                String message = errString != null ? errString.toString() : "Biometric error";
                call.reject(message, codeForError(errorCode));
            }

            @Override
            public void onAuthenticationFailed() {
                // Wrong fingerprint: the system keeps the prompt open for another
                // attempt. Stay silent so the user can retry or press "إلغاء" to
                // fall back to password login.
            }
        });

        BiometricPrompt.PromptInfo promptInfo = builder.build();
        activePrompt.authenticate(promptInfo);
    }

    /**
     * Encrypts a string with an AES-256-GCM key held in the Android Keystore.
     * The key is non-extractable and never leaves secure hardware-backed
     * storage; we use it to protect the refresh token at rest inside
     * Preferences. Biometric data itself is never read, stored or sent.
     * Returns { iv, ciphertext } as base64.
     */
    @PluginMethod
    public void encrypt(PluginCall call) {
        String plaintext = call.getString("data");
        if (plaintext == null) {
            call.reject("Missing data", "invalidArgument");
            return;
        }
        try {
            SecretKey key = getOrCreateKey();
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, key);
            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

            JSObject ret = new JSObject();
            ret.put("iv", Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP));
            ret.put("ciphertext", Base64.encodeToString(ciphertext, Base64.NO_WRAP));
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Unable to secure data on this device", "encryptFailed");
        }
    }

    /**
     * Decrypts a value previously produced by encrypt(). Rejects with
     * "decryptFailed" if the Keystore key is gone (factory reset, app data
     * cleared, or device lock changed) so callers can safely drop the record.
     */
    @PluginMethod
    public void decrypt(PluginCall call) {
        String ivB64 = call.getString("iv");
        String ciphertextB64 = call.getString("ciphertext");
        if (ivB64 == null || ciphertextB64 == null) {
            call.reject("Missing iv or ciphertext", "invalidArgument");
            return;
        }
        try {
            SecretKey key = getOrCreateKey();
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, key,
                    new GCMParameterSpec(128, Base64.decode(ivB64, Base64.NO_WRAP)));
            byte[] plaintext = cipher.doFinal(Base64.decode(ciphertextB64, Base64.NO_WRAP));
            JSObject ret = new JSObject();
            ret.put("data", new String(plaintext, StandardCharsets.UTF_8));
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Stored credentials are no longer accessible", "decryptFailed");
        }
    }

    private static SecretKey getOrCreateKey() throws Exception {
        KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
        keyStore.load(null);
        KeyStore.SecretKeyEntry entry =
                (KeyStore.SecretKeyEntry) keyStore.getEntry(KEYSTORE_ALIAS, null);
        if (entry != null) {
            return entry.getSecretKey();
        }
        KeyGenerator keyGenerator =
                KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE);
        keyGenerator.init(new KeyGenParameterSpec.Builder(
                KEYSTORE_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build());
        return keyGenerator.generateKey();
    }

    @Override
    protected void handleOnDestroy() {
        if (activePrompt != null) {
            activePrompt.cancelAuthentication();
            activePrompt = null;
        }
    }

    private static String codeForCheck(int check) {
        switch (check) {
            case BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED:
                return "notEnrolled";
            case BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE:
                return "notAvailable";
            case BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE:
                return "hardwareUnavailable";
            case BiometricManager.BIOMETRIC_ERROR_SECURITY_UPDATE_REQUIRED:
                return "securityUpdateRequired";
            case BiometricManager.BIOMETRIC_STATUS_UNKNOWN:
                return "unknown";
            default:
                return "unavailable";
        }
    }

    private static String describeCheck(int check) {
        switch (check) {
            case BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED:
                return "لا توجد بصمة مسجلة على هذا الجهاز. سجّل بصمتك من إعدادات جهازك أولاً";
            case BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE:
                return "هذا الجهاز لا يدعم التحقق بالبصمة";
            case BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE:
                return "مستشعر البصمة غير متاح حالياً على هذا الجهاز";
            case BiometricManager.BIOMETRIC_ERROR_SECURITY_UPDATE_REQUIRED:
                return "يتطلب الجهاز تحديث أمني قبل استخدام البصمة";
            default:
                return "التحقق بالبصمة غير متاح حالياً";
        }
    }

    private static String codeForError(int errorCode) {
        switch (errorCode) {
            case BiometricPrompt.ERROR_NEGATIVE_BUTTON:
            case BiometricPrompt.ERROR_USER_CANCELED:
            case BiometricPrompt.ERROR_CANCELED:
                return "userCancel";
            case BiometricPrompt.ERROR_LOCKOUT:
            case BiometricPrompt.ERROR_LOCKOUT_PERMANENT:
                return "lockout";
            case BiometricPrompt.ERROR_NO_BIOMETRICS:
            case BiometricPrompt.ERROR_NO_DEVICE_CREDENTIAL:
                return "notEnrolled";
            case BiometricPrompt.ERROR_HW_UNAVAILABLE:
                return "hardwareUnavailable";
            case BiometricPrompt.ERROR_HW_NOT_PRESENT:
                return "notAvailable";
            case BiometricPrompt.ERROR_SECURITY_UPDATE_REQUIRED:
                return "securityUpdateRequired";
            case BiometricPrompt.ERROR_TIMEOUT:
                return "timeout";
            default:
                return "error";
        }
    }
}
