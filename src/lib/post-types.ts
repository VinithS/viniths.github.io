export type PostType = "essay" | "prototype" | "note" | "photo";

/* Maps a post type to the CSS variable holding its accent colour. The
   variables resolve per-theme automatically. Photo is reserved; we do
   not yet author photo entries in the ledger. */
export const POST_TYPE_ACCENT_VAR: Record<PostType, string> = {
  essay: "var(--type-essay)",
  prototype: "var(--type-prototype)",
  note: "var(--type-note)",
  photo: "var(--type-photo)",
};

export const POST_TYPE_LABEL: Record<PostType, string> = {
  essay: "Essay",
  prototype: "Prototype",
  note: "Note",
  photo: "Photo",
};
