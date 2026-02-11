
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

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
        alias: {}
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/index.html',
        }),
        new CopyWebpackPlugin({
            patterns: [
                { from: 'src/assets', to: 'assets', noErrorOnMissing: true },
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

            console.log('--- SETUP MIDDLEWARES START ---');

            // Add body parsing middleware
            devServer.app.use(require('express').json());
            console.log('Registered json parser');

            // Define rootDir for the middleware
            const rootDir = path.resolve(__dirname, '../../');
            const { createCucumberMiddleware, createExtractMiddleware } = require('../../packages/cucumber-java-plugin/src/cucumber-middleware.js');

            console.log('Registering /run-cucumber');
            // Use the middleware from the plugin package
            devServer.app.post('/run-cucumber', createCucumberMiddleware(rootDir));

            console.log('Registering /extract-steps');
            // Register extraction endpoint
            // The body parsing middleware above handles JSON body
            devServer.app.post('/extract-steps', createExtractMiddleware(rootDir));

            console.log('--- SETUP MIDDLEWARES END ---');
            return middlewares;
        },
    },
};
