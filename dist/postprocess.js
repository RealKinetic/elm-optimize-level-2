"use strict";
/*
This handles functions for operations that this tool doesnt provide as a CLI, but we likely want to study when capturing metrics.
So
    - minification
    - gzip
    - running prepack


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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.includeStubbedV8Helpers = exports.includeV8Helpers = exports.gzip = exports.minify = exports.process = exports.prepack = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const prepack_1 = require("prepack");
const Terser = __importStar(require("terser"));
const Compress = __importStar(require("@gfx/zopfli"));
function prepack(input) {
    const { code } = prepack_1.prepackFileSync([input], {
        debugNames: true,
        inlineExpressions: true,
        maxStackDepth: 1200,
    });
    return code;
}
exports.prepack = prepack;
async function process(file, options) {
    let pieces = file.split('.');
    let ext = pieces.pop();
    const base = pieces.join(".");
    if (options.minify) {
        await minify(file, base + ".min." + ext);
    }
    if (options.minify && options.gzip) {
        await gzip(base + ".min." + ext, base + ".min." + ext + ".gz");
    }
}
exports.process = process;
async function minify(inputFilename, outputFilename) {
    const compress = {
        toplevel: true,
        mangle: false,
        compress: {
            pure_getters: true,
            keep_fargs: false,
            unsafe_comps: true,
            unsafe: true,
            pure_funcs: [
                'F2',
                'F3',
                'F4',
                'F5',
                'F6',
                'F7',
                'F8',
                'F9',
                'A2',
                'A3',
                'A4',
                'A5',
                'A6',
                'A7',
                'A8',
                'A9',
            ],
        },
    };
    const mangle = {
        mangle: true,
        compress: false,
    };
    const input = fs.readFileSync(inputFilename, 'utf8');
    const compressed = await Terser.minify(input, compress);
    let mangled = null;
    if (compressed && compressed.code) {
        mangled = await Terser.minify(compressed.code, mangle);
    }
    else {
        console.log('Error compressing with Terser');
    }
    // console.log('mangled', mangled.error);
    if (mangled && mangled.code) {
        fs.writeFileSync(outputFilename, mangled.code);
    }
    else {
        console.log('Error mangling with Terser');
    }
}
exports.minify = minify;
const gzipOptions = {
    verbose: false,
    verbose_more: false,
    numiterations: 15,
    blocksplitting: true,
    blocksplittingmax: 15,
};
async function gzip(file, output) {
    // --keep = keep the original file
    // --force = overwrite the exisign gzip file if it's there
    // execSync('gzip --keep --force ' + file);
    const fileContents = fs.readFileSync(file, 'utf8');
    const promise = await Compress.gzipAsync(fileContents, gzipOptions).then(compressed => {
        fs.writeFileSync(output, compressed);
    });
}
exports.gzip = gzip;
async function includeV8Helpers(output_dir) {
    fs.copyFileSync("./src/transforms/utils/v8Helpers/v8-browser.js", path.join(output_dir, 'v8-browser.js'));
    fs.copyFileSync("./src/transforms/utils/v8Helpers/v8-node.js", path.join(output_dir, 'v8-node.js'));
    fs.copyFileSync("./src/transforms/utils/v8Helpers/v8-native-dummy.js", path.join(output_dir, 'v8-native-dummy.js'));
    fs.copyFileSync("./src/transforms/utils/v8Helpers/v8-native-calls.js", path.join(output_dir, 'v8-native-calls.js'));
}
exports.includeV8Helpers = includeV8Helpers;
async function includeStubbedV8Helpers(output_dir) {
    fs.copyFileSync("./src/transforms/utils/v8Helpers/v8-skip.js", path.join(output_dir, 'v8.js'));
}
exports.includeStubbedV8Helpers = includeStubbedV8Helpers;
//# sourceMappingURL=postprocess.js.map