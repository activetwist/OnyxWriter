# Linux Build Verification

ROU-037 verifies Linux packaging on JARVIS (`sembetu@10.119.1.88`).

## Host Inventory

- Hostname: JARVIS
- Distribution: Ubuntu 24.04.4 LTS
- Architecture: x86_64
- Kernel: Linux 6.8.0-124-generic
- Disk at start: 748G available on `/`
- Shell: `/bin/bash`
- Rust: `rustc 1.96.0`, `cargo 1.96.0`
- `pkg-config`: 1.8.1
- `dpkg-deb`: available
- Passwordless sudo: unavailable

Missing from the initial noninteractive environment:

- Node.js / npm
- `patchelf`
- `appimagetool`
- DBus development package / `dbus-1.pc`
- WebKitGTK / JavaScriptCoreGTK development packages
- GTK 3 development package
- Ayatana AppIndicator development package
- librsvg development package
- OpenSSL pkg-config metadata

Ubuntu package candidates exist for the core Tauri Linux dependencies:

```sh
libwebkit2gtk-4.1-dev
libgtk-3-dev
libayatana-appindicator3-dev
librsvg2-dev
libdbus-1-dev
libxdo-dev
libssl-dev
patchelf
nodejs
npm
```

## Source Snapshot

The Linux build uses a sanitized source transfer from the local working tree rather than a GitHub clone because the local tree includes newer ROU-036 work that is not yet closed and pushed as the public snapshot.

Excluded from the remote source transfer:

- `.git/`
- `.amphion/`
- `.agent/`
- `.agents/`
- `.plandocs/`
- `.vscode/`
- `ops/`
- `node_modules/`
- `dist/`
- `src-tauri/target/`
- local environment files

Remote source path will be recorded during execution.

## Results

Remote source path:

```text
/home/sembetu/onyxwriter-linux-build/ROU-037-source
```

User-local Node install:

```text
/home/sembetu/onyxwriter-linux-build/tools/node-v24
node v24.16.0
npm 11.13.0
```

Passed on JARVIS:

```sh
npm ci
npm run typecheck
npm run test
npm run build
npm run license:check
npm audit --audit-level=high
npm run tauri:check
```

Test result:

```text
50 test files passed
143 tests passed
```

Linux package build:

```sh
npm run tauri:build
```

Build result:

```text
Built application at:
/home/sembetu/onyxwriter-linux-build/ROU-037-source/src-tauri/target/release/onyxwriter

Bundled:
/home/sembetu/onyxwriter-linux-build/ROU-037-source/src-tauri/target/release/bundle/deb/Onyx Writer_0.1.0_amd64.deb
/home/sembetu/onyxwriter-linux-build/ROU-037-source/src-tauri/target/release/bundle/rpm/Onyx Writer-0.1.0-1.x86_64.rpm
```

Collected local artifacts:

```text
.artifacts/ROU-037-linux/deb/Onyx Writer_0.1.0_amd64.deb
.artifacts/ROU-037-linux/rpm/Onyx Writer-0.1.0-1.x86_64.rpm
```

Checksums:

```text
f6e5a2bfb929c6df24bfc3934c2716f660c2d1c539f29fd2b0e9244ec2547d4e  Onyx Writer_0.1.0_amd64.deb
1fddabb39da80ecfde5619f565ed865a60272770cc69154f2a29f8be16eecec3  Onyx Writer-0.1.0-1.x86_64.rpm
```

AppImage residual:

```text
failed to bundle project `timeout: global`
```

The `.deb` and `.rpm` bundles are available for Linux QA. AppImage packaging timed out while downloading or running the external linuxdeploy/AppRun tooling and should be retried separately if AppImage distribution is required for the first public release.

## Prerequisites

JARVIS initially lacked DBus/WebKitGTK/Tauri Linux dependencies and did not allow passwordless sudo from this session. These packages were required before the successful package build:

Recommended Ubuntu prerequisite install:

```sh
sudo apt-get update
sudo apt-get install -y \
  build-essential \
  curl \
  wget \
  file \
  pkg-config \
  libdbus-1-dev \
  libwebkit2gtk-4.1-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  libxdo-dev \
  libssl-dev \
  patchelf
```

After those packages are installed, rerun from JARVIS:

```sh
export PATH="$HOME/onyxwriter-linux-build/tools/node-v24/bin:$PATH"
cd "$HOME/onyxwriter-linux-build/ROU-037-source"
npm run tauri:check
npm run tauri:build
```

Expected artifact search path:

```text
/home/sembetu/onyxwriter-linux-build/ROU-037-source/src-tauri/target/release/bundle/
```
