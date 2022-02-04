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
exports.generateNodeJitLog = exports.benchmark = void 0;
const fs = __importStar(require("fs"));
const Webdriver = __importStar(require("selenium-webdriver"));
const chrome = __importStar(require("selenium-webdriver/chrome"));
const firefox = __importStar(require("selenium-webdriver/firefox"));
const safari = __importStar(require("selenium-webdriver/safari"));
const Path = __importStar(require("path"));
const types_1 = require("../types");
const chalk_1 = __importDefault(require("chalk"));
const Process = __importStar(require("child_process"));
const Util = __importStar(require("util"));
const ParseLog = __importStar(require("./parseLog"));
function isBrowser(browser) {
    return browser != types_1.Browser.Node && browser != types_1.Browser.V8JitLog;
}
const benchmark = async (options, name, tag, html, js, jitLogPath) => {
    switch (options.browser) {
        case types_1.Browser.Node:
            return visitNode(options, name, tag, js);
        case types_1.Browser.V8JitLog:
            return (0, exports.generateNodeJitLog)(options, name, tag, js, jitLogPath);
        default:
            return visitBrowser(options, name, tag, html);
    }
};
exports.benchmark = benchmark;
const exec = Util.promisify(Process.exec);
const generateNodeJitLog = async (options, name, tag, js, jitLogPath) => {
    console.log("Capturing Jit Log".padEnd(20, ' ') +
        chalk_1.default.green(' -> ') +
        chalk_1.default.yellow("node"));
    return exec(`node --allow-natives-syntax --print-opt-code --code-comments ${js} > ${jitLogPath}`).then(() => {
        const summary = ParseLog.summarize(jitLogPath);
        fs.writeFileSync(jitLogPath + ".summary", summary);
        return { name: name, tag: tag, browser: options.browser, results: [], v8: null };
    });
};
exports.generateNodeJitLog = generateNodeJitLog;
const visitNode = async (options, name, tag, js) => {
    const label = tag == null ? name : name + ', ' + tag;
    console.log(label.padEnd(20, ' ') +
        chalk_1.default.green(' -> ') +
        chalk_1.default.yellow("Node"));
    const stdout = Process.execSync(`node --allow-natives-syntax ${js}`);
    const result = JSON.parse(stdout.toString());
    return { name: name, tag: tag, browser: options.browser, results: result.benchmarks, v8: result.v8 };
};
const visitBrowser = async (options, name, tag, html) => {
    const firefoxOptions = new firefox.Options();
    const chromeOptions = new chrome.Options();
    const safariOptions = new safari.Options();
    if (options.headless) {
        firefoxOptions.headless();
        chromeOptions.headless();
        // safariOptions.headless();
    }
    // Should probably make this configurable...
    chromeOptions.addArguments('js-flags=--allow-natives-syntax');
    let driver = await new Webdriver.Builder()
        .forBrowser(options.browser)
        .setChromeOptions(chromeOptions)
        .setFirefoxOptions(firefoxOptions)
        .setSafariOptions(safariOptions)
        .build();
    // docs for selenium:
    // https://www.selenium.dev/selenium/docs/api/javascript/module/selenium-webdriver/index_exports_WebDriver.html
    let result = [];
    try {
        const label = tag == null ? name : name + ', ' + tag;
        console.log(label.padEnd(20, ' ') +
            chalk_1.default.green(' -> ') +
            chalk_1.default.yellow(options.browser));
        await driver.get('file://' + Path.resolve(html));
        await driver.wait(Webdriver.until.titleIs('done'), 480000);
        result = await driver.executeScript('return window.results;');
    }
    finally {
        await driver.quit();
    }
    return { name: name, tag: tag, browser: options.browser, results: result.benchmarks, v8: result.v8 };
};
//# sourceMappingURL=visit.js.map