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
    Definition,
    ExecuteCommandParams,
    URI
} from 'vscode-languageserver/node';

import {
    TextDocument
} from 'vscode-languageserver-textdocument';
import { mizar_verify, mizfiles } from './mizarFunctions';
import { makeQueryFunction } from './mizarMessages';
import { setDiagnostics } from './displayErrors';
import { 
    getWordRange, 
    returnHover,
    returnMMLHover 
} from './hover';

import { 
    returnDefinition,
	returnABSDefinition
} from './goToDefinition';
import * as path from 'path';
import * as cp from 'child_process';

export const queryMizarMsg = makeQueryFunction();
// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
export const connection = createConnection(ProposedFeatures.all);

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
            executeCommandProvider: {
                commands: [
                    MIZAR_COMMANDS.mizar_verify,
                    //MIZAR_COMMANDS.mizar_verify2,
                    MIZAR_COMMANDS.mizar_irrths,
                    MIZAR_COMMANDS.mizar_relinfer,
                    MIZAR_COMMANDS.mizar_trivdemo,
                    MIZAR_COMMANDS.mizar_reliters,
                    MIZAR_COMMANDS.mizar_relprem,
                    MIZAR_COMMANDS.mizar_irrvoc,
                    MIZAR_COMMANDS.mizar_inacc,
                    MIZAR_COMMANDS.mizar_chklab,
                    MIZAR_COMMANDS.stop_command
                ]
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

async function executeCommand(
    fileName: string,
    uri: URI,
    runningCmd: {process: cp.ChildProcess | null},
    //diagnosticCollection:vscode.DiagnosticCollection, 
    command:string,
    //isVerify2:boolean=false
)
{
    //アクティブなエディタがなければエラーを示して終了
    // if (vscode.window.activeTextEditor === undefined){
    //     vscode.window.showErrorMessage('Not currently in .miz file!!');
    //     return;
    // }
    //拡張子を確認し、mizarファイルでなければエラーを示して終了
    if (path.extname(fileName) !== '.miz'){
        showMessage(1, 'Not currently in .miz file!!');
        return;
    }
    //環境変数MIZFILESが未定義ならエラーメッセージを表示
    if (mizfiles === undefined){
        showMessage(1, 'You have to set environment variable "MIZFILES"');
        return;
    }
    //既に実行中のコマンドがある場合
    if (runningCmd['process']){
        return;
    }
    //channel.clear();
    //channel.show(true);
    //コマンド実行前にファイルを保存
    
    //await vscode.window.activeTextEditor.document.save();
    //makeenvとverifierの実行
    let result = null;
    const prevCwd = process.cwd();
    try {
        //dict,prelを読み込むため、カレントディレクトリを対象ファイルの1つ上へ変更
        process.chdir(path.join( path.dirname(fileName), '..') );
        result = await mizar_verify(fileName, command, runningCmd);
    } finally {
        process.chdir(prevCwd);
    }
        // NOTE:判定ミスは致命的なため「success」と判定された場合でも，
        //      最も確実に判定できる「.err」ファイルをチェックすべき
        setDiagnostics(fileName, uri);
}


const MIZAR_COMMANDS = {
    mizar_verify: "verifier",
    //mizar_verify2: "verifier",
    mizar_irrths: "irrths",
    mizar_relinfer: "relinfer",
    mizar_trivdemo: "trivdemo",
    mizar_reliters: "reliters",
    mizar_relprem: "relprem",
    mizar_irrvoc: "irrvoc",
    mizar_inacc: "inacc",
    mizar_chklab: "chklab",
    stop_command: "stop-command"
};

const runningCmd: {process: cp.ChildProcess | null} = {process: null};

connection.onExecuteCommand( async (arg: ExecuteCommandParams) => {
    if (arg.command === MIZAR_COMMANDS.mizar_verify && arg.arguments) {
        const fileName = arg.arguments[0].fsPath as string;
        const uri = arg.arguments[0].external as URI;
        await executeCommand(fileName, uri, runningCmd, arg.command);
    }else if (arg.command === MIZAR_COMMANDS.mizar_irrths && arg.arguments) {
        const fileName = arg.arguments[0].fsPath as string;
        const uri = arg.arguments[0].external as URI;
        await executeCommand(fileName, uri, runningCmd, arg.command);
    }else if (arg.command === MIZAR_COMMANDS.mizar_relinfer && arg.arguments) {
        const fileName = arg.arguments[0].fsPath as string;
        const uri = arg.arguments[0].external as URI;
        await executeCommand(fileName, uri, runningCmd, arg.command);
    }else if (arg.command === MIZAR_COMMANDS.mizar_trivdemo && arg.arguments) {
        const fileName = arg.arguments[0].fsPath as string;
        const uri = arg.arguments[0].external as URI;
        await executeCommand(fileName, uri, runningCmd, arg.command);
    }else if (arg.command === MIZAR_COMMANDS.mizar_reliters && arg.arguments) {
        const fileName = arg.arguments[0].fsPath as string;
        const uri = arg.arguments[0].external as URI;
        await executeCommand(fileName, uri, runningCmd, arg.command);
    }else if (arg.command === MIZAR_COMMANDS.mizar_relprem && arg.arguments) {
        const fileName = arg.arguments[0].fsPath as string;
        const uri = arg.arguments[0].external as URI;
        await executeCommand(fileName, uri, runningCmd, arg.command);
    }else if (arg.command === MIZAR_COMMANDS.mizar_irrvoc && arg.arguments) {
        const fileName = arg.arguments[0].fsPath as string;
        const uri = arg.arguments[0].external as URI;
        await executeCommand(fileName, uri, runningCmd, arg.command);
    }else if (arg.command === MIZAR_COMMANDS.mizar_inacc && arg.arguments) {
        const fileName = arg.arguments[0].fsPath as string;
        const uri = arg.arguments[0].external as URI;
        await executeCommand(fileName, uri, runningCmd, arg.command);
    }else if (arg.command === MIZAR_COMMANDS.mizar_chklab && arg.arguments) {
        const fileName = arg.arguments[0].fsPath as string;
        const uri = arg.arguments[0].external as URI;
        await executeCommand(fileName, uri, runningCmd, arg.command);
    }else if (arg.command === MIZAR_COMMANDS.stop_command && arg.arguments) {
        if (runningCmd['process'] === null){
            return;
        }
        runningCmd['process'].kill('SIGINT');
        showMessage(3, 'Command stopped!');
    }
});

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
