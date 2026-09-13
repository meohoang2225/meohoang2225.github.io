(function (window, $) {

    "use strict";


    /* =====================================================
       CONFIG
    ====================================================== */

    const CONFIG =
        window.TRUYEN_DOC_CONFIG || {};

    const ITEMS_PER_PAGE = 12;


    /* =====================================================
       STATE
    ====================================================== */

    let novels = [];

    let currentPage = 1;

    let currentSearch = "";

    let currentStatus = "all";

    let currentGenre = "all";


    /* =====================================================
       HELPERS
    ====================================================== */

    function escapeHtml(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(value)
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );
    }


    function normalizeText(value) {

        return String(value || "")
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .toLowerCase()
            .trim();
    }


    function getNovelUrl(
        novelId,
        chapterId
    ) {

        let url =
            "reader.html?novel=" +
            encodeURIComponent(
                novelId
            );

        if (chapterId) {

            url +=
                "&chapter=" +
                encodeURIComponent(
                    chapterId
                );
        }

        return url;
    }


    function getCover(novel) {

        if (
            novel &&
            novel.cover
        ) {
            return novel.cover;
        }

        return "images/default.jpg";
    }


    function getStatusClass(
        status
    ) {

        const value =
            normalizeText(
                status
            );

        if (
            value.includes(
                "hoan"
            )
        ) {

            return "status-completed";
        }

        if (
            value.includes(
                "tam"
            )
        ) {

            return "status-paused";
        }

        return "status-ongoing";
    }


    function getStatusLabel(
        status
    ) {

        return status ||
            "Đang ra";
    }


    /* =====================================================
       GENRE HELPERS
    ====================================================== */

    /*
     * Hỗ trợ nhiều kiểu dữ liệu:
     *
     * genres: ["Cổ trang", "Tình cảm"]
     *
     * hoặc:
     *
     * genres: "Cổ trang, Tình cảm"
     *
     * hoặc:
     *
     * genre: "Cổ trang"
     */

    function getNovelGenres(
        novel
    ) {

        if (!novel) {
            return [];
        }


        let genres = [];


        if (
            Array.isArray(
                novel.genres
            )
        ) {

            genres =
                novel.genres;

        } else if (
            typeof novel.genres ===
            "string"
        ) {

            genres =
                novel.genres
                    .split(",")
                    .map(
                        item =>
                            item.trim()
                    );

        } else if (
            typeof novel.genre ===
            "string"
        ) {

            genres =
                novel.genre
                    .split(",")
                    .map(
                        item =>
                            item.trim()
                    );

        }


        return genres
            .map(
                item =>
                    String(
                        item || ""
                    ).trim()
            )
            .filter(
                Boolean
            );
    }


    /*
     * Lấy toàn bộ thể loại đang có
     * trong novels.json.
     */

    function getAllGenres() {

        const map =
            new Map();


        novels.forEach(
            novel => {

                const genres =
                    getNovelGenres(
                        novel
                    );


                genres.forEach(
                    genre => {

                        const normalized =
                            normalizeText(
                                genre
                            );

                        if (
                            normalized &&
                            !map.has(
                                normalized
                            )
                        ) {

                            map.set(
                                normalized,
                                genre
                            );
                        }

                    }
                );

            }
        );


        return Array.from(
            map.values()
        ).sort(
            (a, b) =>
                String(a).localeCompare(
                    String(b),
                    "vi"
                )
        );
    }


    /*
     * Tìm thể loại trong một truyện.
     */

    function hasGenre(
        novel,
        selectedGenre
    ) {

        if (
            !selectedGenre ||
            selectedGenre ===
            "all"
        ) {

            return true;
        }


        const target =
            normalizeText(
                selectedGenre
            );


        return getNovelGenres(
            novel
        ).some(
            genre =>
                normalizeText(
                    genre
                ) === target
        );
    }


    /*
     * Điền danh sách thể loại
     * vào desktop + mobile.
     */

    function populateGenreFilters() {

        const genres =
            getAllGenres();


        const selectors = [
            "#genre-filter",
            "#mobile-genre-filter"
        ];


        selectors.forEach(
            selector => {

                const $select =
                    $(selector);


                if (!$select.length) {
                    return;
                }


                const currentValue =
                    $select.val();


                $select.empty();


                $select.append(`
                    <option value="">
                        Thể loại
                    </option>
                `);


                genres.forEach(
                    genre => {

                        $select.append(`
                            <option
                                value="${escapeHtml(
                                    genre
                                )}"
                            >
                                ${escapeHtml(
                                    genre
                                )}
                            </option>
                        `);

                    }
                );


                /*
                 * Khôi phục lựa chọn hiện tại
                 * nếu thể loại vẫn tồn tại.
                 */

                if (
                    currentValue &&
                    genres.some(
                        genre =>
                            normalizeText(
                                genre
                            ) ===
                            normalizeText(
                                currentValue
                            )
                    )
                ) {

                    $select.val(
                        currentValue
                    );

                } else {

                    $select.val("");
                }

            }
        );

    }


    /* =====================================================
       LOAD NOVELS
    ====================================================== */

    async function loadNovels() {

        try {

            const response =
                await fetch(
                    CONFIG.data?.novels ||
                    "data/novels.json",
                    {
                        cache:
                            "no-cache"
                    }
                );


            if (!response.ok) {

                throw new Error(
                    "Không thể tải danh sách truyện: " +
                    response.status
                );
            }


            const data =
                await response.json();


            novels =
                Array.isArray(data)
                    ? data
                    : [];


            /*
             * Tạo danh sách thể loại
             * sau khi novels đã được load.
             */

            populateGenreFilters();


            /*
             * Render toàn bộ trang.
             */

            render();


        } catch (error) {

            console.error(
                error
            );


            $("#novel-list").html(`
                <div class="alert alert-danger">
                    Không thể tải danh sách truyện.
                </div>
            `);


            updateNovelCount(
                0,
                0
            );

        }

    }


    /* =====================================================
       FILTER
    ====================================================== */

    function getFilteredNovels() {

        const search =
            normalizeText(
                currentSearch
            );


        return novels.filter(
            novel => {


                /* -----------------------------------------
                   STATUS
                ------------------------------------------ */

                if (
                    currentStatus !==
                    "all"
                ) {

                    if (
                        normalizeText(
                            novel.status
                        ) !==
                        normalizeText(
                            currentStatus
                        )
                    ) {

                        return false;
                    }

                }


                /* -----------------------------------------
                   GENRE
                ------------------------------------------ */

                if (
                    currentGenre !==
                    "all"
                ) {

                    if (
                        !hasGenre(
                            novel,
                            currentGenre
                        )
                    ) {

                        return false;
                    }

                }


                /* -----------------------------------------
                   SEARCH
                ------------------------------------------ */

                if (!search) {

                    return true;
                }


                const title =
                    normalizeText(
                        novel.title
                    );


                const author =
                    normalizeText(
                        novel.author
                    );


                /*
                 * Cho phép tìm cả mô tả.
                 */

                const description =
                    normalizeText(
                        novel.description
                    );


                return (
                    title.includes(
                        search
                    ) ||
                    author.includes(
                        search
                    ) ||
                    description.includes(
                        search
                    )
                );

            }
        );
    }


    /* =====================================================
       NOVEL COUNT
    ====================================================== */

    function updateNovelCount(
        total,
        filtered
    ) {

        const $count =
            $("#novelCount");


        if (!$count.length) {
            return;
        }


        if (
            total === filtered
        ) {

            $count.text(
                `${total} truyện`
            );

            return;
        }


        $count.text(
            `Hiển thị ${filtered} / ${total} truyện`
        );

    }


    /* =====================================================
       RENDER
    ====================================================== */

    function render() {

        const filtered =
            getFilteredNovels();


        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    filtered.length /
                    ITEMS_PER_PAGE
                )
            );


        if (
            currentPage >
            totalPages
        ) {

            currentPage =
                totalPages;
        }


        const start =
            (
                currentPage -
                1
            ) *
            ITEMS_PER_PAGE;


        const pageItems =
            filtered.slice(
                start,
                start +
                ITEMS_PER_PAGE
            );


        updateNovelCount(
            novels.length,
            filtered.length
        );


        renderNovels(
            pageItems
        );


        renderPagination(
            totalPages
        );


        renderContinueReading();


        renderHistory();

    }


    /* =====================================================
       NOVEL CARDS
    ====================================================== */

    function renderNovels(
        items
    ) {

        const $container =
            $("#novel-list");


        if (
            !$container.length
        ) {

            return;
        }


        if (!items.length) {

            $container.html(`
                <div class="loading">
                    Không tìm thấy truyện phù hợp.
                </div>
            `);


            return;
        }


        let html = "";


        items.forEach(
            novel => {


                const progress =
                    window.ReaderStorage
                        ?.getNovelProgress(
                            novel.id
                        );


                const continueChapter =
                    progress?.chapterId ||
                    "";


                const latestChapter =
                    getLatestChapterId(
                        novel
                    );


                const targetChapter =
                    continueChapter ||
                    latestChapter;


                const genres =
                    getNovelGenres(
                        novel
                    );


                html += `
                    <article class="novel-card">

                        <a
                            href="${getNovelUrl(
                                novel.id,
                                targetChapter
                            )}"
                            class="novel-card-link"
                        >

                            <div class="novel-cover">

                                <img
                                    src="${escapeHtml(
                                        getCover(
                                            novel
                                        )
                                    )}"
                                    alt="${escapeHtml(
                                        novel.title
                                    )}"
                                    loading="lazy"
                                >

                            </div>


                            <div class="novel-info">


                                <h2 class="novel-title">
                                    ${escapeHtml(
                                        novel.title
                                    )}
                                </h2>


                                <div class="novel-author">

                                    ${escapeHtml(
                                        novel.author ||
                                        "Chưa rõ tác giả"
                                    )}

                                </div>


                                <div class="novel-status">

                                    <span
                                        class="status-badge ${getStatusClass(
                                            novel.status
                                        )}"
                                    >

                                        ${escapeHtml(
                                            getStatusLabel(
                                                novel.status
                                            )
                                        )}

                                    </span>

                                </div>


                                <div class="novel-description">

                                    ${escapeHtml(
                                        novel.description ||
                                        ""
                                    )}

                                </div>


                                ${
                                    genres.length
                                        ? `
                                        <div class="novel-genres">

                                            ${genres
                                                .slice(
                                                    0,
                                                    3
                                                )
                                                .map(
                                                    genre => `
                                                        <span
                                                            class="novel-genre"
                                                        >
                                                            ${escapeHtml(
                                                                genre
                                                            )}
                                                        </span>
                                                    `
                                                )
                                                .join(" · ")
                                            }

                                        </div>
                                        `
                                        : ""
                                }


                                <div class="novel-meta">

                                    <span>
                                        📚 ${
                                            Number(
                                                novel.chapterCount
                                            ) || 0
                                        } chương
                                    </span>


                                    ${
                                        novel.updatedAt
                                            ? `
                                            <span>
                                                🕒 ${escapeHtml(
                                                    novel.updatedAt
                                                )}
                                            </span>
                                            `
                                            : ""
                                    }

                                </div>


                                ${
                                    targetChapter
                                        ? `
                                        <div class="novel-latest">

                                            <span
                                                class="novel-read-button"
                                            >

                                                ${
                                                    continueChapter
                                                        ? "▶ Tiếp tục đọc"
                                                        : "🆕 Đọc truyện"
                                                }

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
        );


        $container.html(
            html
        );

    }


    /* =====================================================
       LATEST CHAPTER
    ====================================================== */

    function getLatestChapterId(
        novel
    ) {

        if (
            novel &&
            novel.latestChapter
        ) {

            return String(
                novel.latestChapter
            );

        }


        return "";
    }


    /* =====================================================
       PAGINATION
    ====================================================== */

    function renderPagination(
        totalPages
    ) {

        const $container =
            $("#pagination");


        if (
            !$container.length
        ) {

            return;
        }


        if (
            totalPages <= 1
        ) {

            $container.empty();

            return;
        }


        let html = `
            <nav
                aria-label="Phân trang"
            >

                <ul class="pagination justify-content-center">
        `;


        /*
         * Previous
         */

        html += `
            <li class="page-item ${
                currentPage === 1
                    ? "disabled"
                    : ""
            }">

                <button
                    class="page-link"
                    data-page="${
                        currentPage - 1
                    }"
                    ${
                        currentPage === 1
                            ? "disabled"
                            : ""
                    }
                >
                    ‹
                </button>

            </li>
        `;


        /*
         * Pages
         */

        const pages =
            buildPaginationPages(
                currentPage,
                totalPages
            );


        pages.forEach(
            page => {

                if (
                    page === "..."
                ) {

                    html += `
                        <li class="page-item disabled">

                            <span class="page-link">
                                …
                            </span>

                        </li>
                    `;

                    return;
                }


                html += `
                    <li class="page-item ${
                        page ===
                        currentPage
                            ? "active"
                            : ""
                    }">

                        <button
                            class="page-link"
                            data-page="${page}"
                        >
                            ${page}
                        </button>

                    </li>
                `;

            }
        );


        /*
         * Next
         */

        html += `
            <li class="page-item ${
                currentPage ===
                totalPages
                    ? "disabled"
                    : ""
            }">

                <button
                    class="page-link"
                    data-page="${
                        currentPage + 1
                    }"
                    ${
                        currentPage ===
                        totalPages
                            ? "disabled"
                            : ""
                    }
                >
                    ›
                </button>

            </li>
        `;


        html += `
                </ul>

            </nav>
        `;


        $container.html(
            html
        );

    }


    function buildPaginationPages(
        current,
        total
    ) {

        if (
            total <= 7
        ) {

            return Array.from(
                {
                    length:
                        total
                },
                (
                    _,
                    i
                ) =>
                    i + 1
            );
        }


        const pages = [];


        pages.push(1);


        if (
            current > 4
        ) {

            pages.push(
                "..."
            );
        }


        const start =
            Math.max(
                2,
                current - 1
            );


        const end =
            Math.min(
                total - 1,
                current + 1
            );


        for (
            let i = start;
            i <= end;
            i++
        ) {

            pages.push(
                i
            );

        }


        if (
            current <
            total - 3
        ) {

            pages.push(
                "..."
            );
        }


        pages.push(
            total
        );


        return pages;

    }


    /* =====================================================
       CONTINUE READING
    ====================================================== */

    function renderContinueReading() {

        const $container =
            $("#continue-reading");


        if (
            !$container.length
        ) {

            return;
        }


        const progress =
            window.ReaderStorage
                ?.getProgress() ||
            {};


        const entries =
            Object.entries(
                progress
            );


        if (
            !entries.length
        ) {

            $container.empty();

            return;
        }


        /*
         * Lấy lần đọc gần nhất.
         */

        entries.sort(
            (a, b) => {

                return new Date(
                    b[1].updatedAt ||
                    0
                ) -
                new Date(
                    a[1].updatedAt ||
                    0
                );

            }
        );


        const [
            novelId,
            data
        ] = entries[0];


        const novel =
            novels.find(
                item =>
                    String(
                        item.id
                    ) ===
                    String(
                        novelId
                    )
            );


        if (
            !novel ||
            !data.chapterId
        ) {

            $container.empty();

            return;
        }


        const percent =
            Math.max(
                0,
                Math.min(
                    100,
                    Math.round(
                        (
                            Number(
                                data.scroll
                            ) || 0
                        ) * 100
                    )
                )
            );


        $container.html(`
            <div class="continue-card">

                <div class="continue-cover">

                    <img
                        src="${escapeHtml(
                            getCover(
                                novel
                            )
                        )}"
                        alt="${escapeHtml(
                            novel.title
                        )}"
                    >

                </div>


                <div class="continue-info">

                    <div class="continue-label">
                        ▶ TIẾP TỤC ĐỌC
                    </div>


                    <h2>
                        ${escapeHtml(
                            novel.title
                        )}
                    </h2>


                    <p>
                        Chương ${
                            escapeHtml(
                                data.chapterId
                            )
                        }
                    </p>


                    <div class="continue-progress">

                        <div
                            class="continue-progress-bar"
                            style="width:${percent}%"
                        ></div>

                    </div>


                    <div class="continue-percent">
                        Đã đọc ${percent}%
                    </div>


                    <a
                        href="${getNovelUrl(
                            novel.id,
                            data.chapterId
                        )}"
                        class="continue-button"
                    >
                        ▶ Tiếp tục đọc
                    </a>

                </div>

            </div>
        `);

    }


    /* =====================================================
       HISTORY
    ====================================================== */

    function renderHistory() {

        const $container =
            $("#reading-history");


        if (
            !$container.length
        ) {

            return;
        }


        const history =
            window.ReaderStorage
                ?.getHistory() ||
            [];


        if (
            !history.length
        ) {

            $container.empty();

            return;
        }


        let html = `
            <div class="section-title">

                <h2>
                    🕘 Lịch sử đọc
                </h2>

            </div>

            <div class="history-list">
        `;


        let count =
            0;


        history
            .slice(
                0,
                10
            )
            .forEach(
                item => {

                    const novel =
                        novels.find(
                            currentNovel =>
                                String(
                                    currentNovel.id
                                ) ===
                                String(
                                    item.novelId
                                )
                        );


                    if (!novel) {
                        return;
                    }


                    count++;


                    html += `
                        <div class="history-item">

                            <div class="history-info">

                                <div class="history-title">

                                    ${escapeHtml(
                                        novel.title
                                    )}

                                </div>


                                <div class="history-chapter">

                                    Chương ${
                                        escapeHtml(
                                            item.chapterId
                                        )
                                    }

                                    ${
                                        item.readAt
                                            ? `
                                                · ${
                                                    formatHistoryTime(
                                                        item.readAt
                                                    )
                                                }
                                            `
                                            : ""
                                    }

                                </div>

                            </div>


                            <a
                                href="${getNovelUrl(
                                    item.novelId,
                                    item.chapterId
                                )}"
                                class="history-button"
                            >
                                Đọc tiếp
                            </a>

                        </div>
                    `;

                }
            );


        html += `
            </div>
        `;


        if (!count) {

            $container.empty();

            return;
        }


        $container.html(
            html
        );

    }


    function formatHistoryTime(
        value
    ) {

        if (!value) {
            return "";
        }


        const date =
            new Date(
                value
            );


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "";
        }


        return date.toLocaleString(
            "vi-VN",
            {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit"
            }
        );

    }


    /* =====================================================
       EVENTS
    ====================================================== */

    function bindEvents() {


        /* -----------------------------------------
           SEARCH
        ------------------------------------------ */

        $(document).on(
            "input",
            "#novel-search",
            function () {

                currentSearch =
                    $(this).val() ||
                    "";


                currentPage = 1;


                render();

            }
        );


        /* -----------------------------------------
           STATUS
        ------------------------------------------ */

        $(document).on(
            "change",
            "#status-filter",
            function () {

                currentStatus =
                    $(this).val() ||
                    "all";


                currentPage = 1;


                render();

            }
        );


        /* -----------------------------------------
           GENRE
        ------------------------------------------ */

        $(document).on(
            "change",
            "#genre-filter",
            function () {

                currentGenre =
                    $(this).val() ||
                    "all";


                currentPage = 1;


                render();

            }
        );


        /* -----------------------------------------
           PAGINATION
        ------------------------------------------ */

        $(document).on(
            "click",
            "#pagination [data-page]",
            function () {

                const page =
                    Number(
                        $(this).attr(
                            "data-page"
                        )
                    );


                if (
                    !page ||
                    page < 1
                ) {

                    return;
                }


                const filtered =
                    getFilteredNovels();


                const totalPages =
                    Math.max(
                        1,
                        Math.ceil(
                            filtered.length /
                            ITEMS_PER_PAGE
                        )
                    );


                if (
                    page >
                    totalPages
                ) {

                    return;
                }


                currentPage =
                    page;


                render();


                window.scrollTo({
                    top: 0,
                    behavior:
                        "smooth"
                });

            }
        );

    }


    /* =====================================================
       INIT
    ====================================================== */

    $(function () {

        bindEvents();

        loadNovels();

    });


    /* =====================================================
       PUBLIC API
    ====================================================== */

    window.TruyenDocApp = {

        reload:
            loadNovels,

        getNovels:
            () => novels,

        getFilteredNovels:
            () =>
                getFilteredNovels(),

        getGenres:
            () =>
                getAllGenres()

    };


})(window, jQuery);