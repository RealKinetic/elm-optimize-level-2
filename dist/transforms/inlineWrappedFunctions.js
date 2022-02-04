"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFunctionInlineTransformer = exports.createInlineContext = void 0;
const typescript_1 = __importDefault(require("typescript"));
const deriveRawLambdaName = (wrappedName) => wrappedName + '_fn';
const wrapperRegex = /^F(?<arity>[1-9]+[0-9]*)$/;
const invocationRegex = /^A(?<arity>[1-9]+[0-9]*)$/;
function reportInlinining(split, { inlined }) {
    switch (split.type) {
        case 'alias': {
            inlined.fromAlias += 1;
            break;
        }
        case 'raw_func': {
            inlined.fromRawFunc += 1;
            break;
        }
        case 'returned_wrapper': {
            inlined.fromWrapper += 1;
            break;
        }
    }
}
const createInlineContext = () => ({
    functionsThatWrapFunctions: new Map(),
    splits: new Map(),
    partialApplications: new Map(),
    inlined: {
        fromAlias: 0,
        fromRawFunc: 0,
        fromWrapper: 0,
        partialApplications: 0,
    },
});
exports.createInlineContext = createInlineContext;
function reportInlineTransformResult(ctx) {
    const { inlined } = ctx;
    console.log(`inlining ${inlined.fromRawFunc} function calls`);
}
const createFunctionInlineTransformer = (logOverview, arityBasedFunctionNames, ignoreTopLevel) => (context) => {
    return (sourceFile) => {
        const inlineContext = (0, exports.createInlineContext)();
        // todo hack to only inline top level functions
        // const { topScope } = matchElmSource(sourceFile)!;
        const splitter = createSplitterVisitor(inlineContext, context, ignoreTopLevel === 'for tests', arityBasedFunctionNames);
        const splittedNode = typescript_1.default.visitNode(sourceFile, splitter);
        const inliner = createInlinerVisitor(inlineContext, context);
        const result = typescript_1.default.visitNode(splittedNode, inliner);
        if (logOverview) {
            reportInlineTransformResult(inlineContext);
        }
        return result;
    };
};
exports.createFunctionInlineTransformer = createFunctionInlineTransformer;
const isTopLevelScope = (path) => {
    const funcExpCount = path.reduce((c, n) => (typescript_1.default.isFunctionExpression(n) ? c + 1 : c), 0);
    const funcDeclCount = path.reduce((c, n) => (typescript_1.default.isFunctionDeclaration(n) ? c + 1 : c), 0);
    // meaning top level scope function body
    return funcExpCount === 1 && funcDeclCount === 0;
};
const createSplitterVisitor = ({ splits, partialApplications, functionsThatWrapFunctions }, context, ignoreTopLevel, arityBasedFunctionNames) => {
    const visitor = (path) => (node) => {
        var _a, _b, _c;
        // detects "var a"
        if (typescript_1.default.isVariableDeclaration(node) &&
            // todo this is basically a hack to only be able to inline top level functions
            typescript_1.default.isIdentifier(node.name) &&
            node.initializer &&
            (ignoreTopLevel || isTopLevelScope(path))) {
            // detects an alias to existing split
            if (typescript_1.default.isIdentifier(node.initializer)) {
                const existingSplit = splits.get(node.initializer.text);
                if (existingSplit) {
                    splits.set(node.name.text, { ...existingSplit, type: 'alias' });
                }
            }
            if (typescript_1.default.isArrowFunction(node.initializer) ||
                typescript_1.default.isFunctionExpression(node.initializer)) {
                const maybeWrapper = checkIfFunctionReturnsWrappedFunction(node.initializer);
                if (maybeWrapper) {
                    functionsThatWrapFunctions.set(node.name.text, maybeWrapper);
                }
            }
            if (typescript_1.default.isCallExpression(node.initializer)) {
                // detects "var a = [exp](..)"
                const callExpression = node.initializer.expression;
                // detects "var a = f(..)"
                if (typescript_1.default.isIdentifier(callExpression)) {
                    // detects "var a = F123(..)"
                    const wrapperMatch = callExpression.text.match(wrapperRegex);
                    if (wrapperMatch && wrapperMatch.groups) {
                        const args = node.initializer.arguments;
                        // checks that it should be called with only one argument
                        if (args.length === 1) {
                            const [maybeFuncExpression] = args;
                            const arity = Number(wrapperMatch.groups.arity);
                            const originalName = node.name.text;
                            // detects var a = F123(innerFunc)
                            if (typescript_1.default.isIdentifier(maybeFuncExpression)) {
                                splits.set(originalName, {
                                    arity,
                                    rawLambdaName: maybeFuncExpression.text,
                                    type: 'raw_func',
                                });
                                // check if the inner functions was marked as the func that returns a wrapper
                                // example
                                // var inner = (a,b) => F2((c, d) =>  a + b + c + d)
                                // var wrapped = F2(inner)
                                // in that case we mark "wrapped" functions as a functions that returns a wrapper too
                                const maybeWrapper = functionsThatWrapFunctions.get(maybeFuncExpression.text);
                                if (maybeWrapper) {
                                    functionsThatWrapFunctions.set(node.name.text, maybeWrapper);
                                }
                            }
                            else {
                                // it can be either a function expression:
                                // "var a = F123( function (a) {return a})"
                                // "var a = F123( a => a)"
                                // something like
                                // var a = F2(Math.pow)
                                const rawLambdaName = deriveRawLambdaName(originalName);
                                splits.set(originalName, {
                                    arity,
                                    rawLambdaName,
                                    type: 'raw_func',
                                });
                                const lambdaDeclaration = typescript_1.default.createVariableDeclaration(rawLambdaName, undefined, maybeFuncExpression);
                                const newDeclaration = typescript_1.default.updateVariableDeclaration(node, node.name, undefined, typescript_1.default.createCall(callExpression, undefined, [
                                    typescript_1.default.createIdentifier(rawLambdaName),
                                ]));
                                // if it is a function expression check if we need an unwrapped version of it
                                if (typescript_1.default.isArrowFunction(maybeFuncExpression) ||
                                    typescript_1.default.isFunctionExpression(maybeFuncExpression)) {
                                    const maybeWrapper = checkIfFunctionReturnsWrappedFunction(maybeFuncExpression);
                                    if (maybeWrapper) {
                                        functionsThatWrapFunctions.set(node.name.text, maybeWrapper);
                                    }
                                }
                                return [lambdaDeclaration, newDeclaration];
                            }
                        }
                    }
                    else {
                        // assume that it is a raw invocation first like func(1)
                        let appliedArgsNodes = node.initializer.arguments.slice();
                        let funcName = callExpression.text;
                        let isWrappedWithA = false;
                        // but it can be also A2(func, 1,2) with larger number of args.
                        const maybeMatch = callExpression.text.match(invocationRegex);
                        if (maybeMatch && maybeMatch.groups) {
                            const invocationArgs = node.initializer.arguments;
                            const [funcIdentifier, ...restOfArgs] = invocationArgs;
                            if (typescript_1.default.isIdentifier(funcIdentifier)) {
                                appliedArgsNodes = restOfArgs;
                                funcName = funcIdentifier.text;
                                isWrappedWithA = true;
                            }
                        }
                        // it might be a partially applied version of existing thing
                        const existingSplit = splits.get(funcName);
                        // that means something like
                        // var partiallyApplied = func(1);
                        // where number of arguments is less than arity
                        // const appliedArgsNodes = node.initializer.arguments;
                        // means that the number of args is less than arity, thus partially applied
                        if (existingSplit &&
                            appliedArgsNodes.length < existingSplit.arity) {
                            const partiallyAppliedFuncName = node.name.text;
                            const nameOfArg = (i) => `${partiallyAppliedFuncName}_a${i}`;
                            const appliedArgs = appliedArgsNodes.map((_, i) => nameOfArg(i));
                            const funcWrapper = functionsThatWrapFunctions.get(funcName);
                            partialApplications.set(partiallyAppliedFuncName, {
                                split: existingSplit,
                                appliedArgs,
                                funcReturnsWrapper: funcWrapper,
                            });
                            const argsIdentifiers = appliedArgs.map((name) => typescript_1.default.createIdentifier(name));
                            return [
                                ...appliedArgsNodes.map((argExpression, i) => typescript_1.default.createVariableDeclaration(nameOfArg(i), undefined, argExpression)),
                                typescript_1.default.updateVariableDeclaration(node, node.name, undefined, typescript_1.default.updateCall(node.initializer, callExpression, undefined, isWrappedWithA
                                    ? [typescript_1.default.createIdentifier(funcName), ...argsIdentifiers]
                                    : argsIdentifiers)),
                            ];
                        }
                        // console.log('checking', node.name.text, 'with', funcName);
                        const partialApplication = partialApplications.get(funcName);
                        // can either be a direct call
                        const wrapperFunc = functionsThatWrapFunctions.get(funcName);
                        // that means that result is another function wrapped in F(n)
                        if ((wrapperFunc && appliedArgsNodes.length === wrapperFunc.arity) ||
                            (partialApplication &&
                                partialApplication.funcReturnsWrapper &&
                                partialApplication.appliedArgs.length +
                                    appliedArgsNodes.length ===
                                    partialApplication.split.arity)) {
                            const rawFunName = deriveRawLambdaName(node.name.text);
                            splits.set(node.name.text, {
                                arity: (_c = (_a = wrapperFunc === null || wrapperFunc === void 0 ? void 0 : wrapperFunc.resultArity) !== null && _a !== void 0 ? _a : (_b = partialApplication === null || partialApplication === void 0 ? void 0 : partialApplication.funcReturnsWrapper) === null || _b === void 0 ? void 0 : _b.resultArity) !== null && _c !== void 0 ? _c : 0,
                                rawLambdaName: rawFunName,
                                type: 'returned_wrapper',
                            });
                            // console.log('!!', node.name.text);
                            // var f = A2(g, a,b);  where g returns F2
                            // splits into
                            // var f = A2(g, a,b);
                            // var f_fn = f.f;
                            let inner_fn_name = 'f';
                            // arityBasedFunctionNames
                            // Normally the internal function is stored at `.f`
                            // However, when using fastCurriedFns, the internal function is stored at `.a{arity}`
                            if (arityBasedFunctionNames && partialApplication && partialApplication.funcReturnsWrapper && partialApplication.funcReturnsWrapper.resultArity != 1) {
                                inner_fn_name = 'a' + (partialApplication.funcReturnsWrapper.resultArity);
                            }
                            return [
                                node,
                                typescript_1.default.createVariableDeclaration(typescript_1.default.createIdentifier(rawFunName), undefined, typescript_1.default.createPropertyAccess(node.name, typescript_1.default.createIdentifier(inner_fn_name))),
                            ];
                        }
                    }
                }
            }
        }
        return typescript_1.default.visitEachChild(node, visitor(path.concat(node)), context);
    };
    return visitor([]);
};
const createInlinerVisitor = (inlineContext, context) => {
    const { splits, partialApplications } = inlineContext;
    const inliner = (node) => {
        // detects [exp](..)
        if (typescript_1.default.isCallExpression(node)) {
            const expression = node.expression;
            // detects f(..)
            if (typescript_1.default.isIdentifier(expression)) {
                const maybeMatch = expression.text.match(invocationRegex);
                // detects A123(...)
                if (maybeMatch && maybeMatch.groups) {
                    const arity = Number(maybeMatch.groups.arity);
                    const allArgs = node.arguments;
                    const [funcName, ...args] = allArgs;
                    // detects A123(funcName, ...args)
                    if (typescript_1.default.isIdentifier(funcName)) {
                        if (args.length !== arity) {
                            throw new Error(`something went wrong, expected number of arguments=${arity} but got ${args.length} for ${funcName.text}`);
                        }
                        const split = splits.get(funcName.text);
                        if (split && split.arity === arity) {
                            reportInlinining(split, inlineContext);
                            return typescript_1.default.createCall(typescript_1.default.createIdentifier(split.rawLambdaName), undefined, args.map((arg) => typescript_1.default.visitNode(arg, inliner)));
                        }
                        let partialApplication = partialApplications.get(funcName.text);
                        // means that that invocation covers all args
                        if (partialApplication &&
                            partialApplication.appliedArgs.length + arity ===
                                partialApplication.split.arity) {
                            inlineContext.inlined.partialApplications += 1;
                            return typescript_1.default.createCall(typescript_1.default.createIdentifier(partialApplication.split.rawLambdaName), undefined, [
                                ...partialApplication.appliedArgs.map((name) => typescript_1.default.createIdentifier(name)),
                                ...args.map((arg) => typescript_1.default.visitNode(arg, inliner)),
                            ]);
                        }
                    }
                }
                else {
                    // it can be a raw call to a partially applied function
                    let partialApplication = partialApplications.get(expression.text);
                    if (
                    // TODO it is a copypasted code from above
                    partialApplication &&
                        node.arguments.length === 1 &&
                        partialApplication.appliedArgs.length ===
                            partialApplication.split.arity - 1) {
                        inlineContext.inlined.partialApplications += 1;
                        return typescript_1.default.createCall(typescript_1.default.createIdentifier(partialApplication.split.rawLambdaName), undefined, [
                            ...partialApplication.appliedArgs.map((name) => typescript_1.default.createIdentifier(name)),
                            ...node.arguments.map((arg) => typescript_1.default.visitNode(arg, inliner)),
                        ]);
                    }
                }
            }
        }
        return typescript_1.default.visitEachChild(node, inliner, context);
    };
    return inliner;
};
function checkIfFunctionReturnsWrappedFunction(func) {
    let returnExpression;
    if (typescript_1.default.isFunctionExpression(func) && func.body.statements.length === 1) {
        // console.log('$$body', node.body.getText());
        const [returnStatement] = func.body.statements;
        if (typescript_1.default.isReturnStatement(returnStatement) &&
            returnStatement.expression !== undefined) {
            returnExpression = returnStatement.expression;
        }
    }
    else if (typescript_1.default.isArrowFunction(func) && !typescript_1.default.isBlock(func.body)) {
        returnExpression = func.body;
    }
    const arity = func.parameters.length;
    // matches
    // function (...) { return F2(...) }
    // or
    // (...) => F2(...)
    if (returnExpression &&
        typescript_1.default.isCallExpression(returnExpression) &&
        typescript_1.default.isIdentifier(returnExpression.expression)) {
        const maybeWrapper = returnExpression.expression.text.match(wrapperRegex);
        if (maybeWrapper && maybeWrapper.groups) {
            return {
                arity,
                resultArity: Number(maybeWrapper.groups.arity),
            };
        }
    }
    return undefined;
}
//# sourceMappingURL=inlineWrappedFunctions.js.map