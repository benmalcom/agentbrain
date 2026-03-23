# AgentBrain Deployment & Testing Guide

How to test and deploy AgentBrain as a real npm package.

---

## Testing Locally (No Publishing Required)

### Option 1: Global Install from Local Build

Install directly from your local files:

```bash
# From agentbrain directory
npm install -g .

# Test anywhere
cd ~/some-other-project
agentbrain --help
agentbrain init --dry-run
```

**Pros:**
- ✅ Tests the real installation experience
- ✅ Works immediately
- ✅ No publishing required

**Cons:**
- ❌ Changes require reinstalling
- ❌ Only available on your machine

**To update after changes:**
```bash
cd /path/to/agentbrain
npm run build
npm install -g .
```

---

### Option 2: npm link (Best for Active Development)

Creates a symlink so changes are immediately reflected:

```bash
# Step 1: Link agentbrain
cd /path/to/agentbrain
npm link

# Step 2: Use it anywhere
cd ~/some-other-project
agentbrain --help

# Step 3: After making changes, just rebuild
cd /path/to/agentbrain
npm run build
# Changes immediately available (no reinstall needed!)

# Step 4: Unlink when done
npm unlink -g agentbrain
```

**Pros:**
- ✅ Changes immediately reflected after rebuild
- ✅ No need to reinstall
- ✅ Perfect for development

**Cons:**
- ❌ Can be confusing if you forget it's linked
- ❌ Only available on your machine

---

### Option 3: Test in Another Project via Local Path

Install as a dependency in a test project:

```bash
# In your test project
npm install /path/to/agentbrain/packages/cli
npm install /path/to/agentbrain/packages/core
npm install /path/to/agentbrain/packages/mcp-server

# Use in code
import { generateContext } from '@agentbrain/core'
```

Or in package.json:
```json
{
  "dependencies": {
    "@agentbrain/core": "file:../agentbrain/packages/core",
    "@agentbrain/cli": "file:../agentbrain/packages/cli"
  }
}
```

**Pros:**
- ✅ Tests as a library dependency
- ✅ No publishing required

**Cons:**
- ❌ Requires relative paths
- ❌ Not shareable

---

## Publishing to npm (Make it Public)

### Prerequisites

1. **Create npm account**: https://www.npmjs.com/signup
2. **Login to npm:**
   ```bash
   npm login
   ```
3. **Check package names are available:**
   ```bash
   npm search @agentbrain/core
   npm search @agentbrain/cli
   npm search @agentbrain/mcp-server
   ```

### Option A: Publish to Public npm Registry

```bash
# Make sure you're logged in
npm whoami

# Build everything
npm run build

# Publish core first (other packages depend on it)
cd packages/core
npm publish --access public

# Publish cli
cd ../cli
npm publish --access public

# Publish mcp-server
cd ../mcp-server
npm publish --access public

# Install from real npm
npm install -g @agentbrain/cli
```

**Pros:**
- ✅ Available to everyone worldwide
- ✅ Easy to install: `npm install -g @agentbrain/cli`
- ✅ Versioning and updates

**Cons:**
- ❌ Name must be unique on npm
- ❌ Public (everyone can see your code)
- ❌ Need to maintain it

**Cost:** Free for public packages

---

### Option B: Publish to Private npm Registry (Requires npm Pro)

Same as above, but:
```bash
npm publish  # Without --access public
```

**Cost:** $7/month for npm Pro (includes private packages)

---

### Option C: Use GitHub Packages

Free private packages via GitHub:

1. **Create GitHub repo** for agentbrain

2. **Update package.json files** to use GitHub registry:
   ```json
   {
     "name": "@benmalcom/agentbrain-core",
     "publishConfig": {
       "registry": "https://npm.pkg.github.com"
     }
   }
   ```

3. **Authenticate:**
   ```bash
   npm login --registry=https://npm.pkg.github.com
   ```

4. **Publish:**
   ```bash
   npm publish
   ```

5. **Install:**
   ```bash
   npm install -g @benmalcom/agentbrain-cli --registry=https://npm.pkg.github.com
   ```

**Pros:**
- ✅ Free private packages
- ✅ Integrated with GitHub

**Cons:**
- ❌ Requires GitHub account
- ❌ Need to configure registry for installation

---

## Recommended Testing Workflow

### Phase 1: Local Testing (Do This First!)

```bash
# 1. Install globally from local build
cd /path/to/agentbrain
npm run build
npm install -g .

# 2. Create a test directory
mkdir ~/agentbrain-test
cd ~/agentbrain-test
git init
echo "# Test Project" > README.md
echo "console.log('test')" > index.js

# 3. Test all commands
agentbrain config --show
agentbrain init --dry-run
# (add API key if you have one)
agentbrain init
agentbrain standards
agentbrain handoff

# 4. Verify outputs
ls -la agentbrain/
cat agentbrain/context.md
```

### Phase 2: Test on Real Projects

```bash
# Test on small projects first
cd ~/my-small-project
agentbrain init --dry-run
agentbrain init

# Then medium projects
cd ~/my-medium-project
agentbrain init --dry-run
agentbrain init

# Check for issues:
# - Does it handle large repos?
# - Are costs reasonable?
# - Are outputs useful?
```

### Phase 3: Get Feedback

Share with friends/colleagues:

```bash
# Option A: Share built files via zip
cd /path/to/agentbrain
npm run build
tar -czf agentbrain.tar.gz .
# Send agentbrain.tar.gz to someone

# They unzip and install:
tar -xzf agentbrain.tar.gz
cd agentbrain
npm install -g .
```

```bash
# Option B: Share via GitHub
git push origin main
# They clone and install:
git clone https://github.com/you/agentbrain
cd agentbrain
npm install
npm run build
npm install -g .
```

### Phase 4: Publish (When Ready)

Only publish when you're confident it works well:

```bash
# Final checks
npm run build
npm run typecheck
./test-comprehensive.sh

# Publish to npm
npm login
cd packages/core && npm publish --access public
cd ../cli && npm publish --access public
cd ../mcp-server && npm publish --access public

# Announce
echo "🎉 AgentBrain is live! npm install -g @agentbrain/cli"
```

---

## Testing the MCP Server

### With Claude Desktop

1. **Update Claude Desktop config:**
   ```json
   {
     "mcpServers": {
       "agentbrain": {
         "command": "npx",
         "args": ["-y", "@agentbrain/mcp-server"]
       }
     }
   }
   ```

2. **Restart Claude Desktop**

**Note:** No installation needed - `npx` handles package resolution automatically.

### With Cursor / Windsurf

Use the same `npx` approach - check their docs for MCP server configuration file locations.

---

## Quick Commands Reference

```bash
# Install from local
npm install -g .

# Install from npm (after publishing)
npm install -g @agentbrain/cli

# Link for development
npm link

# Uninstall
npm uninstall -g agentbrain

# Check what's installed
npm list -g --depth=0 | grep agentbrain

# Where is it installed?
which agentbrain
```

---

## Troubleshooting

### "Permission denied" when installing globally

```bash
# Option 1: Use sudo (not recommended)
sudo npm install -g .

# Option 2: Fix npm permissions (recommended)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### "Command not found: agentbrain"

```bash
# Check if installed
npm list -g @agentbrain/cli

# Check PATH
echo $PATH

# Reinstall
npm install -g .
```

### Changes not reflected after rebuild

```bash
# If using npm link
npm unlink -g agentbrain
npm link

# If using npm install -g
npm uninstall -g agentbrain
npm install -g .
```

---

## Cost Comparison

| Method | Cost | Ease | Use Case |
|--------|------|------|----------|
| Local install | Free | Easy | Personal testing |
| npm link | Free | Easy | Active development |
| npm (public) | Free | Medium | Share with world |
| npm (private) | $7/mo | Medium | Private teams |
| GitHub Packages | Free | Medium | GitHub users |
| Share .tar.gz | Free | Hard | One-off sharing |

---

## My Recommendation

**For now (testing):**
```bash
npm install -g .
```

**When ready to share:**
1. Push to GitHub (free, easy to share)
2. Publish to npm public registry (free, widely accessible)
3. Add installation instructions to README

**Long term:**
- Keep it on npm for easy installation
- Use semantic versioning (1.0.0 → 1.0.1 → 1.1.0 → 2.0.0)
- Publish updates with `npm version patch && npm publish`
