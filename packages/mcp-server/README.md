# @agentbrain/mcp-server

Model Context Protocol (MCP) server for AgentBrain - connect your AI agent directly to repository intelligence.

## What is This?

This MCP server lets **Claude Desktop**, **Cursor**, and **Windsurf** access AgentBrain functionality directly from within your coding sessions. Your AI agent can automatically:

- 🔍 Scan your repository structure
- 📖 Load comprehensive codebase context
- 📋 Read coding standards
- 💾 Save session handoffs

**No CLI commands needed** - your agent does it all automatically!

---

## Installation

```bash
npm install -g @agentbrain/mcp-server
```

---

## Setup by Platform

### 🟣 Claude Desktop

#### Step 1: Edit Claude Desktop Config

**macOS:**
```bash
# Open in your text editor
code ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Or use nano
nano ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Windows:**
```bash
# The config is at:
%APPDATA%\Claude\claude_desktop_config.json
```

#### Step 2: Add AgentBrain to Config

Add this configuration:

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

**If you have other MCP servers already:**
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/files"]
    },
    "agentbrain": {
      "command": "npx",
      "args": ["-y", "@agentbrain/mcp-server"]
    }
  }
}
```

#### Step 3: Restart Claude Desktop

**Completely quit** Claude Desktop (don't just close the window):
- macOS: `Cmd + Q` or Claude → Quit Claude
- Windows: Right-click taskbar icon → Quit

Then reopen it.

#### Step 5: Verify It's Working

1. Start a new conversation in Claude Desktop
2. Look for the **🔌 icon** in the toolbar or bottom of the chat
3. Click it - you should see "agentbrain" with 4 tools:
   - `scan_repo`
   - `load_context`
   - `load_standards`
   - `save_handoff`

#### Step 6: Try It Out!

Ask Claude:
```
"Use the scan_repo tool to analyze my project at /Users/yourname/my-project"
```

Claude will automatically use the AgentBrain tools!

---

### 🔵 Cursor

#### Step 1: Open Cursor MCP Settings

1. Open Cursor
2. Press `Cmd + Shift + P` (macOS) or `Ctrl + Shift + P` (Windows/Linux)
3. Type "MCP" and select **"MCP: Configure Servers"**

Or manually edit the config file:

**macOS:**
```bash
code ~/Library/Application\ Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
```

**Linux:**
```bash
code ~/.config/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
```

**Windows:**
```bash
code %APPDATA%\Cursor\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json
```

#### Step 2: Add AgentBrain Configuration

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

#### Step 3: Restart Cursor

Completely quit and reopen Cursor.

#### Step 4: Verify

1. Open a project in Cursor
2. Open the Cursor chat (usually `Cmd + L` or `Ctrl + L`)
3. Type `@` and you should see MCP tools available
4. Or check the MCP panel in settings

#### Step 5: Use It

In Cursor chat:
```
"Scan the current repository using AgentBrain"
```

Cursor will automatically use the MCP tools!

---

### 🟢 Windsurf

#### Step 1: Open Windsurf Settings

**Method 1: Via UI**
1. Open Windsurf
2. Go to Settings (gear icon)
3. Search for "MCP" or "Model Context Protocol"
4. Add new server configuration

**Method 2: Edit Config File**

**macOS:**
```bash
code ~/Library/Application\ Support/Windsurf/User/globalStorage/windsurf-mcp/settings.json
```

**Linux:**
```bash
code ~/.config/Windsurf/User/globalStorage/windsurf-mcp/settings.json
```

**Windows:**
```bash
code %APPDATA%\Windsurf\User\globalStorage\windsurf-mcp\settings.json
```

#### Step 2: Add AgentBrain

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

#### Step 3: Restart Windsurf

Quit completely and reopen.

#### Step 4: Verify & Use

Look for MCP tools in the Windsurf interface, then ask:
```
"Use AgentBrain to scan this project"
```

---

## Available Tools

Once configured, your agent can use these 4 tools:

### 1. `scan_repo` - Analyze Repository Structure

**What it does:** Scans your repository and lists all relevant files with language and size info.

**Example prompts for your agent:**
- "Scan this repository at /path/to/project"
- "Show me the structure of my codebase"
- "What files are in this project?"

**Cost:** Free - no API calls

---

### 2. `load_context` - Load Full Context

**What it does:** Loads comprehensive documentation about your entire codebase (context.md + dependency-map.md + patterns.md).

**Example prompts:**
- "Load the context for /path/to/project"
- "Give me the full context of this codebase"
- "Load project intelligence for my app"

**Cost:**
- **First time:** ~$0.02-0.05 (generates documentation)
- **After that:** $0.00 (uses cache)

**Note:** If the context doesn't exist, it will generate it using your API key.

---

### 3. `load_standards` - Load Coding Standards

**What it does:** Loads the coding standards file for your specific agent (CLAUDE.md, .cursor/rules, or .windsurfrules).

**Example prompts:**
- "Load the coding standards for this project"
- "What are my code standards?"
- "Show me the project conventions"

**Cost:** Free - reads from disk

**Note:** Standards file must exist (create with `agentbrain standards` CLI command first).

---

### 4. `save_handoff` - Save Session Handoff

**What it does:** Analyzes your recent git changes and creates a handoff document for the next session.

**Parameters:**
- `repo_path` (required): Path to repository
- `goal` (optional): Session goal or objective
- `commit_count` (optional): Number of recent commits to include (default: 5)

**Example prompts:**
- "Save a handoff for this session"
- "Create a handoff document with goal: implemented auth"
- "Generate a session summary with the last 10 commits"

**Cost:** ~$0.01

---

## Complete Workflow Example

### Morning: Start Your Day

```
You: "Load the context for /Users/me/my-app"
Agent: *Uses load_context tool*
Agent: "I've loaded the full context. Your app is a React/TypeScript
       project with 47 files. I can see you have authentication,
       user management, and API integration modules..."

You: "What are the coding standards?"
Agent: *Uses load_standards tool*
Agent: "I've loaded the standards. You're using TypeScript with strict
       mode, Prettier for formatting, and following clean architecture
       patterns..."
```

### During Development

```
You: "Help me add a new feature for user notifications"
Agent: *Already has full context from earlier*
Agent: "Based on your current architecture, I recommend adding a
       NotificationService class in src/services/..."
```

### End of Day

```
You: "Save a handoff with goal: Implemented notification system"
Agent: *Uses save_handoff tool*
Agent: "Handoff saved to agentbrain/handoff.md!
       Summary: Added NotificationService, integrated with existing
       user system, added tests. Next steps: Add email integration
       and push notification support."
```

---

## Troubleshooting

### "AgentBrain not showing up in my agent"

**1. Verify config file location:**

**Claude Desktop (macOS):**
```bash
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**2. Check for JSON syntax errors:**
- Missing commas between entries
- Missing quotes
- Invalid path format

**3. Restart completely:**
- Don't just close the window
- Actually quit the application (Cmd+Q / Ctrl+Q)
- Reopen

**4. Check logs:**

**Claude Desktop:**
- Go to Help → Show Logs (or Developer → Show Logs)
- Look for MCP connection errors

---

### "Tool calls are failing"

**1. Check the path exists:**
```bash
# Verify the repository exists
ls ~/my-project  # or whatever path you're using
```

**2. Check API key for generation:**

If loading context for the first time:
```bash
# Check if key exists
echo $ANTHROPIC_API_KEY

# Or
agentbrain config --show
```

**3. Check the repo exists:**
```bash
ls /path/to/your/project
```

---

## Configuration Examples

### Minimal Configuration (Recommended)

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

### With Environment Variables

```json
{
  "mcpServers": {
    "agentbrain": {
      "command": "npx",
      "args": ["-y", "@agentbrain/mcp-server"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-..."
      }
    }
  }
}
```

### Multiple MCP Servers

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/me/projects"]
    },
    "agentbrain": {
      "command": "npx",
      "args": ["-y", "@agentbrain/mcp-server"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "ghp_..."
      }
    }
  }
}
```

---

## Tips for Best Results

### 1. Generate Context First

Before using the MCP server, generate context once via CLI:

```bash
cd /path/to/project
agentbrain init
```

This creates the cache, making MCP tool calls instant and free.

### 2. Paths Are Flexible

AgentBrain automatically handles different path formats:
```
✅ "Load context for /Users/me/my-project"   (absolute)
✅ "Load context for ~/my-project"           (~ expansion)
✅ "Load context for ../my-project"          (relative)
```

All three work! The MCP server automatically expands them.

### 3. Generate Standards

Create standards files so `load_standards` works:
```bash
cd /path/to/project
agentbrain standards
```

### 4. Morning Routine

Start each day by asking:
```
"Load the context and standards for /Users/me/my-project"
```

This gives your agent full project awareness immediately.

---

## Frequently Asked Questions

**Q: Does this cost money?**
A: Depends on the tool:
- `scan_repo` - Free
- `load_standards` - Free
- `load_context` (cached) - Free
- `load_context` (first time) - ~$0.02-0.05
- `save_handoff` - ~$0.01

**Q: Where does it get the API key?**
A: From environment variables (`ANTHROPIC_API_KEY` or `OPENAI_API_KEY`) or from `~/.agentbrain/config.json` (set via `agentbrain config`).

**Q: Can I use this without the CLI?**
A: Yes! The MCP server works standalone. But using the CLI once to generate initial context (`agentbrain init`) will make subsequent MCP calls free and instant.

**Q: Which agent is best?**
A: All three work great:
- **Claude Desktop** - Native MCP support, excellent integration
- **Cursor** - Popular for coding, good MCP support
- **Windsurf** - Emerging option with MCP support

**Q: How do I update?**
```bash
npm update -g @agentbrain/mcp-server
```

---

## Related Packages

- **[@agentbrain/cli](../cli)** - Generate context via command line
- **[@agentbrain/core](../core)** - Core library for custom integrations

---

## Support

- **Documentation:** [Main README](../../README.md)
- **Issues:** [GitHub Issues](https://github.com/yourusername/agentbrain/issues)
- **MCP Protocol:** [modelcontextprotocol.io](https://modelcontextprotocol.io)

---

## License

MIT
