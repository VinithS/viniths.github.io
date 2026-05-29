<script>
  /*
    AlbumCreator — dev-only "Create album" tool for the photos mosaic.

    Mounted on /photos ONLY under import.meta.env.DEV (the page gates it),
    so it never reaches production. Flow:
      1. Pick images (multiple). Each is read client-side as a data URL and
         its natural dimensions measured (so we can send the cover `aspect`
         the justify mosaic needs, and so the server needs no image lib).
      2. Choose which image is the cover; fill title / place / month.
      3. POST JSON to the dev middleware (/__dev/album), which writes the
         files under public/photos/<slug>/ and appends to photos.json.
      4. Reload so the new album renders through the content pipeline.
  */
  // Default the month to the current one so the common path (title + images
  // → CREATE) just works; the native <input type="month"> is easy to leave
  // silently empty, which used to keep CREATE disabled with no explanation.
  const thisMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"

  let open = $state(false);
  let title = $state("");
  let place = $state("");
  let month = $state(thisMonth); // "YYYY-MM"
  let files = $state([]); // { name, alt, dataUrl, aspect }
  let coverIndex = $state(0);
  let status = $state("idle"); // idle | reading | saving | error
  let error = $state("");

  // What still blocks CREATE, in human terms — shown beside the button so a
  // disabled state always explains itself.
  let missing = $derived(
    [
      title.trim().length === 0 && "a title",
      files.length === 0 && "an image",
      !/^\d{4}-\d{2}$/.test(month) && "a month",
    ].filter(Boolean),
  );
  let busy = $derived(status === "saving" || status === "reading");
  let canCreate = $derived(missing.length === 0 && !busy);

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error(`could not read ${file.name}`));
      reader.onload = () => {
        const dataUrl = reader.result;
        const img = new Image();
        img.onerror = () => reject(new Error(`not an image: ${file.name}`));
        img.onload = () =>
          resolve({
            name: file.name,
            alt: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
            dataUrl,
            aspect: img.naturalWidth / img.naturalHeight,
          });
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  }

  async function onPick(e) {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;
    status = "reading";
    error = "";
    try {
      const read = await Promise.all(picked.map(readFile));
      files = [...files, ...read];
      status = "idle";
    } catch (err) {
      status = "error";
      error = err.message || String(err);
    }
  }

  function removeAt(i) {
    files = files.filter((_, idx) => idx !== i);
    if (coverIndex >= files.length) coverIndex = Math.max(0, files.length - 1);
  }

  async function create() {
    if (!canCreate) return;
    status = "saving";
    error = "";
    try {
      const res = await fetch("/__dev/album", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          place: place.trim(),
          date: month,
          coverIndex,
          aspect: files[coverIndex].aspect,
          images: files.map((f) => ({
            name: f.name,
            alt: f.alt,
            dataUrl: f.dataUrl,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      location.reload();
    } catch (err) {
      status = "error";
      error = err.message || String(err);
    }
  }
</script>

<div class="creator">
  <button class="creator-toggle" onclick={() => (open = !open)} aria-expanded={open}>
    <span class="creator-toggle-mark" aria-hidden="true">＋</span>
    {open ? "CLOSE" : "CREATE ALBUM"}
    <span class="creator-dev">DEV</span>
  </button>

  {#if open}
    <div class="creator-panel">
      <div class="field-row">
        <label class="field">
          <span class="field-label">Title</span>
          <input class="field-input" type="text" bind:value={title} placeholder="Album title" />
        </label>
        <label class="field">
          <span class="field-label">Place</span>
          <input class="field-input" type="text" bind:value={place} placeholder="Lisbon" />
        </label>
        <label class="field field--month">
          <span class="field-label">Month</span>
          <input class="field-input" type="month" bind:value={month} />
        </label>
      </div>

      <div class="picker">
        <label class="picker-btn">
          <input type="file" accept="image/*" multiple onchange={onPick} hidden />
          {status === "reading" ? "READING…" : "+ ADD IMAGES"}
        </label>
        <span class="picker-hint">
          {files.length} image{files.length === 1 ? "" : "s"} · click a thumb to set the cover
        </span>
      </div>

      {#if files.length}
        <div class="thumbs" role="list">
          {#each files as f, i}
            <div class="thumb-wrap" class:cover={i === coverIndex}>
              <button
                class="thumb"
                onclick={() => (coverIndex = i)}
                aria-label={`Set ${f.name} as cover`}
                title="Set as cover"
              >
                <img src={f.dataUrl} alt={f.alt} />
                {#if i === coverIndex}<span class="thumb-cover-tag">COVER</span>{/if}
              </button>
              <button class="thumb-x" onclick={() => removeAt(i)} aria-label={`Remove ${f.name}`}>
                ×
              </button>
            </div>
          {/each}
        </div>
      {/if}

      <div class="creator-foot">
        {#if status === "error"}
          <span class="creator-error" role="alert">{error}</span>
        {:else if missing.length > 0}
          <span class="creator-hint">Add {missing.join(" + ")}</span>
        {/if}
        <button class="creator-create" onclick={create} disabled={!canCreate}>
          {status === "saving" ? "CREATING…" : "CREATE"}
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .creator {
    margin-bottom: 24px;
  }

  /* Toggle: matches the hard-offset button idiom, green (photos department). */
  .creator-toggle {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-pixel);
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--on-green);
    background: var(--green);
    border: 1.5px solid var(--rule);
    box-shadow: 3px 3px 0 var(--rule);
    padding: 8px 12px;
    cursor: pointer;
    transition:
      transform 0.08s ease,
      box-shadow 0.08s ease;
  }
  .creator-toggle:hover {
    transform: translate(-1px, -1px);
    box-shadow: 4px 4px 0 var(--rule);
  }
  .creator-toggle:active {
    transform: translate(3px, 3px);
    box-shadow: 0 0 0 var(--rule);
  }
  .creator-toggle-mark {
    font-family: var(--font-serif);
    font-size: 14px;
    line-height: 0.6;
  }
  .creator-dev {
    padding: 2px 5px 1px;
    background: var(--bg-card);
    color: var(--ink-muted);
    letter-spacing: 0.16em;
    box-shadow: 0 0 0 1px var(--rule);
  }

  .creator-panel {
    margin-top: 14px;
    padding: 16px;
    background: var(--bg-raised);
    border: 1.5px solid var(--rule);
    box-shadow: 3px 3px 0 var(--rule);
  }

  .field-row {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 14px;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 5px;
    flex: 1 1 180px;
  }
  .field--month {
    flex: 0 1 160px;
  }
  .field-label {
    font-family: var(--font-pixel);
    font-size: 9px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--ink-muted);
  }
  .field-input {
    background: var(--bg-card);
    border: 1px solid var(--rule);
    color: var(--ink);
    font-family: var(--font-serif);
    font-size: 15px;
    padding: 7px 10px;
  }
  .field-input:focus-visible {
    outline: 2px solid var(--em);
    outline-offset: 2px;
  }

  .picker {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 12px;
  }
  .picker-btn {
    font-family: var(--font-pixel);
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--ink);
    background: var(--bg-card);
    border: 1.5px solid var(--rule);
    box-shadow: 2px 2px 0 var(--rule);
    padding: 7px 11px;
    cursor: pointer;
    transition:
      transform 0.08s ease,
      box-shadow 0.08s ease;
  }
  .picker-btn:hover {
    transform: translate(-1px, -1px);
    box-shadow: 3px 3px 0 var(--rule);
  }
  .picker-btn:active {
    transform: translate(2px, 2px);
    box-shadow: 0 0 0 var(--rule);
  }
  .picker-hint {
    font-family: var(--font-pixel);
    font-size: 9px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink-muted);
  }

  .thumbs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 14px;
  }
  .thumb-wrap {
    position: relative;
  }
  .thumb {
    display: block;
    width: 72px;
    height: 72px;
    padding: 0;
    border: 1.5px solid var(--rule-soft);
    background: var(--bg-inset);
    cursor: pointer;
    overflow: hidden;
  }
  .thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .thumb-wrap.cover .thumb {
    border-color: var(--rule);
    box-shadow: inset 0 0 0 2px var(--green);
  }
  .thumb-cover-tag {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    font-family: var(--font-pixel);
    font-size: 7px;
    letter-spacing: 0.12em;
    text-align: center;
    color: var(--on-green);
    background: var(--green);
    padding: 1px 0;
  }
  .thumb-x {
    position: absolute;
    top: -6px;
    right: -6px;
    width: 18px;
    height: 18px;
    display: grid;
    place-items: center;
    font-family: var(--font-serif);
    font-size: 14px;
    line-height: 1;
    color: var(--on-red);
    background: var(--red);
    border: 1px solid var(--rule);
    cursor: pointer;
  }

  .creator-foot {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 14px;
  }
  .creator-error {
    font-family: var(--font-pixel);
    font-size: 10px;
    letter-spacing: 0.06em;
    color: var(--red);
    margin-right: auto;
  }
  .creator-hint {
    font-family: var(--font-pixel);
    font-size: 9px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-muted);
    margin-right: auto;
  }
  .creator-create {
    font-family: var(--font-pixel);
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--on-green);
    background: var(--green);
    border: 1.5px solid var(--rule);
    box-shadow: 2px 2px 0 var(--rule);
    padding: 8px 14px;
    cursor: pointer;
    transition:
      transform 0.08s ease,
      box-shadow 0.08s ease;
  }
  .creator-create:hover:not(:disabled) {
    transform: translate(-1px, -1px);
    box-shadow: 3px 3px 0 var(--rule);
  }
  .creator-create:active:not(:disabled) {
    transform: translate(2px, 2px);
    box-shadow: 0 0 0 var(--rule);
  }
  .creator-create:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (prefers-reduced-motion: reduce) {
    .creator-toggle,
    .creator-create,
    .picker-btn {
      transition: none;
    }
  }
</style>
