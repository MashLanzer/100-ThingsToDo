# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# capacitor-firebase-authentication includes optional Facebook provider
# that we don't use — suppress missing class errors from R8
-dontwarn com.facebook.**
-keep class com.facebook.** { *; }
-dontwarn com.twitter.**
-dontwarn com.github.scribejava.**
-dontwarn com.google.android.gms.auth.api.phone.**

# Capacitor core — plugins are loaded by reflection; keep all plugin classes
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep class * extends com.getcapacitor.Plugin { *; }

# Biometric auth plugin
-keep class com.aparajita.capacitor.biometricauth.** { *; }

# Push notifications plugin + Firebase Messaging
-keep class com.capacitorjs.plugins.pushnotifications.** { *; }
-keep class com.google.firebase.messaging.** { *; }
-keep class com.google.firebase.iid.** { *; }
-dontwarn com.google.firebase.messaging.**

# Firebase general (auto-init, analytics, installations)
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# AndroidX Biometric
-keep class androidx.biometric.** { *; }

# Keep all Capacitor Firebase Authentication classes already in use
-keep class com.capacitorjs.plugins.firebaseauth.** { *; }

