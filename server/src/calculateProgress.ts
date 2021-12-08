
// プログレスバーとして出力する「#」の最大数
export const MAX_OUTPUT = 50;

/**
 * @fn
 * 解析された行数から，プログレスの差分を計算する関数
 * @param numberOfArticleLines 証明部の行数
 * @param numberOfEnvironmentalLines 環境部の行数
 * @param numberOfParsedLines 解析済みの行数
 * @param numberOfProgress プログレス（更新前の「#」の数）
 * @return プログレスの差分
 */
export function calculateProgressDiff(
    numberOfArticleLines:number,
    numberOfEnvironmentalLines:number, 
    numberOfParsedLines:number,
    numberOfProgress:number):number
{
    // 現在の進度と、出力のバーの差を計算する
    let progressDiff = (numberOfParsedLines - numberOfEnvironmentalLines) 
    / numberOfArticleLines * MAX_OUTPUT - numberOfProgress;
    // Checker  [1204]
    // Checker  [1192]
    // Checker  [1192]
    // Checker  [1192]
    // Checker  [1204]
    // NOTE:上記のようにコマンドが出力する解析行数が減る場合があり，
    //      Diffがマイナスになってしまう時があるため，以下の処理を追加
    if (progressDiff < 0){
        progressDiff = 0;
    }
    // 出力できる最大数はMAX_OUTPUTなので，それを超えないように設定
    if (numberOfProgress + Math.floor(progressDiff) > MAX_OUTPUT){
        progressDiff = MAX_OUTPUT - numberOfProgress;
    }
    return Math.floor(progressDiff);
}
