"use strict";
/*

Compiles all the test cases and runs them via webdriver to summarize the results


*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../types");
const Reporting = __importStar(require("./reporting"));
const Benchmark = __importStar(require("./benchmark"));
const fs = __importStar(require("fs"));
const Types = __importStar(require("../types"));
const options = {
    compile: true,
    gzip: true,
    minify: true,
    verbose: true,
    assetSizes: true,
    runBenchmark: [
        {
            browser: types_1.Browser.Chrome,
            headless: true,
        },
        {
            browser: types_1.Browser.Firefox,
            headless: true,
        },
        {
            browser: types_1.Browser.Safari,
            headless: true,
        },
    ],
    transforms: Types.benchmarkDefaults(true, null)
    //     Types.previous.v1
};
async function go() {
    const report = await Benchmark.run(options, [
        // Use `runWithBreakdown` if you want the breakdown
        // const report = await Reporting.runWithKnockout(options, [
        // const report = await Reporting.runWithBreakdown(options, [
        {
            name: 'Elm Core',
            dir: 'testcases/core',
            elmFile: 'V8/Benchmark.elm',
        },
        // {
        //   name: 'Elm CSS',
        //   dir: 'testcases/elm-css',
        //   elmFile: 'V8/Benchmark.elm',
        // },
        {
            name: 'Elm CSS - Realworld',
            dir: 'testcases/elm-css-realworld',
            elmFile: 'V8/Benchmark.elm',
        },
        {
            name: 'Html',
            dir: 'testcases/html',
            elmFile: 'V8/Benchmark.elm',
        },
        {
            name: 'Elm UI',
            dir: 'testcases/elm-ui',
            elmFile: 'V8/Benchmark.elm',
        },
        //     {
        //   name: 'Elm UI 2',
        //   dir: 'testcases/elm-ui-2',
        //   elmFile: 'V8/Benchmark.elm',
        // },
        // {
        //   name: 'elm-animator',
        //   dir: 'testcases/elm-animator',
        //   elmFile: 'V8/Benchmark.elm',
        // },
        {
            name: 'Elm Markdown',
            dir: 'testcases/elm-markdown',
            elmFile: 'V8/Benchmark.elm',
        },
        // // // This one takes forever
        // {
        //   name: 'elm-obj-file',
        //   dir: 'testcases/elm-obj-file',
        //   elmFile: 'V8/Benchmark.elm',
        // },
    ]);
    const result = await report;
    console.log(Reporting.terminal(result));
    fs.writeFileSync('./results.markdown', Reporting.markdownTable(result));
}
go();
//# sourceMappingURL=run.js.map