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
exports.from_file = exports.replace = void 0;
const typescript_1 = __importStar(require("typescript"));
const create_1 = require("./utils/create");
const fs_util_1 = require("../fs_util");
const replace = (replacements) => (context) => {
    return (sourceFile) => {
        const visitor = (node) => {
            var _a;
            if (typescript_1.default.isVariableStatement(node)) {
                const name = (_a = node.declarationList.declarations[0]) === null || _a === void 0 ? void 0 : _a.name;
                if ((0, typescript_1.isIdentifier)(name) && replacements.hasOwnProperty(name.text)) {
                    const key = name.text;
                    return (0, create_1.ast)(replacements[key]);
                }
            }
            else if (typescript_1.default.isFunctionDeclaration(node)) {
                const name = node.name;
                if (name && (0, typescript_1.isIdentifier)(name) && replacements.hasOwnProperty(name.text)) {
                    const key = name.text;
                    return (0, create_1.astNodes)(replacements[key]);
                }
            }
            return typescript_1.default.visitEachChild(node, visitor, context);
        };
        return typescript_1.default.visitNode(sourceFile, visitor);
    };
};
exports.replace = replace;
const from_file = (path) => {
    const read = (0, fs_util_1.readFilesSync)(__dirname + path);
    let replacements = {};
    if (read) {
        replacements = read;
    }
    return (0, exports.replace)(replacements);
};
exports.from_file = from_file;
//# sourceMappingURL=replace.js.map