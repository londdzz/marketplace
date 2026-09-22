#!/usr/bin/env node
/**
 * Make expo-modules-jsi compile under Xcode 26.3.
 *
 * Its RuntimeScheduler.h marks the class SWIFT_SHARED_REFERENCE(retain…,
 * release…) on the closing brace, but declares those two functions *after*
 * the class. Clang resolves the attribute where it is written, so by 26.3 it
 * cannot find them, the attribute does not apply, and the constructors —
 * which are marked SWIFT_RETURNS_RETAINED — then fail with:
 *
 *   'RuntimeScheduler' cannot be annotated with either SWIFT_RETURNS_RETAINED
 *   or SWIFT_RETURNS_UNRETAINED because it is not returning a
 *   SWIFT_SHARED_REFERENCE type
 *
 * Older toolchains let it pass, which is why this only appears now. The fix
 * is to forward-declare the two functions before the class, so the attribute
 * resolves and the retain/release semantics the author intended actually take
 * effect. Removing the annotation instead would silence the error and leave
 * Swift managing the object's lifetime on a wrong assumption.
 *
 * Runs from postinstall. It is idempotent, it is silent when there is nothing
 * to do, and it never fails an install — when Expo fixes this upstream the
 * anchor stops matching and this quietly stops doing anything.
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

const MARKER = 'Autevo: forward declarations for SWIFT_SHARED_REFERENCE';

const ANCHOR = 'namespace expo {\n';

const REPLACEMENT = `namespace expo {
class RuntimeScheduler;
} // namespace expo

// ${MARKER}.
// The attribute on the class below names these, and clang resolves it where
// it is written — which is before their definitions at the foot of the file.
inline void retainRuntimeScheduler(expo::RuntimeScheduler *scheduler);
inline void releaseRuntimeScheduler(expo::RuntimeScheduler *scheduler);

namespace expo {
`;

function main() {
  if (!fs.existsSync(HEADER)) {
    return; // Not installed, or the package moved it. Nothing to do.
  }

  const source = fs.readFileSync(HEADER, 'utf8');

  if (source.includes(MARKER)) {
    return; // Already patched.
  }

  if (!source.includes('SWIFT_RETURNS_RETAINED')) {
    return; // Fixed upstream. Leave it alone.
  }

  const at = source.indexOf(ANCHOR);

  if (at === -1) {
    console.warn(
      '[patch-expo-jsi] RuntimeScheduler.h no longer looks the way this patch expects. ' +
        'If the iOS build fails on SWIFT_RETURNS_RETAINED, this script needs revisiting.',
    );

    return;
  }

  fs.writeFileSync(
    HEADER,
    source.slice(0, at) + REPLACEMENT + source.slice(at + ANCHOR.length),
    'utf8',
  );

  console.log('[patch-expo-jsi] Patched RuntimeScheduler.h for Xcode 26.3.');
}

main();
