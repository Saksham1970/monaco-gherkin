const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  entry: {
    app: './src/index.ts',
    "editor.worker": 'monaco-editor/esm/vs/editor/editor.worker.js',
  },
  output: {
    globalObject: 'self',
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].bundle.js',
    publicPath: '/',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.js'],
    fallback: {
      'util': require.resolve('util/'),
      'process': require.resolve('process/browser'),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.ttf$/,
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser',
    }),
    new (require('copy-webpack-plugin'))({
      patterns: [
        { from: "src/assets", to: "assets" },
      ],
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    compress: true,
    port: 8080,
    open: true,
    setupMiddlewares: (middlewares, devServer) => {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }

      devServer.app.use(require('express').json());

      devServer.app.post('/run-cucumber', (req, res) => {
        const { gherkin, line } = req.body;
        const fs = require('fs');
        const { exec } = require('child_process');

        const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'monaco-gherkin.json'), 'utf8'));
        const jarPath = path.resolve(__dirname, config.jarPath);
        const javaBin = config.javaBin || 'java';
        const gluePackage = config.gluePackage || '';

        // 1. Save gherkin to temp file
        const tempFileName = 'temp_editor.feature';
        const tempFilePath = path.join(__dirname, tempFileName);
        fs.writeFileSync(tempFilePath, gherkin);

        // 2. Run Cucumber from JAR
        // Support line-specific execution for per-scenario logs
        const featureTarget = line ? `${tempFileName}:${line}` : tempFileName;
        const cmd = `"${javaBin}" -Dcucumber.ansi-colors.disabled=false -cp "${jarPath}" io.cucumber.core.cli.Main --glue ${gluePackage} ${featureTarget}`;

        console.log(`Executing: ${cmd} in ${__dirname}`);

        exec(cmd, { cwd: __dirname }, (error, stdout, stderr) => {
          // Cleanup temp file
          try {
            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
          } catch (cleanupError) {
            console.error('Failed to cleanup temp file:', cleanupError);
          }

          res.json({
            success: !error,
            stdout,
            stderr
          });
        });
      });

      return middlewares;
    },
  },
};

