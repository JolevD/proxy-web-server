import https from "https"
import http from "http"
import { LRUCache } from "lru-cache"
import { createLogger, format, transports } from "winston"

const logger = createLogger({
    // defining logs
    level: "info",

    format: format.combine(
        format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), // tells the time of the log
        format.json(), // tells the log
        format.prettyPrint()
    ),

    //storing logs 
    transports: [
        new transports.File({
            filename: 'proxy-server.log',
            maxsize: 5 * 1024 * 1024 // 5MB max file size
        }),

        // show logs in console
        new transports.Console({
            format: format.combine(
                format.colorize(),
                format.simple()
            )
        })
    ]
})


const options = {
    max: 100,            // Maximum number of items in the cache
    maxSize: 200 * 1024, // Maximum total size (in bytes)
    sizeCalculation: (value, key) => {
        return value.body.length; // Use the length of the body for size calculations
    }
}

const cache = new LRUCache(options) // Stores cached responses in memory.

const server = http.createServer((clientReq, clientRes) => {
    // logging incoming requests 
    logger.log('info', {
        message: 'Incoming Request',
        method: clientReq.method,
        url: clientReq.url,
        headers: clientReq.headers
    });

    // timeout for request 
    const requestTimeout = setTimeout(() => {
        clientRes.writeHead(504, { "content-type": 'text/plain' })
        clientRes.end("Gateway Timeout")
    }, 10000);

    // Checks if a response exists before forwarding.

    try {
        if (cache.has(clientReq.url)) {
            clearTimeout(requestTimeout)
            // logging cache info
            logger.info({
                message: 'Cache Hit',
                url: clientReq.url
            });
            const cachedData = cache.get(clientReq.url);
            clientRes.writeHead(200, cachedData.headers);
            return clientRes.end(cachedData.body);  // 
        }
        console.log(`Cache miss: ${clientReq.url}, fetching from example.com...`);

    } catch (error) {
        clearTimeout(requestTimeout)
        console.log(error)
    }



    const options = {
        hostname: "example.com", // main server 
        port: 80,
        path: clientReq.url,  // Use the client's requested path
        method: clientReq.method,
        headers: {
            ...clientReq.headers,
            'host': 'example.com'  // Override the host header i.e. -> if we donot do this then the clientreq will send localhost as the header, which the main server will not recognise 
        }
    };

    // console.log('Forwarding request to example.com with path:', clientReq.url);
    // console.log('Full Incomming request details:', {
    //     url: clientReq.url,
    //     method: clientReq.method,
    //     headers: clientReq.headers
    // });

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
        // logging the errors 
        logger.error({
            message: 'Proxy Request Error',
            error: err.message,
            url: clientReq.url
        });
        clientRes.writeHead(500, { "Content-Type": "text/plain" });
        clientRes.end(`Internal Server Error: ${err.message}`);
    });

    proxyReq.end();
});


server.listen(8081, () => console.log("Proxy server running on http://localhost:8081"));