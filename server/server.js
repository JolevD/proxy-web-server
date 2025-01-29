import http from "http"

const server = http.createServer(function (clientReq, clientRes) {
    console.log(`request form url: ${clientReq.url}`)

    const options = {
        hostname: "example.com", // main server to which the client request will be forwarded
        PORT: 80,
        method: clientReq.method,
        path: clientReq.url,
        headers: clientReq.headers
    }

    const proxyReq = http.request(options, (proxyRes) => {
        clientRes.writeHead(proxyRes.statusCode, proxyRes.headers)
        proxyres.pipe(clientRes) // This pipes the response data directly to the client.
        // It means we don’t need to manually read and send chunks of data—it’s handled automatically.

    })

    req.pipe(proxyreq) // If the client sent data (e.g., form data in a POST request), we forward it to the upstream server.
    //pipe() ensures we stream data efficiently instead of storing it in memory.

    // error handling
    proxyReq.on("error", (err) => {
        console.error("Proxy error:", err.message);
        clientRes.writeHead(500, { "Content-Type": "text/plain" });
        clientRes.end("Internal Server Error");
    });

}).listen(8080, () => console.log("Proxy server running on http://localhost:8080"))