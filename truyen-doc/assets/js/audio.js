/*
 * Audio truyện - Mèo Hoang Thư Viện Truyện
 *
 * Nguồn âm thanh (tự chọn theo từng chương):
 *   1. MP3  - nếu chương có `audio` (chuỗi URL hoặc { url }) trong file chương,
 *             hoặc info.json của truyện có `audio.baseUrl`
 *             (file = {baseUrl}/{chapterId}.mp3; có thể giới hạn bằng `audio.chapters`: ["001","002"]).
 *   2. TTS  - giọng đọc của trình duyệt (Web Speech API), dùng khi không có mp3
 *             hoặc khi mp3 lỗi.
 *
 * Phụ thuộc: reader.js phát sự kiện reader:chapterLoading / reader:chapterLoaded
 * và cung cấp window.ReaderAPI.
 */
(function () {
    "use strict";

    var STORAGE_KEY = "truyen_doc_audio_settings";
    var POS_KEY = "truyen_doc_audio_pos";
    var SITE_NAME = "Mèo Hoang Thư Viện Truyện";
    var MAX_SEG = 200;

    var synth = window.speechSynthesis || null;
    var hasTTS = !!(synth && window.SpeechSynthesisUtterance);

    var settings = Object.assign({
        open: false,
        rate: 1,
        voiceURI: "",
        autoNext: true,
        follow: true,
        intro: true
    }, readJSON(STORAGE_KEY));

    var ctx = null;              // { novelId, novel, chapters, index, chapter }
    var mode = "none";           // "mp3" | "tts" | "none"
    var playing = false;
    var token = 0;               // vô hiệu hóa callback cũ
    var resumeAfterLoad = false; // đang nghe thì chuyển chương -> nghe tiếp chương mới
    var sleepTimer = null;
    var sleepEnd = false;

    var segs = [];
    var segIdx = 0;
    var currentUtt = null;       // giữ tham chiếu tránh bị GC (lỗi Chrome)
    var voices = [];
    var lastMarked = null;

    var audioEl = null;
    var mp3Url = "";
    var wakeLock = null;
    var els = {};
    var lastSave = 0;

    function readJSON(key) {
        try { return JSON.parse(localStorage.getItem(key)) || {}; }
        catch (e) { return {}; }
    }

    function saveSettings() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); }
        catch (e) { /* bỏ qua */ }
    }

    function savePos(value) {
        if (!ctx) { return; }
        var now = Date.now();
        if (value !== "force" && now - lastSave < 3000) { return; }
        lastSave = now;
        var all = readJSON(POS_KEY);
        all[ctx.novelId] = {
            chapterId: String(ctx.chapter.id),
            seg: segIdx,
            time: audioEl ? audioEl.currentTime : 0
        };
        try { localStorage.setItem(POS_KEY, JSON.stringify(all)); }
        catch (e) { /* bỏ qua */ }
    }

    function getSavedPos() {
        if (!ctx) { return null; }
        var p = readJSON(POS_KEY)[ctx.novelId];
        return p && p.chapterId === String(ctx.chapter.id) ? p : null;
    }

    /* =====================================================
       UI
       ===================================================== */

    function buildUI() {
        var bar = document.createElement("section");
        bar.id = "audioPlayer";
        bar.className = "audio-player hidden";
        bar.setAttribute("aria-label", "Trình nghe truyện");
        bar.innerHTML =
            '<div class="ap-top">' +
                '<div class="ap-info">' +
                    '<div class="ap-title" id="apTitle">Nghe truyện</div>' +
                    '<div class="ap-sub"><span id="apMode" class="ap-badge"></span>' +
                    '<span id="apPos"></span></div>' +
                '</div>' +
                '<button type="button" class="ap-btn ap-small" id="apOptions" title="Tùy chọn" aria-label="Tùy chọn">⚙</button>' +
                '<button type="button" class="ap-btn ap-small" id="apClose" title="Đóng" aria-label="Đóng">✕</button>' +
            '</div>' +
            '<input type="range" id="apSeek" class="ap-seek" min="0" max="1000" value="0" aria-label="Tiến độ">' +
            '<div class="ap-controls">' +
                '<button type="button" class="ap-btn" id="apPrevCh" title="Chương trước" aria-label="Chương trước">⏮</button>' +
                '<button type="button" class="ap-btn" id="apBack" title="Lùi" aria-label="Lùi">⏪</button>' +
                '<button type="button" class="ap-btn ap-play" id="apPlay" title="Phát / Tạm dừng" aria-label="Phát">▶</button>' +
                '<button type="button" class="ap-btn" id="apFwd" title="Tới" aria-label="Tới">⏩</button>' +
                '<button type="button" class="ap-btn" id="apNextCh" title="Chương sau" aria-label="Chương sau">⏭</button>' +
            '</div>' +
            '<div class="ap-options hidden" id="apOptionsPanel">' +
                '<label>Tốc độ <select id="apRate">' +
                    '<option value="0.75">0.75×</option><option value="0.9">0.9×</option>' +
                    '<option value="1">1×</option><option value="1.15">1.15×</option>' +
                    '<option value="1.3">1.3×</option><option value="1.5">1.5×</option>' +
                    '<option value="1.75">1.75×</option><option value="2">2×</option>' +
                '</select></label>' +
                '<label>Hẹn giờ tắt <select id="apSleep">' +
                    '<option value="0">Không</option><option value="15">15 phút</option>' +
                    '<option value="30">30 phút</option><option value="60">60 phút</option>' +
                    '<option value="end">Hết chương này</option>' +
                '</select></label>' +
                '<label id="apVoiceWrap">Giọng đọc <select id="apVoice"></select></label>' +
                '<label class="ap-check"><input type="checkbox" id="apAuto"> Tự chuyển chương sau</label>' +
                '<label class="ap-check"><input type="checkbox" id="apFollow"> Tự cuộn theo đoạn đang đọc</label>' +
                '<label class="ap-check" id="apIntroWrap"><input type="checkbox" id="apIntro"> Đọc lời giới thiệu đầu/cuối chương</label>' +
                '<div class="ap-note" id="apNote"></div>' +
            '</div>';
        document.body.appendChild(bar);

        [
            "Title", "Mode", "Pos", "Seek", "Play", "PrevCh", "NextCh", "Back", "Fwd",
            "Options", "OptionsPanel", "Close", "Rate", "Sleep", "Voice", "VoiceWrap",
            "Auto", "Follow", "Intro", "IntroWrap", "Note"
        ].forEach(function (k) { els[k] = document.getElementById("ap" + k); });
        els.bar = bar;

        els.Rate.value = String(settings.rate);
        if (els.Rate.value !== String(settings.rate)) { els.Rate.value = "1"; }
        els.Auto.checked = !!settings.autoNext;
        els.Follow.checked = !!settings.follow;
        els.Intro.checked = !!settings.intro;

        els.Play.addEventListener("click", togglePlay);
        els.Close.addEventListener("click", function () {
            pause();
            setOpen(false);
        });
        els.Options.addEventListener("click", function () {
            els.OptionsPanel.classList.toggle("hidden");
        });
        els.PrevCh.addEventListener("click", function () { changeChapter(false); });
        els.NextCh.addEventListener("click", function () { changeChapter(true); });
        els.Back.addEventListener("click", function () { skip(-1); });
        els.Fwd.addEventListener("click", function () { skip(1); });
        els.Rate.addEventListener("change", function () {
            settings.rate = parseFloat(els.Rate.value) || 1;
            saveSettings();
            if (audioEl) { audioEl.playbackRate = settings.rate; }
            if (mode === "tts" && playing) { speakFrom(segIdx); }
        });
        els.Voice.addEventListener("change", function () {
            settings.voiceURI = els.Voice.value;
            saveSettings();
            if (mode === "tts" && playing) { speakFrom(segIdx); }
        });
        els.Auto.addEventListener("change", function () {
            settings.autoNext = els.Auto.checked; saveSettings();
        });
        els.Follow.addEventListener("change", function () {
            settings.follow = els.Follow.checked; saveSettings();
        });
        els.Intro.addEventListener("change", function () {
            settings.intro = els.Intro.checked; saveSettings();
            if (ctx && !playing) { prepare(); }
        });
        els.Sleep.addEventListener("change", setSleep);

        // Kéo thanh tiến độ
        els.Seek.addEventListener("input", function () {
            var r = parseInt(els.Seek.value, 10) / 1000;
            if (mode === "mp3" && audioEl && isFinite(audioEl.duration)) {
                audioEl.currentTime = r * audioEl.duration;
            } else if (mode === "tts" && segs.length) {
                var i = Math.min(segs.length - 1, Math.floor(r * segs.length));
                segIdx = i;
                if (playing) { speakFrom(i); } else { mark(segs[i].el); updateProgress(); }
            }
        });

        // Dọn lúc rời trang
        window.addEventListener("pagehide", function () {
            savePos("force");
            if (synth) { synth.cancel(); }
        });
    }

    function setOpen(open) {
        settings.open = open;
        saveSettings();
        els.bar.classList.toggle("hidden", !open);
        document.body.classList.toggle("audio-open", open);
        var btn = document.getElementById("audioToggle");
        if (btn) { btn.classList.toggle("active", open); }
        syncBottomOffset();
    }

    // Trên mobile, quảng cáo cố định ở đáy: đặt player ngay phía trên nó.
    function syncBottomOffset() {
        var ad = document.getElementById("adMobileBottom");
        var h = 0;
        if (ad && getComputedStyle(ad).position === "fixed") {
            h = ad.offsetHeight || 0;
        }
        document.documentElement.style.setProperty("--audio-bottom", h + "px");
    }

    function setPlayIcon() {
        els.Play.textContent = playing ? "⏸" : "▶";
        els.Play.setAttribute("aria-label", playing ? "Tạm dừng" : "Phát");
    }

    function updateProgress() {
        if (!ctx) { return; }
        var ratio = 0;
        var pos = "";
        if (mode === "mp3" && audioEl) {
            var d = audioEl.duration;
            if (isFinite(d) && d > 0) {
                ratio = audioEl.currentTime / d;
                pos = fmt(audioEl.currentTime) + " / " + fmt(d);
            }
        } else if (mode === "tts" && segs.length) {
            ratio = segIdx / segs.length;
            var ahead = remainingSeconds();
            pos = "còn khoảng " + fmt(ahead);
        }
        els.Seek.value = String(Math.round(ratio * 1000));
        els.Pos.textContent = pos ? " · " + pos : "";
    }

    function remainingSeconds() {
        // Ước lượng ~ 15 ký tự/giây ở tốc độ 1×
        var chars = 0;
        for (var i = segIdx; i < segs.length; i++) { chars += segs[i].text.length; }
        return chars / (15 * settings.rate);
    }

    function fmt(sec) {
        sec = Math.max(0, Math.round(sec));
        var m = Math.floor(sec / 60);
        var s = sec % 60;
        return m + ":" + (s < 10 ? "0" : "") + s;
    }

    function setNote(text) { els.Note.textContent = text || ""; }

    /* =====================================================
       NGUỒN ÂM THANH
       ===================================================== */

    function resolveMp3(detail) {
        var ch = detail.chapter || {};
        var novel = detail.novel || {};
        var a = ch.audio;
        var url = "";
        if (typeof a === "string") { url = a; }
        else if (a && typeof a === "object" && a.url) { url = a.url; }
        else if (novel.audio && novel.audio.baseUrl) {
            var list = novel.audio.chapters;
            if (!Array.isArray(list) || list.indexOf(String(ch.id)) !== -1) {
                url = novel.audio.baseUrl.replace(/\/+$/, "") + "/" +
                    encodeURIComponent(ch.id) + "." + (novel.audio.ext || "mp3");
            }
        }
        return url;
    }

    function destroyAudio() {
        if (audioEl) {
            audioEl.onended = audioEl.ontimeupdate = audioEl.onerror = null;
            audioEl.onloadedmetadata = null;
            audioEl.pause();
            audioEl.removeAttribute("src");
            audioEl.load();
            audioEl = null;
        }
    }

    function stopEngine() {
        token++;
        if (synth) { synth.cancel(); }
        if (audioEl) { audioEl.pause(); }
        playing = false;
        clearMark();
        setPlayIcon();
        releaseWakeLock();
    }

    // Chuẩn bị nguồn phát cho chương hiện tại (chưa phát).
    function prepare() {
        stopEngine();
        destroyAudio();
        segs = [];
        segIdx = 0;
        mp3Url = ctx ? resolveMp3(ctx) : "";

        var saved = getSavedPos();

        if (mp3Url) {
            mode = "mp3";
            audioEl = new Audio();
            audioEl.preload = "metadata";
            audioEl.playbackRate = settings.rate;
            // Hạn chế nút tải / cast mặc định của trình duyệt
            audioEl.setAttribute("controlsList", "nodownload noplaybackrate");
            audioEl.disableRemotePlayback = true;
            audioEl.src = mp3Url;
            audioEl.onloadedmetadata = function () {
                if (saved && saved.time > 1 && saved.time < audioEl.duration - 3) {
                    audioEl.currentTime = saved.time;
                }
                updateProgress();
            };
            audioEl.ontimeupdate = function () { updateProgress(); savePos(); };
            audioEl.onended = onFinished;
            audioEl.onerror = function () {
                // mp3 lỗi / không tồn tại -> dùng giọng đọc máy
                var wasWanted = playing || resumeAfterLoad;
                mp3Url = "";
                destroyAudio();
                if (hasTTS) {
                    prepareTTS(saved);
                    if (wasWanted) { play(); }
                } else {
                    mode = "none";
                    refreshLabels();
                }
            };
        } else if (hasTTS) {
            prepareTTS(saved);
        } else {
            mode = "none";
        }
        refreshLabels();
        updateProgress();
    }

    function prepareTTS(saved) {
        mode = "tts";
        segs = buildSegments();
        segIdx = saved && saved.seg > 0 && saved.seg < segs.length ? saved.seg : 0;
        refreshLabels();
        updateProgress();
    }

    function refreshLabels() {
        if (!ctx) { return; }
        var n = ctx.index + 1;
        els.Title.textContent = (ctx.novel.title || "Truyện") + " — " +
            (ctx.chapter.title || "Chương " + n);
        els.Mode.textContent = mode === "mp3" ? "Audio" :
            mode === "tts" ? "Giọng đọc máy" : "Không hỗ trợ";
        els.Mode.className = "ap-badge ap-" + mode;
        els.VoiceWrap.classList.toggle("hidden", mode !== "tts");
        els.IntroWrap.classList.toggle("hidden", mode !== "tts");
        els.Back.title = mode === "mp3" ? "Lùi 15 giây" : "Đoạn trước";
        els.Fwd.title = mode === "mp3" ? "Tới 15 giây" : "Đoạn sau";
        els.Play.disabled = mode === "none";
        if (mode === "none") {
            setNote("Trình duyệt này chưa hỗ trợ đọc truyện thành tiếng. Hãy thử Chrome, Edge hoặc Safari.");
        } else if (mode === "tts" && voices.length && !viVoices().length) {
            setNote("Thiết bị chưa có giọng tiếng Việt. Hãy cài giọng Việt trong cài đặt hệ thống (Edge/Windows có sẵn giọng HoaiMy, NamMinh).");
        } else {
            setNote("");
        }
        updateMediaSession();
        els.PrevCh.disabled = !(window.ReaderAPI && ReaderAPI.hasPrevious());
        els.NextCh.disabled = !(window.ReaderAPI && ReaderAPI.hasNext());
    }

    /* =====================================================
       TTS
       ===================================================== */

    function viVoices() {
        return voices.filter(function (v) {
            return /^vi([-_]|$)/i.test(v.lang || "");
        });
    }

    function voiceScore(v) {
        var n = (v.name || "").toLowerCase();
        var s = 0;
        if (/natural|online/.test(n)) { s += 4; }
        if (/hoaimy|namminh/.test(n)) { s += 3; }
        if (/google/.test(n)) { s += 2; }
        if (/linh/.test(n)) { s += 1; }
        return s;
    }

    function loadVoices() {
        if (!hasTTS) { return; }
        voices = synth.getVoices() || [];
        var vi = viVoices().sort(function (a, b) { return voiceScore(b) - voiceScore(a); });
        els.Voice.innerHTML = "";
        vi.forEach(function (v) {
            var o = document.createElement("option");
            o.value = v.voiceURI;
            o.textContent = v.name;
            els.Voice.appendChild(o);
        });
        if (!vi.length) {
            var o = document.createElement("option");
            o.textContent = "Mặc định của thiết bị";
            o.value = "";
            els.Voice.appendChild(o);
        } else if (settings.voiceURI &&
            vi.some(function (v) { return v.voiceURI === settings.voiceURI; })) {
            els.Voice.value = settings.voiceURI;
        }
        refreshLabels();
    }

    function pickVoice() {
        var vi = viVoices();
        if (!vi.length) { return null; }
        var found = vi.filter(function (v) { return v.voiceURI === settings.voiceURI; })[0];
        return found || vi.sort(function (a, b) { return voiceScore(b) - voiceScore(a); })[0];
    }

    function cleanText(t) {
        return String(t || "")
            .replace(/[*_#~`]+/g, " ")
            .replace(/\s*[—–]\s*/g, ", ")
            .replace(/\.{3,}/g, "…")
            .replace(/\s+/g, " ")
            .trim();
    }

    function splitSentences(text) {
        var parts = text.match(/[^.!?…]+[.!?…]*["”’')\]]*\s*/g) || [text];
        var out = [];
        var buf = "";
        parts.forEach(function (p) {
            p = p.trim();
            if (!p) { return; }
            if (buf && (buf + " " + p).length > MAX_SEG) { out.push(buf); buf = ""; }
            buf = buf ? buf + " " + p : p;
            if (buf.length >= 90) { out.push(buf); buf = ""; }
        });
        if (buf) { out.push(buf); }
        // câu quá dài không có dấu ngắt: cắt theo dấu phẩy / khoảng trắng
        var final = [];
        out.forEach(function (s) {
            while (s.length > MAX_SEG * 1.5) {
                var cut = s.lastIndexOf(",", MAX_SEG);
                if (cut < 40) { cut = s.lastIndexOf(" ", MAX_SEG); }
                if (cut < 40) { cut = MAX_SEG; }
                final.push(s.slice(0, cut + 1).trim());
                s = s.slice(cut + 1).trim();
            }
            if (s) { final.push(s); }
        });
        return final;
    }

    function buildSegments() {
        var out = [];
        var n = ctx.index + 1;
        var name = ctx.novel.title || "";

        if (settings.intro) {
            out.push({
                el: null,
                text: "Bạn đang nghe audio truyện " + name + ", chương " + n +
                    ", tại " + SITE_NAME + "."
            });
        }

        var root = document.getElementById("chapterContent");
        var nodes = root ? root.querySelectorAll("p, h1, h2, h3, h4, blockquote, li") : [];
        Array.prototype.forEach.call(nodes, function (el) {
            if (el.closest(".ad-slot, .ad-container, .ad-mid-content")) { return; }
            if (el.tagName !== "BLOCKQUOTE" && el.querySelector("p, li")) { return; }
            var text = cleanText(el.textContent);
            if (!text || !/[\p{L}\p{N}]/u.test(text)) { return; }
            splitSentences(text).forEach(function (s) { out.push({ el: el, text: s }); });
        });

        if (settings.intro) {
            var hasNext = window.ReaderAPI && ReaderAPI.hasNext();
            out.push({
                el: null,
                text: hasNext
                    ? "Hết chương " + n + ". Mời bạn nghe tiếp chương sau của truyện " + name +
                      ", tại " + SITE_NAME + "."
                    : "Hết chương " + n + ". Cảm ơn bạn đã nghe truyện " + name +
                      " tại " + SITE_NAME + "."
            });
        }
        return out;
    }

    function speakFrom(i) {
        if (!hasTTS) { return; }
        token++;
        synth.cancel();
        playing = true;
        setPlayIcon();
        requestWakeLock();
        var my = token;
        // Một số trình duyệt cần chút trễ sau cancel()
        setTimeout(function () {
            if (my === token) { speakSeg(i, my); }
        }, 60);
    }

    function speakSeg(i, my) {
        if (my !== token) { return; }
        if (i >= segs.length) { onFinished(); return; }
        segIdx = i;
        var seg = segs[i];
        mark(seg.el);
        updateProgress();
        savePos();

        var u = new SpeechSynthesisUtterance(seg.text);
        u.lang = "vi-VN";
        var v = pickVoice();
        if (v) { u.voice = v; u.lang = v.lang; }
        u.rate = settings.rate;
        u.onend = function () { if (my === token) { speakSeg(i + 1, my); } };
        u.onerror = function (e) {
            if (my !== token) { return; }
            if (e && (e.error === "interrupted" || e.error === "canceled")) { return; }
            speakSeg(i + 1, my);
        };
        currentUtt = u;
        synth.speak(u);
    }

    function mark(el) {
        if (el === lastMarked) { return; }
        clearMark();
        if (!el) { return; }
        el.classList.add("audio-reading");
        lastMarked = el;
        if (settings.follow && playing) {
            var r = el.getBoundingClientRect();
            var vh = window.innerHeight || 700;
            if (r.top < 80 || r.bottom > vh - 220) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        }
    }

    function clearMark() {
        if (lastMarked) { lastMarked.classList.remove("audio-reading"); }
        lastMarked = null;
    }

    /* =====================================================
       ĐIỀU KHIỂN CHUNG
       ===================================================== */

    function play() {
        if (!ctx || mode === "none") { return; }
        resumeAfterLoad = false;
        if (mode === "mp3" && audioEl) {
            var p = audioEl.play();
            playing = true;
            setPlayIcon();
            requestWakeLock();
            if (p && p.catch) {
                p.catch(function () {
                    // lỗi tự phát / nguồn hỏng: để onerror xử lý hoặc dừng
                    if (mode === "mp3" && audioEl && audioEl.error) { return; }
                    playing = false;
                    setPlayIcon();
                });
            }
        } else if (mode === "tts") {
            speakFrom(segIdx);
        }
        updateMediaSession();
    }

    function pause() {
        resumeAfterLoad = false;
        if (mode === "mp3" && audioEl) {
            audioEl.pause();
        } else if (mode === "tts") {
            token++;
            if (synth) { synth.cancel(); }
        }
        playing = false;
        setPlayIcon();
        releaseWakeLock();
        savePos("force");
    }

    function togglePlay() {
        if (playing) { pause(); } else { play(); }
    }

    function skip(dir) {
        if (mode === "mp3" && audioEl) {
            audioEl.currentTime = Math.max(0, audioEl.currentTime + dir * 15);
            return;
        }
        if (mode !== "tts" || !segs.length) { return; }
        // nhảy theo đoạn văn (paragraph), không theo câu
        var cur = segs[segIdx] ? segs[segIdx].el : null;
        var i = segIdx;
        if (dir > 0) {
            while (i < segs.length - 1 && segs[i].el === cur) { i++; }
        } else {
            while (i > 0 && segs[i].el === cur) { i--; }
            var target = segs[i].el;
            while (i > 0 && segs[i - 1].el === target) { i--; }
        }
        segIdx = i;
        if (playing) { speakFrom(i); } else { mark(segs[i].el); updateProgress(); }
    }

    function changeChapter(next) {
        if (!window.ReaderAPI) { return; }
        resumeAfterLoad = playing;
        if (next) { ReaderAPI.goNext(); } else { ReaderAPI.goPrevious(); }
    }

    function onFinished() {
        playing = false;
        clearMark();
        setPlayIcon();
        releaseWakeLock();
        segIdx = 0;
        savePos("force");
        // Sau khi nghe hết chương: xoá vị trí đã lưu để lần sau nghe lại từ đầu
        if (ctx) {
            var all = readJSON(POS_KEY);
            delete all[ctx.novelId];
            try { localStorage.setItem(POS_KEY, JSON.stringify(all)); } catch (e) { /* bỏ qua */ }
        }

        if (sleepEnd) {
            sleepEnd = false;
            els.Sleep.value = "0";
            return;
        }
        if (settings.autoNext && window.ReaderAPI && ReaderAPI.hasNext()) {
            resumeAfterLoad = true;
            ReaderAPI.goNext();
        }
    }

    function setSleep() {
        clearTimeout(sleepTimer);
        sleepEnd = false;
        var v = els.Sleep.value;
        if (v === "end") { sleepEnd = true; return; }
        var m = parseInt(v, 10);
        if (m > 0) {
            sleepTimer = setTimeout(function () {
                pause();
                els.Sleep.value = "0";
            }, m * 60000);
        }
    }

    /* =====================================================
       WAKE LOCK + MEDIA SESSION
       ===================================================== */

    function requestWakeLock() {
        if (!("wakeLock" in navigator) || wakeLock) { return; }
        navigator.wakeLock.request("screen").then(function (l) {
            wakeLock = l;
            l.addEventListener("release", function () { wakeLock = null; });
        }).catch(function () { /* bỏ qua */ });
    }

    function releaseWakeLock() {
        if (wakeLock) { wakeLock.release().catch(function () { }); wakeLock = null; }
    }

    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible" && playing) { requestWakeLock(); }
    });

    function updateMediaSession() {
        if (!("mediaSession" in navigator) || !ctx) { return; }
        try {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: ctx.chapter.title || "Chương " + (ctx.index + 1),
                artist: ctx.novel.author || SITE_NAME,
                album: ctx.novel.title || SITE_NAME,
                artwork: ctx.novel.cover ? [{ src: new URL(ctx.novel.cover, location.href).href }] : []
            });
            navigator.mediaSession.setActionHandler("play", play);
            navigator.mediaSession.setActionHandler("pause", pause);
            navigator.mediaSession.setActionHandler("previoustrack", function () { changeChapter(false); });
            navigator.mediaSession.setActionHandler("nexttrack", function () { changeChapter(true); });
        } catch (e) { /* bỏ qua */ }
    }

    /* =====================================================
       SỰ KIỆN TỪ READER
       ===================================================== */

    document.addEventListener("reader:chapterLoading", function () {
        if (!els.bar) { return; }
        var was = playing || resumeAfterLoad;
        stopEngine();
        resumeAfterLoad = was;
    });

    document.addEventListener("reader:chapterLoaded", function (e) {
        if (!els.bar) { return; }
        ctx = e.detail;
        var autoplay = resumeAfterLoad;
        resumeAfterLoad = false;
        // Nghe tiếp chương mới thì bắt đầu từ đầu, không dùng vị trí cũ
        if (autoplay) {
            var all = readJSON(POS_KEY);
            delete all[ctx.novelId];
            try { localStorage.setItem(POS_KEY, JSON.stringify(all)); } catch (er) { /* bỏ qua */ }
        }
        prepare();
        if (autoplay) {
            // đợi monetization chèn xong quảng cáo giữa chương rồi mới dựng đoạn
            setTimeout(function () {
                if (mode === "tts") { segs = buildSegments(); segIdx = 0; }
                play();
            }, 150);
        }
    });

    /* =====================================================
       KHỞI TẠO
       ===================================================== */

    function init() {
        if (!document.getElementById("chapterContent")) { return; }
        buildUI();

        var btn = document.getElementById("audioToggle");
        if (btn) {
            btn.addEventListener("click", function () {
                setOpen(els.bar.classList.contains("hidden"));
            });
        }

        if (hasTTS) {
            loadVoices();
            if (synth.addEventListener) {
                synth.addEventListener("voiceschanged", loadVoices);
            } else {
                synth.onvoiceschanged = loadVoices;
            }
        }

        var params = new URLSearchParams(location.search);
        setOpen(settings.open || params.get("audio") === "1");

        window.addEventListener("resize", syncBottomOffset);
        var ad = document.getElementById("adMobileBottom");
        if (ad && window.ResizeObserver) {
            new ResizeObserver(syncBottomOffset).observe(ad);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
