"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPassUnwrappedFunctionsTransformer = void 0;
const typescript_1 = __importDefault(require("typescript"));
// import { createFunctionInlineTransformer } from './inlineWrappedFunctions';
const patterns_1 = require("./patterns");
const createTSprogram_1 = require("./createTSprogram");
const deriveNewFuncName = (funcName) => funcName + '_unwrapped';
const createPassUnwrappedFunctionsTransformer = (getCtx) => (context) => {
    getCtx;
    return (sourceFile) => {
        const foundFunctions = new Map();
        const [program, copiedSource] = (0, createTSprogram_1.createProgramFromSource)(sourceFile);
        const typeChecker = program.getTypeChecker();
        const collectFunctions = (node) => {
            const invocation = (0, patterns_1.matchWrappedInvocation)(node);
            if (invocation) {
                const { arity, callExpression, calleeName: funcName } = invocation;
                const symbol = typeChecker.getSymbolAtLocation(funcName);
                const [declaration] = (symbol === null || symbol === void 0 ? void 0 : symbol.declarations) || [];
                if (declaration &&
                    typescript_1.default.isParameter(declaration) &&
                    typescript_1.default.isIdentifier(declaration.name) &&
                    typescript_1.default.isFunctionExpression(declaration.parent) &&
                    typescript_1.default.isVariableDeclaration(declaration.parent.parent) &&
                    typescript_1.default.isIdentifier(declaration.parent.parent.name)) {
                    const funcDeclaration = declaration.parent.parent;
                    const func = declaration.parent;
                    const parameterPos = func.parameters.findIndex((p) => p === declaration);
                    const funcName = declaration.parent.parent.name.text;
                    const existing = foundFunctions.get(funcName);
                    if (!existing) {
                        foundFunctions.set(funcName, {
                            arity,
                            callExpression,
                            funcDeclaration: funcDeclaration,
                            funcExpression: func,
                            parameterPos,
                            funcName,
                            parameterName: declaration.name.text,
                        });
                    }
                    else if (existing !== 'bail_out') {
                        // it means that we already registered this function
                        // we will need to bail out if:
                        // 1. it is a different argument, we don't yet unwrap for two
                        // 2. arity of the call doesn't match
                        if (existing.parameterPos !== parameterPos ||
                            existing.arity !== arity) {
                            foundFunctions.set(funcName, 'bail_out');
                        }
                    }
                }
            }
            return typescript_1.default.visitEachChild(node, collectFunctions, context);
        };
        const addFunctionsWithoutUnwrapping = (node) => {
            if (typescript_1.default.isVariableDeclaration(node) && typescript_1.default.isIdentifier(node.name)) {
                const funcToModify = foundFunctions.get(node.name.text);
                if (funcToModify && funcToModify !== 'bail_out') {
                    let bailOut = false;
                    const modifyFunction = (nodeInModfifyFunc) => {
                        if (typescript_1.default.isCallExpression(nodeInModfifyFunc) &&
                            typescript_1.default.isIdentifier(nodeInModfifyFunc.expression)) {
                            const match = (0, patterns_1.matchWrappedInvocation)(nodeInModfifyFunc);
                            if (match &&
                                match.calleeName.text === funcToModify.parameterName &&
                                match.arity === funcToModify.arity) {
                                // transforms A2(func, a,b) into func(a,b)
                                return typescript_1.default.createCall(match.calleeName, undefined, 
                                // recursively transform all calls within a function
                                match.args.map((arg) => typescript_1.default.visitNode(arg, modifyFunction)));
                            }
                            const calledFuncIdentifier = nodeInModfifyFunc.expression;
                            // can be a curried version of callee name in the same body
                            // example: A2(func, a,b) and func(c)
                            if (calledFuncIdentifier.text === funcToModify.parameterName &&
                                nodeInModfifyFunc.arguments.length === 1 &&
                                funcToModify.arity !== 1) {
                                // means that we have an invocation that is not uniform with expected arity
                                // therefore we cannot pass a raw function to it
                                bailOut = true;
                            }
                            // recursive call to itself
                            if (calledFuncIdentifier.text === funcToModify.funcName) {
                                return typescript_1.default.createCall(typescript_1.default.createIdentifier(deriveNewFuncName(funcToModify.funcName)), undefined, nodeInModfifyFunc.arguments.map((arg) => typescript_1.default.visitNode(arg, modifyFunction)));
                            }
                            // now it can be a call to another function but with passed in parameter
                            // that is now unwrapped
                            // thus check if we have an unwrapped version
                            if (nodeInModfifyFunc.arguments.some((arg) => typescript_1.default.isIdentifier(arg) &&
                                arg.text === funcToModify.parameterName)) {
                                const existingUnwrappedFunc = foundFunctions.get(calledFuncIdentifier.text);
                                if (
                                // todo we need to bail out because we cannot find an unwrapped version
                                !existingUnwrappedFunc ||
                                    existingUnwrappedFunc === 'bail_out' ||
                                    // we need to make sure that arity matches
                                    // TODO make sure that the position matches too, e.g. it is the same parameter
                                    existingUnwrappedFunc.arity !== funcToModify.arity) {
                                    bailOut = true;
                                }
                                return typescript_1.default.createCall(typescript_1.default.createIdentifier(deriveNewFuncName(calledFuncIdentifier.text)), undefined, nodeInModfifyFunc.arguments.map((arg) => typescript_1.default.visitNode(arg, modifyFunction)));
                            }
                        }
                        return typescript_1.default.visitEachChild(nodeInModfifyFunc, modifyFunction, context);
                    };
                    const newFuncExpression = typescript_1.default.visitNode(funcToModify.funcExpression, modifyFunction);
                    if (bailOut) {
                        foundFunctions.delete(funcToModify.funcName);
                    }
                    else {
                        return [
                            node,
                            typescript_1.default.createVariableDeclaration(deriveNewFuncName(funcToModify.funcName), undefined, newFuncExpression),
                        ];
                    }
                }
            }
            return typescript_1.default.visitEachChild(node, addFunctionsWithoutUnwrapping, context);
        };
        const replaceUsagesWithUnwrappedVersion = (node) => {
            var _a;
            if (typescript_1.default.isCallExpression(node)) {
                const { expression } = node;
                if (typescript_1.default.isIdentifier(expression)) {
                    // todo make it a map maybe?
                    const funcToUnwrap = foundFunctions.get(expression.text);
                    if (funcToUnwrap &&
                        funcToUnwrap !== 'bail_out' &&
                        // actually the same symbol
                        typeChecker.getSymbolAtLocation(expression) ===
                            typeChecker.getSymbolAtLocation(funcToUnwrap.funcDeclaration.name)) {
                        const args = node.arguments;
                        const argPos = funcToUnwrap.parameterPos;
                        const funcParameter = args[argPos];
                        if (funcParameter) {
                            const match = (0, patterns_1.matchWrapping)(funcParameter);
                            // it means that it is something like (..., F3(function (a,b,c) {...}), ...)
                            if (match) {
                                return typescript_1.default.createCall(typescript_1.default.createIdentifier(deriveNewFuncName(expression.text)), undefined, [
                                    ...args
                                        .slice(0, funcToUnwrap.parameterPos)
                                        .map((a) => typescript_1.default.visitNode(a, replaceUsagesWithUnwrappedVersion)),
                                    typescript_1.default.visitNode(match.wrappedExpression, replaceUsagesWithUnwrappedVersion),
                                    ...args
                                        .slice(argPos + 1)
                                        .map((a) => typescript_1.default.visitNode(a, replaceUsagesWithUnwrappedVersion)),
                                ]);
                            }
                            else if (typescript_1.default.isIdentifier(funcParameter)) {
                                const existingSplit = (_a = getCtx()) === null || _a === void 0 ? void 0 : _a.splits.get(funcParameter.text);
                                // if (funcParameter.text)
                                if (existingSplit &&
                                    existingSplit.arity === funcToUnwrap.arity) {
                                    return typescript_1.default.createCall(typescript_1.default.createIdentifier(deriveNewFuncName(expression.text)), undefined, [
                                        ...args
                                            .slice(0, funcToUnwrap.parameterPos)
                                            .map((a) => typescript_1.default.visitNode(a, replaceUsagesWithUnwrappedVersion)),
                                        typescript_1.default.createIdentifier(existingSplit.rawLambdaName),
                                        ...args
                                            .slice(argPos + 1)
                                            .map((a) => typescript_1.default.visitNode(a, replaceUsagesWithUnwrappedVersion)),
                                    ]);
                                }
                            }
                        }
                    }
                }
            }
            return typescript_1.default.visitEachChild(node, replaceUsagesWithUnwrappedVersion, context);
        };
        typescript_1.default.visitNode(copiedSource, collectFunctions);
        const withUnwrappedFunctions = typescript_1.default.visitNode(copiedSource, addFunctionsWithoutUnwrapping);
        const withInlinedCalls = typescript_1.default.visitNode(withUnwrappedFunctions, replaceUsagesWithUnwrappedVersion);
        return withInlinedCalls;
    };
};
exports.createPassUnwrappedFunctionsTransformer = createPassUnwrappedFunctionsTransformer;
//# sourceMappingURL=passUnwrappedFunctions.js.map