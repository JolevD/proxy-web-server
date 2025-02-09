import https from "https"
import fs from "fs"
import { LRUCache } from "lru-cache"
import { createLogger, format, transports } from "winston"
import { Semaphore } from "async-mutex"


// Loading SSL key and certificate
const sslOptions = {
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.cert')
};

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


const cacheOptions = {
    max: 100,            // Maximum number of items in the cache
    maxSize: 200 * 1024, // Maximum total size (in bytes)
    sizeCalculation: (value, key) => {
        return Buffer.byteLength(value.body); // Use the length of the body for size calculations
    }
}

const cache = new LRUCache(cacheOptions) // Stores cached responses in memory.

const MAX_CONCURRENT_CONNECTIONS = 400;  // 400 max clients 
const connectionSemaphore = new Semaphore(MAX_CONCURRENT_CONNECTIONS);


const server = https.createServer(sslOptions, async (clientReq, clientRes) => {

    // logging incoming requests
    logger.log('info', {
        message: 'Incoming Request',
        method: clientReq.method,
        url: clientReq.url,
        headers: clientReq.headers
    });


    // timeout for request 
    const requestTimeout = setTimeout(() => {
        clientRes.writeHead(504, { "content-type": 'text/plain' });
        clientRes.end("Gateway Timeout");

    }, 10000);

    const cleanupRequest = (shouldClearTimeout = true) => {
        if (shouldClearTimeout) {
            clearTimeout(requestTimeout);
        }
    };

    // Ensures timeout is cleared on response finish /////////////////ai
    clientRes.on('finish', () => {
        clearTimeout(requestTimeout);
    });

    // Checks if a response exists before forwarding.

    const release = await connectionSemaphore.acquire()

    try {
        if (cache.has(clientReq.url)) {

            // logging cache info
            logger.info({
                message: 'Cache Hit',
                url: clientReq.url
            });
            const cachedData = cache.get(clientReq.url);
            cleanupRequest()
            clientRes.writeHead(200, cachedData.headers);
            return clientRes.end(cachedData.body);  //

        }
        console.log(`Cache miss: ${clientReq.url}, fetching from example.com...`);

        //proxy request options 
        const options = {
            hostname: "example.com", // main server 
            port: 443,
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

        const proxyReq = https.request(options, (proxyRes) => {

            let MAX_SIZE = 5 * 1024 * 1024 // 5MB
            clientRes.writeHead(proxyRes.statusCode, proxyRes.headers) // checking for header length before caching 

            proxyRes.pipe(clientRes) // direct piping the response without storing 
            const headerLength = proxyRes.headers['content-length']

            if (parseInt(headerLength || 0) <= MAX_SIZE) {
                let chunks = []  // array for both binary and text based data 
                let totalSize = 0 // incoming req cache size 

                proxyRes.on('data', (chunk) => {

                    totalSize += chunk.length
                    //store chunks if we haven't exceeded size limit
                    if (totalSize <= MAX_SIZE) {
                        chunks.push(chunk)
                    } else {
                        logger.info({
                            message: 'Response is too large for caching',
                            url: clientReq.url,
                            size: totalSize
                        })
                        chunks.length = 0 // clearing chunks 
                    }
                }) // collect chunks of data in cache 

                proxyRes.on("end", () => {
                    if (chunks.length > 0) {
                        const body = Buffer.concat(chunks) // mergs chunks into single buffer
                        cache.set(clientReq.url, { body, headers: proxyRes.headers }) // Cache the response (store both body and headers), adds a new cached response 
                        console.log(`Got cached response: ${proxyRes.statusCode}`)
                    }
                    cleanupRequest()
                })
            } else {
                logger.info({
                    message: 'Response too large for caching (based on headers)',
                    url: clientReq.url,
                    size: headerLength
                });
                cleanupRequest();
            }
        });

        proxyReq.on("error", (err) => {
            // logging the errors 
            logger.error({
                message: 'Proxy Request Error',
                error: err.message,
                url: clientReq.url
            });
            cleanupRequest()

            clientRes.writeHead(500, { "Content-Type": "text/plain" });
            clientRes.end(`Internal Server Error: ${err.message}`);
        });

        proxyReq.end();



    } catch (error) {
        if (!isRequestClosed) {
            clearTimeout(requestTimeout);
            logger.error({
                message: 'Cache Error',
                error: error.message,
                url: clientReq.url
            });
            cleanupRequest()
            clientRes.writeHead(500, { "Content-Type": "text/plain" });
            clientRes.end(`Internal Server Error: ${error.message}`);

        }
    }
    finally {
        release
    }
})

server.on('error', (err) => {
    logger.error({
        message: 'Server Error',
        error: err.message
    });
});


server.listen(8081, () => console.log("Proxy server running on http://localhost:8081"));