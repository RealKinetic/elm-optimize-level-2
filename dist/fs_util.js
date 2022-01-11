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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readFilesSync = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function readFilesSync(dir) {
    let foundAnything = false;
    const files = {};
    fs.readdirSync(dir).forEach(filename => {
        const name = path.parse(filename).name;
        const filepath = path.resolve(dir, filename);
        const stat = fs.statSync(filepath);
        const isFile = stat.isFile();
        if (isFile) {
            const content = fs.readFileSync(path.join(dir, filename));
            files[name] = content.toString();
            foundAnything = true;
        }
    });
    if (foundAnything) {
        return files;
    }
    else {
        return null;
    }
}
exports.readFilesSync = readFilesSync;
//# sourceMappingURL=fs_util.js.map