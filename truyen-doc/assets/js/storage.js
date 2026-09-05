(function (window) {
    "use strict";

    const KEYS = {
        PROGRESS: "truyen_doc_progress",
        HISTORY: "truyen_doc_history"
    };

    const MAX_HISTORY = 100;

    function readJSON(key, fallback) {
        try {
            const value = localStorage.getItem(key);

            if (!value) {
                return fallback;
            }

            return JSON.parse(value);
        } catch (error) {
            console.warn("Storage read error:", key, error);
            return fallback;
        }
    }

    function writeJSON(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.warn("Storage write error:", key, error);
            return false;
        }
    }

    /*
     * =====================================================
     * PROGRESS
     * =====================================================
     */

    function getProgress() {
        return readJSON(KEYS.PROGRESS, {});
    }

    function getNovelProgress(novelId) {
        const progress = getProgress();
        return progress[novelId] || null;
    }

    function saveProgress(novelId, chapterId, scroll = 0) {
        if (!novelId || !chapterId) {
            return false;
        }

        const progress = getProgress();

        progress[novelId] = {
            chapterId: String(chapterId),
            scroll: Math.max(0, Math.min(1, Number(scroll) || 0)),
            updatedAt: new Date().toISOString()
        };

        return writeJSON(KEYS.PROGRESS, progress);
    }

    function removeProgress(novelId) {
        const progress = getProgress();

        if (progress[novelId]) {
            delete progress[novelId];
            writeJSON(KEYS.PROGRESS, progress);
        }
    }

    /*
     * =====================================================
     * HISTORY
     * =====================================================
     */

    function getHistory() {
        return readJSON(KEYS.HISTORY, []);
    }

    function addHistory(novelId, chapterId) {
        if (!novelId || !chapterId) {
            return false;
        }

        let history = getHistory();

        /*
         * Nếu đã có chương này thì xóa bản cũ.
         * Sau đó đưa nó lên đầu.
         */
        history = history.filter(item => {
            return !(
                String(item.novelId) === String(novelId) &&
                String(item.chapterId) === String(chapterId)
            );
        });

        history.unshift({
            novelId: String(novelId),
            chapterId: String(chapterId),
            readAt: new Date().toISOString()
        });

        /*
         * Giữ tối đa 100 lịch sử.
         */
        history = history.slice(0, MAX_HISTORY);

        return writeJSON(KEYS.HISTORY, history);
    }

    function removeHistoryItem(novelId, chapterId) {
        let history = getHistory();

        history = history.filter(item => {
            return !(
                String(item.novelId) === String(novelId) &&
                String(item.chapterId) === String(chapterId)
            );
        });

        return writeJSON(KEYS.HISTORY, history);
    }

    function clearHistory() {
        return writeJSON(KEYS.HISTORY, []);
    }

    /*
     * =====================================================
     * PUBLIC API
     * =====================================================
     */

    window.ReaderStorage = {
        getProgress,
        getNovelProgress,
        saveProgress,
        removeProgress,

        getHistory,
        addHistory,
        removeHistoryItem,
        clearHistory
    };

})(window);