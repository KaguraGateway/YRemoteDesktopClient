module.exports = {
    // モード値を production に設定すると最適化された状態で、
    // development に設定するとソースマップ有効でJSファイルが出力される
    mode: process.env.NODE_ENV || "production",

    // メインとなるJavaScriptファイル（エントリーポイント）
    entry: "./src/app.tsx",
    // ファイルの出力設定
    output: {
      //  出力ファイルのディレクトリ名
      path: `${__dirname}/assets/`,
      // 出力ファイル名
      filename: "app.bundle.js"
    },
    module: {
      rules: [
        {
          // 拡張子 .ts もしくは .tsx の場合
          test: /\.tsx?$/,
          // TypeScript をコンパイルする
          use: "ts-loader"
        }
      ]
    },
    // import 文で .ts や .tsx ファイルを解決するため
    resolve: {
      extensions: [".ts", ".tsx", ".js", ".json"]
    },
    // ES5(IE11等)向けの指定（webpack 5以上で必要）
    target: ["web", "es5"],
  };