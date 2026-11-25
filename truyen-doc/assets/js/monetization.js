(function () {
    "use strict";

    // ==========================================
    // CONFIG
    // ==========================================

    const MID_AD_AFTER_PARAGRAPHS = 50;

    const DESKTOP_BREAKPOINT = 768;

    const AD_CLIENT = "ca-pub-6349630685078292";

    // Dán ID đơn vị quảng cáo (10 chữ số) tạo trong AdSense > Quảng cáo > Theo đơn vị quảng cáo.
    const AD_SLOTS = {
        "desktop-top": "8688838252",
        "desktop-left": "9403154122",
        "desktop-right": "6776990782",
        "mobile-bottom": "5260056687",
        "mid-content": "4796635213",
        // Màn hình danh sách truyện. Đang dùng chung đơn vị mid-content;
        // tạo đơn vị riêng trong AdSense rồi dán mã vào đây nếu muốn tách báo cáo.
        "list-inline": "4796635213"
    };

    // Kích thước quảng cáo theo vị trí. Không khai báo thì để Google tự chọn (auto),
    // và định dạng auto trên mobile có thể ra khung vuông ~375px che gần hết màn hình.
    const AD_LAYOUTS = {
        // Thanh dính đáy màn hình: banner cố định 320x50.
        "mobile-bottom": { width: 320, height: 50 },
        "mid-content": { format: "rectangle" },
        // Thanh dính phía trên desktop chỉ chừa ~80px nên dùng banner thấp 468x60.
        "desktop-top": { width: 468, height: 60 },
        // Cột bên rộng 120px (160px từ 1200px) nên dùng 120x240.
        "desktop-left": { width: 120, height: 240 },
        "desktop-right": { width: 120, height: 240 },
        // Dưới lưới truyện: banner ngang, trên mobile Google tự chọn cỡ thấp (~100px).
        "list-inline": { format: "horizontal" }
    };

    // Hai cột quảng cáo bên cạnh chỉ hiện khi cửa sổ đủ rộng để không đè lên khung đọc.
    const DESKTOP_SIDE_ADS_MIN_WIDTH = 1100;


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


        const key = position.replace(/-\d+$/, "");

        const slot = AD_SLOTS[key];

        const layout = AD_LAYOUTS[key] || {};

        // Chưa có mã đơn vị quảng cáo thì không vẽ khung trống.
        if (!slot) {
            return;
        }


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


        const ins = document.createElement("ins");

        ins.className = "adsbygoogle";
        ins.dataset.adClient = AD_CLIENT;
        ins.dataset.adSlot = slot;

        if (layout.width && layout.height) {

            // Cỡ cố định: bỏ data-ad-format để Google dùng đúng width/height này.
            ins.style.display = "inline-block";
            ins.style.width = layout.width + "px";
            ins.style.height = layout.height + "px";

        } else {

            ins.style.display = "block";

            // .ad-container là flex nên thẻ rỗng co về rộng 0; AdSense báo "No slot size for availableWidth=0".
            ins.style.width = "100%";

            ins.dataset.adFormat = layout.format || "auto";
            ins.dataset.fullWidthResponsive = layout.format ? "false" : "true";
        }

        adContainer.appendChild(ins);


        wrapper.appendChild(label);

        wrapper.appendChild(adContainer);

        container.appendChild(wrapper);


        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (error) {
            // AdSense chưa tải hoặc bị chặn.
        }
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


        // Cửa sổ hẹp thì bỏ hai cột bên (CSS vẫn đặt chúng cố định sát mép).
        if (window.innerWidth < DESKTOP_SIDE_ADS_MIN_WIDTH) {
            return;
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


        // Chương không có nội dung thì không hiện quảng cáo.
        if (paragraphs.length === 0) {
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


            // Phải gắn vào trang trước: AdSense bỏ qua thẻ ins chưa nằm trong DOM.
            paragraph.insertAdjacentElement(
                "afterend",
                adSlot
            );


            renderAd(
                adSlot,
                "mid-content-" +
                (insertedCount + 1)
            );


            insertedCount++;
        }


        // Chương ngắn, chưa đủ đoạn để chèn giữa chương:
        // đặt một quảng cáo ở cuối nội dung.
        if (insertedCount === 0) {

            const endSlot =
                document.createElement("div");


            // Dùng chung class ad-mid-content để lần render sau tự xóa.
            endSlot.className =
                "ad-slot ad-mid-content";


            content.appendChild(endSlot);


            renderAd(
                endSlot,
                "mid-content-1"
            );
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