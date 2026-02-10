# Add project specific ProGuard rules here.
-keepattributes *Annotation*
-keepattributes EnclosingMethod
-keepattributes InnerClasses

# Firebase
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }

# Kotlin Serialization
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt
-keepclassmembers class kotlinx.serialization.json.** {
    *** Companion;
}
-keepclasseswithmembers class kotlinx.serialization.json.** {
    kotlinx.serialization.KSerializer serializer(...);
}
-keep,includedescriptorclasses class com.poverse.app.**$$serializer { *; }
-keepclassmembers class com.poverse.app.** {
    *** Companion;
}
-keepclasseswithmembers class com.poverse.app.** {
    kotlinx.serialization.KSerializer serializer(...);
}

# WebRTC
-keep class org.webrtc.** { *; }

# Room
-keep class * extends androidx.room.RoomDatabase
-keep @androidx.room.Entity class *
-dontwarn androidx.room.paging.**

# Data classes for Firebase
-keepclassmembers class com.poverse.app.data.model.** { *; }
