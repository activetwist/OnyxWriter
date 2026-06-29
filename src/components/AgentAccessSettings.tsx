import { Clipboard, TerminalSquare } from "lucide-react";

interface AgentAccessSettingsProps {
  currentBundlePath: string;
}

export function AgentAccessSettings({ currentBundlePath }: AgentAccessSettingsProps) {
  const root = currentBundlePath || "/path/to/onyx-bundle";
  const cliExample = `onyx bundle validate --root "${root}" --json`;
  const mcpExample = JSON.stringify(
    {
      mcpServers: {
        onyxwriter: {
          command: "onyx-mcp",
          args: ["--root", root],
        },
      },
    },
    null,
    2,
  );

  return (
    <div className="agent-access-settings">
      <section className="settings-section">
        <h3>
          <TerminalSquare size={16} />
          <span>Local Agent Access</span>
        </h3>
        <p>
          Onyx Writer exposes governed local bundle operations through the CLI and an MCP stdio sidecar. These tools do not open a port, run
          a background server, or grant raw filesystem writes.
        </p>
      </section>
      <section className="settings-section">
        <h3>Allowed Bundle</h3>
        <p className="current-drawer-path">{currentBundlePath || "Open a bundle to generate root-specific agent configuration."}</p>
        <p>Agent writes are expected to target explicit bundle roots and preserve OKF validation, link repair, and deterministic indexes.</p>
      </section>
      <Snippet title="CLI" value={cliExample} />
      <Snippet title="MCP stdio" value={mcpExample} />
      <section className="settings-section">
        <h3>Audit</h3>
        <p>
          Governed CLI and MCP writes append operation metadata to <code>.onyx-agent-audit.jsonl</code> in the bundle root. Audit records do
          not include document content or keys.
        </p>
      </section>
    </div>
  );
}

function Snippet({ title, value }: { title: string; value: string }) {
  return (
    <section className="settings-section agent-snippet-section">
      <div className="agent-snippet-header">
        <h3>{title}</h3>
        <button className="icon-button" type="button" onClick={() => void navigator.clipboard?.writeText(value)} aria-label={`Copy ${title} snippet`}>
          <Clipboard size={16} />
        </button>
      </div>
      <pre className="agent-snippet">{value}</pre>
    </section>
  );
}
