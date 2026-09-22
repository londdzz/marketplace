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

const ACTOR = path.join(
  ROOT,
  'apple',
  'Sources',
  'ExpoModulesJSI',
  'Runtime',
  'JavaScriptActor.swift',
);

/**
 * Each fix: the file, what to find, what to put, and why it is safe.
 *
 * @type {{file: string, find: RegExp, put: string, note: string}[]}
 */
const FIXES = [
  {
    file: ACTOR,
    // `weak let` is sugar a later Swift 6.2 point release added. The property
    // is assigned once in init and never again, so `weak var` is the same
    // reference with the same lifetime — only the reassignment ban is lifted.
    find: /\bweak let\b/g,
    put: 'weak var',
    note: "weak let -> weak var, which Swift 6.2.1 and earlier require",
  },
  {
    file: HEADER,
    // Only on a constructor — never on anything else that may be annotated.
    // Redundant: Swift imports a constructor of a shared-reference type as
    // returning +1 already, which the class's refCount starting at 1 expects.
    find: /SWIFT_RETURNS_RETAINED\s+(RuntimeScheduler\s*\()/g,
    put: '$1',
    note: 'dropped a redundant SWIFT_RETURNS_RETAINED that Xcode 26.3 rejects',
  },
];

function main() {
  for (const { file, find, put, note } of FIXES) {
    if (!fs.existsSync(file)) {
      continue; // Not installed, or the package moved it.
    }

    const source = fs.readFileSync(file, 'utf8');
    const patched = source.replace(find, put);

    if (patched === source) {
      continue; // Already done, or fixed upstream.
    }

    fs.writeFileSync(file, patched, 'utf8');
    console.log(`[patch-expo-jsi] ${note}.`);
  }
}

main();
