# AgentBrain Quick Start

Get AgentBrain running in 2 minutes.

---

## ⚡ Install & Test (Right Now!)

```bash
# 1. Install globally
cd /path/to/agentbrain
npm run build
cd packages/cli
npm install -g .

# 2. Verify installation
agentbrain --version
# Should show: 1.0.0

# 3. Test it works
agentbrain --help
# Should show all 4 commands

# 4. Test on any project
cd ~/your-project
agentbrain config --show
# Should say: "No API key configured"
```

**✅ It's installed!** AgentBrain is now a real CLI command available system-wide.

---

## 🔑 Add Your API Key

Get a key from [Anthropic](https://console.anthropic.com) or [OpenAI](https://platform.openai.com), then:

```bash
agentbrain config
# Paste your key when prompted
```

Or use environment variables:
```bash
export ANTHROPIC_API_KEY="sk-ant-..."
# or
export OPENAI_API_KEY="sk-..."
```

---

## 🚀 Generate Context (Your First Run)

```bash
# Navigate to any project
cd ~/my-project

# Preview what it would do (FREE)
agentbrain init --dry-run

# Actually generate (costs ~$0.02-0.05)
agentbrain init

# Check the results
ls agentbrain/
cat agentbrain/context.md
cat agentbrain/dependency-map.md
cat agentbrain/patterns.md
```

---

## 📋 All Commands

```bash
# Generate context docs
agentbrain init

# Generate coding standards
agentbrain standards

# Generate session handoff
agentbrain handoff

# Manage API key
agentbrain config
```

---

## 🔌 Use with Claude Desktop

1. **Add to Claude Desktop config:**

   Edit: `~/Library/Application Support/Claude/claude_desktop_config.json`

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

2. **Restart Claude Desktop** and look for the 🔌 icon

**Note:** No installation needed - `npx` handles everything automatically!

---

## 🧪 Test Suite

Run comprehensive tests:

```bash
cd /path/to/agentbrain
./test-comprehensive.sh
```

Should show: **45/47 tests passing** ✅

---

## 🗑️ Uninstall

```bash
npm uninstall -g @agentbrain/cli
npm uninstall -g @agentbrain/mcp-server
```

---

## 📚 More Info

- **Detailed Testing**: See [TESTING_GUIDE.md](./TESTING_GUIDE.md)
- **Deployment Options**: See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Test Results**: See [TEST_RESULTS.md](./TEST_RESULTS.md)

---

## ❓ Troubleshooting

### "command not found: agentbrain"

```bash
# Make sure you installed from packages/cli
cd packages/cli
npm install -g .

# Check it's in PATH
which agentbrain
```

### "No API key found"

```bash
# Set an API key
agentbrain config

# Or use environment variable
export ANTHROPIC_API_KEY="sk-ant-..."
```

### "Permission denied"

```bash
# Install to local npm prefix
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Try again
cd packages/cli
npm install -g .
```

---

## 🎉 You're Ready!

AgentBrain is installed and ready to use. Try it on a project:

```bash
cd ~/your-project
agentbrain init --dry-run
```
