<script>
  /*
    TweetComposer — dev-only inline composer for the Notes feed.

    Mounted on /tweets ONLY under import.meta.env.DEV (the page gates it),
    so it never reaches production. Posts to the dev middleware
    (/__dev/tweet), which appends to src/content/tweets.json; on success we
    reload so the new note renders through the normal content pipeline.
  */
  const MAX = 250;

  let text = $state("");
  let status = $state("idle"); // idle | saving | error
  let error = $state("");

  let remaining = $derived(MAX - text.length);
  let canSend = $derived(
    text.trim().length > 0 && remaining >= 0 && status !== "saving",
  );

  async function send() {
    if (!canSend) return;
    status = "saving";
    error = "";
    try {
      const res = await fetch("/__dev/tweet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      // Reload so the note renders from the rebuilt content collection.
      location.reload();
    } catch (e) {
      status = "error";
      error = e.message || String(e);
    }
  }

  function onKey(e) {
    // Cmd/Ctrl+Enter to post.
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") send();
  }
</script>

<div class="composer">
  <div class="composer-head">
    <span class="composer-pip" aria-hidden="true"></span>
    <span class="composer-label">New note</span>
    <span class="composer-dev">DEV</span>
  </div>
  <textarea
    class="composer-input"
    bind:value={text}
    onkeydown={onKey}
    placeholder="a short thought…"
    rows="3"
    maxlength={MAX + 40}
    aria-label="Note text"
  ></textarea>
  <div class="composer-foot">
    <span class="composer-count" class:over={remaining < 0}>
      {remaining}
    </span>
    <button class="composer-send" onclick={send} disabled={!canSend}>
      {status === "saving" ? "POSTING…" : "POST ↵"}
    </button>
  </div>
  {#if status === "error"}
    <p class="composer-error" role="alert">Could not save: {error}</p>
  {/if}
</div>

<style>
  .composer {
    margin-bottom: 32px;
    padding: 14px 16px 12px;
    background: var(--bg-raised);
    border: 1.5px solid var(--rule);
    box-shadow: 3px 3px 0 var(--rule);
    max-width: 60ch;
  }
  .composer-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
    font-family: var(--font-pixel);
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--ink-muted);
  }
  .composer-pip {
    width: 7px;
    height: 7px;
    background: var(--blue);
    box-shadow: 0 0 0 1px var(--rule);
  }
  .composer-label {
    color: var(--ink);
  }
  .composer-dev {
    margin-left: auto;
    padding: 2px 6px 1px;
    background: var(--yellow);
    color: var(--on-yellow);
    letter-spacing: 0.16em;
  }
  .composer-input {
    display: block;
    width: 100%;
    background: var(--bg-card);
    border: 1px solid var(--rule);
    color: var(--ink);
    font-family: var(--font-serif);
    font-variation-settings: "opsz" 16, "SOFT" 80, "wght" 400;
    font-size: 16px;
    line-height: 1.5;
    padding: 10px 12px;
    resize: vertical;
  }
  .composer-input:focus-visible {
    outline: 2px solid var(--em);
    outline-offset: 2px;
  }
  .composer-foot {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 14px;
    margin-top: 10px;
  }
  .composer-count {
    font-family: var(--font-pixel);
    font-size: 11px;
    color: var(--ink-muted);
    font-variant-numeric: tabular-nums;
  }
  .composer-count.over {
    color: var(--red);
  }
  .composer-send {
    font-family: var(--font-pixel);
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--on-blue);
    background: var(--blue);
    border: 1.5px solid var(--rule);
    box-shadow: 2px 2px 0 var(--rule);
    padding: 7px 12px;
    cursor: pointer;
    transition:
      transform 0.08s ease,
      box-shadow 0.08s ease;
  }
  .composer-send:hover:not(:disabled) {
    transform: translate(-1px, -1px);
    box-shadow: 3px 3px 0 var(--rule);
  }
  .composer-send:active:not(:disabled) {
    transform: translate(2px, 2px);
    box-shadow: 0 0 0 var(--rule);
  }
  .composer-send:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .composer-error {
    margin-top: 10px;
    font-family: var(--font-pixel);
    font-size: 10px;
    letter-spacing: 0.06em;
    color: var(--red);
  }

  @media (prefers-reduced-motion: reduce) {
    .composer-send {
      transition: none;
    }
  }
</style>
