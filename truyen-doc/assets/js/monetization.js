(function () {
    "use strict";

    // ==========================================
    // CONFIG
    // ==========================================

    const MID_AD_AFTER_PARAGRAPHS = 5;

    const DESKTOP_BREAKPOINT = 768;


    // ==========================================
    // HELPERS
    // ==========================================

    function isValidUrl(url) {
        if (!url) return false;

        try {
            const parsed = new URL(url);

            return (
                parsed.protocol === "https:" ||
                parsed.protocol === "http:"
            );

        } catch (error) {
            return false;
        }
    }


    function isDesktop() {
        return window.innerWidth >= DESKTOP_BREAKPOINT;
    }


    function getElement(id) {
        return document.getElementById(id);
    }


    // ==========================================
    // AFFILIATE POPUP
    // ==========================================

    function showAffiliatePopup(affiliate) {

        if (!affiliate) return;

        if (!affiliate.enabled) return;

        if (!isValidUrl(affiliate.url)) return;


        // Không tạo popup trùng
        if (getElement("affiliatePopup")) {
            return;
        }


        const overlay = document.createElement("div");

        overlay.id = "affiliatePopup";
        overlay.className = "affiliate-popup";


        overlay.innerHTML = `
            <div class="affiliate-popup-box">

                <button
                    type="button"
                    class="affiliate-popup-close"
                    aria-label="Đóng"
                >
                    ×
                </button>

                <div class="affiliate-popup-icon">
                    🛍️
                </div>

                <h3 class="affiliate-popup-title">
                    Sản phẩm đề xuất
                </h3>

                <p class="affiliate-popup-description">
                    Có thể bạn sẽ quan tâm đến sản phẩm này.
                </p>

                <a
                    href="${affiliate.url}"
                    target="_blank"
                    rel="nofollow sponsored noopener"
                    class="affiliate-popup-button"
                >
                    🛒 Xem sản phẩm
                </a>

                <button
                    type="button"
                    class="affiliate-popup-continue"
                >
                    Tiếp tục đọc
                </button>

            </div>
        `;


        document.body.appendChild(overlay);


        document.body.classList.add(
            "affiliate-popup-open"
        );


        // Đóng popup
        const closeButton =
            overlay.querySelector(
                ".affiliate-popup-close"
            );

        const continueButton =
            overlay.querySelector(
                ".affiliate-popup-continue"
            );


        function close() {
            closeAffiliatePopup();
        }


        closeButton.addEventListener(
            "click",
            close
        );


        continueButton.addEventListener(
            "click",
            close
        );


        // Click nền để đóng
        overlay.addEventListener(
            "click",
            function (event) {

                if (event.target === overlay) {
                    close();
                }

            }
        );
    }


    function closeAffiliatePopup() {

        const popup =
            getElement("affiliatePopup");

        if (popup) {
            popup.remove();
        }

        document.body.classList.remove(
            "affiliate-popup-open"
        );
    }


    // ==========================================
    // AD SLOT
    // ==========================================

    function renderAd(
        container,
        position
    ) {

        if (!container) {
            return;
        }


        container.innerHTML = "";


        const wrapper =
            document.createElement("div");

        wrapper.className =
            "ad-inner";


        const label =
            document.createElement("div");

        label.className =
            "ad-label";

        label.textContent =
            "Quảng cáo";


        const adContainer =
            document.createElement("div");

        adContainer.className =
            "ad-container";


        adContainer.dataset.position =
            position;


        wrapper.appendChild(label);

        wrapper.appendChild(adContainer);

        container.appendChild(wrapper);
    }


    // ==========================================
    // DESKTOP ADS
    // ==========================================

    function renderDesktopAds() {

        const top =
            getElement("adDesktopTop");

        const left =
            getElement("adDesktopLeft");

        const right =
            getElement("adDesktopRight");


        if (top) {
            renderAd(
                top,
                "desktop-top"
            );
        }


        if (left) {
            renderAd(
                left,
                "desktop-left"
            );
        }


        if (right) {
            renderAd(
                right,
                "desktop-right"
            );
        }
    }


    // ==========================================
    // MOBILE ADS
    // ==========================================

    function renderMobileAds() {

        const bottom =
            getElement("adMobileBottom");


        if (!bottom) {
            return;
        }


        renderAd(
            bottom,
            "mobile-bottom"
        );
    }


    // ==========================================
    // MID CONTENT ADS
    // ==========================================

    function renderMidContentAds() {

        const content =
            getElement("chapterContent");


        if (!content) {
            return;
        }


        // Xóa quảng cáo cũ nếu reader
        // được load lại chương
        content
            .querySelectorAll(
                ".ad-mid-content"
            )
            .forEach(function (element) {

                element.remove();

            });


        const paragraphs =
            Array.from(
                content.querySelectorAll("p")
            );


        if (
            paragraphs.length <
            MID_AD_AFTER_PARAGRAPHS
        ) {
            return;
        }


        let insertedCount = 0;


        for (
            let i = MID_AD_AFTER_PARAGRAPHS;
            i <= paragraphs.length;
            i += MID_AD_AFTER_PARAGRAPHS
        ) {

            const paragraph =
                paragraphs[i - 1];


            if (!paragraph) {
                continue;
            }


            const adSlot =
                document.createElement("div");


            adSlot.className =
                "ad-slot ad-mid-content";


            renderAd(
                adSlot,
                "mid-content-" +
                (insertedCount + 1)
            );


            paragraph.insertAdjacentElement(
                "afterend",
                adSlot
            );


            insertedCount++;
        }
    }


    // ==========================================
    // CLEAR ADS
    // ==========================================

    function clearAds() {

        const ids = [
            "adDesktopTop",
            "adDesktopLeft",
            "adDesktopRight",
            "adMobileBottom"
        ];


        ids.forEach(function (id) {

            const element =
                getElement(id);


            if (element) {
                element.innerHTML = "";
            }

        });


        const content =
            getElement("chapterContent");


        if (content) {

            content
                .querySelectorAll(
                    ".ad-mid-content"
                )
                .forEach(function (element) {

                    element.remove();

                });
        }
    }


    // ==========================================
    // RENDER
    // ==========================================

    function render(
        monetization
    ) {

        monetization =
            monetization || {};


        clearAds();


        // ======================================
        // AFFILIATE
        // ======================================

        const affiliate =
            monetization.affiliate ||
            {};


        if (
            affiliate.enabled === true &&
            isValidUrl(affiliate.url)
        ) {

            showAffiliatePopup(
                affiliate
            );
        }


        // ======================================
        // ADS
        // ======================================

        const ads =
            monetization.ads ||
            {};


        if (
            ads.enabled !== true
        ) {

            return;
        }


        // Desktop
        if (isDesktop()) {

            renderDesktopAds();

        }

        // Mobile
        else {

            renderMobileAds();

        }


        // Mid-content
        renderMidContentAds();
    }


    // ==========================================
    // PUBLIC API
    // ==========================================

    window.ReaderMonetization = {

        render,

        showAffiliatePopup,

        closeAffiliatePopup,

        renderAd,

        renderMidContentAds,

        clearAds

    };

})();