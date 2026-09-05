$(document).ready(function () {

    let novelId = null;
    let chapterId = null;

    let novel = null;
    let chapters = [];

    let currentChapterIndex = -1;


    // ==============================
    // Đọc URL
    // ==============================

    const params = new URLSearchParams(
        window.location.search
    );


    novelId = params.get("novel");
    chapterId = params.get("chapter");


    if (!novelId) {

        showError("Không tìm thấy truyện.");

        return;
    }


    // ==============================
    // Load dữ liệu
    // ==============================

    loadNovel();


    // ==============================
    // Load thông tin truyện
    // ==============================

    function loadNovel() {

        $.getJSON(
            `data/novels/${encodeURIComponent(novelId)}/info.json`
        )

        .done(function (data) {

            novel = data;

            $("#bookTitle")
                .text(novel.title)
                .attr(
                    "href",
                    `reader.html?novel=${encodeURIComponent(novelId)}`
                );


            document.title =
                novel.title + " - Đọc truyện";


            loadChapters();

        })

        .fail(function () {

            showError(
                "Không tìm thấy truyện."
            );

        });

    }


    // ==============================
    // Load danh sách chương
    // ==============================

    function loadChapters() {

        $.getJSON(
            `data/novels/${encodeURIComponent(novelId)}/chapters.json`
        )

        .done(function (data) {

            chapters = data || [];


            if (chapters.length === 0) {

                showError(
                    "Truyện chưa có chương nào."
                );

                return;
            }


            renderChapterList();


            // Nếu không truyền chapter
            // → mở chương đầu tiên

            if (!chapterId) {

                const saved =
                    getSavedChapter();


                if (saved) {

                    chapterId = saved;

                } else {

                    chapterId =
                        chapters[0].id;

                }

            }


            currentChapterIndex =
                chapters.findIndex(function (chapter) {

                    return chapter.id === chapterId;

                });


            // Không tìm thấy chương
            // → mở chương đầu tiên

            if (currentChapterIndex === -1) {

                currentChapterIndex = 0;

                chapterId =
                    chapters[0].id;

            }


            loadChapter();

        })

        .fail(function () {

            showError(
                "Không thể tải danh sách chương."
            );

        });

    }


    // ==============================
    // Load chương
    // ==============================

    function loadChapter() {

        const chapter =
            chapters[currentChapterIndex];


        if (!chapter) {

            showError(
                "Không tìm thấy chương."
            );

            return;
        }


        chapterId = chapter.id;


        $("#chapterTitle")
            .text("Đang tải...");


        $("#chapterContent")
            .html(`
                <div class="loading">
                    Đang tải chương...
                </div>
            `);


        $.getJSON(

            `data/novels/${encodeURIComponent(novelId)}/${encodeURIComponent(chapterId)}.json`

        )

        .done(function (data) {

            renderChapter(data);

        })

        .fail(function () {

            showError(
                "Không thể tải nội dung chương."
            );

        });

    }


    // ==============================
    // Render chương
    // ==============================

    function renderChapter(data) {

        $("#chapterTitle")
            .text(data.title || "Không có tiêu đề");


        $("#chapterContent")
            .html(data.content || "<p>Chương này chưa có nội dung.</p>");


        $("#chapterProgress")
            .text(
                `Chương ${currentChapterIndex + 1} / ${chapters.length}`
            );


        updateNavigation();


        saveCurrentChapter();


        updateUrl();


        renderChapterList();


        // Cuộn lên đầu
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }


    // ==============================
    // Navigation
    // ==============================

    function updateNavigation() {

        const isFirst =
            currentChapterIndex <= 0;


        const isLast =
            currentChapterIndex >= chapters.length - 1;


        $("#prevChapter")
            .prop("disabled", isFirst);


        $("#prevChapterBottom")
            .prop("disabled", isFirst);


        $("#nextChapter")
            .prop("disabled", isLast);


        $("#nextChapterBottom")
            .prop("disabled", isLast);

    }


    function goPrevious() {

        if (currentChapterIndex <= 0) {
            return;
        }


        currentChapterIndex--;

        loadChapter();

    }


    function goNext() {

        if (
            currentChapterIndex >=
            chapters.length - 1
        ) {
            return;
        }


        currentChapterIndex++;

        loadChapter();

    }


    $("#prevChapter").on(
        "click",
        goPrevious
    );


    $("#prevChapterBottom").on(
        "click",
        goPrevious
    );


    $("#nextChapter").on(
        "click",
        goNext
    );


    $("#nextChapterBottom").on(
        "click",
        goNext
    );


    // ==============================
    // Chapter list
    // ==============================

    $("#chapterListButton").on(
        "click",
        function () {

            $("#chapterList")
                .toggleClass("hidden");

        }
    );


    $("#closeChapterList").on(
        "click",
        function () {

            $("#chapterList")
                .addClass("hidden");

        }
    );


    function renderChapterList() {

        let html = "";


        chapters.forEach(
            function (chapter, index) {

                const active =
                    index === currentChapterIndex
                        ? "active"
                        : "";


                html += `

                    <a
                        href="reader.html?novel=${encodeURIComponent(novelId)}&chapter=${encodeURIComponent(chapter.id)}"
                        class="chapter-item ${active}"
                    >

                        <span>
                            ${index + 1}.
                            ${escapeHtml(chapter.title)}
                        </span>

                    </a>

                `;

            }
        );


        $("#chapterListContent")
            .html(html);

    }


    // ==============================
    // URL
    // ==============================

    function updateUrl() {

        const url =
            `reader.html?novel=${encodeURIComponent(novelId)}&chapter=${encodeURIComponent(chapterId)}`;


        window.history.replaceState(
            {},
            "",
            url
        );

    }


    // ==============================
    // LocalStorage
    // ==============================

    function storageKey() {

        return `reading_${novelId}`;

    }


    function saveCurrentChapter() {

        localStorage.setItem(
            storageKey(),
            chapterId
        );

    }


    function getSavedChapter() {

        return localStorage.getItem(
            storageKey()
        );

    }


    // ==============================
    // Keyboard
    // ==============================

    $(document).on(
        "keydown",
        function (event) {

            // ←
            if (
                event.key === "ArrowLeft" &&
                !isTypingTarget(event.target)
            ) {

                goPrevious();

            }


            // →
            if (
                event.key === "ArrowRight" &&
                !isTypingTarget(event.target)
            ) {

                goNext();

            }

        }
    );


    function isTypingTarget(target) {

        const tag =
            target.tagName.toLowerCase();


        return (
            tag === "input" ||
            tag === "textarea" ||
            target.isContentEditable
        );

    }


    // ==============================
    // Error
    // ==============================

    function showError(message) {

        $("#chapterContent").html(`
            <div class="error">
                ${escapeHtml(message)}
            </div>
        `);

    }


    // ==============================
    // Escape
    // ==============================

    function escapeHtml(value) {

        return String(value)

            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }

});