# ─────────────────────────────────────────────────────────────────────────────
# android/app/proguard-rules.pro
# ProGuard / R8 rules for the PPVPicker release build.
# ─────────────────────────────────────────────────────────────────────────────

# ── React Native ──────────────────────────────────────────────────────────────
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.**    { *; }

# ── React Native WebView ──────────────────────────────────────────────────────
-keep class com.reactnativecommunity.webview.** { *; }

# ── React Navigation ─────────────────────────────────────────────────────────
-keep class com.swmansion.**  { *; }
-keep class com.th3rdwave.** { *; }

# ── Keep JS bundle entry points ───────────────────────────────────────────────
-keep class com.ppvpicker.** { *; }

# ── General Android / Kotlin ──────────────────────────────────────────────────
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-dontwarn sun.misc.**
-dontwarn java.lang.invoke.**
