export declare function run(options: {
    inputFilePath: string | undefined;
    outputFilePath: string;
    optimizeSpeed: boolean;
    processOpts: {
        stdio: [string, string, string];
    } | null;
}): Promise<string>;
/**
 * Transform JS source (compiled output of `elm make`)
 * Handy for making build tool plugins (e.g, parcel, snowpack, webpack, etc.)
 */
export declare function transform(jsSource: string, o3Enabled?: boolean): Promise<string>;
