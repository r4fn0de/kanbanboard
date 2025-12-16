#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import readline from 'readline'

function exec(command, options = {}) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options,
    })
  } catch (error) {
    throw new Error(`Command failed: ${command}\n${error.message}`)
  }
}

function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

function readUpdaterSignature(filePath) {
  const sigPath = `${filePath}.sig`
  if (!fs.existsSync(sigPath)) {
    throw new Error(
      `Updater signature file not found: ${sigPath}. Ensure TAURI_SIGNING_PRIVATE_KEY is set (base64) and rebuild.`
    )
  }

  return fs.readFileSync(sigPath, 'utf8').trim()
}

function findBuildArtifacts() {
  const tauriDir = 'src-tauri/target/release/bundle'
  const artifacts = {
    'darwin-aarch64': null,
    'darwin-x86_64': null,
    'linux-x86_64': null,
    'windows-x86_64': null,
  }

  if (!fs.existsSync(tauriDir)) {
    return artifacts
  }

  // macOS Universal Binary (.app.tar.gz)
  const macUniversal = findFile(
    path.join(tauriDir, 'macos'),
    /Modulo(?:_.*)?\.app\.tar\.gz$/
  )
  if (macUniversal) {
    artifacts['darwin-aarch64'] = macUniversal
    artifacts['darwin-x86_64'] = macUniversal
  }

  // Linux AppImage
  const linuxAppImage = findFile(
    path.join(tauriDir, 'appimage'),
    /Modulo_.*_amd64\.AppImage\.tar\.gz$/
  )
  if (linuxAppImage) artifacts['linux-x86_64'] = linuxAppImage

  // Windows MSI
  const winMsi = findFile(
    path.join(tauriDir, 'msi'),
    /Modulo_.*_en-US\.msi\.zip$/
  )
  if (winMsi) artifacts['windows-x86_64'] = winMsi

  return artifacts
}

function findFile(dir, pattern) {
  if (!fs.existsSync(dir)) return null
  const files = fs.readdirSync(dir)
  const match = files.find(f => pattern.test(f))
  return match ? path.join(dir, match) : null
}

async function releaseApp() {
  const version = process.argv[2]

  if (!version || !version.match(/^v?\d+\.\d+\.\d+$/)) {
    console.error('❌ Usage: node scripts/release.js v1.0.1')
    console.error('   or: npm run release v1.0.1')
    process.exit(1)
  }

  const cleanVersion = version.replace('v', '')
  const tagVersion = version.startsWith('v') ? version : `v${version}`

  console.log(`🚀 Building and releasing ${tagVersion}...\n`)

  try {
    // Check environment
    console.log('🔍 Checking environment...')
    const hasGh = exec('which gh', { silent: true }).trim()
    if (!hasGh) {
      console.error('❌ GitHub CLI (gh) not found. Install with: brew install gh')
      process.exit(1)
    }
    console.log('✅ GitHub CLI found')

    // Load private key for signing
    let privateKey = process.env.TAURI_SIGNING_PRIVATE_KEY
    if (!privateKey && fs.existsSync('.env.local')) {
      const envContent = fs.readFileSync('.env.local', 'utf8')
      const match = envContent.match(
        /TAURI_SIGNING_PRIVATE_KEY=(.+?)(?:\n|$)/s
      )
      if (match) privateKey = match[1].trim()
    }

    if (!privateKey) {
      console.warn('⚠️  No TAURI_SIGNING_PRIVATE_KEY found. Build will proceed without signing.')
      console.log('   Set it via: export TAURI_SIGNING_PRIVATE_KEY="your-key"')
    }

    // Build Tauri
    console.log('\n🔨 Building Tauri application...')
    console.log('   (This may take a few minutes...)\n')
    exec('source ~/.cargo/env && npm run tauri build')
    console.log('✅ Build completed')

    // Find artifacts
    console.log('\n🔍 Finding build artifacts...')
    const artifacts = findBuildArtifacts()
    const foundArtifacts = Object.entries(artifacts).filter(
      ([, path]) => path !== null
    )

    if (foundArtifacts.length === 0) {
      console.warn(
        '⚠️  No build artifacts found. Build may have failed or not all platforms were compiled.'
      )
    } else {
      console.log(`✅ Found ${foundArtifacts.length} artifact(s):`)
      foundArtifacts.forEach(([platform, filePath]) => {
        const size = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2)
        console.log(`   • ${platform}: ${path.basename(filePath)} (${size}MB)`)
      })
    }

    // Create latest.json
    console.log('\n📝 Creating latest.json...')
    const latestJson = {
      version: cleanVersion,
      notes: `v${cleanVersion} - Release build`,
      pub_date: new Date().toISOString(),
      platforms: {},
    }

    foundArtifacts.forEach(([platform, filePath]) => {
      const fileName = path.basename(filePath)
      const signature = readUpdaterSignature(filePath)

      latestJson.platforms[platform] = {
        signature,
        url: `https://github.com/r4fn0de/kanbanboard/releases/download/${tagVersion}/${fileName}`,
      }
    })

    fs.writeFileSync('latest.json', JSON.stringify(latestJson, null, 2) + '\n')
    console.log('✅ latest.json created')

    // Create GitHub Release
    console.log('\n📦 Creating GitHub release...')
    const releaseNotes = `## v${cleanVersion}

### Changes
- Build and release artifacts
- Automatic updater support

### Installation
Download the appropriate installer for your platform from the Assets section below.

### Auto-Update
The application supports automatic updates. Check the app settings to enable auto-update checks.
`

    // Prepare release command with artifacts
    let releaseCmd = `gh release create ${tagVersion} --draft --title "v${cleanVersion}" --notes "${releaseNotes}"`

    // Add artifact files
    foundArtifacts.forEach(([, filePath]) => {
      releaseCmd += ` "${filePath}"`
    })
    releaseCmd += ' latest.json'

    exec(releaseCmd)
    console.log(`✅ GitHub release created: ${tagVersion}`)
    console.log(`   📍 Draft release: https://github.com/r4fn0de/kanbanboard/releases/tag/${tagVersion}`)

    // Copy latest.json to dist for serving
    if (fs.existsSync('dist')) {
      fs.copyFileSync('latest.json', 'dist/latest.json')
      console.log('✅ latest.json copied to dist/')
    }

    console.log(`\n🎉 Release ${tagVersion} prepared successfully!`)
    console.log('\n📋 Next steps:')
    console.log(
      '   1. Review the draft release on GitHub: https://github.com/r4fn0de/kanbanboard/releases'
    )
    console.log('   2. Publish the release when ready')
    console.log('   3. Users will receive auto-update notifications')

    console.log('\n💡 To publish the release via CLI:')
    console.log(`   gh release edit ${tagVersion} --draft=false`)
  } catch (error) {
    console.error('\n❌ Release failed:', error.message)
    process.exit(1)
  }
}

// Run if this is the main module
releaseApp()
