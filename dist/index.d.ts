import { Transforms } from "./types";
export declare function run(options: {
    inputFilePath: string | undefined;
    outputFilePath: string;
    optimizeSpeed: boolean;
    processOpts: {
        stdio: [string, string, string];
    } | null;
}): Promise<string>;
export declare function transform(jsSource: string, elmFilePath: string | undefined, o3Enabled?: boolean, transforms?: Transforms | null, verbose?: boolean): Promise<string>;
