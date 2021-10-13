import {
	MarkupContent,
	MarkupKind,
	Position
} from 'vscode-languageserver/node';

import {
	Range,
	TextDocument,
} from 'vscode-languageserver-textdocument';

export function returnHover(
	document: TextDocument,
	wordRange: Range
): MarkupContent
{
	const documentText = document.getText();
	const hoveredWord = document.getText(wordRange);
	// ホバーによって示されるテキストの開始・終了インデックスを格納する変数
	let startIndex = -1;
	let endIndex = -1;
	// 定義・定理・ラベルの参照する箇所のパターンをそれぞれ格納
	const definitionPattern = ":" + hoveredWord + ":";
	const theoremPattern = "theorem " + hoveredWord + ":";
	const labelPattern = hoveredWord + ":";

	// 定義を参照する場合
	if ( (startIndex = documentText.indexOf(definitionPattern)) > -1 ){
		startIndex = documentText.lastIndexOf('definition', startIndex);
		endIndex = startIndex
				+ documentText.slice(startIndex).search(/\send\s*;/g)
				+ '\nend;'.length;
	}
	// 定理を参照する場合
	else if ( (startIndex = documentText.indexOf(theoremPattern)) > -1 ){
		endIndex = startIndex 
				+ documentText.slice(startIndex).search(/(\sproof|;)/g)
				+ '\n'.length;
	}
	// ラベルを参照する場合
	else if ( (startIndex = documentText.lastIndexOf(labelPattern, 
								document.offsetAt(wordRange.start)-1)) > -1)
	{
		endIndex = startIndex 
				+ documentText.slice(startIndex).search(/;/)
				+ ';'.length;
	}
	// ホバー対象でない場合
	else{
		return{
			kind: MarkupKind.PlainText,
			value: ""
		};
	}
	const contents: MarkupContent = {
		kind: MarkupKind.PlainText,
		value: documentText.slice(startIndex,endIndex)
	};	
	
	return contents;
}

// function returnMMLHover(
//     document: TextDocument,
//     wordRange: Range
// )


export function getWordRange(
	document: TextDocument,
    position: Position
): Range | undefined
{
	// ホバーしている一行のテキスト
	const text = document.getText({
		"start": { "line": position.line, "character": 0 },
		"end": { "line": position.line, "character": 100 }
	});
	// by以降を正規表現で取得
	const found = /(by\s+(\w+(,|\s|:)*)+|from\s+\w+(:sch\s+\d+)*\((\w+,*)+\))/g.exec(text);
	let wordRange: Range;

	if (found){
		const index = found.index;
		const regex = /\w+:def\s+\d+|\w+:\s*\d+|\w+:sch\s+\d+|\w+/g;
		let result;
		// 正規表現で一単語ずつ取得しマウスのポジションにある単語のwordRangeを返す
		while (result = regex.exec(found[0])) {
			if(position.character < index+regex.lastIndex){
				wordRange = {
					"start": { "line": position.line, "character": index+result.index },
					"end": { "line": position.line, "character": index+regex.lastIndex }
				};
				return wordRange;
			}
		}
	}
}