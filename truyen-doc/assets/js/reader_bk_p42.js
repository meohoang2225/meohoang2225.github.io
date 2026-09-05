$(document).ready(function () {

    /* =========================================================
       CONFIG
    ========================================================= */

    const params = new URLSearchParams(window.location.search);

    const novelId = params.get("novel");
    let chapterId = params.get("chapter");

    let novel = null;
    let chapters = [];
    let currentChapterIndex = -1;

    let restoringScroll = false;
    let scrollSaveTimer = null;


    /* =========================================================
       CHECK NOVEL ID
    ========================================================= */

    if (!novelId) {

        showError("Không tìm thấy truyện.");

        return;
    }


    /* =========================================================
       HELPERS
    ========================================================= */

    function normalizeText(text) {

        return String(text || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
    }


    function getNovelBasePath() {

        return `data/novels/${encodeURIComponent(novelId)}`;
    }


    function getChapterUrl(id) {

        return `${getNovelBasePath()}/${encodeURIComponent(id)}.json`;
    }


    function updateUrl(id) {

        const url =
            `reader.html?novel=${encodeURIComponent(novelId)}&chapter=${encodeURIComponent(id)}`;

        window.history.replaceState({}, "", url);
    }


    function showError(message) {

        $("#chapterContent").html(`
            <div class="empty">
                ${escapeHtml(message)}
            </div>
        `);
    }


    function escapeHtml(text) {

        return String(text || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    /* =========================================================
       LOAD NOVEL
    ========================================================= */

    async function loadNovel() {

        try {

            const basePath = getNovelBasePath();

            const [infoResponse, chaptersResponse] =
                await Promise.all([

                    fetch(`${basePath}/info.json`, {
                        cache: "default"
                    }),

                    fetch(`${basePath}/chapters.json`, {
                        cache: "default"
                    })

                ]);


            if (!infoResponse.ok) {
                throw new Error("Không thể tải thông tin truyện.");
            }


            if (!chaptersResponse.ok) {
                throw new Error("Không thể tải danh sách chương.");
            }


            novel = await infoResponse.json();

            chapters = await chaptersResponse.json();


            if (!Array.isArray(chapters)) {

                throw new Error(
                    "Dữ liệu danh sách chương không hợp lệ."
                );
            }


            /* =================================================
               BOOK INFORMATION
            ================================================= */

            document.title =
                `${novel.title || "Đọc truyện"} - Thư viện truyện`;


            $("#bookTitle")
                .text(novel.title || "Không có tên truyện")
                .attr(
                    "href",
                    `index.html`
                );


            /*
             * Nếu URL không có chapter:
             *
             * 1. Lấy chương đang đọc dở
             * 2. Nếu không có -> mở chương mới nhất
             * 3. Nếu vẫn không có -> chương đầu
             */

            if (!chapterId) {

                const progress =
                    window.ReaderStorage
                        ? ReaderStorage.getNovelProgress(novelId)
                        : null;


                if (
                    progress &&
                    progress.chapterId &&
                    chapters.some(
                        c => String(c.id) === String(progress.chapterId)
                    )
                ) {

                    chapterId = String(progress.chapterId);

                } else if (chapters.length > 0) {

                    chapterId =
                        String(chapters[chapters.length - 1].id);

                }

            }


            if (!chapterId) {

                showError("Truyện chưa có chương.");

                return;
            }


            await loadChapter(chapterId);


        } catch (error) {

            console.error(error);

            showError(
                error.message ||
                "Không thể tải truyện."
            );
        }
    }


    /* =========================================================
       LOAD CHAPTER
    ========================================================= */

    async function loadChapter(id, options = {}) {

        const shouldRestore =
            options.restoreScroll !== false;


        const index = chapters.findIndex(
            chapter =>
                String(chapter.id) === String(id)
        );


        if (index === -1) {

            showError("Không tìm thấy chương.");

            return;
        }


        currentChapterIndex = index;


        try {

            $("#chapterContent").html(`
                <div class="loading">
                    Đang tải chương...
                </div>
            `);


            const response =
                await fetch(
                    getChapterUrl(id),
                    {
                        cache: "default"
                    }
                );


            if (!response.ok) {

                throw new Error(
                    "Không thể tải nội dung chương."
                );
            }


            const chapter =
                await response.json();


            /* =================================================
               TITLE
            ================================================= */

            $("#chapterTitle")
                .text(
                    chapter.title ||
                    chapters[index].title ||
                    `Chương ${id}`
                );


            /* =================================================
               CONTENT
            ================================================= */

            $("#chapterContent")
                .html(
                    chapter.content || "<p>Chương này chưa có nội dung.</p>"
                );


            /* =================================================
               PROGRESS
            ================================================= */

            $("#chapterProgress")
                .text(
                    `Chương ${index + 1} / ${chapters.length}`
                );


            /* =================================================
               URL
            ================================================= */

            updateUrl(id);


            /* =================================================
               NAVIGATION
            ================================================= */

            updateNavigation();


            /* =================================================
               CHAPTER LIST
            ================================================= */

            renderChapterList();


            /* =================================================
               READING HISTORY
            ================================================= */

            if (window.ReaderStorage) {

                ReaderStorage.addHistory(
                    novelId,
                    String(id)
                );
            }


            /* =================================================
               RESTORE SCROLL
            ================================================= */

            if (shouldRestore) {

                restoreScrollPosition(id);

            } else {

                window.scrollTo(0, 0);
            }


        } catch (error) {

            console.error(error);

            showError(
                error.message ||
                "Không thể tải chương."
            );
        }
    }


    /* =========================================================
       NAVIGATION
    ========================================================= */

    function updateNavigation() {

        const hasPrevious =
            currentChapterIndex > 0;


        const hasNext =
            currentChapterIndex <
            chapters.length - 1;


        $("#prevChapter")
            .prop("disabled", !hasPrevious);


        $("#prevChapterBottom")
            .prop("disabled", !hasPrevious);


        $("#nextChapter")
            .prop("disabled", !hasNext);


        $("#nextChapterBottom")
            .prop("disabled", !hasNext);


        /*
         * Nếu không có chương trước/sau,
         * vẫn giữ button nhưng disable.
         */

        if (!hasPrevious) {

            $("#prevChapter")
                .addClass("disabled");

            $("#prevChapterBottom")
                .addClass("disabled");

        } else {

            $("#prevChapter")
                .removeClass("disabled");

            $("#prevChapterBottom")
                .removeClass("disabled");
        }


        if (!hasNext) {

            $("#nextChapter")
                .addClass("disabled");

            $("#nextChapterBottom")
                .addClass("disabled");

        } else {

            $("#nextChapter")
                .removeClass("disabled");

            $("#nextChapterBottom")
                .removeClass("disabled");
        }
    }


    function goPreviousChapter() {

        if (currentChapterIndex <= 0) {
            return;
        }


        saveCurrentScroll();


        const previous =
            chapters[currentChapterIndex - 1];


        loadChapter(
            String(previous.id),
            {
                restoreScroll: false
            }
        );
    }


    function goNextChapter() {

        if (
            currentChapterIndex === -1 ||
            currentChapterIndex >= chapters.length - 1
        ) {

            return;
        }


        saveCurrentScroll();


        const next =
            chapters[currentChapterIndex + 1];


        loadChapter(
            String(next.id),
            {
                restoreScroll: false
            }
        );
    }


    /* =========================================================
       CHAPTER LIST
    ========================================================= */

    function renderChapterList(filter = "") {

        const keyword =
            normalizeText(filter);


        const filtered =
            chapters.filter(chapter => {

                if (!keyword) {
                    return true;
                }


                const title =
                    normalizeText(
                        chapter.title
                    );


                const id =
                    normalizeText(
                        chapter.id
                    );


                return (
                    title.includes(keyword) ||
                    id.includes(keyword)
                );
            });


        if (!filtered.length) {

            $("#chapterListContent").html(`
                <div class="empty">
                    Không tìm thấy chương.
                </div>
            `);

            return;
        }


        let html = "";


        filtered.forEach(chapter => {

            const id =
                String(chapter.id);


            const active =
                id === String(chapterId);


            html += `
                <button
                    type="button"
                    class="chapter-item ${active ? "active" : ""}"
                    data-chapter-id="${escapeHtml(id)}"
                >
                    ${escapeHtml(
                        chapter.title ||
                        `Chương ${id}`
                    )}
                </button>
            `;
        });


        $("#chapterListContent")
            .html(html);
    }


    /* =========================================================
       OPEN / CLOSE CHAPTER LIST
    ========================================================= */

    $("#chapterListButton").on("click", function () {

        $("#chapterList")
            .toggleClass("hidden");


        renderChapterList();
    });


    $("#closeChapterList").on("click", function () {

        $("#chapterList")
            .addClass("hidden");
    });


    $(document).on(
        "click",
        ".chapter-item",
        function () {

            const id =
                String(
                    $(this).data("chapter-id")
                );


            $("#chapterList")
                .addClass("hidden");


            saveCurrentScroll();


            loadChapter(
                id,
                {
                    restoreScroll: false
                }
            );
        }
    );


    /* =========================================================
       CHAPTER SEARCH
       
       Tạo search box nếu reader.html chưa có.
    ========================================================= */

    function ensureChapterSearch() {

        if ($("#chapterSearch").length) {
            return;
        }


        $("#chapterListContent").before(`
            <div class="chapter-search-wrapper">

                <input
                    type="search"
                    id="chapterSearch"
                    class="chapter-search"
                    placeholder="Tìm chương..."
                    autocomplete="off"
                >

            </div>
        `);
    }


    ensureChapterSearch();


    $(document).on(
        "input",
        "#chapterSearch",
        function () {

            renderChapterList(
                $(this).val()
            );
        }
    );


    /* =========================================================
       SCROLL PROGRESS
    ========================================================= */

    function getScrollPosition() {

        return Math.max(
            window.scrollY ||
            window.pageYOffset ||
            0,
            0
        );
    }


    function saveCurrentScroll() {

        if (!window.ReaderStorage) {
            return;
        }


        if (!chapterId) {
            return;
        }


        ReaderStorage.saveProgress(
            novelId,
            String(chapterId),
            getScrollPosition()
        );
    }


    function restoreScrollPosition(id) {

        if (!window.ReaderStorage) {
            return;
        }


        const progress =
            ReaderStorage.getNovelProgress(
                novelId
            );


        if (
            !progress ||
            String(progress.chapterId) !== String(id)
        ) {

            window.scrollTo(0, 0);

            return;
        }


        const scroll =
            Number(progress.scroll || 0);


        if (scroll <= 0) {

            window.scrollTo(0, 0);

            return;
        }


        restoringScroll = true;


        /*
         * Chờ DOM render hoàn toàn.
         */

        setTimeout(function () {

            window.scrollTo(
                0,
                scroll
            );


            setTimeout(function () {

                restoringScroll = false;

            }, 100);

        }, 100);
    }


    $(window).on("scroll", function () {

        if (restoringScroll) {
            return;
        }


        clearTimeout(scrollSaveTimer);


        scrollSaveTimer =
            setTimeout(function () {

                saveCurrentScroll();

            }, 500);
    });


    $(window).on(
        "beforeunload",
        function () {

            saveCurrentScroll();
        }
    );


    /* =========================================================
       KEYBOARD NAVIGATION
    ========================================================= */

    $(document).on(
        "keydown",
        function (event) {

            /*
             * Không bắt phím nếu đang nhập text.
             */

            const tag =
                document.activeElement
                    ? document.activeElement.tagName
                    : "";


            if (
                tag === "INPUT" ||
                tag === "TEXTAREA" ||
                tag === "SELECT"
            ) {

                return;
            }


            if (event.key === "ArrowLeft") {

                goPreviousChapter();
            }


            if (event.key === "ArrowRight") {

                goNextChapter();
            }
        }
    );


    /* =========================================================
       BUTTON EVENTS
    ========================================================= */

    $("#prevChapter")
        .on(
            "click",
            goPreviousChapter
        );


    $("#prevChapterBottom")
        .on(
            "click",
            goPreviousChapter
        );


    $("#nextChapter")
        .on(
            "click",
            goNextChapter
        );


    $("#nextChapterBottom")
        .on(
            "click",
            goNextChapter
        );


    /* =========================================================
       CLOSE CHAPTER LIST WHEN CLICKING OUTSIDE
    ========================================================= */

    $(document).on(
        "click",
        function (event) {

            const list =
                $("#chapterList")[0];


            const button =
                $("#chapterListButton")[0];


            if (!list || !button) {
                return;
            }


            if (
                !list.contains(event.target) &&
                !button.contains(event.target)
            ) {

                $("#chapterList")
                    .addClass("hidden");
            }
        }
    );


    /* =========================================================
       INITIAL LOAD
    ========================================================= */

    loadNovel();

});