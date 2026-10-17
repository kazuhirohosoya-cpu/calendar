/* ===================================================================
 * # 予定の設定
 *
 * ------------------------------------------------------------------- */
const DB_NAME = '#CALENDOR';
const VERSION = 1;
const OBJ_STORE_PARAMETER = '#PARAMETER';
const OBJ_STORE_INCIDENT = '#INCIDENT';
/*
window.indexedDB.deleteDatabase('#CALENDOR');
*/
/* ===================================================================
 * # ユーザ・カスタマイズ スタイル設定
 *
 * ※この設定は初回起動時にのみ使用されます。
 * 設定値はIndexedDBに永続的に保存されるため、次回以降も同じ設定で
 * 表示されます。設定はモーダルウィンドウからいつでも変更可能です。
 * 削除する場合：
 * IndexedDBに保存されたデータを削除するには、開発ツールを開き、
 * ストレージ内のIndexedDBから直接削除するか、コンソールで
 *  window.indexedDB.deleteDatabase('#CALENDOR');
 * のコマンドを実行します。

 * ------------------------------------------------------------------- */
// パラメータの設定は navigation Menu の操作で行う
var	__PARAMETER__ = (typeof ___PARAMETER___ !== "undefined") ? ___PARAMETER___ : {};
function setDefaultParameter(parameter) {
	function isObject(value) {
		return value !== null && !Array.isArray(value) && typeof value === "object";
	}
	if(! isObject(__PARAMETER__)) {
		__PARAMETER__ = {};
	}
	if(isObject(parameter)) {
		__PARAMETER__ = Object.assign(__PARAMETER__, parameter);
	}
}
function getDefaultParameter(keyPath) {
	var parameter = {
		// パラメータのデフォルト値
		//	※ デフォルト値はカレンダー起動時の初期値です
		country : keyPath,								// IndexedDBのkeyPath。calendar.localのcountryと同じにします。
		// creatCalendar()のパラメータ
		background_select_slide: 'JP',					// 背景スライドショーのデータカテゴリー
		background_slide_show_interval: 30 * 1000,		// 背景スライドショーの間隔(ms) (background_select_slide:'-'以外のとき有効) ※MAX:const MAX_TIMEOUT_MS = Math.floor((Math.pow(2, 31) - 1) / 1000); // 2147483647/1000
		dark_mode: true,								// ダークモード：true:ON、false:OFF
		background_opacity_range: 0.5,					// 背景の透過度： 0～1
		latin_font : "Helvetica",						// 欧文フォント
		japanese_font : "Kosugi-Maru",					// 和文フォント
		moon_hidden: true,								// 月齢：true:非表示、false:表示
		holiday_name_hidden: false,						// 祝日名：true:非表示、false:表示
		fest_name_hidden: false,						// 祭日名：true:非表示、false:表示
		schedule_name_hidden: false,					// 予定名：true:非表示、false:表示
		tips_disp: true,								// 日付の吹き出し表示：true:表示、false:非表示
		monday_start: false,							// 月曜日始まり：true:月曜日始まり(ISO 8601)、false:日曜日始まり
		saturday_coloring: true,						// 土曜日色付け：true:土曜日色付けする、false:土曜日色付けしない
		large_time_format: "hh:mm:ss",					// 大きな時刻の表示形式
		small_time_format: "hh:mm:ss",					// 小さな時刻の表示形式
	//	calendar:
	//	calcXX: typeof Calendar.CalcJP === 'undefined' ? undefined : new Calendar.CalcJP(),		//※「予定の設定」の後にする必要があるため、Parameter は「予定の設定」後のここに配置。（Calendar.CalcJPのコンストラクタで「予定の設定」を取り込みます。）
														// 国別カレンダー情報：
														//	CalcJP:日本
														//	CalcGB_ENG:イギリス-イングランド地方
														//	CalcGB_NIR:イギリス-北アイルランド地方
														//	CalcGB_SCT:イギリス-スコットランド地方
														//	CalcGB_WLS:イギリス-ウェールズ地方
														//	CalcUS:アメリカ-州共通
														//	CalcUS_DC:アメリカ-コロンビア特別区
														//	CalcUS_OH:アメリカ-オハイオ州
														//	CalcUS_WA:アメリカ-ワシントン州
														//	CalcUS_CO:アメリカ-コロラド州
														//	CalcUS_ID:アメリカ-アイダホ州
														//	CalcUS_HI:アメリカ-ハワイ州
		// creatCalendar()以外で使う
		__time_format_apply: false,						//	時刻の表示形式適用(false:未、true:済)(※内部動作のフラグ。設定しても効果はない)
		__big_time: false,								//	時計のサイズ(ture:大きく表示、false:小さく表示)(※起動時のみ効果)
		__calendar_row: 1,								//	複数の1か月カレンダーを表示するとき１か月カレンダーの行数
		__calendar_column: 2							//	複数の1か月カレンダーを表示するとき１か月カレンダーの列数
	};
	if(keyPath == "US") {
		parameter.background_select_slide = 'US';
		parameter.monday_start = false;
		parameter.saturday_coloring = false;
	} else
	if(keyPath == "GB") {
		parameter.background_select_slide = 'GB';
		parameter.monday_start = true;
		parameter.saturday_coloring = false;
	}
	// ユーザに設定されたパラーメータを優先して採用
	parameter = Object.assign(parameter, __PARAMETER__);
	return parameter;
}
var Parameter = getDefaultParameter("JP");
var GlovalParameterLoadPromise = new Promise( (resolve) => {
	// 【Parameter復元】
	(async () => {
		try {
			await idbSchema(DB_NAME, VERSION, db => {
				db.createObjectStore(OBJ_STORE_PARAMETER, { keyPath: "country" });
				db.createObjectStore(OBJ_STORE_INCIDENT, { keyPath: "detail" });
			});
			var idbDt = await idbGet(DB_NAME, OBJ_STORE_PARAMETER, Parameter.country);
			if(idbDt) {
				// ※ ネイティブコードで実装されたcalendarはIndexedDBに保存できないため、calendar を削除します
				//    起動時にIndexedDBから読み込んだとき、再度 インスタンスを生成します。
				Parameter = Object.assign({}, idbDt);
				Parameter.calendar = new Calendar.Date({locale_key: Calendar.Date.LocaleKeyEnum.JP}).round({smallestUnit: 'day', roundingMode: 'trunc'});
			}else{
				if(! Parameter.calendar) {
					Parameter.calendar = new Calendar.Date({locale_key: Calendar.Date.LocaleKeyEnum.JP}).round({smallestUnit: 'day', roundingMode: 'trunc'});
				}
			}
			Parameter.country = Parameter.calendar.local.getCountry();
			resolve();
		} catch (e) {
			console.error("ユーザ・カスタマイズ スタイル設定読み込み :\n", e);
		}
	})();
});

//GlovalParameterLoadPromise.then( () => {
//	idbPut(DB_NAME, OBJ_STORE_INCIDENT, { incident: "Event", detail: `${decodeURI(window.location.pathname).split('/').pop()}が起動しました。` });
//});
