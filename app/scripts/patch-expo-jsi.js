#!/usr/bin/env node
/**
 * Make expo-modules-jsi compile under Xcode 26.3.
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

const HEADER = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo-modules-jsi',
  'apple',
  'Sources',
  'ExpoModulesJSI-Cxx',
  'include',
  'RuntimeScheduler.h',
);

/** Only on a constructor — never on anything else that may be annotated. */
const PATTERN = /SWIFT_RETURNS_RETAINED\s+(RuntimeScheduler\s*\()/g;

function main() {
  if (!fs.existsSync(HEADER)) {
    return; // Not installed, or the package moved it.
  }

  const source = fs.readFileSync(HEADER, 'utf8');
  const patched = source.replace(PATTERN, '$1');

  if (patched === source) {
    return; // Already done, or fixed upstream.
  }

  fs.writeFileSync(HEADER, patched, 'utf8');

  const count = (source.match(PATTERN) ?? []).length;
  console.log(`[patch-expo-jsi] Removed ${count} redundant SWIFT_RETURNS_RETAINED for Xcode 26.3.`);
}

main();
