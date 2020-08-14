const reg = require('./reg');

const kurumizawa = /(kurumizawa|胡桃沢)?\s*/;
const satania = /(satan(i|y|ichi)a|Сатании|サタニキア|サターニャ)\s*-?/;
const mcdowell = /(mcdowellu?|マクドウェル)?\s*/;
const honorifics = /(sama|san|chan|senpai|さま|様|さん|ちゃん|せんぱい|先輩)?\s*/;
const extra = /(!+|！+|¡+|﹗+|︕+|‼+|¿+|？+|⁉+|﹖+|︖+|⁈+|⁇+|\?+|~+|˜+|～+|〜+)?/;
const sataniaName = reg`${kurumizawa}${satania}${mcdowell}${honorifics}`;

module.exports = {
	kurumizawa: kurumizawa,
	satania: satania,
	mcdowell: mcdowell,
	honorifics: honorifics,
	extra: extra,
	sataniaName: sataniaName
};
