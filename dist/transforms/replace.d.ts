import ts from 'typescript';
export declare const replace: (replacements: {
    [name: string]: string;
}) => ts.TransformerFactory<ts.SourceFile>;
export declare const from_file: (path: string) => ts.TransformerFactory<ts.SourceFile>;
