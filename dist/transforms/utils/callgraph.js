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
exports.createCallGraph = exports.getCalled = exports.print = void 0;
const ts = __importStar(require("typescript"));
const functionsToIgnore = []; // optionally ['require', 'parseInt', 'exec', 'reject', 'resolve'];
const invocationRegex = /A(?<arity>[1-9]+[0-9]*)/;
const wrapperRegex = /F(?<arity>[1-9]+[0-9]*)/;
function print(fns) {
    // Output
    console.log('');
    console.log('======================================');
    console.log(fns.all);
    console.log('--------------------------------------');
    console.log(fns.called);
    console.log('--------------------------------------');
    console.log('Functions: \t\t\t', fns.all.length);
    console.log('Functions that call others: \t', fns.called.size);
    console.log('--------------------------------------');
}
exports.print = print;
// =================================================================================================
/**
 * Recursively walk through TypeScript code extracting
 *  - function declarations and
 *  - function calls within each function
 *
 * Code modified from https://convincedcoder.com/2019/01/19/Processing-TypeScript-using-TypeScript/
 * @param node
 * @param sourceFile
 * @param indentLevel -- helpful for logging
 */
function extractFunctionCalls(node, sourceFile, indentLevel, contextFn) {
    let graph = { all: [], called: new Map() };
    // Standard named functions, e.g `function hello()`
    if (ts.isFunctionDeclaration(node)) {
        // logNode(node, sourceFile, indentLevel);
        node.forEachChild(child => {
            if (ts.isIdentifier(child)) {
                const declaredFunction = child.getText(sourceFile);
                contextFn = declaredFunction;
                graph.all.push(declaredFunction);
            }
        });
    }
    // Arrow function
    if (ts.isVariableDeclaration(node) &&
        node.initializer &&
        ts.isArrowFunction(node.initializer) &&
        indentLevel === 3) {
        const child = node.getChildAt(0, sourceFile);
        if (ts.isIdentifier(child)) {
            const declaredFunction = child.getText(sourceFile);
            contextFn = declaredFunction;
            graph.all.push(declaredFunction);
        }
    }
    // Elm style function declarations with wrapper
    // i.e. var my_function = F3(function(x,y,z){ return a })
    let already_inspected = false;
    if (ts.isVariableDeclaration(node) && node.initializer) {
        if (ts.isCallExpression(node.initializer) && ts.isIdentifier(node.initializer.expression) && ts.isIdentifier(node.name)) {
            const fn_var_name = node.name.text;
            contextFn = node.name.text;
            // match F{n} wrapper
            const fnWrapper = node.initializer.expression.text.match(wrapperRegex);
            if (fnWrapper && fnWrapper.groups) {
                graph.all.push(fn_var_name);
                node.initializer.forEachChild((child) => {
                    if (ts.isFunctionExpression(child)) {
                        graph.all.push(fn_var_name);
                        contextFn = fn_var_name;
                        let subgraph = extractFunctionCalls(child, sourceFile, indentLevel + 1, contextFn);
                        //                     graph.all = graph.all.concat(subgraph.all)
                        graph.all.push(contextFn);
                        graph.called = merge_maps(graph.called, subgraph.called);
                        already_inspected = true;
                    }
                });
            }
        }
        else if (ts.isIdentifier(node.name)) {
            const contextFn = node.name.text;
            if (ts.isIdentifier(node.initializer)) {
                graph.all.push(contextFn);
                var new_called = new Map();
                new_called.set(contextFn, [node.initializer.text]);
                graph.called = merge_maps(graph.called, new_called);
            }
            else {
                let subgraph = extractFunctionCalls(node.initializer, sourceFile, indentLevel + 1, contextFn);
                //         graph.all = graph.all.concat(subgraph.all)
                graph.all.push(contextFn);
                graph.called = merge_maps(graph.called, subgraph.called);
            }
            already_inspected = true;
        }
    }
    if (ts.isIdentifier(node) && (node.text.includes("$"))) {
        var new_called = new Map();
        new_called.set(contextFn, [node.text]);
        graph.called = merge_maps(graph.called, new_called);
    }
    // Looking for elm invocations
    // This is A{n}(my_function, otherstuff)    
    if (ts.isCallExpression(node) && !already_inspected) {
        if (ts.isIdentifier(node.expression)) {
            const maybeMatch = node.expression.text.match(invocationRegex);
            if (maybeMatch && maybeMatch.groups) {
                let found_index = 0;
                node.forEachChild((child) => {
                    if (found_index == 1 && ts.isIdentifier(child) && contextFn) {
                        functionCall(contextFn, child.text, graph);
                    }
                    found_index = found_index + 1;
                });
            }
            else {
                if (contextFn) {
                    functionCall(contextFn, node.expression.text, graph);
                }
            }
        }
    }
    // logNode(node, sourceFile, indentLevel);
    if (!already_inspected) {
        if (ts.isCallExpression(node)) {
            for (const arg of node.arguments) {
                let subgraph = extractFunctionCalls(arg, sourceFile, indentLevel + 1, contextFn);
                graph.all = graph.all.concat(subgraph.all);
                graph.called = merge_maps(graph.called, subgraph.called);
            }
        }
        node.forEachChild(child => {
            let subgraph = extractFunctionCalls(child, sourceFile, indentLevel + 1, contextFn);
            graph.all = graph.all.concat(subgraph.all);
            graph.called = merge_maps(graph.called, subgraph.called);
        });
    }
    return graph;
}
function merge_maps(one, two) {
    for (let [key, value] of two.entries()) {
        let value_one = one.get(key);
        if (value_one == undefined) {
            one.set(key, value);
        }
        else {
            one.set(key, value_one.concat(value));
        }
    }
    return one;
}
/**
 * Log stuff if needed
 * @param node
 * @param sourceFile
 * @param indentLevel
 */
function logNode(node, sourceFile, indentLevel) {
    const indentation = "-".repeat(indentLevel);
    const syntaxKind = ts.SyntaxKind[node.kind];
    const nodeText = node.getText(sourceFile);
    console.log(`${indentation}${syntaxKind}: ${nodeText}`);
}
function formatNode(node, sourceFile, indentLevel) {
    const indentation = "-".repeat(indentLevel);
    const syntaxKind = ts.SyntaxKind[node.kind];
    const nodeText = node.getText(sourceFile);
    return `${indentation}${syntaxKind}: ${nodeText}`;
}
function functionCall(contextFn, calledFunction, graph) {
    if (!functionsToIgnore.includes(calledFunction)) {
        const pastCalls = graph.called.get(contextFn);
        if (pastCalls) {
            pastCalls.push(calledFunction);
            graph.called.set(contextFn, pastCalls);
        }
        else {
            graph.called.set(contextFn, [calledFunction]);
        }
    }
    return graph;
}
function getCalled(graph, entry, already_called) {
    let called = [];
    if (already_called) {
        called = called.concat(already_called);
    }
    if (graph.called.has(entry)) {
        var found = graph.called.get(entry);
        if (!found) {
            return called;
        }
        for (const item of found) {
            if (called.includes(item)) {
                continue;
            }
            called.push(item);
            called = getCalled(graph, item, called);
        }
    }
    return called;
}
exports.getCalled = getCalled;
function createCallGraph(source) {
    // =================================================================================================
    // instead of: extractFunctionCalls(sourceFile, 0, sourceFile);
    // grab all the root nodes first
    // then do recursion for each
    const rootNodes = [];
    const callgraph = { all: [], called: new Map() };
    source.forEachChild((child) => {
        rootNodes.push(child);
    });
    rootNodes.forEach((node) => {
        const subgraph = extractFunctionCalls(node, source, 1, null);
        callgraph.all = callgraph.all.concat(subgraph.all);
        callgraph.called = merge_maps(callgraph.called, subgraph.called);
    });
    // Only include functions that exist in the `allFunctions` list
    // This will remove functions defined and called within the body of another function
    // Which we can't ask function status for unless we get more clever.
    // And of course that ain't happenin soon.
    callgraph.called.forEach((value, key) => {
        callgraph.called.set(key, value.filter((calledFunc) => {
            return callgraph.all.includes(calledFunc);
        }));
        var called = callgraph.called.get(key);
        if (!called || called.length == 0) {
            callgraph.called.delete(key);
        }
    });
    return callgraph;
}
exports.createCallGraph = createCallGraph;
//# sourceMappingURL=callgraph.js.map