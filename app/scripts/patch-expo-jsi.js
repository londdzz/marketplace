#!/usr/bin/env node
/**
 * Make expo-modules-jsi compile on the Xcode the CI runner actually has.
 *
 * No version installed there builds it as shipped. Swift 6.2.0 and 6.2.1
 * (Xcode 26.0, 26.1) reject `weak let`, which the package uses; 6.2.3
 * (Xcode 26.2, 26.3) accepts it but raises a dozen strict-concurrency errors
 * in JavaScriptRuntime.swift, and 26.3 adds a C++ interop one on top. The
 * band the package was written for is not on the image.
 *
 * So the build runs on 26.1 — the newest that does not raise the concurrency
 * errors — and the one thing 26.1 cannot swallow is fixed here.
 *
 * Its RuntimeScheduler.h marks the two constructors SWIFT_RETURNS_RETAINED.
 * From 26.3 clang rejects that:
 *
 *   'RuntimeScheduler' cannot be annotated with either SWIFT_RETURNS_RETAINED
 *   or SWIFT_RETURNS_UNRETAINED because it is not returning a
 *   SWIFT_SHARED_REFERENCE type
 *
 * The class *is* a shared reference — it carries
 * SWIFT_SHARED_REFERENCE(retainRuntimeScheduler, releaseRuntimeScheduler) —
 * but that attribute is written on the closing brace, so the class is not
 * known to be one until it has been parsed in full, and the constructors are
 * checked on the way past. Older toolchains did not make the check.
 *
 * The annotation is redundant regardless: Swift imports a constructor of a
 * shared-reference type as returning +1 already, which is what the class's
 * refCount starting at 1 expects. So it comes off, and nothing about the
 * object's lifetime changes.
 *
 * (Forward-declaring the retain and release functions above the class does
 * not help — tried, and the error simply moves down by the number of lines
 * inserted. The ordering that matters is the attribute's, not theirs.)
 *
 * Runs from postinstall. It is idempotent, silent when there is nothing to
 * do, and never fails an install: when Expo fixes this upstream the pattern
 * stops matching and this quietly does nothing.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'node_modules', 'expo-modules-jsi');

const HEADER = path.join(
  ROOT,
  'apple',
  'Sources',
  'ExpoModulesJSI-Cxx',
  'include',
  'RuntimeScheduler.h',
);

const SOURCES = path.join(ROOT, 'apple', 'Sources');

/** `weak let` is sugar a later Swift 6.2 point release added. */
const WEAK_LET = /\bweak let\b/g;

/** Every .swift under a directory. */
function swiftFilesIn(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return swiftFilesIn(full);
    }

    return entry.isFile() && entry.name.endsWith('.swift') ? [full] : [];
  });
}

/**
 * Swift 6.2.1 and earlier require `weak var`. Every one of these properties
 * is assigned in an initialiser and never again, so `var` is the same
 * reference with the same lifetime — it only lifts the reassignment ban.
 *
 * Swept rather than listed by name: the first pass named one file and the
 * build then failed on a second, in a different directory.
 */
function fixWeakLet() {
  let files = 0;

  for (const file of swiftFilesIn(SOURCES)) {
    const source = fs.readFileSync(file, 'utf8');

    if (!WEAK_LET.test(source)) {
      WEAK_LET.lastIndex = 0;
      continue;
    }

    WEAK_LET.lastIndex = 0;
    fs.writeFileSync(file, source.replace(WEAK_LET, 'weak var'), 'utf8');
    files += 1;
  }

  if (files > 0) {
    console.log(`[patch-expo-jsi] weak let -> weak var in ${files} file(s), for Swift 6.2.1.`);
  }
}

/**
 * Redundant on a constructor: Swift imports a constructor of a
 * shared-reference type as returning +1 already, which the class's refCount
 * starting at 1 expects. Xcode 26.3 rejects it outright.
 */
function fixReturnsRetained() {
  if (!fs.existsSync(HEADER)) {
    return;
  }

  const source = fs.readFileSync(HEADER, 'utf8');
  const patched = source.replace(/SWIFT_RETURNS_RETAINED\s+(RuntimeScheduler\s*\()/g, '$1');

  if (patched !== source) {
    fs.writeFileSync(HEADER, patched, 'utf8');
    console.log('[patch-expo-jsi] dropped a redundant SWIFT_RETURNS_RETAINED.');
  }
}

function main() {
  fixWeakLet();
  fixReturnsRetained();
}

main();
