const path = require('path');

module.exports = {
    entry: './src/index.js',    // The entry point of your application
    output: {
        filename: 'main.js',    // The output file that Webpack will generate
        path: path.resolve(__dirname, 'dist'),
    },
    mode: 'development',        // Set the mode to development for easier debugging
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',  // Transpile modern JS if needed (optional)
                },
            },
        ],
    },
    devtool: 'source-map',      // Source maps for easier debugging
};
