const reg = require('./reg');

const kurumizawa = /(kurumizawa|胡桃沢)?\s*/;
const satania = /(satan(i|y|ichi)a|Сатании|サタニキア|サターニャ|사타냐|萨塔妮娅)\s*-?/;
const mcdowell = /(mcdowellu?|マクドウェル)?\s*/;
const honorifics = /(sama|san|chan|senpai|さま|様|さん|ちゃん|せんぱい|先輩)?\s*/;
const extra = /[!！¡﹗︕‼¿？⁉﹖︖⁈⁇?~˜～〜]*/;
const sataniaName = reg`${kurumizawa}${satania}${mcdowell}${honorifics}`;

module.exports = {
	kurumizawa,
	satania,
	mcdowell,
	honorifics,
	extra,
	sataniaName
};
