const path = require('path');

module.exports = {
    entry: {
        codeEditor: './src/codeEditor.js',
        cubeDisplay: './src/cubeDisplay.ts'
    },
    mode: "development",
    devtool: process.env.NODE_ENV === 'production' ? 'source-map' : 'inline-source-map',
    output: {
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, 'dist')
    },
    module: {
        rules: [
            // Rule for JavaScript files (app entry point)
            {
                test: /\.js$/,
                include: path.resolve(__dirname, 'src'),  // Apply to all .js files in src directory
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'] // Transpile ES6+ to ES5
                    }
                }
            },
            // Rule for TypeScript files (admin entry point)
            {
                test: /\.ts$/,
                include: path.resolve(__dirname, 'src'),  // Apply to all .ts files in src directory
                exclude: /node_modules/,
                use: 'ts-loader'
            }
        ]
    },
    resolve: {
        extensions: ['.js', '.ts'],
    }
};
