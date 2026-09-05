(function (window, $) {

    "use strict";


    // ==========================================
    // CONFIG
    // ==========================================

    const CONFIG =
        window.TRUYEN_DOC_CONFIG;


    const ADMIN_KEY =
        "truyen_doc_admin_logged_in";


    const DRAFT_KEY =
        "truyen_doc_editor_draft";


    let editor = null;

    let novels = [];

    let chapters = [];

    let selectedNovelId = null;

    let editingChapterId = null;

    // ===============================
    // SECURITY: Escape HTML
    // ===============================
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
    
    function escapeAttr(value) {
    
        if (value === null || value === undefined) {
    
            return "";
    
        }
    
        return String(value)
    
            .replace(/&/g, "&amp;")
    
            .replace(/"/g, "&quot;")
    
            .replace(/'/g, "&#039;")
    
            .replace(/</g, "&lt;")
    
            .replace(/>/g, "&gt;");
    
    }

    // ==========================================
    // TOAST
    // ==========================================

    function toast(
        message,
        type = "success"
    ) {

        const el =
            $("#toast");


        el
            .removeClass(
                "show success error"
            )
            .addClass(type)
            .text(message);


        setTimeout(
            () =>
                el.addClass("show"),
            10
        );


        setTimeout(
            () =>
                el.removeClass("show"),
            3200
        );

    }



    // ==========================================
    // LOGIN
    // ==========================================

    function isLoggedIn() {

        return (
            sessionStorage.getItem(
                ADMIN_KEY
            ) === "true"
        );

    }


    function showLogin() {

        $("#login-screen")
            .removeClass("hidden");

        $("#admin-app")
            .addClass("hidden");

    }


    function showApp() {

        $("#login-screen")
            .addClass("hidden");

        $("#admin-app")
            .removeClass("hidden");

    }


    $("#btn-login").on(
        "click",
        function () {

            const password =
                $("#admin-password")
                    .val();


            /*
             * ĐỔI MẬT KHẨU NÀY
             * trước khi public.
             */

            const ADMIN_PASSWORD =
                "admin123";


            if (
                password ===
                ADMIN_PASSWORD
            ) {

                sessionStorage.setItem(
                    ADMIN_KEY,
                    "true"
                );


                $("#login-error")
                    .text("");


                showApp();


                initializeApp();

            } else {

                $("#login-error")
                    .text(
                        "Sai mật khẩu."
                    );

            }

        }
    );


    $("#admin-password").on(
        "keydown",
        function (e) {

            if (
                e.key === "Enter"
            ) {

                $("#btn-login").click();

            }

        }
    );


    $("#btn-logout").on(
        "click",
        function () {

            if (
                hasUnsavedDraft()
            ) {

                if (
                    !confirm(
                        "Bạn đang có nội dung chưa lưu. Đăng xuất?"
                    )
                ) {

                    return;

                }

            }


            sessionStorage.removeItem(
                ADMIN_KEY
            );


            GitHubAPI.clearToken();


            location.reload();

        }
    );



    // ==========================================
    // GITHUB
    // ==========================================

    function updateGitHubStatus() {

        const online =
            GitHubAPI.isConnected();


        const status =
            $("#github-status");


        const dot =
            $("#github-dot");


        if (online) {

            status
                .text(
                    "Đã kết nối"
                )
                .removeClass("offline")
                .addClass("online");


            dot
                .removeClass("offline")
                .addClass("online");

        } else {

            status
                .text(
                    "Chưa kết nối"
                )
                .removeClass("online")
                .addClass("offline");


            dot
                .removeClass("online")
                .addClass("offline");

        }

    }


    function initGitHub() {

        const github =
            CONFIG.github;


        $("#github-repository")
            .text(
                github.owner +
                "/" +
                github.repo
            );


        $("#github-branch")
            .text(
                github.branch
            );


        updateGitHubStatus();

    }


    $("#btn-github-connect").on(
        "click",
        async function () {

            const button =
                $(this);


            const token =
                $("#github-token")
                    .val()
                    .trim();


            if (!token) {

                toast(
                    "Nhập GitHub token.",
                    "error"
                );

                return;

            }


            button
                .prop(
                    "disabled",
                    true
                )
                .text(
                    "Đang kết nối..."
                );


            try {

                GitHubAPI.setToken(
                    token
                );


                const repo =
                    await GitHubAPI
                        .testConnection();


                updateGitHubStatus();


                $("#github-token")
                    .val("");


                toast(
                    `Đã kết nối ${repo.full_name}`,
                    "success"
                );


                await loadNovels();


            } catch (error) {

                GitHubAPI.clearToken();

                updateGitHubStatus();


                toast(
                    "Kết nối thất bại: " +
                    error.message,
                    "error"
                );

            }


            button
                .prop(
                    "disabled",
                    false
                )
                .text(
                    "🔗 Kết nối"
                );

        }
    );


    $("#btn-github-disconnect").on(
        "click",
        function () {

            GitHubAPI.clearToken();

            updateGitHubStatus();

            toast(
                "Đã ngắt kết nối.",
                "success"
            );

        }
    );



    // ==========================================
    // LOAD NOVELS
    // ==========================================

    async function loadNovels() {

        if (
            !GitHubAPI.isConnected()
        ) {

            return;

        }


        try {

            const result =
                await GitHubAPI
                    .getJson(
                        CONFIG.data.novels
                    );


            novels =
                Array.isArray(
                    result.data
                )
                    ? result.data
                    : [];


            renderNovelSelect();


        } catch (error) {

            if (
                error.status === 404
            ) {

                novels = [];

                renderNovelSelect();

                return;

            }


            toast(
                "Không tải được danh sách truyện: " +
                error.message,
                "error"
            );

        }

    }



    // ==========================================
    // NOVEL SELECT
    // ==========================================

    function renderNovelSelect() {

        const select =
            $("#novel-select");


        select.empty();


        select.append(
            $("<option>", {
                value: "",
                text:
                    "-- Chọn truyện --"
            })
        );


        novels.forEach(
            novel => {

                select.append(
                    $("<option>", {
                        value:
                            novel.id,

                        text:
                            `${novel.title} (${novel.id})`
                    })
                );

            }
        );


        if (selectedNovelId) {

            select.val(
                selectedNovelId
            );

        }

    }


    $("#novel-select").on(
        "change",
        async function () {

            const id =
                $(this).val();


            if (!id) {

                selectedNovelId =
                    null;


                hideNovelSections();

                return;

            }


            selectedNovelId =
                id;


            await openNovel(
                id
            );

        }
    );



    // ==========================================
    // OPEN NOVEL
    // ==========================================

    async function openNovel(
        novelId
    ) {

        try {

            const result =
                await GitHubAPI.getJson(
                    `${CONFIG.data.novels_folder}/${novelId}/info.json`
                );


            const novel =
                result.data;


            fillNovelForm(
                novel
            );


            $("#novel-section")
                .removeClass("hidden");


            $("#chapter-section")
                .removeClass("hidden");


            await loadChapters(
                novelId
            );


        } catch (error) {

            toast(
                "Không mở được truyện: " +
                error.message,
                "error"
            );

        }

    }



    // ==========================================
    // NOVEL FORM
    // ==========================================

    function fillNovelForm(
        novel
    ) {

        $("#novel-id")
            .val(
                novel.id || ""
            );


        $("#novel-title")
            .val(
                novel.title || ""
            );


        $("#novel-author")
            .val(
                novel.author || ""
            );


        $("#novel-status")
            .val(
                novel.status ||
                "Đang ra"
            );


        $("#novel-cover")
            .val(
                novel.cover || ""
            );


        $("#novel-description")
            .val(
                novel.description || ""
            );


        showCoverPreview(
            novel.cover
        );

    }


    function clearNovelForm() {

        $("#novel-id").val("");

        $("#novel-title").val("");

        $("#novel-author").val("");

        $("#novel-status")
            .val("Đang ra");

        $("#novel-cover").val("");

        $("#novel-description")
            .val("");

        $("#cover-preview-image")
            .attr("src", "");

        $("#cover-preview")
            .removeClass("show");

    }



    // ==========================================
    // NEW NOVEL
    // ==========================================

    $("#btn-new-novel").on(
        "click",
        function () {

            selectedNovelId =
                null;


            $("#novel-select")
                .val("");


            clearNovelForm();


            $("#novel-section")
                .removeClass("hidden");


            $("#chapter-section")
                .addClass("hidden");


            $("#editor-section")
                .addClass("hidden");


            $("#novel-id")
                .focus();


            window.scrollTo({
                top:
                    $("#novel-section")
                        .offset()
                        .top - 70,

                behavior:
                    "smooth"

            });

        }
    );



    // ==========================================
    // SAVE NOVEL
    // ==========================================

    $("#btn-save-novel").on(
        "click",
        async function () {

            const button =
                $(this);


            try {

                requireGitHub();


                let id =
                    $("#novel-id")
                        .val()
                        .trim()
                        .toLowerCase();


                const title =
                    $("#novel-title")
                        .val()
                        .trim();


                if (!id) {

                    throw new Error(
                        "Chưa nhập ID truyện."
                    );

                }


                if (!/^[a-z0-9-]+$/.test(id)) {

                    throw new Error(
                        "ID chỉ được chứa a-z, 0-9 và dấu -."
                    );

                }


                if (!title) {

                    throw new Error(
                        "Chưa nhập tên truyện."
                    );

                }


                button
                    .prop(
                        "disabled",
                        true
                    )
                    .text(
                        "Đang lưu..."
                    );


                const path =
                    `${CONFIG.data.novels_folder}/${id}/info.json`;


                let sha = null;


                try {

                    const existing =
                        await GitHubAPI
                            .getFile(path);


                    sha =
                        existing.sha;

                } catch (error) {

                    if (
                        error.status !== 404
                    ) {

                        throw error;

                    }

                }


                const novel = {

                    id,

                    title,

                    author:
                        $("#novel-author")
                            .val()
                            .trim(),

                    description:
                        $("#novel-description")
                            .val()
                            .trim(),

                    cover:
                        $("#novel-cover")
                            .val()
                            .trim(),

                    status:
                        $("#novel-status")
                            .val(),

                    updatedAt:
                        today()

                };


                await GitHubAPI.saveJson(

                    path,

                    novel,

                    `Update novel ${id}`,

                    sha

                );


                await updateCatalog(
                    novel
                );


                await ensureChapterIndex(
                    id
                );


                selectedNovelId =
                    id;


                await loadNovels();


                $("#novel-select")
                    .val(id);


                $("#chapter-section")
                    .removeClass("hidden");


                await loadChapters(
                    id
                );


                toast(
                    "Đã lưu truyện.",
                    "success"
                );


            } catch (error) {

                toast(
                    error.message,
                    "error"
                );

            }


            button
                .prop(
                    "disabled",
                    false
                )
                .text(
                    "💾 Lưu truyện"
                );

        }
    );



    // ==========================================
    // UPDATE CATALOG
    // ==========================================

    async function updateCatalog(
        novel
    ) {

        const path =
            CONFIG.data.novels;


        let list = [];

        let sha = null;


        try {

            const result =
                await GitHubAPI
                    .getJson(path);


            list =
                Array.isArray(
                    result.data
                )
                    ? result.data
                    : [];


            sha =
                result.sha;

        } catch (error) {

            if (
                error.status !== 404
            ) {

                throw error;

            }

        }


        const item = {

            id:
                novel.id,

            title:
                novel.title,

            author:
                novel.author,

            description:
                novel.description,

            cover:
                novel.cover,

            status:
                novel.status,

            updatedAt:
                novel.updatedAt

        };


        const index =
            list.findIndex(
                x =>
                    x.id === novel.id
            );


        if (index >= 0) {

            list[index] =
                item;

        } else {

            list.push(
                item
            );

        }


        list.sort(
            (a, b) =>
                String(a.title)
                    .localeCompare(
                        String(b.title),
                        "vi"
                    )
        );


        await GitHubAPI.saveJson(

            path,

            list,

            "Update novels catalog",

            sha

        );

    }



    // ==========================================
    // DELETE NOVEL
    // ==========================================

    $("#btn-delete-novel").on(
        "click",
        async function () {

            const id =
                $("#novel-id")
                    .val()
                    .trim();


            if (!id) {

                return;

            }


            if (
                !confirm(
                    `Xóa truyện "${id}" khỏi danh mục?\n\nCác file chương vẫn còn trong GitHub.`
                )
            ) {

                return;

            }


            try {

                requireGitHub();


                const path =
                    CONFIG.data.novels;


                const result =
                    await GitHubAPI
                        .getJson(path);


                const list =
                    Array.isArray(
                        result.data
                    )
                        ? result.data
                        : [];


                const filtered =
                    list.filter(
                        x =>
                            x.id !== id
                    );


                await GitHubAPI.saveJson(

                    path,

                    filtered,

                    `Remove novel ${id}`,

                    result.sha

                );


                selectedNovelId =
                    null;


                await loadNovels();


                $("#novel-section")
                    .addClass("hidden");


                $("#chapter-section")
                    .addClass("hidden");


                $("#editor-section")
                    .addClass("hidden");


                toast(
                    "Đã xóa truyện khỏi danh mục.",
                    "success"
                );


            } catch (error) {

                toast(
                    error.message,
                    "error"
                );

            }

        }
    );



    // ==========================================
    // COVER UPLOAD
    // ==========================================

    $("#cover-file").on(
        "change",
        async function () {

            const file =
                this.files?.[0];


            if (!file) {

                return;

            }


            try {

                requireGitHub();


                validateImage(
                    file
                );


                const novelId =
                    $("#novel-id")
                        .val()
                        .trim();


                if (!novelId) {

                    throw new Error(
                        "Hãy nhập ID truyện trước."
                    );

                }


                const extension =
                    getExtension(
                        file.name
                    );


                const path =
                    `images/novels/${novelId}/cover.${extension}`;


                $("#image-status")
                    .text(
                        "Đang upload..."
                    );


                await GitHubAPI.uploadImage(

                    path,

                    file,

                    `Upload cover ${novelId}`

                );


                $("#novel-cover")
                    .val(path);


                showCoverPreview(
                    path
                );


                toast(
                    "Đã upload ảnh bìa.",
                    "success"
                );


            } catch (error) {

                toast(
                    error.message,
                    "error"
                );

            }

        }
    );



    function showCoverPreview(
        path
    ) {

        if (!path) {

            $(".cover-preview")
                .removeClass("show");

            return;

        }


        const url =
            getPublicUrl(path);


        $("#cover-preview-image")
            .attr(
                "src",
                url
            );


        $(".cover-preview")
            .addClass("show");

    }



    // ==========================================
    // CHAPTERS
    // ==========================================

    async function loadChapters(
        novelId
    ) {

        try {

            const result =
                await GitHubAPI
                    .getJson(
                        `${CONFIG.data.novels_folder}/${novelId}/chapters.json`
                    );


            chapters =
                Array.isArray(
                    result.data
                )
                    ? result.data
                    : [];


            chapters.sort(
                chapterSort
            );


            renderChapters();


        } catch (error) {

            if (
                error.status === 404
            ) {

                chapters = [];

                await saveChapterIndex(
                    novelId,
                    []
                );


                renderChapters();

                return;

            }


            toast(
                error.message,
                "error"
            );

        }

    }


    function renderChapters() {

        const list =
            $("#chapter-list");


        list.empty();


        if (
            chapters.length === 0
        ) {

            list.html(
                `<div class="text-center text-secondary py-4">
                    Chưa có chương.
                </div>`
            );


            return;

        }


        chapters.forEach(
            (chapter, index) => {

                const item = $(`
                    <div class="chapter-item">

                        <div class="chapter-number">
                            #${escapeHtml(
                                chapter.id
                            )}
                        </div>

                        <div class="chapter-name">
                            ${escapeHtml(
                                chapter.title
                            )}
                        </div>

                        <div class="chapter-actions">

                            <button
                                class="btn btn-sm btn-primary"
                                data-action="edit"
                                data-id="${escapeAttr(
                                    chapter.id
                                )}"
                            >
                                Sửa
                            </button>

                            <button
                                class="btn btn-sm btn-outline-danger"
                                data-action="delete"
                                data-id="${escapeAttr(
                                    chapter.id
                                )}"
                            >
                                Xóa
                            </button>

                        </div>

                    </div>
                `);


                list.append(
                    item
                );

            }
        );

    }


    $(document).on(
        "click",
        "#chapter-list button",
        async function () {

            const action =
                $(this)
                    .data("action");


            const id =
                $(this)
                    .data("id");


            if (
                action === "edit"
            ) {

                await openChapter(
                    selectedNovelId,
                    id
                );

            }


            if (
                action === "delete"
            ) {

                await deleteChapter(
                    selectedNovelId,
                    id
                );

            }

        }
    );



    // ==========================================
    // NEW CHAPTER
    // ==========================================

    $("#btn-new-chapter").on(
        "click",
        async function () {

            if (!selectedNovelId) {

                toast(
                    "Hãy chọn truyện.",
                    "error"
                );

                return;

            }


            const nextId =
                getNextChapterId();


            editingChapterId =
                nextId;


            $("#chapter-id")
                .val(nextId);


            $("#chapter-title")
                .val(
                    `Chương ${parseInt(
                        nextId,
                        10
                    )}`
                );


            $("#editor-subtitle")
                .text(
                    `Chương mới • ${nextId}`
                );


            $("#editor-section")
                .removeClass("hidden");


            await initEditor("");


            clearDraft();


            updateDraftStatus(
                "Chưa lưu"
            );


            scrollToEditor();

        }
    );



    // ==========================================
    // NEXT ID
    // ==========================================

    function getNextChapterId() {

        if (
            chapters.length === 0
        ) {

            return "001";

        }


        const numbers =
            chapters
                .map(
                    c =>
                        parseInt(
                            String(c.id)
                                .replace(
                                    /\D/g,
                                    ""
                                ),
                            10
                        )
                )
                .filter(
                    n =>
                        Number.isFinite(n)
                );


        const max =
            Math.max(
                ...numbers,
                0
            );


        return String(
            max + 1
        ).padStart(
            3,
            "0"
        );

    }



    // ==========================================
    // OPEN CHAPTER
    // ==========================================

    async function openChapter(
        novelId,
        chapterId
    ) {

        try {

            requireGitHub();


            const result =
                await GitHubAPI.getJson(

                    `${CONFIG.data.novels_folder}/${novelId}/${chapterId}.json`

                );


            const chapter =
                result.data;


            editingChapterId =
                chapterId;


            $("#chapter-id")
                .val(chapterId);


            $("#chapter-title")
                .val(
                    chapter.title || ""
                );


            $("#editor-subtitle")
                .text(
                    `Đang sửa • ${chapterId}`
                );


            $("#editor-section")
                .removeClass("hidden");


            await initEditor(
                chapter.content || ""
            );


            clearDraft();


            updateDraftStatus(
                "Đã tải từ GitHub"
            );


            scrollToEditor();


        } catch (error) {

            toast(
                "Không mở được chương: " +
                error.message,
                "error"
            );

        }

    }



    // ==========================================
    // DELETE CHAPTER
    // ==========================================

    async function deleteChapter(
        novelId,
        chapterId
    ) {

        if (
            !confirm(
                `Xóa chương ${chapterId}?\n\nThao tác này sẽ xóa file chương khỏi GitHub.`
            )
        ) {

            return;

        }


        try {

            requireGitHub();


            const path =
                `${CONFIG.data.novels_folder}/${novelId}/${chapterId}.json`;


            const file =
                await GitHubAPI.getFile(
                    path
                );


            await GitHubAPI.deleteFile(

                path,

                file.sha,

                `Delete chapter ${novelId}/${chapterId}`

            );


            chapters =
                chapters.filter(
                    c =>
                        c.id !== chapterId
                );


            await saveChapterIndex(

                novelId,

                chapters

            );


            if (
                editingChapterId ===
                chapterId
            ) {

                $("#editor-section")
                    .addClass("hidden");

                editingChapterId =
                    null;

            }


            renderChapters();


            toast(
                "Đã xóa chương.",
                "success"
            );


        } catch (error) {

            toast(
                "Xóa thất bại: " +
                error.message,
                "error"
            );

        }

    }



    // ==========================================
    // SAVE CHAPTER
    // ==========================================

    $("#btn-save-chapter").on(
        "click",
        async function () {

            const button =
                $(this);


            try {

                requireGitHub();


                if (!editor) {

                    throw new Error(
                        "CKEditor chưa sẵn sàng."
                    );

                }


                const novelId =
                    selectedNovelId;


                const chapterId =
                    $("#chapter-id")
                        .val()
                        .trim();


                const title =
                    $("#chapter-title")
                        .val()
                        .trim();


                if (!novelId) {

                    throw new Error(
                        "Chưa chọn truyện."
                    );

                }


                if (!chapterId) {

                    throw new Error(
                        "Chưa có Chapter ID."
                    );

                }


                if (!title) {

                    throw new Error(
                        "Chưa nhập tên chương."
                    );

                }


                const content =
                    editor.getData();


                if (
                    !content ||
                    content === "<p>&nbsp;</p>"
                ) {

                    if (
                        !confirm(
                            "Chương đang trống. Vẫn lưu?"
                        )
                    ) {

                        return;

                    }

                }


                button
                    .prop(
                        "disabled",
                        true
                    )
                    .text(
                        "⏳ Đang lưu..."
                    );


                // --------------------------------
                // CHAPTER FILE
                // --------------------------------

                const path =
                    `${CONFIG.data.novels_folder}/${novelId}/${chapterId}.json`;


                let sha = null;


                try {

                    const old =
                        await GitHubAPI
                            .getFile(path);


                    sha =
                        old.sha;

                } catch (error) {

                    if (
                        error.status !== 404
                    ) {

                        throw error;

                    }

                }


                const chapter = {

                    id:
                        chapterId,

                    title,

                    content

                };


                await GitHubAPI.saveJson(

                    path,

                    chapter,

                    `Save chapter ${novelId}/${chapterId}`,

                    sha

                );


                // --------------------------------
                // INDEX
                // --------------------------------

                const existing =
                    chapters.findIndex(
                        c =>
                            c.id === chapterId
                    );


                const indexItem = {

                    id:
                        chapterId,

                    title

                };


                if (
                    existing >= 0
                ) {

                    chapters[existing] =
                        indexItem;

                } else {

                    chapters.push(
                        indexItem
                    );

                }


                chapters.sort(
                    chapterSort
                );


                await saveChapterIndex(

                    novelId,

                    chapters

                );


                // --------------------------------
                // CLEAR DRAFT
                // --------------------------------

                clearDraft();


                updateDraftStatus(
                    "✓ Đã lưu GitHub"
                );


                $("#editor-status")
                    .removeClass("error")
                    .addClass("success")
                    .text(
                        "✓ Đã lưu chương thành công."
                    );


                renderChapters();


                toast(
                    "Đã lưu chương lên GitHub.",
                    "success"
                );


            } catch (error) {

                console.error(
                    error
                );


                $("#editor-status")
                    .removeClass("success")
                    .addClass("error")
                    .text(
                        error.message
                    );


                toast(
                    error.message,
                    "error"
                );

            }


            button
                .prop(
                    "disabled",
                    false
                )
                .text(
                    "💾 Lưu chương"
                );

        }
    );



    // ==========================================
    // SAVE INDEX
    // ==========================================

    async function saveChapterIndex(
        novelId,
        list
    ) {

        const path =
            `${CONFIG.data.novels_folder}/${novelId}/chapters.json`;


        let sha = null;


        try {

            const old =
                await GitHubAPI
                    .getFile(path);


            sha =
                old.sha;

        } catch (error) {

            if (
                error.status !== 404
            ) {

                throw error;

            }

        }


        await GitHubAPI.saveJson(

            path,

            list,

            `Update chapter index ${novelId}`,

            sha

        );

    }


    async function ensureChapterIndex(
        novelId
    ) {

        try {

            await GitHubAPI.getFile(
                `${CONFIG.data.novels_folder}/${novelId}/chapters.json`
            );

        } catch (error) {

            if (
                error.status !== 404
            ) {

                throw error;

            }


            await saveChapterIndex(
                novelId,
                []
            );

        }

    }



    // ==========================================
    // CANCEL
    // ==========================================

    $("#btn-cancel-editor").on(
        "click",
        function () {

            if (
                hasUnsavedDraft()
            ) {

                if (
                    !confirm(
                        "Bạn có nội dung chưa lưu. Hủy?"
                    )
                ) {

                    return;

                }

            }


            clearDraft();


            $("#editor-section")
                .addClass("hidden");


            editingChapterId =
                null;

        }
    );



    // ==========================================
    // PREVIEW
    // ==========================================

    $("#btn-preview").on(
        "click",
        function () {

            if (!editor) {

                return;

            }


            $("#preview-title")
                .text(
                    $("#chapter-title")
                        .val() ||
                    "Xem trước"
                );


            $("#preview-content")
                .html(
                    editor.getData()
                );


            $("#preview-modal")
                .removeClass("hidden");

        }
    );


    $("#btn-close-preview").on(
        "click",
        closePreview
    );


    $(".preview-overlay").on(
        "click",
        closePreview
    );


    function closePreview() {

        $("#preview-modal")
            .addClass("hidden");

    }



    // ==========================================
    // IMAGE INSERT
    // ==========================================

    $("#chapter-image").on(
        "change",
        async function () {

            const file =
                this.files?.[0];


            if (!file) {

                return;

            }


            try {

                requireGitHub();


                validateImage(
                    file
                );


                if (!selectedNovelId) {

                    throw new Error(
                        "Chưa chọn truyện."
                    );

                }


                if (!editor) {

                    throw new Error(
                        "CKEditor chưa sẵn sàng."
                    );

                }


                $("#image-status")
                    .text(
                        "Đang upload..."
                    );


                const chapterId =
                    $("#chapter-id")
                        .val()
                        .trim() ||
                    "draft";


                const extension =
                    getExtension(
                        file.name
                    );


                const filename =
                    `${Date.now()}-${randomString(5)}.${extension}`;


                const path =
                    `images/novels/${selectedNovelId}/${chapterId}/${filename}`;


                await GitHubAPI.uploadImage(

                    path,

                    file,

                    `Upload image ${selectedNovelId}/${chapterId}`

                );


                const publicUrl =
                    getPublicUrl(
                        path
                    );


                editor.model.change(
                    writer => {

                        const imageElement =
                            writer.createElement(
                                "imageBlock",
                                {
                                    src:
                                        publicUrl
                                }
                            );


                        editor.model.insertContent(
                            imageElement,
                            editor.model.document.selection
                        );

                    }
                );


                $("#image-status")
                    .text(
                        "✓ Đã chèn ảnh"
                    );


                toast(
                    "Đã upload và chèn ảnh.",
                    "success"
                );


            } catch (error) {

                $("#image-status")
                    .text(
                        ""
                    );


                toast(
                    "Upload ảnh thất bại: " +
                    error.message,
                    "error"
                );

            }


            this.value = "";

        }
    );



    // ==========================================
    // CKEDITOR
    // ==========================================

    async function initEditor(
        content = ""
    ) {

        if (editor) {

            try {

                await editor.destroy();

            } catch (error) {

                console.warn(error);

            }


            editor = null;

        }


        const {
            DecoupledEditor,
            Essentials,
            Paragraph,
            Heading,
            Bold,
            Italic,
            Underline,
            Strikethrough,
            Link,
            BlockQuote,
            List,
            Alignment,
            Indent,
            Table,
            TableToolbar,
            HorizontalLine,
            RemoveFormat
        } = CKEDITOR;


        editor =
            await DecoupledEditor.create({

                root: {

                    element:
                        document.querySelector(
                            "#chapter-editor"
                        )

                },


                licenseKey:
                    "GPL",


                plugins: [

                    Essentials,

                    Paragraph,

                    Heading,

                    Bold,

                    Italic,

                    Underline,

                    Strikethrough,

                    Link,

                    BlockQuote,

                    List,

                    Alignment,

                    Indent,

                    Table,

                    TableToolbar,

                    HorizontalLine,

                    RemoveFormat

                ],


                toolbar: [

                    "undo",

                    "redo",

                    "|",

                    "heading",

                    "|",

                    "bold",

                    "italic",

                    "underline",

                    "|",

                    "link",

                    "blockQuote",

                    "horizontalLine",

                    "|",

                    "bulletedList",

                    "numberedList",

                    "|",

                    "alignment",

                    "outdent",

                    "indent",

                    "|",

                    "insertTable",

                    "removeFormat"

                ],


                table: {

                    contentToolbar: [

                        "tableColumn",

                        "tableRow",

                        "mergeTableCells"

                    ]

                }

            });


        $("#editor-toolbar")
            .empty()
            .append(
                editor.ui.view.toolbar.element
            );


        editor.setData(
            content || ""
        );


        editor.model.document.on(
            "change:data",
            debounce(
                saveDraft,
                500
            )
        );


        return editor;

    }



    // ==========================================
    // DRAFT
    // ==========================================

    function saveDraft() {

        if (!editor) {

            return;

        }


        const draft = {

            novelId:
                selectedNovelId,

            chapterId:
                $("#chapter-id")
                    .val(),

            title:
                $("#chapter-title")
                    .val(),

            content:
                editor.getData(),

            savedAt:
                new Date()
                    .toISOString()

        };


        sessionStorage.setItem(

            DRAFT_KEY,

            JSON.stringify(
                draft
            )

        );


        updateDraftStatus(
            "● Bản nháp"
        );

    }


    function restoreDraft() {

        const raw =
            sessionStorage.getItem(
                DRAFT_KEY
            );


        if (!raw) {

            return false;

        }


        try {

            const draft =
                JSON.parse(raw);


            if (
                draft.novelId !==
                selectedNovelId
            ) {

                return false;

            }


            if (!confirm(
                "Phát hiện bản nháp chưa lưu. Khôi phục?"
            )) {

                return false;

            }


            editingChapterId =
                draft.chapterId;


            $("#chapter-id")
                .val(
                    draft.chapterId
                );


            $("#chapter-title")
                .val(
                    draft.title
                );


            initEditor(
                draft.content
            );


            updateDraftStatus(
                "● Đã khôi phục bản nháp"
            );


            return true;


        } catch (error) {

            console.warn(error);

            return false;

        }

    }


    function clearDraft() {

        sessionStorage.removeItem(
            DRAFT_KEY
        );

    }


    function hasUnsavedDraft() {

        return !!sessionStorage.getItem(
            DRAFT_KEY
        );

    }


    function updateDraftStatus(
        text
    ) {

        $("#draft-status")
            .text(text);

    }



    // ==========================================
    // HELPERS
    // ==========================================

    function requireGitHub() {

        if (
            !GitHubAPI.isConnected()
        ) {

            throw new Error(
                "Chưa kết nối GitHub."
            );

        }

    }


    function today() {

        return new Date()
            .toISOString()
            .slice(
                0,
                10
            );

    }


    function chapterSort(
        a,
        b
    ) {

        return (
            parseInt(
                String(a.id)
                    .replace(
                        /\D/g,
                        ""
                    ),
                10
            ) || 0
        ) -
        (
            parseInt(
                String(b.id)
                    .replace(
                        /\D/g,
                        ""
                    ),
                10
            ) || 0
        );

    }


    function getExtension(
        filename
    ) {

        const match =
            String(filename)
                .toLowerCase()
                .match(
                    /\.([a-z0-9]+)$/
                );


        return match
            ? match[1]
            : "jpg";

    }


    function validateImage(
        file
    ) {

        if (
            !file.type.startsWith(
                "image/"
            )
        ) {

            throw new Error(
                "File không phải ảnh."
            );

        }


        const maxSize =
            5 * 1024 * 1024;


        if (
            file.size > maxSize
        ) {

            throw new Error(
                "Ảnh tối đa 5MB."
            );

        }

    }


    function getPublicUrl(
        path
    ) {

        const github =
            CONFIG.github;


        return (
            `https://raw.githubusercontent.com/` +
            `${github.owner}/` +
            `${github.repo}/` +
            `${github.branch}/` +
            path
        );

    }


    function randomString(
        length
    ) {

        const chars =
            "abcdefghijklmnopqrstuvwxyz0123456789";


        let result = "";


        for (
            let i = 0;
            i < length;
            i++
        ) {

            result +=
                chars[
                    Math.floor(
                        Math.random() *
                        chars.length
                    )
                ];

        }


        return result;

    }


    function debounce(
        fn,
        delay
    ) {

        let timer;


        return function () {

            clearTimeout(
                timer
            );


            timer =
                setTimeout(
                    () =>
                        fn.apply(
                            this,
                            arguments
                        ),
                    delay
                );

        };

    }


    function scrollToEditor() {

        setTimeout(
            () => {

                const element =
                    $("#editor-section");


                if (
                    element.length
                ) {

                    window.scrollTo({

                        top:
                            element.offset()
                                .top - 65,

                        behavior:
                            "smooth"

                    });

                }

            },
            100
        );

    }


    function hideNovelSections() {

        $("#novel-section")
            .addClass("hidden");


        $("#chapter-section")
            .addClass("hidden");


        $("#editor-section")
            .addClass("hidden");

    }



    // ==========================================
    // INITIALIZE
    // ==========================================

    async function initializeApp() {

        initGitHub();


        if (
            GitHubAPI.isConnected()
        ) {

            await loadNovels();

        }

    }



    // ==========================================
    // START
    // ==========================================

    $(document).ready(
        async function () {

            if (
                isLoggedIn()
            ) {

                showApp();

                await initializeApp();

            } else {

                showLogin();

            }

        }
    );


})(window, jQuery);