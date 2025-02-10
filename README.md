# Node.js HTTPS Proxy Server with Caching

A secure, high-performance proxy server built in Node.js that forwards client requests to upstream servers, implements dynamic routing based on the Host header, and caches responses using an LRU cache. It supports HTTPS for both incoming client connections and connections to upstream servers, incorporates robust error handling with detailed logging, and limits concurrent connections using a semaphore.

## Overview

This project is a Node.js-based proxy server designed to demonstrate key networking concepts such as secure HTTPS communication, dynamic request forwarding, response caching with an LRU strategy, and robust error handling. The server supports multiple upstream domains by dynamically mapping the Host header and uses a composite cache key to ensure correct caching behavior. It also limits the number of concurrent connections via a semaphore and logs all activities with Winston.

## Features

- **Secure Connections:**

  - Incoming connections use HTTPS with a self-signed (or CA-issued) certificate.
  - Outgoing (upstream) requests use HTTPS, ensuring end-to-end encryption.

- **Dynamic Routing:**

  - The proxy determines the target upstream server based on the client's Host header.
  - A composite cache key (`<targetHost><clientReq.url>`) ensures correct cache isolation between domains.

- **Caching with LRU Strategy:**

  - Uses the `lru-cache` library to cache responses for faster subsequent requests.
  - Caches responses only if they are below a specified size threshold (e.g., 5MB).
  - Bypasses caching for large responses while still streaming them to the client.

- **Error Handling & Timeouts:**
  - Implements a 10-second timeout for each request, returning a 504 Gateway Timeout if the upstream server is too slow.
  - Handles errors on the upstream connection, client streams, and caching logic, sending appropriate HTTP error responses (e.g., 400, 500).
- **Logging:**

  - Uses Winston for structured logging to both a file (`proxy-server.log`) and the console.
  - Logs incoming requests, cache hits/misses, errors, and other events with detailed context.

- **Concurrency Control:**
  - Limits concurrent client connections (e.g., up to 400) using a semaphore from the `async-mutex` library.
