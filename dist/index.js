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
exports.transform = exports.run = void 0;
const Run = __importStar(require("./run"));
const Transform = __importStar(require("./transform"));
const types_1 = require("./types");
async function run(options) {
    return Run.run({
        ...options,
        verbose: false,
        processOpts: options.processOpts || { stdio: ['inherit', 'ignore', 'inherit'] },
    }, '', () => { });
}
exports.run = run;
/**
 * Transform JS source (compiled output of `elm make`)
 * Handy for making build tool plugins (e.g, parcel, snowpack, webpack, etc.)
 */
async function transform(jsSource, o3Enabled = false) {
    if (jsSource == '') {
        throw new Error('elm-optimize-level-2: JS source is empty.');
    }
    return Transform.transform("unused dirName param", jsSource, undefined, false, (0, types_1.toolDefaults)(o3Enabled, null));
}
exports.transform = transform;
//# sourceMappingURL=index.js.map