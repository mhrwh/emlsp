import {
    Position,
	Range,
	Diagnostic,
    URI
} from 'vscode-languageserver/node';
import * as fs from "fs";
import * as readline from "readline";
import * as path from 'path';
import { queryMizarMsg, connection } from './server';

/**
 * @brief Problemsにクリックできるエラーメッセージを追加する関数
 * @param fileName verifierを実行したmizarのファイル名
 * @param uri verifierを実行したmizarファイルのURI
 * @param diagnosticCollection diagnosticsをセットするための引数
 */
export function setDiagnostics(
    fileName:string, 
    uri:URI, 
    //diagnosticCollection:vscode.DiagnosticCollection
)
{
    const directory = path.dirname(fileName);
    //拡張子を除いたファイル名だけを取得
    const name = path.basename(fileName, path.extname(fileName));
    //.errファイルを1行ずつ読み込むための準備
    const errFile = path.join(directory,name+".err");
    const stream = fs.createReadStream(errFile, "utf-8");
    const reader = readline.createInterface({ input:stream });
    const diagnostics: Diagnostic[] = [];
    //.errファイルの例：
    // 左から順に「エラーの行」「左からの文字数」「エラーの種類」を表す番号となっている
    //test.err : 36 1 201
    //           88 29 144
    //.errファイルを1行ずつ読み込み、lineに格納
    reader.on("line", (line:string) => {
        const [errorLine, errorColumn, errorNumber] 
            = line.split(' ').map(str => parseInt(str, 10));
        const errorPosition: Position = {line: errorLine-1, character: errorColumn-1};
        const errorRange: Range = {"start": errorPosition, "end": errorPosition};
        const diagnostic: Diagnostic = Diagnostic.create(
			errorRange,
			queryMizarMsg(errorNumber)
		);
        diagnostics.push(diagnostic);
    }).on('close', () => {
        connection.sendDiagnostics({ uri, diagnostics });
    });
}