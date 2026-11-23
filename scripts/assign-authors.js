#!/usr/bin/env node
/*
 * Gán tên tác giả cho truyện theo scripts/authors.json.
 * Quy tắc: tác giả = người phụ trách thể loại ĐẦU TIÊN của truyện
 * (genres[0]); nếu thể loại chưa có trong danh sách thì dùng
 * fallbackAuthor; "overrides" {id: tên} thắng mọi quy tắc khác.
 *
 * Cập nhật cả truyen-doc/data/novels.json lẫn
 * truyen-doc/data/novels/<id>/info.json.
 *
 * Dùng:  node scripts/assign-authors.js          (áp dụng)
 *        node scripts/assign-authors.js --check  (chỉ báo cáo, thoát 1 nếu lệch)
 */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const CONFIG = JSON.parse(
    fs.readFileSync(path.join(__dirname, "authors.json"), "utf8")
);
const NOVELS_JSON = path.join(ROOT, "truyen-doc/data/novels.json");
const CHECK = process.argv.includes("--check");

const byGenre = {};
for (const a of CONFIG.authors) {
    for (const g of a.genres) {
        if (byGenre[g]) throw new Error("Thể loại trùng tác giả: " + g);
        byGenre[g] = a.name;
    }
}

function authorFor(id, genres) {
    if (CONFIG.overrides && CONFIG.overrides[id]) return CONFIG.overrides[id];
    const first = (genres || [])[0];
    return (first && byGenre[first]) || CONFIG.fallbackAuthor;
}

function writeJson(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

const novels = JSON.parse(fs.readFileSync(NOVELS_JSON, "utf8"));
let changed = 0;
const tally = {};

for (const n of novels) {
    const infoPath = path.join(ROOT, "truyen-doc/data/novels", n.id, "info.json");
    const info = fs.existsSync(infoPath)
        ? JSON.parse(fs.readFileSync(infoPath, "utf8"))
        : null;
    const genres = n.genres || (info && info.genres) || [];
    const author = authorFor(n.id, genres);
    tally[author] = (tally[author] || 0) + 1;

    if (n.author !== author) {
        n.author = author;
        changed++;
    }
    if (info && info.author !== author) {
        info.author = author;
        if (!CHECK) writeJson(infoPath, info);
        if (n.author === author && !CHECK) { /* đã đếm ở trên */ }
        else changed++;
    }
}

if (CHECK) {
    console.log(changed ? changed + " mục lệch." : "Tất cả khớp.");
    console.log(tally);
    process.exit(changed ? 1 : 0);
}
writeJson(NOVELS_JSON, novels);
console.log("Đã cập nhật. Phân bổ:", tally);
