# Windows Build Verification

ROU-048 verifies Windows packaging from a Windows VM before Onyx Writer claims Windows release support.

## Scope

This milestone is for local Windows build confidence:

- establish SSH ingress from this Mac into the Windows VM;
- verify or install the Tauri Windows build prerequisites;
- build from the public repository or a sanitized source snapshot;
- collect unsigned Windows installer artifacts;
- smoke-test the app in the Windows desktop shell;
- decide whether to add Windows packaging to the GitHub Actions release matrix.

Out of scope for this pass:

- Windows code signing;
- public Windows release publication;
- installing GitHub tokens or Tauri signing private keys on the VM;
- AppImage remediation.

## Ingress Plan

Use SSH for agent management and the existing VM display/KVM/RDP path for human visual QA.

Target acceptance:

- Windows VM IP is reachable from this Mac.
- OpenSSH Server is installed and running.
- `sshd` starts automatically.
- Windows Firewall allows TCP 22 with the narrowest practical local scope.
- The Mac public SSH key is installed for the selected Windows user.
- `ssh <user>@<windows-vm-ip>` opens a shell from this Mac.
- Remote PowerShell command execution works over SSH.

Useful Windows PowerShell commands, run as Administrator:

```powershell
Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH.Server*'
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
Start-Service sshd
Set-Service -Name sshd -StartupType Automatic
New-NetFirewallRule -Name sshd -DisplayName 'OpenSSH Server (sshd)' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22
ipconfig
```

Mac-side SSH key check:

```sh
ls ~/.ssh/*.pub
```

Mac-side SSH verification:

```sh
ssh <windows-user>@<windows-vm-ip> 'powershell -NoProfile -Command "$PSVersionTable.PSVersion; hostname"'
```

## Windows Prerequisites

Required or expected for Tauri v2 Windows packaging:

- Windows 10/11 x64 or ARM64 VM;
- Git;
- Node.js LTS and npm;
- Rust via rustup with the MSVC toolchain;
- Microsoft C++ Build Tools with Desktop development with C++;
- LLVM/Clang for native Windows ARM64 builds;
- WebView2 Runtime;
- NSIS and/or MSI packaging support as used by Tauri;
- VBSCRIPT optional feature if MSI packaging fails because Windows Script Host support is unavailable.

Inventory commands:

```powershell
systeminfo
git --version
node --version
npm --version
rustc --version
cargo --version
rustup show
where cl
reg query "HKLM\SOFTWARE\Microsoft\EdgeUpdate\Clients" /s | findstr /i WebView2
```

## Source Checkout

Preferred first source path:

```powershell
git clone https://github.com/activetwist/OnyxWriter.git $env:USERPROFILE\onyxwriter-windows-build\OnyxWriter
cd $env:USERPROFILE\onyxwriter-windows-build\OnyxWriter
```

Do not transfer or clone internal project-control files to the VM:

- `.amphion/`
- `.agents/`
- `AGENTS.md`
- `.plandocs/`
- signing keys;
- GitHub tokens;
- local environment files.

## Verification Commands

Run from the Windows source checkout:

```powershell
npm ci
npm run typecheck
npm run test
npm run build
npm run license:check
npm audit --audit-level=high
npm run tauri:check
npm run tauri:build
```

On Windows ARM64 over SSH, run Tauri commands from the Visual Studio Developer Command Prompt environment and make LLVM visible on `PATH`:

```cmd
"C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat" -arch=arm64 -host_arch=arm64
set "PATH=C:\Program Files\LLVM\bin;%PATH%"
cd /d "%USERPROFILE%\onyxwriter-windows-build\OnyxWriter"
npm run tauri:check
npm run tauri:build
```

Expected artifact search path:

```text
src-tauri\target\release\bundle\
```

Record artifact names, paths, sizes, and SHA-256 checksums after a successful build.

PowerShell checksum example:

```powershell
Get-FileHash "path\to\artifact.exe" -Algorithm SHA256
```

## Smoke QA

Minimum Windows smoke path:

- launch Onyx Writer;
- open or create an OKF bundle;
- open documents from the explorer;
- edit in Visual mode and Raw mode;
- confirm autosave/manual save behavior;
- open Settings and apply a bundled design system;
- open external links in the system browser;
- open graph view;
- render a Mermaid block if available;
- quit and relaunch to confirm session restore.

## Current Execution Notes

ROU-048 ingress discovery on this Mac:

- VM runtime: UTM
- VM name from QEMU process: `Windows11`
- Network backend: `vmnet-shared`
- Mac bridge interface: `bridge100`
- Mac bridge IP: `192.168.64.1`
- Likely Windows guest IP from ARP/MAC mapping: `192.168.64.2`
- Guest MAC from QEMU process and ARP: `82:E4:89:19:4D:FA`
- SSH test to `192.168.64.2:22`: timed out
- Ping test to `192.168.64.2`: no reply
- Follow-up SSH port test to `192.168.64.2:22`: succeeded
- SSH user supplied by operator: `Stanton`
- SSH authentication test for `Stanton@192.168.64.2`: rejected public key with `Permission denied (publickey,password,keyboard-interactive)`
- Client offered Mac key fingerprint: `SHA256:ZlheBMnZnBzltTFI0W4XhQAB+4/Z4djN2Yg35v6A1IM`

The Windows VM is reachable over SSH after installing the Mac public key in the Windows administrator key path.

Current verified host/toolchain:

- Windows VM IP: `192.168.64.2`
- Windows user: `Stanton`
- Remote identity: `win-ff9lq5vtc7o\stanton`
- Hostname: `WIN-FF9LQ5VTC7O`
- Windows version: Windows 11 Pro per VM UI; `Get-ComputerInfo` over SSH reported `WindowsProductName: Windows 10 Pro`, `WindowsVersion: 2009`, build/HAL `10.0.26100.1`, which is consistent with current Windows 11 internals.
- Architecture: ARM64
- PowerShell: `5.1.26100.8655`
- Admin rights: yes, SSH user is local administrator
- Git: `2.54.0.windows.1`
- Node.js: `v24.17.0`
- npm: `11.13.0` via `npm.cmd`; `npm.ps1` is blocked by PowerShell ExecutionPolicy
- Rust: `rustc 1.96.0`, `cargo 1.96.0`, `rustup 1.29.0`
- Active Rust toolchain: `stable-aarch64-pc-windows-msvc`
- Visual Studio Build Tools: 2022 `17.14.35`, install path `C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools`
- MSVC compiler path example: `C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC\14.44.35207\bin\Hostarm64\arm64\cl.exe`
- LLVM/Clang: `C:\Program Files\LLVM\bin\clang.exe`
- VBSCRIPT optional capability: Installed
- WebView2 Runtime: `149.0.4022.80`
- Source path: `C:\Users\Stanton\onyxwriter-windows-build\OnyxWriter`
- Verification:
  - `npm ci`: passed
  - `npm run typecheck`: passed
  - `npm run test`: passed, 54 test files / 163 tests
  - `npm run build`: passed
  - `npm run license:check`: passed
  - `npm audit --audit-level=high`: passed; one moderate DOMPurify advisory remains below the fail threshold
  - `npm run tauri:check`: passed when run through `VsDevCmd.bat` with LLVM on `PATH`
- Artifact paths:
  - `C:\Users\Stanton\onyxwriter-windows-build\OnyxWriter\src-tauri\target\release\bundle\msi\Onyx Writer_0.1.3_arm64_en-US.msi`
  - `C:\Users\Stanton\onyxwriter-windows-build\OnyxWriter\src-tauri\target\release\bundle\nsis\Onyx Writer_0.1.3_arm64-setup.exe`
- Desktop copies:
  - `C:\Users\Stanton\Desktop\OnyxWriter-Windows-ARM64\Onyx Writer_0.1.3_arm64_en-US.msi`
  - `C:\Users\Stanton\Desktop\OnyxWriter-Windows-ARM64\Onyx Writer_0.1.3_arm64-setup.exe`
- Checksums:
  - MSI: `884422F196CC4A5AE38B3017A419A488A6797FD49882B531DB31BE480CCDDF13`, 5,599,232 bytes
  - NSIS EXE: `AD1978832F2695150663BEAF5E83FD6156AB8B0C4E159E30E403CCED07FE1BB2`, 4,093,296 bytes
- Build signing note: `npm run tauri:build` produced both installers, then exited non-zero because a Tauri updater public key exists in the repository but `TAURI_SIGNING_PRIVATE_KEY` is intentionally absent from the VM. Private signing keys remain out of scope for this local VM pass.
- Smoke QA notes:
