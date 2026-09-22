#!/usr/bin/env node
/**
 * Make Expo's iOS sources compile on the Xcode the CI runner actually has.
 *
 * No Xcode on the image builds it as shipped. Every one was tried:
 *
 *   16.4  Swift tools too old — SwiftPM cannot even resolve the package
 *   26.0  Swift 6.2.0  — rejects `weak let`
 *   26.1  Swift 6.2.1  — rejects `weak let`
 *   26.2  Swift 6.2.3  — takes `weak let`, but the package's Swift 6 language
 *                        mode raises eight "sending '…Ptr' risks causing data
 *                        races" in JavaScriptRuntime.swift
 *   26.3  Swift 6.2.x  — the same, plus a C++ interop error
 *
 * `weak let` cannot simply become `weak var`: these classes conform to
 * Sendable, which requires immutable stored properties, so `var` trades one
 * compile error for another ("stored property 'runtime' of
 * 'Sendable'-conforming class is mutable"). It is load-bearing, which rules
 * out 26.0 and 26.1 entirely.
 *
 * So the build runs on 26.2, and what it cannot swallow is the language mode.
 * Dropping to v5 turns the data-race diagnostics back into warnings.
 *
 * Dropping the mode also switches off every other feature Swift 6 turns on by
 * default, and the package uses two of them. Both are put back explicitly, so
 * the only thing v5 actually loosens here is the data-race checking:
 *
 *   BareSlashRegexLiterals   the `/^[a-zA-Z_$]…$/` guarding createClass()
 *                            against injection via eval, which v5 reads as
 *                            division: "'$' is not a valid digit"
 *   IsolatedDefaultValues    JavaScriptPromise's `let longLivedState =
 *                            LongLivedState()`, whose initialiser is
 *                            @JavaScriptActor-isolated and which v5 evaluates
 *                            in a nonisolated context
 *
 * All of this is Expo's to fix; 57.1.0 is the newest inside SDK 57 and still
 * has it. Every edit below is idempotent, silent when there is nothing to do,
 * and never fails an install — when Expo ships a fix the patterns stop
 * matching and this quietly stops doing anything.
 */
const fs = require('fs');
const path = require('path');

const MODULES = path.join(__dirname, '..', 'node_modules');
const ROOT = path.join(MODULES, 'expo-modules-jsi');

const EVENT_EMITTER = path.join(
  MODULES,
  'expo-modules-core',
  'ios',
  'Core',
  'Events',
  'EventEmitter.swift',
);

const PACKAGE = path.join(ROOT, 'apple', 'Package.swift');

const HEADER = path.join(
  ROOT,
  'apple',
  'Sources',
  'ExpoModulesJSI-Cxx',
  'include',
  'RuntimeScheduler.h',
);

/** The features Swift 6 would have enabled, and which the sources rely on. */
const RESTORED = ['BareSlashRegexLiterals', 'IsolatedDefaultValues'];

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
  console.log(`[patch-expo-ios] ${note}`);
}

function main() {
  edit(
    PACKAGE,
    /swiftLanguageModes:\s*\[\s*\.v6\s*\]/,
    'swiftLanguageModes: [.v5]',
    'Swift language mode v6 -> v5, so the data-race checks warn instead of failing.',
  );

  // Anchored on the last feature the package enables itself, so the restored
  // ones land inside the right target's swiftSettings and nowhere else.
  const anchor = '.enableUpcomingFeature("InferIsolatedConformances"),';

  for (const feature of RESTORED) {
    edit(
      PACKAGE,
      new RegExp(
        `${anchor.replace(/[.()"]/g, '\\$&')}(?![\\s\\S]*?${feature})`,
      ),
      `${anchor}\n        .enableUpcomingFeature("${feature}"),`,
      `put ${feature} back, which v5 would otherwise switch off.`,
    );
  }

  // expo-modules-core, built from source now that the prebuilt xcframeworks are
  // off, fails the same Swift 6.2 region-isolation check in two places:
  //
  //   EventEmitter.swift:52  sending 'emitter' risks causing data races
  //   EventEmitter.swift:79  the same
  //
  // Both are `nonisolated(unsafe) weak let emitter = self` captured by the
  // @JavaScriptActor closure `runtime.schedule` takes. The compiler's note says
  // exactly why the annotation does not help: "task-isolated 'emitter' is
  // captured by a global actor 'JavaScriptActor'-isolated closure".
  // `nonisolated(unsafe)` says a value is not actor-isolated; it does not make
  // it Sendable, and region isolation will not let a task-isolated
  // non-Sendable value cross into an actor-isolated closure whatever it is
  // annotated with.
  //
  // Expo's own reasoning there is unchanged and still holds — the closure only
  // reaches @JavaScriptActor-isolated or Sendable state through the emitter,
  // never the module's own mutable state — so the promise is simply moved to
  // the one place the compiler accepts it: a type. The reference stays weak, so
  // scheduling an event still cannot keep a module alive.
  edit(
    EVENT_EMITTER,
    /nonisolated\(unsafe\) weak let emitter = self/g,
    'let emitter = UncheckedWeakRef(self)',
    'boxed EventEmitter\'s weak self so it can cross into the JS actor.',
  );

  edit(
    EVENT_EMITTER,
    /guard let emitter else \{/g,
    'guard let emitter = emitter.value else {',
    'unwrapped the boxed emitter.',
  );

  edit(
    EVENT_EMITTER,
    /guard let emitter, let appContext else \{/g,
    'guard let emitter = emitter.value, let appContext else {',
    'unwrapped the boxed emitter beside appContext.',
  );

  // Appended rather than inserted, so it cannot land inside a declaration.
  if (fs.existsSync(EVENT_EMITTER)) {
    const source = fs.readFileSync(EVENT_EMITTER, 'utf8');

    if (source.includes('UncheckedWeakRef(') && !source.includes('final class UncheckedWeakRef')) {
      fs.appendFileSync(
        EVENT_EMITTER,
        [
          '',
          '/**',
          ' A weak reference that region isolation will let cross into a',
          ' `@JavaScriptActor`-isolated closure. See the notes on `emit` above: what is',
          ' reached through the emitter there is `@JavaScriptActor`-isolated or `Sendable`,',
          ' never the module\'s own mutable state.',
          ' */',
          'private final class UncheckedWeakRef<T: AnyObject>: @unchecked Sendable {',
          '  weak var value: T?',
          '',
          '  init(_ value: T?) {',
          '    self.value = value',
          '  }',
          '}',
          '',
        ].join('\n'),
        'utf8',
      );
      console.log('[patch-expo-ios] added the weak box EventEmitter now uses.');
    }
  }

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
