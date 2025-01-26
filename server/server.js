import http from "http"

const server = http.createServer(function (req, res) {
    res.end("Hello!")
    console.log("server is running")

}).listen(8080)