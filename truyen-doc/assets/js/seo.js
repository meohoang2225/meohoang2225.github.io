(function () {
    "use strict";
    const SITE_NAME = "Thư viện truyện";
    const DEFAULT_TITLE =
        "Thư viện truyện - Đọc truyện online";
    const DEFAULT_DESCRIPTION =
        "Thư viện truyện online - Đọc truyện miễn phí.";
    const DEFAULT_IMAGE =
        "images/og-default.jpg";
    /*
     * =====================================================
     * BASE URL
     * =====================================================
     */
    function getBaseUrl() {
        return window.location.origin +
            window.location.pathname
                .split("/")
                .slice(0, -1)
                .join("/") +
            "/";
    }
    /*
     * =====================================================
     * ABSOLUTE URL
     * =====================================================
     */
    function absoluteUrl(path) {
        if (!path) {
            return getBaseUrl();
        }
        if (
            path.startsWith("http://") ||
            path.startsWith("https://")
        ) {
            return path;
        }
        return new URL(
            path,
            getBaseUrl()
        ).href;
    }
    /*
     * =====================================================
     * SET META
     * =====================================================
     */
    function setMeta(
        attribute,
        value,
        content
    ) {
        if (!content) {
            return;
        }
        let element =
            document.head.querySelector(
                `meta[${attribute}="${value}"]`
            );
        if (!element) {
            element =
                document.createElement("meta");
            element.setAttribute(
                attribute,
                value
            );
            document.head.appendChild(
                element
            );
        }
        element.setAttribute(
            "content",
            content
        );
    }
    /*
     * =====================================================
     * SET TITLE
     * =====================================================
     */
    function setTitle(title) {
        document.title =
            title || DEFAULT_TITLE;
    }
    /*
     * =====================================================
     * BASIC SEO
     * =====================================================
     */
    function setBasicSEO({
        title,
        description
    }) {
        setTitle(title);
        setMeta(
            "name",
            "description",
            description || DEFAULT_DESCRIPTION
        );
        setMeta(
            "name",
            "robots",
            "index, follow"
        );
    }
    /*
     * =====================================================
     * OPEN GRAPH
     * =====================================================
     */
    function setOpenGraph({
        title,
        description,
        image,
        url,
        type = "website"
    }) {
        setMeta(
            "property",
            "og:type",
            type
        );
        setMeta(
            "property",
            "og:title",
            title
        );
        setMeta(
            "property",
            "og:description",
            description
        );
        setMeta(
            "property",
            "og:image",
            absoluteUrl(image)
        );
        setMeta(
            "property",
            "og:url",
            url || window.location.href
        );
        setMeta(
            "property",
            "og:site_name",
            SITE_NAME
        );
        setMeta(
            "property",
            "og:locale",
            "vi_VN"
        );
    }
    /*
     * =====================================================
     * TWITTER / SOCIAL
     * =====================================================
     */
    function setTwitterCard({
        title,
        description,
        image
    }) {
        setMeta(
            "name",
            "twitter:card",
            "summary_large_image"
        );
        setMeta(
            "name",
            "twitter:title",
            title
        );
        setMeta(
            "name",
            "twitter:description",
            description
        );
        setMeta(
            "name",
            "twitter:image",
            absoluteUrl(image)
        );
    }
    /*
     * =====================================================
     * CANONICAL
     * =====================================================
     */
    function setCanonical(url) {
        let link =
            document.head.querySelector(
                'link[rel="canonical"]'
            );
        if (!link) {
            link =
                document.createElement("link");
            link.rel = "canonical";
            document.head.appendChild(
                link
            );
        }
        link.href =
            url || window.location.href;
    }
    /*
     * =====================================================
     * NOVEL PAGE
     * =====================================================
     */
    function setNovelSEO(novel) {
        if (!novel) {
            return;
        }
        const title =
            `${novel.title} - Đọc truyện online | ${SITE_NAME}`;
        const description =
            novel.description ||
            `Đọc ${novel.title} online miễn phí tại ${SITE_NAME}.`;
        const image =
            novel.cover ||
            DEFAULT_IMAGE;
        const url =
            window.location.href;
        setBasicSEO({
            title,
            description
        });
        setOpenGraph({
            title,
            description,
            image,
            url,
            type: "book"
        });
        setTwitterCard({
            title,
            description,
            image
        });
        setCanonical(url);
    }
    /*
     * =====================================================
     * CHAPTER PAGE
     * =====================================================
     */
     
     function setStructuredData({
        novel,
        chapter
    }) {
    
        if (!novel || !chapter) {
            return;
        }
    
    
        let script =
            document.getElementById(
                "structuredData"
            );
    
    
        if (!script) {
    
            script =
                document.createElement("script");
    
            script.type =
                "application/ld+json";
    
            script.id =
                "structuredData";
    
            document.head.appendChild(
                script
            );
    
        }
    
    
        const data = {
    
            "@context":
                "https://schema.org",
    
            "@type":
                "Article",
    
            "headline":
                `${novel.title} - ${chapter.title}`,
    
            "description":
                `Đọc ${chapter.title} của ${novel.title} online miễn phí.`,
    
            "author": {
    
                "@type":
                    "Person",
    
                "name":
                    novel.author || "Đang cập nhật"
    
            },
    
            "isPartOf": {
    
                "@type":
                    "Book",
    
                "name":
                    novel.title
    
            },
    
            "mainEntityOfPage": {
    
                "@type":
                    "WebPage",
    
                "@id":
                    window.location.href
    
            }
    
        };
    
    
        script.textContent =
            JSON.stringify(data);
    
    }
    
    function setChapterSEO({
        novel,
        chapter
    }) {
        if (!novel || !chapter) {
            return;
        }
        const chapterTitle =
            chapter.title ||
            `Chương ${chapter.id}`;
        const title =
            `${novel.title} - ${chapterTitle} | ${SITE_NAME}`;
        const description =
            `Đọc ${chapterTitle} của ${novel.title} online miễn phí.`;
        const image =
            novel.cover ||
            DEFAULT_IMAGE;
        const url =
            window.location.href;
        setBasicSEO({
            title,
            description
        });
        setOpenGraph({
            title,
            description,
            image,
            url,
            type: "article"
        });
        setTwitterCard({
            title,
            description,
            image
        });
        setCanonical(url);
        setStructuredData({
            novel,
            chapter
        });
    }
    /*
     * =====================================================
     * HOME PAGE
     * =====================================================
     */
    function setHomeSEO() {
        const title =
            `${SITE_NAME} - Đọc truyện online miễn phí`;
        const description =
            "Thư viện truyện online. Đọc truyện miễn phí, tìm kiếm truyện và tiếp tục chương đang đọc.";
        setBasicSEO({
            title,
            description
        });
        setOpenGraph({
            title,
            description,
            image: DEFAULT_IMAGE,
            url: window.location.href,
            type: "website"
        });
        setTwitterCard({
            title,
            description,
            image: DEFAULT_IMAGE
        });
        setCanonical(
            window.location.href
        );
    }
    /*
     * =====================================================
     * EXPOSE
     * =====================================================
     */
    window.ReaderSEO = {
        setHomeSEO,
        setNovelSEO,
        setChapterSEO,
        setBasicSEO,
        setOpenGraph,
        setTwitterCard,
        setCanonical,
        absoluteUrl
    };
})();