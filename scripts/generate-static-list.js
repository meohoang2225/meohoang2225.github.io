#!/usr/bin/env node

/*
 * Pre-render the homepage novel list as static HTML so crawlers that
 * don't execute JavaScript (e.g. the AdSense review bot) see real
 * content instead of the "Đang tải..." loading skeleton.
 *
 * app.js still renders the same data client-side on top of this for
 * real visitors (search, filter, pagination, continue-reading), so
 * this is progressive enhancement, not cloaking: same data source,
 * same markup, same sort order as what JS produces for a first-time
 * visitor.
 *
 * Run after any change to truyen-doc/data/novels.json, before publish.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const NOVELS_JSON = path.join(ROOT, "truyen-doc/data/novels.json");
const INDEX_HTML = path.join(ROOT, "truyen-doc/index.html");

const LIST_START = "<!--STATIC:NOVEL_LIST-->";
const LIST_END = "<!--/STATIC:NOVEL_LIST-->";
const COUNT_START = "<!--STATIC:NOVEL_COUNT-->";
const COUNT_END = "<!--/STATIC:NOVEL_COUNT-->";

function escapeHtml(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getCover(novel) {
    if (novel && novel.cover) {
        return novel.cover;
    }

    return "images/default.jpg";
}

function normalizeText(text) {
    return String(text || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .trim();
}

function getStatusClass(status) {
    const value = normalizeText(status);

    if (value.includes("hoan")) {
        return "status-completed";
    }

    if (value.includes("tam")) {
        return "status-paused";
    }

    return "status-ongoing";
}

function getStatusLabel(status) {
    return status || "Đang ra";
}

function getNovelGenres(novel) {
    if (!novel) {
        return [];
    }

    let genres = [];

    if (Array.isArray(novel.genres)) {
        genres = novel.genres;
    } else if (typeof novel.genres === "string") {
        genres = novel.genres.split(",").map(item => item.trim());
    } else if (typeof novel.genre === "string") {
        genres = novel.genre.split(",").map(item => item.trim());
    }

    return genres
        .map(item => String(item || "").trim())
        .filter(Boolean);
}

function getLatestChapterId(novel) {
    if (novel && novel.latestChapter) {
        return String(novel.latestChapter);
    }

    return "";
}

function getNovelUrl(novelId, chapterId) {
    let url = "reader.html?novel=" + encodeURIComponent(novelId);

    if (chapterId) {
        url += "&chapter=" + encodeURIComponent(chapterId);
    }

    return url;
}

function renderCard(novel) {
    /*
     * Không có lịch sử đọc phía server, nên luôn coi
     * đây là người đọc mới -> không gắn chapter vào URL,
     * để reader.html tự mở chương 1 (giống hành vi thật
     * của app.js khi chưa có tiến trình đọc).
     */

    const latestChapter = getLatestChapterId(novel);
    const genres = getNovelGenres(novel);

    return `
        <article class="novel-card">

            <a
                href="${getNovelUrl(novel.id, "")}"
                class="novel-card-link"
            >

                <div class="novel-cover">

                    <img
                        src="${escapeHtml(getCover(novel))}"
                        alt="${escapeHtml(novel.title)}"
                        loading="lazy"
                    >

                </div>


                <div class="novel-info">


                    <h2 class="novel-title">
                        ${escapeHtml(novel.title)}
                    </h2>


                    <div class="novel-author">

                        ${escapeHtml(novel.author || "Chưa rõ tác giả")}

                    </div>


                    <div class="novel-status">

                        <span
                            class="status-badge ${getStatusClass(novel.status)}"
                        >

                            ${escapeHtml(getStatusLabel(novel.status))}

                        </span>

                    </div>


                    <div class="novel-description">

                        ${escapeHtml(novel.description || "")}

                    </div>


                    ${
                        genres.length
                            ? `
                            <div class="novel-genres">

                                ${genres
                                    .slice(0, 3)
                                    .map(
                                        genre => `
                                            <span class="novel-genre">
                                                ${escapeHtml(genre)}
                                            </span>
                                        `
                                    )
                                    .join(" · ")}

                            </div>
                            `
                            : ""
                    }


                    <div class="novel-meta">

                        <span>
                            📚 ${Number(novel.chapterCount) || 0} chương
                        </span>


                        ${
                            novel.updatedAt
                                ? `
                                <span>
                                    🕒 ${escapeHtml(novel.updatedAt)}
                                </span>
                                `
                                : ""
                        }

                    </div>


                    ${
                        latestChapter
                            ? `
                            <div class="novel-latest">

                                <span class="novel-read-button">
                                    🆕 Đọc truyện
                                </span>

                            </div>
                            `
                            : ""
                    }


                </div>

            </a>

        </article>
    `;
}

function build() {
    const novels = JSON.parse(
        fs.readFileSync(NOVELS_JSON, "utf8")
    );

    if (!Array.isArray(novels)) {
        throw new Error("novels.json không phải là một mảng.");
    }

    /*
     * Cùng thứ tự với app.js: mới cập nhật nhất trước.
     */

    const sorted = [...novels].sort(
        (a, b) =>
            new Date(b.updatedAt || 0).getTime() -
            new Date(a.updatedAt || 0).getTime()
    );

    const listHtml = sorted.map(renderCard).join("\n");
    const countHtml = `${sorted.length} truyện`;

    let html = fs.readFileSync(INDEX_HTML, "utf8");

    html = replaceBetween(html, LIST_START, LIST_END, listHtml);
    html = replaceBetween(html, COUNT_START, COUNT_END, countHtml);

    fs.writeFileSync(INDEX_HTML, html);

    console.log(
        `Đã render ${sorted.length} truyện vào ${path.relative(ROOT, INDEX_HTML)}`
    );
}

function replaceBetween(html, startMarker, endMarker, content) {
    const startIndex = html.indexOf(startMarker);
    const endIndex = html.indexOf(endMarker);

    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        throw new Error(
            `Không tìm thấy marker ${startMarker} ... ${endMarker} trong index.html`
        );
    }

    const before = html.slice(0, startIndex + startMarker.length);
    const after = html.slice(endIndex);

    return `${before}\n${content}\n${after}`;
}

build();
