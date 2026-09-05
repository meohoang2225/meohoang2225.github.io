(function () {

    "use strict";


    // ==========================================
    // HELPERS
    // ==========================================

    function isValidUrl(url) {

        if (!url) {
            return false;
        }


        try {

            const parsed =
                new URL(url);


            return (
                parsed.protocol === "https:" ||
                parsed.protocol === "http:"
            );

        } catch (error) {

            return false;

        }

    }


    // ==========================================
    // AFFILIATE POPUP
    // ==========================================

    function showAffiliatePopup(
        affiliate
    ) {

        if (
            !affiliate ||
            !affiliate.enabled ||
            !isValidUrl(affiliate.url)
        ) {

            return;

        }


        const existing =
            document.getElementById(
                "affiliatePopup"
            );


        if (existing) {

            existing.remove();

        }


        const overlay =
            document.createElement("div");


        overlay.id =
            "affiliatePopup";

        overlay.className =
            "affiliate-popup";


        const box =
            document.createElement("div");


        box.className =
            "affiliate-popup-box";


        const icon =
            document.createElement("div");


        icon.className =
            "affiliate-popup-icon";

        icon.textContent =
            "🛍️";


        const title =
            document.createElement("h2");


        title.className =
            "affiliate-popup-title";

        title.textContent =
            "Ủng hộ chúng mình";


        const description =
            document.createElement("p");


        description.className =
            "affiliate-popup-description";

        description.textContent =
            "Nếu bạn có nhu cầu mua sắm, bạn có thể tham khảo sản phẩm qua link bên dưới để ủng hộ chúng mình duy trì trang nhé.";


        const affiliateButton =
            document.createElement("a");


        affiliateButton.className =
            "affiliate-popup-button";


        affiliateButton.textContent =
            "🛒 Xem sản phẩm";


        affiliateButton.href =
            affiliate.url;


        affiliateButton.target =
            "_blank";


        affiliateButton.rel =
            "nofollow sponsored noopener";


        const continueButton =
            document.createElement("button");


        continueButton.type =
            "button";


        continueButton.className =
            "affiliate-popup-continue";


        continueButton.textContent =
            "Tiếp tục đọc";


        continueButton.addEventListener(
            "click",
            function () {

                closeAffiliatePopup();

            }
        );


        box.appendChild(icon);

        box.appendChild(title);

        box.appendChild(description);

        box.appendChild(
            affiliateButton
        );

        box.appendChild(
            continueButton
        );


        overlay.appendChild(box);

        document.body.appendChild(
            overlay
        );


        document.body.classList.add(
            "affiliate-popup-open"
        );

    }


    function closeAffiliatePopup() {

        const popup =
            document.getElementById(
                "affiliatePopup"
            );


        if (!popup) {
            return;
        }


        popup.remove();


        document.body.classList.remove(
            "affiliate-popup-open"
        );

    }


    // ==========================================
    // ADS
    // ==========================================

    function renderAd(
        container,
        position,
        ads
    ) {

        if (!container) {
            return;
        }


        container.innerHTML = "";


        if (
            !ads ||
            !ads.enabled
        ) {

            return;

        }


        const wrapper =
            document.createElement("div");


        wrapper.className =
            "ad-slot";


        wrapper.dataset.adPosition =
            position;


        const label =
            document.createElement("div");


        label.className =
            "ad-label";


        label.textContent =
            "Quảng cáo";


        /*
         * Đây là vùng dành cho
         * Google AdSense / ad network.
         *
         * Chưa tự giả lập quảng cáo.
         */

        const adContainer =
            document.createElement("div");


        adContainer.className =
            "ad-container";


        wrapper.appendChild(label);

        wrapper.appendChild(
            adContainer
        );


        container.appendChild(
            wrapper
        );

    }


    // ==========================================
    // RENDER
    // ==========================================

    function render(
        monetization = {}
    ) {

        const top =
            document.getElementById(
                "monetizationTop"
            );


        const bottom =
            document.getElementById(
                "monetizationBottom"
            );


        if (top) {

            top.innerHTML = "";

        }


        if (bottom) {

            bottom.innerHTML = "";

        }


        const affiliate =
            monetization.affiliate || {
                enabled: false,
                url: ""
            };


        const ads =
            monetization.ads || {
                enabled: false
            };


        /*
         * AFFILIATE
         *
         * Affiliate chỉ dùng popup.
         *
         * Không render card Affiliate
         * ở top / bottom nữa.
         */

        if (
            affiliate.enabled &&
            isValidUrl(
                affiliate.url
            )
        ) {

            showAffiliatePopup(
                affiliate
            );

        }


        /*
         * ADS
         *
         * Ads hoạt động độc lập.
         */

        if (ads.enabled) {

            renderAd(
                top,
                "top",
                ads
            );


            renderAd(
                bottom,
                "bottom",
                ads
            );

        }

    }


    // ==========================================
    // PUBLIC API
    // ==========================================

    window.ReaderMonetization = {

        render,

        showAffiliatePopup,

        closeAffiliatePopup,

        renderAd

    };


})();