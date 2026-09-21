"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const RESUME_MAX_BYTES = 10 * 1024 * 1024;

/** "over" = a droppable file is hovering, "reject" = it is hovering but we already know we'll refuse it. */
export type DropState = "idle" | "over" | "reject";

/** Why a hovering drag will be refused — enough to label the zone honestly before the drop. */
export type RejectKind = null | "too-many" | "wrong-type" | "not-a-file";

/** The hover-time label for a refusal. The file name isn't readable yet, so these stay generic. */
export function rejectHint(why: RejectKind): string {
  if (why === "too-many") return "One file at a time";
  if (why === "not-a-file") return "That isn't a file";
  return "PDF only";
}

// Mac-specific: these are what people actually drag out of Finder when they mean "my resume".
// Naming the fix beats "invalid file" — the user can't guess that Pages/Word need an export step.
const EXPORT_FIRST = /\.(docx?|pages|rtf|odt|txt)$/i;

function mb(bytes: number) {
  return (bytes / 1024 / 1024).toFixed(1);
}

/**
 * The single gate both paths go through — the file picker and the drop zone — so a file
 * can never be accepted one way and refused the other. Returns null when the file is fine.
 */
export function resumeRejectReason(file: File, maxBytes = RESUME_MAX_BYTES): string | null {
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);

  if (!isPdf) {
    if (EXPORT_FIRST.test(file.name)) {
      return `“${file.name}” isn't a PDF. Open it and export to PDF (File ▸ Export As… ▸ PDF), then drop that.`;
    }
    return `Only PDF files — “${file.name}” isn't one.`;
  }
  if (file.size === 0) {
    return `“${file.name}” is empty — 0 bytes. Check the file and drop it again.`;
  }
  if (file.size > maxBytes) {
    return `That PDF is ${mb(file.size)} MB — the limit is ${mb(maxBytes)} MB.`;
  }
  return null;
}

interface Options {
  /** Called once with a file that already passed resumeRejectReason. */
  onFile: (file: File) => void;
  /** Where a refusal goes. Reuse the caller's existing error channel instead of growing a second one. */
  onReject: (message: string) => void;
  maxBytes?: number;
  disabled?: boolean;
  /**
   * Swallow file drops that miss the zone. Without this, Chrome navigates the tab to the
   * dropped PDF and the user loses the page they were on — the usual punishment for a near-miss.
   */
  guardWindow?: boolean;
}

/**
 * What the drag is carrying, read before the drop so the zone can turn red in advance.
 * Only the MIME type and the count are readable at this point — never the file name.
 */
function peek(dt: DataTransfer | null): { state: DropState; why: RejectKind } {
  if (!dt) return { state: "over", why: null };
  const items = Array.from(dt.items || []).filter(i => i.kind === "file");
  // Some sources expose types but not items during dragover; don't pre-refuse on no information.
  if (!items.length) {
    return dt.types?.includes("Files")
      ? { state: "over", why: null }
      : { state: "reject", why: "not-a-file" };
  }
  if (items.length > 1) return { state: "reject", why: "too-many" };
  const type = items[0].type;
  // Finder sometimes reports an empty type; only refuse on a type we positively know is wrong.
  return type && type !== "application/pdf"
    ? { state: "reject", why: "wrong-type" }
    : { state: "over", why: null };
}

export function useFileDrop({ onFile, onReject, maxBytes = RESUME_MAX_BYTES, disabled, guardWindow }: Options) {
  const [state, setState] = useState<DropState>("idle");
  const [why, setWhy] = useState<RejectKind>(null);
  // dragleave fires for every child element too, so track nesting instead of trusting a single leave.
  const depth = useRef(0);

  const reset = useCallback(() => {
    depth.current = 0;
    setState("idle");
    setWhy(null);
  }, []);

  useEffect(() => {
    // A drag that ends outside the zone (dropped elsewhere, or cancelled with Esc) can
    // skip our dragleave, which would leave the zone lit for good. End it from the window.
    const end = () => reset();
    window.addEventListener("dragend", end);
    window.addEventListener("drop", end);
    return () => {
      window.removeEventListener("dragend", end);
      window.removeEventListener("drop", end);
    };
  }, [reset]);

  useEffect(() => {
    if (!guardWindow) return;
    const stop = (e: DragEvent) => {
      if (!e.dataTransfer?.types?.includes("Files")) return; // leave text and link drags alone
      e.preventDefault();
    };
    window.addEventListener("dragover", stop);
    window.addEventListener("drop", stop);
    return () => {
      window.removeEventListener("dragover", stop);
      window.removeEventListener("drop", stop);
    };
  }, [guardWindow]);

  // While disabled (an upload already in flight) refuse the drag instead of showing a target.
  const refuse = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "none";
    reset();
  }, [reset]);

  const onDragEnter = useCallback((e: React.DragEvent) => {
    if (disabled) { refuse(e); return; }
    e.preventDefault();
    depth.current += 1;
    const next = peek(e.dataTransfer);
    setState(next.state);
    setWhy(next.why);
  }, [disabled, refuse]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (disabled) { refuse(e); return; }
    e.preventDefault(); // required, or the drop event never fires
    const next = peek(e.dataTransfer);
    if (e.dataTransfer) e.dataTransfer.dropEffect = next.state === "reject" ? "none" : "copy";
    setState(next.state);
    setWhy(next.why);
  }, [disabled, refuse]);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    depth.current -= 1;
    if (depth.current <= 0) reset();
  }, [disabled, reset]);

  const onDrop = useCallback((e: React.DragEvent) => {
    if (disabled) return;
    e.preventDefault();
    reset();

    const files = Array.from(e.dataTransfer?.files || []);
    // A drop that does nothing silently reads as a broken page, so every path below says something.
    if (!files.length) {
      onReject("That wasn't a file — drag the PDF itself out of Finder, or click Replace to browse.");
      return;
    }
    if (files.length > 1) {
      onReject(`Drop one resume — you dropped ${files.length} files.`);
      return;
    }
    const reason = resumeRejectReason(files[0], maxBytes);
    if (reason) {
      onReject(reason);
      return;
    }
    onFile(files[0]);
  }, [disabled, maxBytes, onFile, onReject, reset]);

  // Derived, so a disabled zone can never be left lit by a drag that ended without an event.
  const visible: DropState = disabled ? "idle" : state;

  return {
    state: visible,
    isOver: visible === "over",
    isReject: visible === "reject",
    /** Ready-to-render label for the refusal the zone is currently showing. */
    hint: rejectHint(why),
    dropProps: { onDragEnter, onDragOver, onDragLeave, onDrop },
  };
}
