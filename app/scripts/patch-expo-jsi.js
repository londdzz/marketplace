#!/usr/bin/env node
/**
 * Make expo-modules-jsi compile on the Xcode the CI runner actually has.
 *
 * No Xcode on the image builds it as shipped. Every one was tried:
 *
 *   26.0  Swift 6.2.0  — rejects `weak let`
 *   26.1  Swift 6.2.1  — rejects `weak let`
 *   26.2  Swift 6.2.3  — takes `weak let`, but Swift 6 language mode raises
 *                        eight "sending '…Ptr' risks causing data races" in
 *                        JavaScriptRuntime.swift
 *   26.3  Swift 6.2.x  — the same, plus a C++ interop error
 *
 * `weak let` cannot simply become `weak var`: these classes conform to
 * Sendable, which requires immutable stored properties, so `var` trades one
 * compile error for another ("stored property 'runtime' of
 * 'Sendable'-conforming class is mutable"). It is load-bearing. That rules
 * out 26.0 and 26.1 entirely.
 *
 * So the build runs on 26.2, and what it cannot swallow is the package's
 * Swift 6 language mode. Dropping to v5 turns the data-race diagnostics back
 * into warnings. It is a real loosening — those checks exist for a reason —
 * but the alternative is annotating pointer handoffs inside a JS bridging
 * layer on a guess, which is a worse thing to get wrong. The upcoming
 * features the package opts into explicitly are untouched, so actor
 * isolation still applies.
 *
 * All of this is Expo's to fix; 57.1.0 is the newest inside SDK 57 and still
 * has it. Every edit below is idempotent, silent when there is nothing to do,
 * and never fails an install — when Expo ships a fix the patterns stop
 * matching and this quietly stops doing anything.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'node_modules', 'expo-modules-jsi');

const PACKAGE = path.join(ROOT, 'apple', 'Package.swift');

const HEADER = path.join(
  ROOT,
  'apple',
  'Sources',
  'ExpoModulesJSI-Cxx',
  'include',
  'RuntimeScheduler.h',
);

/** Applies one replacement to one file, reporting only when it changed it. */
function edit(file, find, put, note) {
  if (!fs.existsSync(file)) {
    return;
  }

  const source = fs.readFileSync(file, 'utf8');
  const patched = source.replace(find, put);

  if (patched === source) {
    return; // Already done, or fixed upstream.
  }

  fs.writeFileSync(file, patched, 'utf8');
  console.log(`[patch-expo-jsi] ${note}`);
}

function main() {
  edit(
    PACKAGE,
    /swiftLanguageModes:\s*\[\s*\.v6\s*\]/,
    'swiftLanguageModes: [.v5]',
    'Swift language mode v6 -> v5, so the data-race checks warn instead of failing.',
  );

  edit(
    HEADER,
    // Redundant on a constructor: Swift imports one of a shared-reference
    // type as returning +1 already, which the class's refCount starting at 1
    // expects. Only 26.3 rejects it, but it costs nothing to remove.
    /SWIFT_RETURNS_RETAINED\s+(RuntimeScheduler\s*\()/g,
    '$1',
    'dropped a redundant SWIFT_RETURNS_RETAINED.',
  );
}

main();
