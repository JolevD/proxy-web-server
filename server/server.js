import https from "https"
import http from "http"


const server = http.createServer((clientReq, clientRes) => {
    console.log(`Received request: ${clientReq.method} ${clientReq.url}`);

    const options = {
        hostname: "example.com", // main seerver 
        port: 80,
        path: clientReq.url,  // Use the client's requested path
        method: clientReq.method,
        headers: {
            ...clientReq.headers,
            'host': 'example.com'  // Override the host header
        }
    };

    console.log('Forwarding request to example.com with path:', clientReq.url);

    const proxyReq = http.request(options, (proxyRes) => {
        console.log(`Got response: ${proxyRes.statusCode}`);
        clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(clientRes);
    });

    proxyReq.on("error", (err) => {
        console.error("Proxy request error:", err);
        clientRes.writeHead(500, { "Content-Type": "text/plain" });
        clientRes.end(`Internal Server Error: ${err.message}`);
    });

    proxyReq.end();
});


server.listen(8081, () => console.log("Proxy server running on http://localhost:8081"));