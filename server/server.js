import https from "https"
import http from "http"

const cache = new Map() // Stores cached responses in memory.
const server = http.createServer((clientReq, clientRes) => {
    console.log(`Received request: ${clientReq.method} ${clientReq.url}`);

    // Checks if a response exists before forwarding.
    if (cache.has(clientReq.url)) {
        console.log(`Cache hit: ${clientReq.url}`);
        const cachedData = cache.get(clientReq.url);
        clientRes.writeHead(200, cachedData.headers);
        return clientRes.end(cachedData.body);  // 
    }
    console.log(`Cache miss: ${clientReq.url}, fetching from example.com...`);


    const options = {
        hostname: "example.com", // main seerver 
        port: 80,
        path: clientReq.url,  // Use the client's requested path
        method: clientReq.method,
        headers: {
            ...clientReq.headers,
            'host': 'example.com'  // Override the host header i.e. -> if we donot do this then the clientreq will send localhost as the header, which the main server will not recognise 
        }
    };

    console.log('Forwarding request to example.com with path:', clientReq.url);

    const proxyReq = http.request(options, (proxyRes) => {
        let chunks = []  // array for both binary and text based data 

        proxyRes.on('data', (chunk) => chunks.push(chunk)) // collect chunks of data in cache 

        proxyRes.on("end", () => {
            const body = Buffer.concat(chunks) // mergs chunks into single buffer

            cache.set(clientReq.url, { body, headers: proxyRes.headers }) // Cache the response (store both body and headers), adds a new cached response 
            console.log(`Got response: ${proxyRes.statusCode}`);
            clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
            clientRes.end(body)
        })

    });

    proxyReq.on("error", (err) => {
        console.error("Proxy request error:", err);
        clientRes.writeHead(500, { "Content-Type": "text/plain" });
        clientRes.end(`Internal Server Error: ${err.message}`);
    });

    proxyReq.end();
});


server.listen(8081, () => console.log("Proxy server running on http://localhost:8081"));