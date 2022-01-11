"use strict";
/*
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDir = exports.parseElm = void 0;
const tree_sitter_1 = __importDefault(require("tree-sitter"));
const tree_sitter_elm_1 = __importDefault(require("tree-sitter-elm"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Parse the elm file using tree sitter
const elmParser = new tree_sitter_1.default();
elmParser.setLanguage(tree_sitter_elm_1.default);
exports.parseElm = ({ author, project, source, }) => {
    const tree = elmParser.parse(source);
    const found = [];
    /*
        A quick reference for using treesitter.
        Generally it's pretty easy to see what methods are available here:
        https://github.com/tree-sitter/node-tree-sitter/blob/master/index.js
  
        We usually want these things
  
          - node.namedChildren
              Gives a list of named children for a node.  Unnamed children are things like intermediate characters in the AST.
              http://tree-sitter.github.io/tree-sitter/using-parsers#named-vs-anonymous-nodes
          
          - node.type
              The name of the AST node that was parsed.  e.g. upper_case_identifier, or union_variant
  
          - node.toString()
              See the s-expression version of the node.  e.g. (union_variant (upper_case_identifier) (type_ref (upper_case_qid (upper_case_identifier))))
              May look kinda weird, but it's basically describing the AST for that node.
              http://tree-sitter.github.io/tree-sitter/using-parsers#query-syntax
  
          - node.text
              Render the literal text for that node.
  
    */
    let moduleName = 'Unknown';
    for (let child of tree.rootNode.namedChildren) {
        switch (child.type) {
            case 'module_declaration': {
                for (let module of child.namedChildren) {
                    if (module.type == 'upper_case_qid') {
                        moduleName = module.text;
                        break;
                    }
                }
                break;
            }
            case 'type_declaration': {
                let name = '';
                let index = 0;
                let totalTypeSlotCount = 0;
                for (let variant of child.namedChildren) {
                    switch (variant.type) {
                        case 'upper_case_identifier': {
                            name = moduleName + '.' + variant.text;
                            break;
                        }
                        case 'union_variant': {
                            let foundVariantName = '';
                            let slots = [];
                            for (let detail of variant.namedChildren) {
                                switch (detail.type) {
                                    case 'upper_case_identifier': {
                                        foundVariantName = detail.text;
                                        break;
                                    }
                                    case 'type_ref': {
                                        slots.push(detail.text);
                                        break;
                                    }
                                    case 'type_variable': {
                                        slots.push(detail.text);
                                        break;
                                    }
                                    case 'type_expression': {
                                        slots.push(detail.text);
                                        break;
                                    }
                                    default: {
                                        break;
                                    }
                                }
                            }
                            totalTypeSlotCount = Math.max(totalTypeSlotCount, slots.length);
                            let jsName = '$' +
                                author +
                                '$' +
                                project +
                                '$' +
                                moduleName.replace('.', '$') +
                                '$' +
                                foundVariantName;
                            found.push({
                                typeName: name,
                                name: foundVariantName,
                                jsName: jsName,
                                index: index,
                                slots: slots,
                                totalTypeSlotCount: totalTypeSlotCount,
                            });
                            index = index + 1;
                            break;
                        }
                        default: {
                            break;
                        }
                    }
                }
                for (let variant of found) {
                    if (variant.typeName == name) {
                        variant.totalTypeSlotCount = totalTypeSlotCount;
                    }
                }
                break;
            }
            default: {
                break;
            }
        }
    }
    return found;
};
exports.parseDir = (dir) => {
    let variants = [];
    const files = fs.readdirSync(dir);
    files.forEach(function (author) {
        if (fs.statSync(dir + '/' + author).isDirectory()) {
            const projs = fs.readdirSync(path.join(dir, author));
            projs.forEach(function (project) {
                if (fs.statSync(path.join(dir, author, project)).isDirectory()) {
                    const vars = parseElmFilesInDirectory(path.join(dir, author, project), author, project);
                    variants = variants.concat(vars);
                }
            });
        }
    });
    return variants;
};
const parseElmFilesInDirectory = (dir, author, project) => {
    let variants = [];
    let files = walkSync(dir, []);
    for (let i in files) {
        if (files[i].endsWith('.elm')) {
            const source = fs.readFileSync(files[i], 'utf8');
            let results = exports.parseElm({
                author: author,
                project: project,
                source: source,
            });
            variants = variants.concat(results);
        }
    }
    return variants;
};
var walkSync = function (dir, filelist) {
    var files = fs.readdirSync(dir);
    filelist = filelist || [];
    files.forEach(function (file) {
        if (fs.statSync(path.join(dir, file)).isDirectory()) {
            filelist = walkSync(path.join(dir, file), filelist);
        }
        else {
            filelist.push(path.join(dir, file));
        }
    });
    return filelist;
};
//# sourceMappingURL=parseElm.js.map