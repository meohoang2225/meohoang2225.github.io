#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SITE = "https://truyen.meohoang.app";
const READER = `${SITE}/truyen-doc/reader.html`;
const NOVELS_JSON = path.join(ROOT, "truyen-doc/data/novels.json");
const NOVELS_DIR = path.join(ROOT, "truyen-doc/data/novels");
const PAGES_DIR = path.join(ROOT, "truyen-doc/pages");

function escapeXml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function entry(loc, lastmod) {
    return (
        "  <url>\n" +
        `    <loc>${escapeXml(loc)}</loc>\n` +
        (lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : "") +
        "  </url>"
    );
}

function readJson(file) {
    return JSON.parse(fs.readFileSync(file, "utf8").replace(/^﻿/, ""));
}

function build() {
    const novels = readJson(NOVELS_JSON);
    const urls = [];

    const newest = novels
        .map(n => n.updatedAt)
        .filter(Boolean)
        .sort()
        .pop();

    urls.push(entry(`${SITE}/truyen-doc/index.html`, newest));

    let chapterCount = 0;

    for (const novel of novels) {
        const novelUrl = `${READER}?novel=${encodeURIComponent(novel.id)}`;
        urls.push(entry(novelUrl, novel.updatedAt));

        const chaptersFile = path.join(NOVELS_DIR, novel.id, "chapters.json");

        if (!fs.existsSync(chaptersFile)) {
            continue;
        }

        for (const chapter of readJson(chaptersFile)) {
            urls.push(
                entry(
                    `${novelUrl}&chapter=${encodeURIComponent(chapter.id)}`,
                    novel.updatedAt
                )
            );
            chapterCount++;
        }
    }

    const pages = fs.existsSync(PAGES_DIR)
        ? fs.readdirSync(PAGES_DIR).filter(f => f.endsWith(".html")).sort()
        : [];

    for (const page of pages) {
        urls.push(entry(`${SITE}/truyen-doc/pages/${page}`));
    }

    const xml =
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        urls.join("\n") +
        "\n</urlset>\n";

    fs.writeFileSync(path.join(ROOT, "sitemap.xml"), xml);

    console.log(
        `sitemap.xml: ${urls.length} URL (${novels.length} truyen, ${chapterCount} chuong, ${pages.length} trang)`
    );
}

build();
