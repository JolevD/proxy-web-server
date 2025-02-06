# Node.js Proxy Server with Caching

A simple proxy server built in Node.js that forwards client requests to an upstream server (e.g., example.com) and caches responses using an LRU cache. It also implements logging and request timeouts to improve reliability and performance.

## Overview

This project implements a basic proxy server that:

- Listens for incoming HTTP requests on a specified port (default: 8081).
- Forwards requests to an upstream server (e.g., example.com) with appropriate header modifications.
- Caches responses using an LRU (Least Recently Used) cache to improve response times on subsequent requests.
- Logs incoming requests, cache hits, and errors using the Winston logging library.
- Implements a timeout mechanism to return a "Gateway Timeout" error if the upstream server does not respond within 10 seconds.

## Features

- **Request Forwarding:**  
  Receives a client request and forwards it to the configured upstream server.

- **Caching:**  
  Uses an LRU cache (with the `lru-cache` package) to store and retrieve responses. Cached responses include both the response body and headers.

- **Logging:**  
  Logs are managed with Winston, outputting to both a log file (`proxy-server.log`) and the console. Logs include details such as method, URL, headers, and timestamps.

- **Timeouts:**  
  Each request has a 10-second timeout. If the upstream server does not respond within this period, the server returns a 504 "Gateway Timeout" error.
