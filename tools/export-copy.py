#!/usr/bin/env python3
"""Export authored static page text as source-mode Markdown."""
import argparse
from datetime import date
from html.parser import HTMLParser
from pathlib import Path
import re

SKIP = {"head", "script", "style", "svg", "canvas", "noscript", "iframe", "video", "audio"}
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}
BLOCK = {"address", "article", "aside", "button", "div", "dl", "dt", "dd", "details", "figcaption", "figure", "footer", "header", "main", "nav", "p", "section", "table"}
INLINE = {"em": "*", "i": "*", "strong": "**", "b": "**", "mark": "**"}


class Exporter(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out, self.skipping, self.lists, self.links = [], [], [], []
        self.title, self.in_title, self.heading = [], False, 0
        self.pending_space = False
        self.last_link = False
        self.quotes = 0
        self.pre, self.pre_blocks = None, []
        self.cells, self.in_thead, self.header_cells = 0, False, 0

    def add(self, text):
        if self.pre is not None: self.pre.append(text); return
        if self.pending_space:
            if self.out and not self.out[-1].endswith(("\n", " ", "\t")): self.out.append(" ")
            self.pending_space = False
        if self.quotes and text.strip() and (not self.out or self.out[-1].endswith("\n")): self.out.append("> ")
        self.out.append(text)

    def blank(self):
        if self.pre is not None or not self.out: return
        tail = "".join(self.out)
        self.out.append("\n" if tail.endswith("\n") else "\n\n")

    def line(self):
        if self.pre is None and self.out and not "".join(self.out).endswith("\n"): self.out.append("\n")

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "title": self.in_title = True; return
        if self.skipping:
            if tag not in VOID: self.skipping.append(tag)
            return
        if tag in SKIP: self.skipping.append(tag); return
        if tag == "pre": self.blank(); self.pre = []; return
        if tag in BLOCK: self.blank()
        if tag in {"h1", "h2", "h3", "h4", "h5", "h6"}:
            self.blank(); self.heading += 1; self.add("#" * int(tag[1]) + " ")
        elif tag in {"ul", "ol"}: self.lists.append([tag, 0])
        elif tag == "li":
            self.line()
            depth = max(0, len(self.lists) - 1)
            if self.lists and self.lists[-1][0] == "ol":
                self.lists[-1][1] += 1; prefix = f"{self.lists[-1][1]}. "
            else: prefix = "- "
            self.add("  " * depth + prefix)
        elif tag == "a":
            if self.last_link and not self.pending_space and self.out and not self.out[-1].endswith(("\n", " ", "\t")): self.out.append(" ")
            self.last_link = False; self.links.append(a.get("href", "")); self.add("[")
        elif tag in INLINE and self.pre is None: self.add(INLINE[tag])
        elif tag == "code" and self.pre is None: self.add("`")
        elif tag == "q": self.add("“")
        elif tag == "summary": self.add("**")
        elif tag == "thead": self.in_thead = True
        elif tag == "tr": self.line(); self.cells = 0; self.add("|")
        elif tag in {"td", "th"}:
            self.add(" " if not self.cells else "| ")
            self.cells += 1
            if self.in_thead: self.header_cells = self.cells
            if tag == "th": self.add("**")
        elif tag == "blockquote": self.blank(); self.quotes += 1
        elif tag == "br": self.add(" " if self.heading else "\n")
        elif tag == "hr": self.blank(); self.add("---"); self.blank()

    def handle_endtag(self, tag):
        if tag == "title" and self.in_title: self.in_title = False; return
        if self.skipping:
            if tag == self.skipping[-1]: self.skipping.pop()
            return
        if tag == "pre" and self.pre is not None:
            raw = "".join(self.pre)
            if raw.startswith("\n"): raw = raw[1:]
            if raw.endswith("\n"): raw = raw[:-1]
            ticks = max((len(x) for x in re.findall(r"`+", raw)), default=2) + 1
            fence = "`" * max(3, ticks)
            token = f"\x00PRE{len(self.pre_blocks)}\x00"
            self.pre_blocks.append(f"{fence}\n{raw}\n{fence}")
            self.pre = None; self.out.append(f"\n\n{token}\n\n"); return
        if tag == "a" and self.links: self.add(f"]({self.links.pop()})"); self.last_link = True
        elif tag in INLINE and self.pre is None: self.add(INLINE[tag])
        elif tag == "code" and self.pre is None: self.add("`")
        elif tag == "summary": self.add("**")
        elif tag == "th": self.add("** ")
        elif tag == "td": self.add(" ")
        elif tag == "q": self.add("”")
        elif tag in {"h1", "h2", "h3", "h4", "h5", "h6"}: self.heading -= 1; self.blank()
        elif tag == "li": self.line()
        elif tag == "tr": self.add("|"); self.line()
        elif tag == "thead":
            self.in_thead = False
            if self.header_cells: self.add("| " + " | ".join("---" for _ in range(self.header_cells)) + " |"); self.line()
        elif tag in {"ul", "ol"}:
            if self.lists: self.lists.pop()
            self.blank()
        elif tag == "blockquote": self.quotes = max(0, self.quotes - 1); self.blank()
        elif tag in BLOCK: self.blank()

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs); self.handle_endtag(tag)

    def handle_data(self, data):
        if self.in_title: self.title.append(data); return
        if self.skipping: return
        if self.pre is not None: self.pre.append(data); return
        text = re.sub(r"\s+", " ", data)
        if not text.strip():
            self.pending_space = self.pending_space or bool(self.out)
            return
        if text.startswith(" "):
            text = text.lstrip(" ")
            if self.out and not self.out[-1].endswith(("\n", " ", "\t")): self.pending_space = True
        self.last_link = False
        self.add(text)


def render(source, source_url, exported):
    parser = Exporter(); parser.feed(source); parser.close()
    body = "".join(parser.out)
    body = re.sub(r"[ \t]+\n", "\n", body)
    body = re.sub(r"\n[ \t]*\n(?:[ \t]*\n)+", "\n\n", body).strip()
    for n, code in enumerate(parser.pre_blocks): body = body.replace(f"\x00PRE{n}\x00", code)
    title = " ".join("".join(parser.title).split())
    note = (f"# {title}\n\n> Source: {source_url}\n> Exported: {exported}\n"
            "> Scope: static text from all source panels, including collapsed notes; scripts, styles, SVG/canvas renderings, and no-script fallbacks are omitted. HTML is transformed to Markdown, not a verbatim transcript of a rendered session.\n\n")
    return note + body + "\n"


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--source", required=True, type=Path)
    ap.add_argument("--output", required=True, type=Path)
    ap.add_argument("--url", required=True)
    ap.add_argument("--date", required=True, type=date.fromisoformat)
    args = ap.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(render(args.source.read_text(encoding="utf-8"), args.url, args.date.isoformat()), encoding="utf-8")


if __name__ == "__main__": main()
