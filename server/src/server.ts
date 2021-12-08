/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {
    createConnection,
    TextDocuments,
    ProposedFeatures,
    InitializeParams,
    DidChangeConfigurationNotification,
    TextDocumentPositionParams,
    TextDocumentSyncKind,
    InitializeResult,
    Hover,
    Definition
} from 'vscode-languageserver/node';

import {
    TextDocument
} from 'vscode-languageserver-textdocument';

import { 
    getWordRange, 
    returnHover,
    returnMMLHover 
} from './hover';

import { 
    returnDefinition,
	returnABSDefinition
} from './goToDefinition';


// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;

connection.onInitialize((params: InitializeParams) => {
    const capabilities = params.capabilities;

    // Does the client support the `workspace/configuration` request?
    // If not, we fall back using global settings.
    hasConfigurationCapability = !!(
        capabilities.workspace && !!capabilities.workspace.configuration
    );
    hasWorkspaceFolderCapability = !!(
        capabilities.workspace && !!capabilities.workspace.workspaceFolders
    );

    const result: InitializeResult = {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            // Tell the client that this server supports code completion.
            completionProvider: {
                resolveProvider: true
            },
            hoverProvider: true,
            definitionProvider: true
        }
    };
    if (hasWorkspaceFolderCapability) {
        result.capabilities.workspace = {
            workspaceFolders: {
                supported: true
            }
        };
    }
    return result;
});

connection.onInitialized(() => {
    if (hasConfigurationCapability) {
        // Register for all configuration changes.
        connection.client.register(DidChangeConfigurationNotification.type, undefined);
    }
    if (hasWorkspaceFolderCapability) {
        connection.workspace.onDidChangeWorkspaceFolders(_event => {
            connection.console.log('Workspace folder change event received.');
        });
    }
});

export function showMessage(
    type: number,
    message: string
)
{
    const param = {type, message};
    connection.sendRequest('window/showMessageRequest', param);
}

connection.onHover(
    (params: TextDocumentPositionParams): Hover | Promise<Hover> => {
        const document = documents.get(params.textDocument.uri);
        if (document === undefined) {
            return{ contents: [] };
        }
        const position = params.position;
		
        const wordRange = getWordRange(document, position, /\w+:def\s+\d+|\w+:\s*\d+|\w+:sch\s+\d+|\w+/g);
        
        if (!wordRange || document.getText(wordRange) === 'by'){
            return{ contents: [] };
        }
        // 外部ファイル（MML）の定義、定理、スキームを参照する場合
        else if(/(\w+:def\s+\d+|\w+:\s*\d+|\w+:sch\s+\d+)/g.test(document.getText(wordRange))){
            return returnMMLHover(document, wordRange);
        }
        // 自身のファイル内の定義、定理、ラベルを参照する場合
        else if (/(\w+)/.test(document.getText(wordRange))){
            return returnHover(document, wordRange);
        }
        else{
            return{ contents: [] };
        }
});

connection.onDefinition(
    (params: TextDocumentPositionParams): Definition | Promise<Definition> |undefined => {
        const document = documents.get(params.textDocument.uri);
        if (document === undefined) {
            return [];
        }
        const position = params.position;

        const wordRange = getWordRange(document, position, /\w+:def\s+\d+|\w+:\s*\d+|\w+:sch\s+\d+|\w+/g);
        
        if (!wordRange || document.getText(wordRange) === 'by'){
            return [];
        }
        // 外部ファイル（MML）の定義、定理、スキームを参照する場合
        else if(/(\w+:def\s+\d+|\w+:\s*\d+|\w+:sch\s+\d+)/g.test(document.getText(wordRange))){
            return returnABSDefinition(document, wordRange);
        }
        // 自身のファイル内の定義、定理、ラベルを参照する場合
        else if (/(\w+)/.test(document.getText(wordRange))){
            return returnDefinition(document, wordRange);
        }
        else{
            return [];
        }
});
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
