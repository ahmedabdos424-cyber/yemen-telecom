# Capacitor WebView
-keepclassmembers class * implements android.webkit.JavascriptInterface {
    public *;
}
-keep class com.getcapacitor.** { *; }
-keep class com.yemen.telecom.** { *; }
-keep class org.apache.cordova.** { *; }

# Firebase
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-keepattributes Signature
-keepattributes *Annotation*

# Keep R8 from stripping GenericSignature
-keepattributes Exceptions,InnerClasses,EnclosingMethod

# Keep serializable
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    !static !transient <fields>;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# WebSocket / OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep class okio.** { *; }

# Firebase Auth plugins (Facebook login, AppCheck KTX — optional deps)
-dontwarn com.facebook.CallbackManager$Factory
-dontwarn com.facebook.CallbackManager
-dontwarn com.facebook.FacebookCallback
-dontwarn com.facebook.login.LoginManager
-dontwarn com.facebook.login.widget.LoginButton
-dontwarn com.google.firebase.ktx.Firebase
