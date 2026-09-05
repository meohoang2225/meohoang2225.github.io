(function () {
    "use strict";
    const STORAGE_KEY = "truyen_doc_reader_settings";
    const DEFAULT_SETTINGS = {
        theme: "light",
        fontSize: 18,
        lineHeight: 1.7,
        readerWidth: 760
    };
    const MIN_FONT_SIZE = 14;
    const MAX_FONT_SIZE = 26;
    const FONT_SIZE_STEP = 1;
    let settings = loadSettings();
    /* =====================================================
       LOAD
       ===================================================== */
    function loadSettings() {
        try {
            const saved =
                localStorage.getItem(STORAGE_KEY);
            if (!saved) {
                return {
                    ...DEFAULT_SETTINGS
                };
            }
            const parsed =
                JSON.parse(saved);
            return {
                ...DEFAULT_SETTINGS,
                ...parsed
            };
        } catch (error) {
            console.warn(
                "Không thể đọc reader settings:",
                error
            );
            return {
                ...DEFAULT_SETTINGS
            };
        }
    }
    /* =====================================================
       SAVE
       ===================================================== */
    function saveSettings() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(settings)
            );
        } catch (error) {
            console.warn(
                "Không thể lưu reader settings:",
                error
            );
        }
    }
    /* =====================================================
       APPLY
       ===================================================== */
    function applySettings() {
        const reader =
            document.querySelector(".reader");
        if (!reader) {
            return;
        }
        /*
         * DARK MODE
         */
        document.body.classList.toggle(
            "reader-dark",
            settings.theme === "dark"
        );
        /*
         * FONT SIZE
         *
         * Chỉ đặt font-size mặc định
         * cho chapter-content.
         *
         * Không can thiệp font-family,
         * màu chữ, căn lề...
         */
        reader.style.setProperty(
            "--reader-font-size",
            `${settings.fontSize}px`
        );
        /*
         * LINE HEIGHT
         */
        reader.style.setProperty(
            "--reader-line-height",
            settings.lineHeight
        );
        /*
         * WIDTH
         */
        reader.style.setProperty(
            "--reader-width",
            `${settings.readerWidth}px`
        );
        updateControls();
    }
    /* =====================================================
       UPDATE UI
       ===================================================== */
    function updateControls() {
        const themeToggle =
            document.getElementById("themeToggle");
        const fontSizeValue =
            document.getElementById("fontSizeValue");
        const lineHeightSelect =
            document.getElementById(
                "lineHeightSelect"
            );
        const readerWidthSelect =
            document.getElementById(
                "readerWidthSelect"
            );
        /*
         * THEME
         */
        if (themeToggle) {
            if (settings.theme === "dark") {
                themeToggle.textContent = "☀️";
                themeToggle.setAttribute(
                    "aria-label",
                    "Chuyển sang giao diện sáng"
                );
                themeToggle.setAttribute(
                    "title",
                    "Chuyển sang giao diện sáng"
                );
            } else {
                themeToggle.textContent = "🌙";
                themeToggle.setAttribute(
                    "aria-label",
                    "Chuyển sang giao diện tối"
                );
                themeToggle.setAttribute(
                    "title",
                    "Chuyển sang giao diện tối"
                );
            }
        }
        /*
         * FONT SIZE
         */
        if (fontSizeValue) {
            fontSizeValue.textContent =
                `${settings.fontSize}px`;
        }
        /*
         * LINE HEIGHT
         */
        if (lineHeightSelect) {
            lineHeightSelect.value =
                String(settings.lineHeight);
        }
        /*
         * WIDTH
         */
        if (readerWidthSelect) {
            readerWidthSelect.value =
                String(settings.readerWidth);
        }
    }
    /* =====================================================
       THEME
       ===================================================== */
    function toggleTheme() {
        settings.theme =
            settings.theme === "dark"
                ? "light"
                : "dark";
        saveSettings();
        applySettings();
    }
    /* =====================================================
       FONT SIZE
       ===================================================== */
    function changeFontSize(delta) {
        settings.fontSize +=
            delta * FONT_SIZE_STEP;
        settings.fontSize =
            Math.max(
                MIN_FONT_SIZE,
                Math.min(
                    MAX_FONT_SIZE,
                    settings.fontSize
                )
            );
        saveSettings();
        applySettings();
    }
    /* =====================================================
       LINE HEIGHT
       ===================================================== */
    function changeLineHeight(value) {
        const allowedValues = [
            "1.5",
            "1.6",
            "1.7",
            "1.8",
            "2"
        ];
        if (
            !allowedValues.includes(value)
        ) {
            return;
        }
        settings.lineHeight =
            Number(value);
        saveSettings();
        applySettings();
    }
    /* =====================================================
       READER WIDTH
       ===================================================== */
    function changeReaderWidth(value) {
        const allowedValues = [
            "680",
            "760",
            "860"
        ];
        if (
            !allowedValues.includes(value)
        ) {
            return;
        }
        settings.readerWidth =
            Number(value);
        saveSettings();
        applySettings();
    }
    /* =====================================================
       INIT
       ===================================================== */
    function init() {
        const themeToggle =
            document.getElementById(
                "themeToggle"
            );
        const fontDecrease =
            document.getElementById(
                "fontDecrease"
            );
        const fontIncrease =
            document.getElementById(
                "fontIncrease"
            );
        const lineHeightSelect =
            document.getElementById(
                "lineHeightSelect"
            );
        const readerWidthSelect =
            document.getElementById(
                "readerWidthSelect"
            );
        /*
         * THEME
         */
        if (themeToggle) {
            themeToggle.addEventListener(
                "click",
                toggleTheme
            );
        }
        /*
         * FONT SIZE -
         */
        if (fontDecrease) {
            fontDecrease.addEventListener(
                "click",
                function () {
                    changeFontSize(-1);
                }
            );
        }
        /*
         * FONT SIZE +
         */
        if (fontIncrease) {
            fontIncrease.addEventListener(
                "click",
                function () {
                    changeFontSize(1);
                }
            );
        }
        /*
         * LINE HEIGHT
         */
        if (lineHeightSelect) {
            lineHeightSelect.addEventListener(
                "change",
                function () {
                    changeLineHeight(
                        this.value
                    );
                }
            );
        }
        /*
         * WIDTH
         */
        if (readerWidthSelect) {
            readerWidthSelect.addEventListener(
                "change",
                function () {
                    changeReaderWidth(
                        this.value
                    );
                }
            );
        }
        /*
         * APPLY INITIAL SETTINGS
         */
        applySettings();
    }
    /* =====================================================
       PUBLIC API
       ===================================================== */
    window.ReaderSettings = {
        get: function () {
            return {
                ...settings
            };
        },
        apply: applySettings,
        reset: function () {
            settings = {
                ...DEFAULT_SETTINGS
            };
            saveSettings();
            applySettings();
        }
    };
    document.addEventListener(
        "DOMContentLoaded",
        init
    );
})();