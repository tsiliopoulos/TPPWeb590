module.exports = {
  server: {
    baseDir: './Wasm',
    middleware: [
      function (req, res, next) {
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
        res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
        next();
      }
    ]
  }
};
