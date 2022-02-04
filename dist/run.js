"use strict";
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
exports.run = void 0;
const path = __importStar(require("path"));
const Transform = __importStar(require("./transform"));
const types_1 = require("./types");
const node_elm_compiler_1 = require("node-elm-compiler");
const fs = __importStar(require("fs"));
// import * as BenchInit from './benchmark/init'
// import * as Benchmark from './benchmark/benchmark';
// import * as Reporting from './benchmark/reporting';
async function run(options, helpInformation, log) {
    if (!options.outputFilePath) {
        throw new Error('Missing an output file path');
    }
    const dirname = process.cwd();
    let jsSource = '';
    let elmFilePath = undefined;
    const replacements = null;
    const inputFilePath = options.inputFilePath;
    const o3Enabled = options.optimizeSpeed;
    // if (program.initBenchmark) {
    //   console.log(`Initializing benchmark ${program.initBenchmark}`)
    //   BenchInit.generate(program.initBenchmark)
    //   process.exit(0)
    // }
    //   if (program.benchmark) {
    //       const options = {
    //           compile: true,
    //           gzip: true,
    //           minify: true,
    //           verbose: true,
    //           assetSizes: true,
    //           runBenchmark: [
    //               {
    //                   browser: Browser.Chrome,
    //                   headless: true,
    //               }
    //           ],
    //           transforms: benchmarkDefaults(o3Enabled, replacements),
    //       };
    //       const report = await Benchmark.run(options, [
    //         {
    //           name: 'Benchmark',
    //           dir: program.benchmark,
    //           elmFile: 'V8/Benchmark.elm',
    //         }
    //       ]);
    //       console.log(Reporting.terminal(report));
    // //       fs.writeFileSync('./results.markdown', Reporting.markdownTable(result));
    //       process.exit(0)
    //   }
    if (inputFilePath && inputFilePath.endsWith('.js')) {
        jsSource = fs.readFileSync(inputFilePath, 'utf8');
        log('Optimizing existing JS...');
    }
    else if (inputFilePath && inputFilePath.endsWith('.elm')) {
        elmFilePath = inputFilePath;
        jsSource = (0, node_elm_compiler_1.compileToStringSync)([inputFilePath], {
            output: 'output/elm.opt.js',
            cwd: dirname,
            optimize: true,
            processOpts: 
            // ignore stdout
            {
                stdio: ['inherit', 'ignore', 'inherit'],
            },
        });
        if (jsSource != '') {
            log('Compiled, optimizing JS...');
        }
        else {
            throw new Error('An error occurred when compiling your application with Elm 0.19.1.');
        }
    }
    else {
        throw new Error(`Please provide a path to an Elm file.\n${helpInformation}`.trim());
    }
    if (jsSource == '') {
        throw new Error('Target JS file is empty.');
    }
    const transformed = await Transform.transform(dirname, jsSource, elmFilePath, options.verbose, (0, types_1.toolDefaults)(o3Enabled, replacements));
    // Make sure all the folders up to the output file exist, if not create them.
    // This mirrors elm make behavior.
    const outputDirectory = path.dirname(options.outputFilePath);
    if (path.dirname(inputFilePath) !== outputDirectory && !fs.existsSync(outputDirectory)) {
        fs.mkdirSync(outputDirectory, { recursive: true });
    }
    fs.writeFileSync(options.outputFilePath, transformed);
    const fileName = path.basename(inputFilePath);
    log('Success!');
    log('');
    log(`   ${fileName} ───> ${options.outputFilePath}`);
    log('');
    return options.outputFilePath;
}
exports.run = run;
//# sourceMappingURL=run.js.map