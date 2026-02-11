
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
// const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
// Actually root package.json didn't have monaco-editor-webpack-plugin. It used CopyWebpackPlugin for workers?
// Let's check root webpack.config.js content from viewed_file.
// It used 'copy-webpack-plugin' to copy 'monaco-editor' workers? No, it used 'style-loader' and imports.
// Let's stick to what was there or standard monaco setup.
// Root webpack.config.js:
// ...
// plugins: [
//   new HtmlWebpackPlugin({ template: './src/index.html' }),
//   new CopyWebpackPlugin({ patterns: [
//      { from: 'src/assets', to: 'assets' } 
//   ] })
// ]
// It didn't seem to explicitly handle monaco workers in the snippet I saw?
// Ah, `monaco-editor` usually needs workers.
// If the previous setup worked, it might have been loading them from CDN or they were bundled.
// Let's look at index.ts again. `import 'monaco-editor/esm/vs/editor/editor.all.css';`
// Usually you need a worker loader or the plugin.
// I will blindly start with a basic config and if it breaks (workers not found), I'll fix it.
// The root package.json has `copy-webpack-plugin`, `html-webpack-plugin`, `css-loader`, `style-loader`, `ts-loader`.
// No `monaco-editor-webpack-plugin`.
// So I will use the same loaders.

const { createCucumberMiddleware } = require('../../packages/cucumber-java-plugin/src/cucumber-middleware.js');

module.exports = {
    entry: './src/index.ts',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
        clean: true,
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules\/(?!@monaco-gherkin)/,
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
    resolve: {
        extensions: ['.ts', '.js'],
        alias: {
            // Ensure we resolve to the source of our packages for live reload editing?
            // Or rely on ts-loader with project references. 
            // For now, let's rely on standard node resolution via workspaces.
        }
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/index.html',
        }),
        new CopyWebpackPlugin({
            patterns: [
                { from: 'src/assets', to: 'assets', noErrorOnMissing: true },
                // Copy monaco workers if needed? 
                // If the original didn't, maybe it used the main thread worker (not recommended but possible).
            ],
        }),
    ],
    devServer: {
        static: './dist',
        port: 8080,
        setupMiddlewares: (middlewares, devServer) => {
            if (!devServer) {
                throw new Error('webpack-dev-server is not defined');
            }

            // Add body parsing middleware
            devServer.app.use(require('express').json());

            // Define rootDir for the middleware
            const rootDir = path.resolve(__dirname, '../../');

            // Use the middleware from the plugin package
            devServer.app.post('/run-cucumber', createCucumberMiddleware(rootDir));

            return middlewares;
        },
    },
};
