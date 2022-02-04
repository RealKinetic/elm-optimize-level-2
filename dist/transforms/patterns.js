"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchElmSource = exports.matchWrapping = exports.matchWrappedInvocation = void 0;
const typescript_1 = __importDefault(require("typescript"));
const invocationRegex = /A(?<arity>[1-9]+[0-9]*)/;
const wrapperRegex = /F(?<arity>[1-9]+[0-9]*)/;
const matchWrappedInvocation = node => {
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
                    return {
                        args,
                        calleeName: funcName,
                        callExpression: node,
                        arity,
                    };
                }
            }
        }
    }
    return undefined;
};
exports.matchWrappedInvocation = matchWrappedInvocation;
const matchWrapping = node => {
    if (typescript_1.default.isCallExpression(node) && typescript_1.default.isIdentifier(node.expression)) {
        const maybeMatch = node.expression.text.match(wrapperRegex);
        if (maybeMatch && maybeMatch.groups) {
            return {
                arity: Number(maybeMatch.groups.arity),
                wrappedExpression: node.arguments[0],
            };
        }
    }
    return undefined;
};
exports.matchWrapping = matchWrapping;
// SourceFile;
//  ExpressionStatement;
//    ParenthesizedExpression;
//      CallExpression;
//        FunctionExpression;
//          Parameter;
//            Identifier;
//          Block; <==== that what we are looking
//    ThisKeyword;
const matchElmSource = (source) => {
    const expStatement = source.statements[0];
    console.log(expStatement);
    if (typescript_1.default.isExpressionStatement(expStatement) &&
        typescript_1.default.isParenthesizedExpression(expStatement.expression) &&
        typescript_1.default.isCallExpression(expStatement.expression.expression) &&
        typescript_1.default.isFunctionExpression(expStatement.expression.expression.expression)) {
        return { topScope: expStatement.expression.expression.expression.body };
    }
    return undefined;
};
exports.matchElmSource = matchElmSource;
//# sourceMappingURL=patterns.js.map