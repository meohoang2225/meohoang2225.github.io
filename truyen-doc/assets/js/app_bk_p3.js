$(document).ready(function () {

    let novels = [];


    // ==============================
    // Load danh sách truyện
    // ==============================

    $.getJSON("data/novels.json")

        .done(function (data) {

            novels = data;

            renderNovels(novels);

        })

        .fail(function () {

            $("#novelList").html(`
                <div class="error">
                    Không thể tải danh sách truyện.
                </div>
            `);

        });


    // ==============================
    // Render
    // ==============================

    function renderNovels(list) {

        $("#novelCount").text(
            `${list.length} truyện`
        );


        if (list.length === 0) {

            $("#novelList").empty();

            $("#emptyResult")
                .removeClass("hidden");

            return;
        }


        $("#emptyResult")
            .addClass("hidden");


        let html = "";


        list.forEach(function (novel) {

            html += `

                <article class="novel-card">

                    <a
                        href="reader.html?novel=${encodeURIComponent(novel.id)}"
                        class="novel-cover-link"
                    >

                        <img
                            src="${novel.cover}"
                            alt="${escapeHtml(novel.title)}"
                            class="novel-cover"
                            loading="lazy"
                            onerror="this.src='images/novels/default.jpg'"
                        >

                    </a>


                    <div class="novel-info">

                        <h2>

                            <a
                                href="reader.html?novel=${encodeURIComponent(novel.id)}"
                            >
                                ${escapeHtml(novel.title)}
                            </a>

                        </h2>


                        <div class="novel-author">

                            Tác giả:
                            ${escapeHtml(novel.author || "Không rõ")}

                        </div>


                        <div class="novel-status">

                            ${escapeHtml(novel.status || "")}

                        </div>


                        <p class="novel-description">

                            ${escapeHtml(
                                novel.description || ""
                            )}

                        </p>


                        <div class="novel-footer">

                            <span>
                                ${novel.chapterCount || 0} chương
                            </span>


                            <a
                                href="reader.html?novel=${encodeURIComponent(novel.id)}"
                                class="read-button"
                            >
                                Đọc truyện
                            </a>

                        </div>

                    </div>

                </article>

            `;

        });


        $("#novelList").html(html);
    }


    // ==============================
    // Search
    // ==============================

    $("#searchInput").on("input", function () {

        const keyword = $(this)
            .val()
            .trim()
            .toLowerCase();


        if (!keyword) {

            renderNovels(novels);

            return;
        }


        const filtered = novels.filter(function (novel) {

            const title =
                (novel.title || "").toLowerCase();

            const author =
                (novel.author || "").toLowerCase();

            return (
                title.includes(keyword) ||
                author.includes(keyword)
            );

        });


        renderNovels(filtered);

    });


    // ==============================
    // HTML escape
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