export declare function run(options: {
    inputFilePath: string | undefined;
    outputFilePath: string;
    optimizeSpeed: boolean;
    verbose: boolean;
    processOpts: {
        stdio: [string, string, string];
    };
}, helpInformation: string, log: (message?: any, ...optionalParams: any[]) => void): Promise<string>;
