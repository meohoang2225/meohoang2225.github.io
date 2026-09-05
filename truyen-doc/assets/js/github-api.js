(function (window) {

    "use strict";

    const CONFIG = window.TRUYEN_DOC_CONFIG.github;

    const TOKEN_KEY = "truyen_doc_github_token";


    // ==========================================
    // TOKEN
    // ==========================================

    function getToken() {

        return sessionStorage.getItem(TOKEN_KEY);

    }


    function setToken(token) {

        sessionStorage.setItem(
            TOKEN_KEY,
            token
        );

    }


    function clearToken() {

        sessionStorage.removeItem(
            TOKEN_KEY
        );

    }


    function isConnected() {

        return !!getToken();

    }


    // ==========================================
    // URL
    // ==========================================

    function apiUrl(path = "") {

        return (
            "https://api.github.com/repos/" +
            encodeURIComponent(CONFIG.owner) +
            "/" +
            encodeURIComponent(CONFIG.repo) +
            "/contents/" +
            path
        );

    }


    // ==========================================
    // HEADERS
    // ==========================================

    function getHeaders() {

        const headers = {

            "Accept":
                "application/vnd.github+json",

            "X-GitHub-Api-Version":
                "2022-11-28"

        };


        const token = getToken();


        if (token) {

            headers.Authorization =
                "Bearer " + token;

        }


        return headers;

    }


    // ==========================================
    // REQUEST
    // ==========================================

    async function request(
        url,
        options = {}
    ) {

        const response =
            await fetch(
                url,
                {
                    ...options,

                    headers: {
                        ...getHeaders(),
                        ...(options.headers || {})
                    }
                }
            );


        let data = null;


        try {

            data =
                await response.json();

        } catch (error) {

            data = null;

        }


        if (!response.ok) {

            const error =
                new Error(
                    data?.message ||
                    `GitHub HTTP ${response.status}`
                );


            error.status =
                response.status;


            error.github =
                data;


            throw error;

        }


        return data;

    }


    // ==========================================
    // BASE64
    // ==========================================

    function encodeBase64(text) {

        const bytes =
            new TextEncoder()
                .encode(text);


        let binary = "";

        const chunkSize = 0x8000;


        for (
            let i = 0;
            i < bytes.length;
            i += chunkSize
        ) {

            const chunk =
                bytes.subarray(
                    i,
                    Math.min(
                        i + chunkSize,
                        bytes.length
                    )
                );


            binary +=
                String.fromCharCode(
                    ...chunk
                );

        }


        return btoa(binary);

    }


    function decodeBase64(base64) {

        const binary =
            atob(
                base64.replace(/\n/g, "")
            );


        const bytes =
            new Uint8Array(
                binary.length
            );


        for (
            let i = 0;
            i < binary.length;
            i++
        ) {

            bytes[i] =
                binary.charCodeAt(i);

        }


        return new TextDecoder(
            "utf-8"
        ).decode(bytes);

    }


    // ==========================================
    // GET FILE
    // ==========================================

    async function getFile(path) {

        const data =
            await request(
                apiUrl(path)
            );


        return {

            sha: data.sha,

            path: data.path,

            content:
                decodeBase64(
                    data.content
                )

        };

    }


    // ==========================================
    // GET JSON
    // ==========================================

    async function getJson(path) {

        const file =
            await getFile(path);


        return {

            sha: file.sha,

            data:
                JSON.parse(
                    file.content
                )

        };

    }


    // ==========================================
    // SAVE FILE
    // ==========================================

    async function saveFile(
        path,
        content,
        message,
        sha = null
    ) {

        const body = {

            message,

            content:
                encodeBase64(
                    content
                ),

            branch:
                CONFIG.branch

        };


        if (sha) {

            body.sha = sha;

        }


        return await request(
            apiUrl(path),
            {

                method: "PUT",

                body:
                    JSON.stringify(body)

            }
        );

    }


    // ==========================================
    // SAVE JSON
    // ==========================================

    async function saveJson(
        path,
        data,
        message,
        sha = null
    ) {

        return await saveFile(

            path,

            JSON.stringify(
                data,
                null,
                2
            ),

            message,

            sha

        );

    }


    // ==========================================
    // DELETE
    // ==========================================

    async function deleteFile(
        path,
        sha,
        message
    ) {

        return await request(

            apiUrl(path),

            {

                method: "DELETE",

                body:
                    JSON.stringify({

                        message,

                        sha,

                        branch:
                            CONFIG.branch

                    })

            }

        );

    }


    // ==========================================
    // UPLOAD BINARY
    // ==========================================

    async function uploadBinary(
        path,
        base64,
        message,
        sha = null
    ) {

        const body = {

            message,

            content:
                base64,

            branch:
                CONFIG.branch

        };


        if (sha) {

            body.sha = sha;

        }


        return await request(

            apiUrl(path),

            {

                method: "PUT",

                body:
                    JSON.stringify(body)

            }

        );

    }


    // ==========================================
    // UPLOAD IMAGE FILE
    // ==========================================

    async function uploadImage(
        path,
        file,
        message
    ) {

        const base64 =
            await fileToBase64(
                file
            );


        return await uploadBinary(

            path,

            base64,

            message

        );

    }


    // ==========================================
    // FILE -> BASE64
    // ==========================================

    function fileToBase64(
        file
    ) {

        return new Promise(
            (resolve, reject) => {

                const reader =
                    new FileReader();


                reader.onload = () => {

                    const result =
                        reader.result;


                    const base64 =
                        result.split(",")[1];


                    resolve(base64);

                };


                reader.onerror =
                    reject;


                reader.readAsDataURL(
                    file
                );

            }
        );

    }


    // ==========================================
    // TEST CONNECTION
    // ==========================================

    async function testConnection() {

        const url =
            "https://api.github.com/repos/" +
            encodeURIComponent(
                CONFIG.owner
            ) +
            "/" +
            encodeURIComponent(
                CONFIG.repo
            );


        return await request(url);

    }


    // ==========================================
    // PUBLIC
    // ==========================================

    window.GitHubAPI = {

        getToken,

        setToken,

        clearToken,

        isConnected,

        getFile,

        getJson,

        saveFile,

        saveJson,

        deleteFile,

        uploadBinary,

        uploadImage,

        testConnection

    };


})(window);