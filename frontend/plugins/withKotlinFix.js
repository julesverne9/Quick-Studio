/**
 * withKotlinFix.js
 *
 * Expo config plugin that patches the generated Android Gradle build files
 * to resolve Kotlin metadata version mismatches between React Native's
 * gradle plugin (compiled with Kotlin 2.1.0+) and the project's default
 * Kotlin compiler version.
 *
 * This plugin:
 * 1. Pins the kotlin-gradle-plugin classpath to the version from gradle.properties
 * 2. Injects a global `subprojects` block with `-Xskip-metadata-version-check`
 *    so all modules (including third-party native plugins) tolerate metadata
 *    from newer Kotlin compilers.
 * 3. Adds the same compiler arg at the app module level for belt-and-suspenders safety.
 */

const { withProjectBuildGradle, withAppBuildGradle } = require("expo/config-plugins");

// ─── Root build.gradle patch ────────────────────────────────────────────────────

function withKotlinVersionPin(config) {
  return withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== "groovy") return cfg;

    let contents = cfg.modResults.contents;

    // 1. Pin kotlin-gradle-plugin to a version read from gradle.properties
    //    Replace unversioned classpath with versioned one
    if (contents.includes("classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')")) {
      // Insert ext block with kotlinVersion if not already present
      if (!contents.includes("kotlinVersion")) {
        contents = contents.replace(
          "buildscript {",
          `buildscript {\n  ext {\n    kotlinVersion = findProperty('android.kotlinVersion') ?: '2.1.20'\n  }`
        );
      }
      contents = contents.replace(
        "classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')",
        'classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:${kotlinVersion}")'
      );
    }

    // 2. Inject the global subprojects metadata-skip block if not already present
    if (!contents.includes("-Xskip-metadata-version-check")) {
      const skipBlock = `
// [withKotlinFix] Force all Kotlin compile tasks across every module
// to accept metadata from newer Kotlin compilers.
subprojects {
  afterEvaluate {
    tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
      compilerOptions {
        freeCompilerArgs.addAll([
          '-Xskip-metadata-version-check'
        ])
      }
    }
  }
}
`;
      // Insert before the final `apply plugin` lines
      const applyIdx = contents.lastIndexOf('apply plugin:');
      if (applyIdx !== -1) {
        contents = contents.slice(0, applyIdx) + skipBlock + "\n" + contents.slice(applyIdx);
      } else {
        contents += "\n" + skipBlock;
      }
    }

    cfg.modResults.contents = contents;
    return cfg;
  });
}

// ─── App build.gradle patch ─────────────────────────────────────────────────────

function withAppKotlinSkip(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== "groovy") return cfg;

    let contents = cfg.modResults.contents;

    // Add the metadata skip flag at the app module level
    if (!contents.includes("-Xskip-metadata-version-check")) {
      const skipBlock = `
// [withKotlinFix] Bypass metadata version checks in this module.
tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
  compilerOptions {
    freeCompilerArgs.addAll([
      '-Xskip-metadata-version-check'
    ])
  }
}
`;
      // Insert before the `dependencies {` block
      const depsIdx = contents.indexOf("\ndependencies {");
      if (depsIdx !== -1) {
        contents = contents.slice(0, depsIdx) + "\n" + skipBlock + contents.slice(depsIdx);
      } else {
        contents += "\n" + skipBlock;
      }
    }

    cfg.modResults.contents = contents;
    return cfg;
  });
}

// ─── Combined plugin ────────────────────────────────────────────────────────────

module.exports = function withKotlinFix(config) {
  config = withKotlinVersionPin(config);
  config = withAppKotlinSkip(config);
  return config;
};
