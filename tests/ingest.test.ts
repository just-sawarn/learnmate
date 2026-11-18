import { describe, expect, it } from "vitest";
import { extractPdf } from "@/lib/ingest/extract-pdf";
import {
  assertPageCount,
  assertUploadSize,
  IngestError,
  MAX_PAGES,
  MAX_PDF_BYTES,
} from "@/lib/ingest/limits";
import { splitPastedText } from "@/lib/ingest/split-text";
import { makePdf } from "./helpers/make-pdf";

const TEXT = "This page explains how a for loop repeats a block of code for every item.";

describe("PDF extraction", () => {
  it("extracts text page by page", async () => {
    const out = await extractPdf(
      makePdf([`${TEXT}\nSecond line one`, `${TEXT} Another page`, `${TEXT} Third`]),
    );
    expect(out.pages).toHaveLength(3);
    expect(out.pages[0]).toContain("for loop repeats");
    expect(out.pages[0]).toContain("Second line one");
    expect(out.warnings).toEqual([]);
  });

  it("warns about a single near-empty page but keeps going", async () => {
    const out = await extractPdf(makePdf([TEXT, "", TEXT, TEXT]));
    expect(out.emptyPages).toEqual([2]);
    expect(out.warnings[0]).toContain("Page 2");
  });

  it("rejects a scanned PDF where most pages have no text", async () => {
    await expect(extractPdf(makePdf(["", "", TEXT]))).rejects.toMatchObject({ code: "scanned" });
  });

  it("rejects PDFs with more than 40 pages with a clear message", async () => {
    const pages = Array.from({ length: MAX_PAGES + 1 }, () => TEXT);
    await expect(extractPdf(makePdf(pages))).rejects.toThrow(/41 pages.*up to 40/);
  });

  it("rejects non-PDF bytes", async () => {
    await expect(extractPdf(new TextEncoder().encode("not a pdf at all"))).rejects.toMatchObject({
      code: "bad_pdf",
    });
  });
});

describe("upload limits", () => {
  it("enforces the 10 MB limit", () => {
    expect(() => assertUploadSize(MAX_PDF_BYTES)).not.toThrow();
    expect(() => assertUploadSize(MAX_PDF_BYTES + 1)).toThrow(IngestError);
  });

  it("enforces the 40 page limit", () => {
    expect(() => assertPageCount(20)).not.toThrow();
    expect(() => assertPageCount(41)).toThrow(/up to 40 pages/);
  });
});

describe("pasted text splitting", () => {
  it("splits on horizontal rules", () => {
    expect(splitPastedText("one\n\n---\n\ntwo\n\n---\n\nthree")).toEqual(["one", "two", "three"]);
  });

  it("falls back to headings, then to length", () => {
    expect(splitPastedText("# A\nalpha\n## B\nbeta")).toHaveLength(2);
    const long = Array.from({ length: 30 }, (_, i) => `Paragraph ${i} ${"word ".repeat(120)}`).join(
      "\n\n",
    );
    const pages = splitPastedText(long);
    expect(pages.length).toBeGreaterThan(2);
    expect(pages.length).toBeLessThanOrEqual(MAX_PAGES);
  });

  it("never returns more than 40 sections", () => {
    const text = Array.from({ length: 50 }, (_, i) => `section ${i}`).join("\n\n---\n\n");
    expect(splitPastedText(text)).toHaveLength(MAX_PAGES);
  });
});
