// To be added to your setupProxy.js or similar configuration
// This sets up a proxy for development environment
const { createProxyMiddleware } = require("http-proxy-middleware");
const target = import.meta.env.VITE_API_URL || "http://localhost:5000";
module.exports = function (app) {
  app.use(
    "/generate_audio",
    createProxyMiddleware({
      target: target,
      changeOrigin: true,
    })
  );

  app.use(
    "/initialize",
    createProxyMiddleware({
      target: target,
      changeOrigin: true,
    })
  );
};
