"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = __importDefault(require("commander"));
const chalk_1 = __importDefault(require("chalk"));
const run_1 = require("./run");
const { version } = require('../package.json');
// import * as BenchInit from './benchmark/init'
// import * as Benchmark from './benchmark/benchmark';
// import * as Reporting from './benchmark/reporting';
commander_1.default
    .version(version)
    .description(`${chalk_1.default.yellow('Elm Optimize Level 2!')}
    
This applies a second level of optimization to the javascript that Elm creates.

Make sure you're familiar with Elm's built-in optimization first: ${chalk_1.default.cyan('https://guide.elm-lang.org/optimization/asset_size.html')}

Give me an Elm file, I'll compile it behind the scenes using Elm 0.19.1, and then I'll make some more optimizations!`)
    .usage('[options] <src/Main.elm>')
    .option('--output <output>', 'the javascript file to create.', 'elm.js')
    .option('-O3, --optimize-speed', 'Enable optimizations that likely increases asset size', false)
    .option('--verbose', 'Show more error details, useful to provide better bug reports', false)
    // .option('--init-benchmark <dir>', 'Generate some files to help run benchmarks')
    // .option('--benchmark <dir>', 'Run the benchmark in the given directory.')
    // .option('--replacements <dir>', 'Replace stuff')
    .parse(process.argv);
const { output, optimizeSpeed, verbose } = commander_1.default.opts();
(0, run_1.run)({
    inputFilePath: commander_1.default.args[0],
    outputFilePath: output,
    optimizeSpeed,
    verbose,
    processOpts: { stdio: ['inherit', 'ignore', 'inherit'] },
}, commander_1.default.helpInformation(), console.log.bind(console)).catch((e) => {
    if (verbose) {
        console.error(e);
    }
    else {
        console.error(e.toString());
    }
    process.exit(1);
});
//# sourceMappingURL=bin.js.map