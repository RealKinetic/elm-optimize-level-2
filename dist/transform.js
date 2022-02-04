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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transform = void 0;
const primitives_1 = require("./parsing/primitives");
// import { parseElm } from './parsing/parseElm';
const typescript_1 = __importDefault(require("typescript"));
const variantShapes_1 = require("./transforms/variantShapes");
const types_1 = require("./types");
const inlineWrappedFunctions_1 = require("./transforms/inlineWrappedFunctions");
const inlineListFromArray_1 = require("./transforms/inlineListFromArray");
const inlineEquality_1 = require("./transforms/inlineEquality");
const modernizeJS_1 = require("./transforms/modernizeJS");
const removeUnusedLocals_1 = require("./transforms/removeUnusedLocals");
const passUnwrappedFunctions_1 = require("./transforms/passUnwrappedFunctions");
const adjustVirtualDom_1 = require("./transforms/adjustVirtualDom");
const inlineNumberToString_1 = require("./transforms/inlineNumberToString");
const analyze_1 = require("./transforms/analyze");
const recordUpdate_1 = require("./transforms/recordUpdate");
const Replace = __importStar(require("./transforms/replace"));
const transform = async (_dir, jsSource, elmfile, verbose, transforms) => {
    /* First, remove comments from source.
  
    We've encountered a bug when running some of the transforms (specifically the
    record-update transform when the -O3 flag is enabled) where comments from the
    source file appear interspersed throughout the transformed file. In some cases
    this will result in runtime exceptions.
   */
    const sourceWithComments = typescript_1.default.createSourceFile('n/a', jsSource, typescript_1.default.ScriptTarget.ES2018);
    const noCommentsPrinter = typescript_1.default.createPrinter({ removeComments: true });
    const jsSourceWithoutComments = noCommentsPrinter.printFile(sourceWithComments);
    let source = typescript_1.default.createSourceFile('elm.js', jsSourceWithoutComments, typescript_1.default.ScriptTarget.ES2018);
    let parsedVariants = primitives_1.primitives;
    if (elmfile && transforms.variantShapes) {
        // const elmSource = fs.readFileSync(elmfile, 'utf8');
        // parsedVariants = parseElm({
        //   author: 'author',
        //   project: 'project',
        //   source: elmSource,
        // }).concat(parsedVariants);
        // We have the ability to parse for more variant shapes,
        // Though I think we should include this once we understand the shapes a bit better.
        // There are also questions about 1. shipping a file with *all type* defined in elm-package
        // and 2. making it so that the parser is only parsing the user's intended project
        // and not scanning a dir like node_modules.
        // However, once we handle those, we can turn these back on!
        // .concat(parseDir('elm-packages'))
        // .concat(parseDir(dir));
        // we dont care about types that have no slots on any variants
        parsedVariants = parsedVariants.filter((variant) => {
            return variant.totalTypeSlotCount != 0;
        });
    }
    const normalizeVariantShapes = (0, variantShapes_1.createCustomTypesTransformer)(parsedVariants, types_1.Mode.Prod);
    if (verbose) {
        console.log('Reshaping ' + parsedVariants.length + ' variants');
    }
    // We have to ensure that this transformation takes place before everything else
    if (transforms.replaceVDomNode) {
        const results = typescript_1.default.transform(source, [(0, adjustVirtualDom_1.replaceVDomNode)()]);
        source = results.transformed[0];
    }
    let replacementTransformer = (0, inlineEquality_1.inlineEquality)();
    if (transforms.replacements != null) {
        replacementTransformer = Replace.replace(transforms.replacements);
    }
    let inlineCtx;
    const transformations = removeDisabled([
        [transforms.replacements != null, replacementTransformer],
        [transforms.fastCurriedFns, Replace.from_file('/../replacements/faster-function-wrappers')],
        [transforms.replaceListFunctions, Replace.from_file('/../replacements/list')],
        [transforms.replaceStringFunctions, Replace.from_file('/../replacements/string')],
        [transforms.v8Analysis, analyze_1.v8Debug],
        [transforms.variantShapes, normalizeVariantShapes],
        [transforms.inlineFunctions, (0, inlineWrappedFunctions_1.createFunctionInlineTransformer)(verbose, transforms.fastCurriedFns)],
        [transforms.inlineEquality, (0, inlineEquality_1.inlineEquality)()],
        [transforms.inlineNumberToString, (0, inlineNumberToString_1.inlineNumberToString)()],
        [
            transforms.listLiterals == types_1.InlineLists.AsObjects,
            (0, inlineListFromArray_1.createInlineListFromArrayTransformer)(inlineListFromArray_1.InlineMode.UsingLiteralObjects(types_1.Mode.Prod)),
        ],
        [
            transforms.listLiterals == types_1.InlineLists.AsCons,
            (0, inlineListFromArray_1.createInlineListFromArrayTransformer)(inlineListFromArray_1.InlineMode.UsingConsFunc),
        ],
        [
            transforms.passUnwrappedFunctions,
            (0, passUnwrappedFunctions_1.createPassUnwrappedFunctionsTransformer)(() => inlineCtx),
        ],
        [
            !!transforms.objectUpdate,
            transforms.objectUpdate && (0, modernizeJS_1.objectUpdate)(transforms.objectUpdate),
        ],
        [transforms.arrowFns, modernizeJS_1.convertFunctionExpressionsToArrowFuncs],
        [transforms.shorthandObjectLiterals, modernizeJS_1.convertToObjectShorthandLiterals],
        [transforms.unusedValues, (0, removeUnusedLocals_1.createRemoveUnusedLocalsTransform)()],
        [transforms.recordUpdates, (0, recordUpdate_1.recordUpdate)()],
        [transforms.v8Analysis, analyze_1.reportFunctionStatusInBenchmarks],
    ]);
    const { transformed: [result], } = typescript_1.default.transform(source, transformations);
    const printer = typescript_1.default.createPrinter();
    return printer.printFile(result);
};
exports.transform = transform;
function removeDisabled(list) {
    let newList = [];
    list.forEach(([cond, val]) => {
        if (![null, false, undefined].includes(cond)) {
            newList.push(val);
        }
    });
    return newList;
}
//# sourceMappingURL=transform.js.map