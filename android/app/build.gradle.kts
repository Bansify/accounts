plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// Passed by the release workflow (-PversionCode= / -PversionName=).
val appVersionCode = (project.findProperty("versionCode") as String?)?.toIntOrNull() ?: 1
val appVersionName = (project.findProperty("versionName") as String?) ?: "1.0.0"

// Filled by the workflow from the organisation secrets; absent for a local build.
val keystorePass: String = System.getenv("KS_PASS").orEmpty()
val keyAliasName: String = System.getenv("K_ALIAS") ?: "bansify"
// Deliberately not named "keyPassword": inside the signingConfig block that
// name is the SigningConfig property itself, and `keyPassword = keyPassword`
// would assign null to null.
val keyPass: String = System.getenv("K_PASS") ?: keystorePass

android {
    namespace = "com.bansify.accounts"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.bansify.accounts"
        minSdk = 24
        targetSdk = 35
        versionCode = appVersionCode
        versionName = appVersionName
    }

    signingConfigs {
        if (keystorePass.isNotEmpty()) {
            create("release") {
                storeFile = file("keystore.jks")
                storePassword = keystorePass
                keyAlias = keyAliasName
                keyPassword = keyPass
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            if (keystorePass.isNotEmpty()) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

dependencies {
    implementation("com.github.Bansify:bansifywrap:1.1.0")
    // The library's splash theme inherits from an AppCompat theme, and
    // LauncherActivity is an AppCompatActivity, so the app needs it directly.
    implementation("androidx.appcompat:appcompat:1.7.0")
}
