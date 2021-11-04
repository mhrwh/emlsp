import {
    Definition
} from 'vscode-languageserver/node';

import {
    Range,
    TextDocument,
} from 'vscode-languageserver-textdocument';

import * as path from 'path';
import * as fs from 'fs';
import { URI } from 'vscode-uri';

const Abstr = "abstr";
const mizfiles = process.env.MIZFILES;

export function returnDefinition(
    document: TextDocument,
    wordRange: Range
): Definition
{
    const documentText = document.getText();
    const selectedWord = document.getText(wordRange);
    // 定義箇所のインデックスを格納する変数
    let startIndex = 0;
    let endIndex = 0;
    // 定義・定理・ラベルの参照する箇所のパターンをそれぞれ格納
    const definitionPattern = ":" + selectedWord + ":";
    const theoremPattern = "theorem " + selectedWord + ":";
    const labelPattern = selectedWord + ":";

    // 定義を参照する場合
    if ((startIndex = documentText.indexOf(definitionPattern)) > -1){
        endIndex = startIndex + definitionPattern.length;
    }
    // 定理を参照する場合
    else if ((startIndex = documentText.indexOf(theoremPattern)) > -1){
        endIndex = startIndex + theoremPattern.length;
    }
    // ラベルを参照する場合
    else if ((startIndex = documentText.lastIndexOf(labelPattern, 
            document.offsetAt(wordRange.start)-1)) > -1){
        endIndex = startIndex + labelPattern.length;
    }
    return {
        uri: document.uri,
        range: {
            start: document.positionAt(startIndex),
            end: document.positionAt(endIndex)
        }
    };
}

export function returnABSDefinition(
    document: TextDocument,
    wordRange: Range
): Promise<Definition>
{
    if (mizfiles === undefined){
        return new Promise((resolve, reject) => {
            reject(
                new Error('You have to set environment variable "MIZFILES"')
            );
        });
    }
    const absDir = path.join(mizfiles, Abstr);
    const definition: Promise<Definition> = new Promise
    ((resolve, reject) => {
        const selectedWord = document.getText(wordRange);
        let [fileName] = selectedWord.split(':');
        // .absのファイルを絶対パスで格納
        fileName = path.join(absDir,fileName.toLowerCase() + '.abs');
        // 定義を参照するドキュメントから，定義箇所を指定して返す
        fs.readFile(fileName, "utf-8", (err, documentText) => {
            if (err){
                reject(err);
            }
            const uri = URI.file(fileName).toString();  
            const document = TextDocument.create(uri, "Mizar", 1, documentText);          
            const index = documentText.indexOf(selectedWord);
            resolve({
                uri,
                range: {
                    start: document.positionAt(index),
                    end: document.positionAt(index + selectedWord.length)
                }
            });
        });
    });
    return definition;
}
