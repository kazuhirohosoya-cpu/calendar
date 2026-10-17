/**
 * Calendar Modal Dialog Script 2.1.0
 * Copyright 2022-2026 Kazuhiro Hosoya
 * Released under the MIT License
 * Released on: 2026-01-01
 */
/* ======================================================================
	Calendar/menu-00_Class.js
   ====================================================================== */

/* ===================================================================
 * # CSS global custom property settings FUNCTION
 *
 * ------------------------------------------------------------------- */
/**
 * CSSグローバルカスタムプロパティの取得・設定
 * @param {string} name - プロパティ名
 * @param {string} [value] - 設定する値（省略時は取得）
 * @return {float/string} [value] - 取得した値。
 * 取得した値にpx単位のcalc()計算式を含む場合計算結果を返します。
 * :root {
 *	 --main-bg-color: brown;
 * }
 * 取得:
 *	 val = cssroot("--main-bg-color");
 * 設定:
 *	 val = cssroot("--main-bg-color", "rgb(34,139,34)");
 */
function cssroot(name, value) {
	if (value) document.documentElement.style.setProperty(name, value);
	var result = getComputedStyle(document.documentElement).getPropertyValue(name);
	try {
		var exp = result.match("[\\d](px){0,1}[\\s]*[\\+\\-\\*/][\\s]*[\\d](px){0,1}");
		var url = result.match("http");
		if (exp && !url) {
			// 演算が含まれる場合、evalで演算実行
			result = eval(String(result).replace(/(calc|px)/g, ""));
		}
	} catch (e) {
		console.error(`CSSグローバルカスタムプロパティの取得・設定(cssroot) name=[${name}] result=[${result}]\n  ${e}`);
	}
	return result;
}
/////**
//// * CSS変数の取得・設定
//// * @param {string} name - プロパティ名
//// * @param {string} [value] - 設定値
//// */
////function cssroot(name, value) {
////	const root = document.documentElement;
////	if (value !== undefined) {
////		root.style.setProperty(name, value);
////	}
////	let result = getComputedStyle(root).getPropertyValue(name).trim();
////	// calcが含まれる場合の簡易計算処理 (evalを避け、安全な数値抽出で対応)
////	if (result.includes('calc')) {
////		try {
////			const expression = result.replace(/[^\d.+\-*/]/g, '');
////			result = new Function(`return ${expression}`)();
////		} catch (e) {
////			console.error(`CSS Variable Error [${name}]: ${e}`);
////		}
////	}
////	return result;
////}

/* ===================================================================
 * # GENERAL PURPOSE FUNCTION
 * ------------------------------------------------------------------- */
class CalenderGeneral {
	/**
	 * 点の要素内外判定
	 * elementの矩形内に座標(xy)が含まれるかを判定します
	 */
	static isPointInElement([x, y], element) {
		if (!element) return false;
		try {
			const rect = element.getBoundingClientRect();
			// スクロール量を考慮した座標判定
			const pageX = x - window.scrollX;
			const pageY = y - window.scrollY;
			return (pageX >= rect.left && pageX <= rect.right && pageY >= rect.top && pageY <= rect.bottom);
		} catch (e) {
			console.error("isPointInElement error:", e);
			return false;
		}
	}
	/**
	 * イベント委譲 (Event Delegation)
	 * bodyに対してイベントを設定し、targetSelectorに合致する要素で発生した場合のみ実行します
	 */
	static delegate(targetSelector, type, listener) {
		document.body.addEventListener(type, (event) => {
			// クリックされた要素、またはその親要素がtargetSelectorに一致するか判定
			const targetElement = event.target.closest(targetSelector);
			if (targetElement) {
				// aタグなどのデフォルト動作を抑制する場合はここ
				// event.preventDefault(); 
				// listener内のthisをtargetElementに固定して実行
				listener.call(targetElement, event, targetElement);
			}
		});
	}
}
/* ======================================================================
	Calendar/menu-01-backgroundImage.js
   ====================================================================== */

/* -------------------------------------------------------------------
 * documentElementのクラスを切り替える汎用関数
 * ------------------------------------------------------------------- */
function toggleDocumentClass(className, isEnabled) {
	document.documentElement.classList.toggle(className, !!isEnabled);
}

/* -------------------------------------------------------------------
 * ダークモード切換え
 * ------------------------------------------------------------------- */
const darkmodeSwitch = (isDark) => {
	cssroot("--hq-calendar-color-general", isDark ? "#fff" : "#000");
	toggleDocumentClass('dark-mode', isDark);
};

/* -------------------------------------------------------------------
 * 背景の透過度切換え
 * ------------------------------------------------------------------- */
const backgroundOpacityRange = (range) => {
	// CSS変数への反映とラベル更新
	cssroot("--hq-calendar-background-opacity", range);

	// モーダルダイアログのコントロールの設定
	const modalContainer_rangeControl = document.querySelector("#input-background-opacity-range");
	if(modalContainer_rangeControl) {
		modalContainer_rangeControl.value = range;
	}
	const modalContainer_rangeValue = document.querySelector("#opacity-range-value");
	if(modalContainer_rangeValue) {
		modalContainer_rangeValue.textContent = range;
	}
};

/* -------------------------------------------------------------------
 * 背景画像切換え
 * ------------------------------------------------------------------- */
const backgroundImageSwitch = (hasImg) => toggleDocumentClass('back-img', hasImg);

/* -------------------------------------------------------------------
 * スライドショーデータ更新
 * ※毎月1日に、その月のイメージに沿ったスライドショー
 *	データへglobalSlideShowCurrentMonthArrayを更新します。
 * ------------------------------------------------------------------- */
var globalSlideShowCurrentMonthArray = [];
let slideShowCategoryFilteredArray = [];
let remakeTimerId = null;

function dailySlideShowCategoryFilter() {
	const {
		calendar,
		background_select_slide
	} = Parameter;
	const currentMonth = calendar.Now.month;
	//-----------------------------------------------------
	// 1. 月でフィルタリング
	//-----------------------------------------------------
	globalSlideShowCurrentMonthArray = (__GlovalSlideShowArray || []).filter(item => item.effectiveMonth.includes(currentMonth));
	//-----------------------------------------------------
	// 2. カテゴリーでフィルタリング
	//-----------------------------------------------------
	if (background_select_slide === "-") {
		slideShowCategoryFilteredArray.length = 0;
	} else
	if (background_select_slide.toUpperCase() === "ALL") {
		slideShowCategoryFilteredArray = [...globalSlideShowCurrentMonthArray];
	} else {
		const reg = new RegExp(background_select_slide);
		slideShowCategoryFilteredArray = globalSlideShowCurrentMonthArray.filter(item => item.category.join(',').match(reg));
	}
	//-----------------------------------------------------
	// 3. 次回更新タイマー設定 (最大10日制限を考慮)
	//-----------------------------------------------------
	// 翌月になったら、再度GlovalSlideShowCurrentMonthArrayを作り直すため、タイマーを設定
	// ※JavaScriptのsetTimeoutの最大制限時間は約24.8日(2^31-1)を超える値を指定すると、
	//   整数オーバーフローが発生し、予期しない動作を引き起こします。
	//   そのため、10日を上限としてタイマーを設定します。
	const now = calendar.Now;
	const nextUpdate = calendar.Now.round({
		smallestUnit: 'day',
		roundingMode: 'trunc'
	});
	nextUpdate.day = 1;
	nextUpdate.month += 1;
	const MS_PER_DAY = 24 * 60 * 60 * 1000;
	let timeUntilNext = Math.min(nextUpdate.valueOf() - now.valueOf(), 10 * MS_PER_DAY);
	if (timeUntilNext < MS_PER_DAY) timeUntilNext += 60000; // 1分余裕を持たせる
	clearTimeout(remakeTimerId);
	remakeTimerId = setTimeout(dailySlideShowCategoryFilter, timeUntilNext);
}
/* -------------------------------------------------------------------
 * スライドショーの切り替え実行
 * ------------------------------------------------------------------- */
let slideSwitchTimerId = null;

function nextSlideShowSwitchBackgroundImage() {
	clearTimeout(slideSwitchTimerId);
	const {
		background_select_slide,
		background_slide_show_interval,
		background_opacity_range,
		dark_mode
	} = Parameter;
	// 切り替え不要な場合の処理
	if (background_select_slide === "-" || !background_slide_show_interval || !slideShowCategoryFilteredArray.length) {
		// CSS変数への反映とラベル更新
		backgroundOpacityRange(parseFloat(background_opacity_range));
		darkmodeSwitch(dark_mode);
	//	backgroundImageSwitch(background_select_slide !== "-");
		backgroundImageSwitch(false);
		return;
	}
	// ランダムにインデックスを選択
	const index = Math.floor(Math.random() * slideShowCategoryFilteredArray.length);
	const selected = slideShowCategoryFilteredArray[index];
	// CSSプロパティの反映
	cssroot("--hq-calendar-color-general", selected.color);
	cssroot("--hq-calendar-background-image", `url(${selected.url})`);
	// CSS変数への反映とラベル更新
	backgroundOpacityRange(selected.opacity);
	darkmodeSwitch(selected.darkMode);
	backgroundImageSwitch(true);
	// 画像の存在チェック
	checkImageExists(selected.url);
	// 次回実行予約
	slideSwitchTimerId = setTimeout(nextSlideShowSwitchBackgroundImage, background_slide_show_interval);
}
/**
 * 画像の読み込み確認
 */
function checkImageExists(url) {
	const img = new Image();
	img.onload = () => {
		img.onload = img.onerror = null;
	};
	img.onerror = () => {
		console.error(`Failed to load background image: ${url}`);
		if (typeof idbPut === 'function') {
			idbPut(DB_NAME, OBJ_STORE_INCIDENT, {
				incident: "Invalid URL",
				detail: url
			});
		}
		img.onload = img.onerror = null;
	};
	img.src = url;
}


(function() {

	'use strict';

	/* -------------------------------------------------------------------
	/* -------------------------------------------------------------------
	 * # プリローダー（preloader）
	 * プリローダーの「ローダー（読み込みインジケーター）」のデザインやアニメーション要素
	 *
	 * -------------------------------------------------------------------
	 * - markup:
	 *
	 * <div id="preloader">
	 *     <div id="loader" class="dots-fade">
	 *         <div></div>
	 *         <div></div>
	 *         <div></div>
	 *     </div>
	 * </div>
	 *
	 * - loader class:
	 * <dots-fade | dots-pulse>
	 *
	 * -------------------------------------------------- */
	document.documentElement.classList.add('ss-preload');
	const ssPreloader = function() {
		const siteBody = document.body;
		const preloader = document.querySelector('#preloader');
		if (!preloader) return;
		let timeoutExtension = preloader.dataset.timeoutExtension || "0";
		timeoutExtension = parseInt(timeoutExtension);
		setTimeout(() => {
			document.documentElement.classList.remove('ss-preload');
			document.documentElement.classList.add('ss-loaded');
			preloader.addEventListener('transitionend', function afterTransition(e) {
				if (e.target.matches('#preloader')) {
						siteBody.classList.add('ss-show');
						e.target.style.display = 'none';
						preloader.removeEventListener(e.type, afterTransition);
				}
			});
		}, timeoutExtension);
	}; // end ssPreloader

	/* -------------------------------------------------------------------
	 * Background Image
	 *  背景要素の生成
	 *	┌─────────┐
	 *	│					│
	 *	│	   イメージ		│
	 *	│					│
	 *	└─────────┘
	 * <div class="l-body-background-img m-bkimg"></div> を作成しbodyに追加
	 * ------------------------------------------------------------------- */
	const initBackgroundImage = () => {
		const div = document.createElement('div');
		div.classList.add("l-body-background-img", "m-bkimg");
		document.body.appendChild(div);
	};

   /* Initialize
	* ------------------------------------------------------ */
	const init = () => {

		// プリローダー（preloader）
		ssPreloader();

		// モード切り替え
		darkmodeSwitch(Parameter.dark_mode);
		backgroundImageSwitch(Parameter.background_select_slide !== "-");
		// 背景生成
		initBackgroundImage();
		// スライドショーのフィルタリング開始
		dailySlideShowCategoryFilter();
	};
	/**
	 * パラメータロード完了後の実行制御
	 */
	if (typeof GlovalParameterLoadPromise !== 'undefined') {
		GlovalParameterLoadPromise.then(() => {
			if (document.readyState === 'complete') {
				init();
			} else {
				window.addEventListener('load', init, {
					once: true
				});
			}
		});
	}
})();

/* ======================================================================
	Calendar/menu-02-SettingsTrigger_Overlay.js
   ====================================================================== */

(function() {

	'use strict';

	/* -------------------------------------------------------------------
	 * Settings Trigger & Overlay
	 *  オーバーレイ背景作成
	 *	┌─────────────────────┐
	 *	│ _,-._	←設定トリガー					│
	 *	│/  _  \									│
	 *	│> (_) <	┌───────────┐		│
	 *	│\_   _/	│						│		│
	 *	│  `-'		│						│		│
	 *	│			│		モーダル		│		│
	 *	│			│		コンテンツ		│		│
	 *	│			│						│		│
	 *	│			│						│		│
	 *	│			└───────────┘		│
	 *	│											│
	 *	└─────────────────────┘
	 * ------------------------------------------------------------------- */

	// 設定定数
	const CONFIG = {
		BIAS_SIZE: 100,
		HIDE_DELAY: 500,
		TOUCH_HIDE_DELAY: 2000
	};
	/**
	 * UI要素（トリガーとオーバーレイ）の生成
	 */
	function createUI() {
		const html = `
			<button class="settings-trigger active" id="openModal" title="設定">
				<svg viewBox="0 0 24 24">
					<path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.13,5.91,7.62,6.29L5.23,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.72,8.87 c-0.11,0.2-0.06,0.47,0.12,0.61l2.03,1.58C4.84,11.36,4.82,11.68,4.82,12c0,0.32,0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.5c-1.93,0-3.5-1.57-3.5-3.5 s1.57-3.5,3.5-3.5s3.5,1.57,3.5,3.5S13.93,15.5,12,15.5z" />
				</svg>
			</button>
			<div class="modal-overlay" id="modalOverlay"></div>
		`;
		document.body.insertAdjacentHTML('beforeend', html);
		setupEventListeners();
	}

	/* -------------------------------------------------------------------
	 * イベントリスナーの登録
	 * # Setting Trigger
	 *		 _,-._
	 *		/  _  \
	 *		> (_) <
	 *		\_   _/
	 *		  `-'
	 *-----------------------------------------------------
	 *	設定アイコン の表示制御
	 *	最初はアイコンを表示していて、2秒後に隠す。
	 *	アイコンの高さの領域へマウスを動かすと、メニューが表示される。
	 * ------------------------------------------------------------------- */
	function setupEventListeners() {
		const trigger = document.querySelector("#openModal");
		const overlay = document.querySelector("#modalOverlay");
		let timerId = null;
		// --- 設定アイコンの表示制御 (マウス移動) ---
		window.addEventListener('mousemove', (e) => {
			if (e.clientX < CONFIG.BIAS_SIZE || e.clientY < CONFIG.BIAS_SIZE) {
				trigger.classList.add('active');
				clearTimeout(timerId);
				timerId = null;
			} else if (!timerId) {
				timerId = setTimeout(() => {
					trigger.classList.remove('active');
					timerId = null;
				}, CONFIG.HIDE_DELAY);
			}
		}, {
			passive: true
		});
		window.addEventListener('mouseout', (e) => {
			timerId = setTimeout(() => {
				trigger.classList.remove('active');
				timerId = null;
			}, CONFIG.HIDE_DELAY);
		}, {
			passive: true
		});
		// --- タッチ操作 ---
		window.addEventListener('touchstart', () => {
			trigger.classList.add('active');
			setTimeout(() => trigger.classList.remove('active'), CONFIG.TOUCH_HIDE_DELAY);
		}, {
			passive: true
		});
		// --- モーダル開閉 ---
		trigger.addEventListener('click', () => overlay.classList.add('open'));
		overlay.addEventListener('click', (e) => {
			if (e.target === overlay) {
				overlay.classList.remove('open');
				saveSettings();
			}
		});
	}
	/**
	 * パラメータの保存
	 *	【Parameter保存】
	 *	 ※	ネイティブコードで実装されたcalendarはIndexedDBに保存できないため、calendar を削除します
	 *		起動時にIndexedDBから読み込んだとき、再度 インスタンスを生成します。
	 */
	function saveSettings() {
		if (typeof Parameter === 'undefined') return;
		// 不要なプロパティを除去してディープコピー
		const saveDt = JSON.parse(JSON.stringify(Parameter));
		delete saveDt.calendar;
		// undefined プロパティの除去
		Object.keys(saveDt).forEach(key => {
			if (saveDt[key] === undefined) delete saveDt[key];
		});
		// パラメータをデータストアへ保存
		if (typeof idbPut === 'function') {
			idbPut(DB_NAME, OBJ_STORE_PARAMETER, saveDt);
		}
	}


   /* Initialize
	* ------------------------------------------------------ */
	const init = () => {

		// 重複実行防止
		if (document.querySelector('#openModal')) return;
		createUI();
	};
	/**
	 * パラメータロード完了後の実行制御
	 */
	if (typeof GlovalParameterLoadPromise !== 'undefined') {
		GlovalParameterLoadPromise.then(() => {
			if (document.readyState === 'complete') {
				init();
			} else {
				window.addEventListener('load', init, {
					once: true
				});
			}
		});
	}
})();

/* ======================================================================
	Calendar/menu-03-modalDialog.js
   ====================================================================== */

/* ===================================================================
 *  # Modal Window
 *
 *  ● 全体的な外観                                                                         ● ショートカット
 *                                                                                            過去への操作 (BACK)
 *  Monitor Layout Preview  ┌─────────────────────┐                   ┌─────────────┐
 *     ┌─┬─┬─┬─┐   │　ダークモード　　　　　　　　　　　　○　│                   │－１月　　　　　　　　　←│
 *     │　│　│　│　│   └─────────────────────┘                   ├─────────────┤
 *     ├─┼─┼─┼─┤    Opacity0.5                                                      │－１年　　　　　　　　　↑│
 *     │　│　│　│　│    ━━━━━━━━━━━◎━━━━━━━━━━                    ├─────────────┤
 *     ├─┼─┼─┼─┤   背景スライドショー          間隔 (秒)                            │－１０年 　　　[Shift]＋↑│
 *     │　│　│　│　│   ┌───────────┐┌────────┐                   ├─────────────┤
 *     └─┴─┴─┴─┘   │スライドショー選択　▼││スライド切替間隔│                   │－１００年　　　[Ctrl]＋↑│
 *         12ヶ月表示       └───────────┘└────────┘                   ├─────────────┤
 *                           欧文フォント          和文フォント                              │　　：　　　　　：　　　　│
 *                          ┌─────────┐┌─────────┐                     │　　：　　　　　：　　　　│
 *                          │　Helvetica 　　▼││　小杉丸　　　　▼│                                    :
 *                          └─────────┘└─────────┘                                    :
 *                                                                                                          :
 *  ● 表示要素の選択                                                                        未来への操作 (FORWARD)
 *      ┌────┬────┐┌─────────────┐大きな時刻の表示形式             ┌─────────────┐
 *      │　　　　│　　　　││　日付吹出しを表示　　○　│┌────────────┐     │＋１月　　　　　　　　　→│
 *      │　　　　│　　　　│└─────────────┘│　hh:mm:ss　　　　　　▼│     ├─────────────┤
 *      │　９９　│　○　　│┌─────────────┐└────────────┘     │＋１年　　　　　　　　　↓│
 *      │　　　　│　　　　││　月曜日始まり　　　　○　│小さな時刻の表示形式             ├─────────────┤
 *      │　　　　│　　　　│└─────────────┘┌────────────┐     │＋１０年 　　　[Shift]＋↓│
 *      ├────┴────┤┌─────────────┐│　hh:mm:ss　　　　　　▼│     ├─────────────┤
 *      │祝日：振替休日　　││　土曜日色付け　　　　○　│└────────────┘     │＋１００年　　　[Ctrl]＋↓│
 *      │祭日：二十四節季　│└─────────────┘                                 ├─────────────┤
 *      │　　　予定日　　　│                                                               │　　：　　　　　：　　　　│
 *      └─────────┘                                                               │　　：　　　　　：　　　　│
 *
 *  ● 国セレクション
 *
 *      ┌────┬────┬────┐
 *      │　日本　│イギリス│アメリカ│
 *      └────┴────┴────┘
 *      ┌───────┬───────┬───────┬───────┐
 *      │イングランド　│北アイルランド│スコットランド│ウェールズ　　│
 *      └───────┴───────┴───────┴───────┘
 *
 * ------------------------------------------------------------------- */

/**
 * 行列数に応じたマルチプライヤー（倍率）の一括設定
 *	(row, column)のときのcalendar-settings-multiplier 変更
 *	標準(1920×1080の解像度)のとき
 */
function setCssPropertyCalendarSettingsMultiplier() {

	const matrixRowArrangement = [
			  {row:1	,	calendar_multiplier:1.9		//	1×1(1185×821.1px)
			},{row:2	,	calendar_multiplier:1.00	//	(866px)
			},{row:3	,	calendar_multiplier:0.663	//	(865.283px)
			},{row:4	,	calendar_multiplier:0.495	//	(865.417px)
			}
		];
	const matrixColumnArrangement = [
			  {column:1	,	calendar_multiplier:2.00	// 1×1(1112px×862px)
			},{column:2	,	calendar_multiplier:1.5		// (1668px)
			},{column:3	,	calendar_multiplier:1.00	// (1668px)
			},{column:4	,	calendar_multiplier:0.75	// (1668px)
			},{column:5	,	calendar_multiplier:0.60	// (1668px)
			},{column:6	,	calendar_multiplier:0.50	// (1668px)
			}
		];
	var calendar_multiplier = Number.MAX_SAFE_INTEGER;

	// 現在の配置(NxM)にあった縮尺を取得
	var result = matrixRowArrangement.filter(e => e.row == Parameter.__calendar_row);
	if (result.length > 0) {
		calendar_multiplier = Math.min(calendar_multiplier, result[0].calendar_multiplier);
	}
	var result = matrixColumnArrangement.filter(e => e.column == Parameter.__calendar_column);
	if (result.length > 0) {
		calendar_multiplier = Math.min(calendar_multiplier, result[0].calendar_multiplier);
	}
	// 縮尺変更
	cssroot("--hq-calendar-settings-multiplier", calendar_multiplier);
	return calendar_multiplier;
}

/* ===================================================================
 * # ユーザ・カスタマイズ スタイル設定
 *
 * ------------------------------------------------------------------- */
/**
 * カレンダー生成のディスパッチャ
 */
function dispatchMakeCalendar() {
	if (typeof makeCalendar === 'function') makeCalendar();
	if (typeof todaysChangeCheck === 'function') {
		// 実行キューの最後に回す
		queueMicrotask(() => todaysChangeCheck());
	}
}


(function() {

	'use strict';


	/* -------------------------------------------------------------------
	 * モニターの解像度に従った縮尺率を変更
	 *	※ CSSグローバルカスタムプロパティの設定
	 *	"--hq-calendar-screen-multiplier"
	 * ------------------------------------------------------------------- */
	function setScreenCalendarMultiplier() {

		const screen_width = 1920;
		const screen_height = 1080;

		// 1920x1080px を基準として、screen.width, screen.height の縮尺率の小さい方を
		// --hq-calendar-screen-multiplier に設定する
		// モニターの解像度		縮尺率
		//	---------------------------
		//	1920x1080px			1.0		min(1920/1920=1.0	, 1080/1080=1.0	) = 1.0;
		//	1280x768px			0.6		min(1280/1920=0.667	, 768/1080=0.711) = 0.667
		//	1280x1024px			0.9		min(1280/1920=0.667	, 1024/1080=0.948) = 0.667
		//	1280x800px			0.7		min(1280/1920=0.667	, 800/1080=0.740) = 0.740

		let rate = Math.min(screen.width / screen_width, screen.height / screen_height);
		rate = Math.floor(rate * 10) / 10;

		cssroot("--hq-calendar-screen-multiplier", rate);

	}
	window.addEventListener("resize", () => setScreenCalendarMultiplier);

	/* -------------------------------------------------------------------
	 * Monitor Layout Preview
	 * レイアウト
	 *	┌──┬──┬──┐　┌─┬─┬─┬─┐
	 *	│　　│　　│　　│　│　│　│　│　│
	 *	│　　│　　│　　│　├─┼─┼─┼─┤
	 *	├──┼──┼──┤→│　│　│　│　│
	 *	│　　│　　│　　│　├─┼─┼─┼─┤
	 *	│　　│　　│　　│　│　│　│　│　│
	 *	└──┴──┴──┘　└─┴─┴─┴─┘
	 * ------------------------------------------------------------------- */
	/**
	 * 1. Monitor Layout Preview
	 */
	let globalMatrixLayoutIndex = 0;
	const matrixLayouts = [{
		r: 1,
		c: 1,
		n: "1ヶ月表示"
	}, {
		r: 1,
		c: 2,
		n: "2ヶ月表示 (横)"
	}, {
		r: 2,
		c: 1,
		n: "2ヶ月表示 (縦)"
	}, {
		r: 2,
		c: 3,
		n: "6ヶ月表示 (横)"
	}, {
		r: 3,
		c: 4,
		n: "12ヶ月表示"
	}, {
		r: 4,
		c: 3,
		n: "12ヶ月表示"
	}, {
		r: 4,
		c: 6,
		n: "24ヶ月表示"
	}];

	function drawLayout() {
		const layout = matrixLayouts[(globalMatrixLayoutIndex < 0 ? 0 : globalMatrixLayoutIndex)%matrixLayouts.length ];
		const grid = document.querySelector("#miniGrid");
		// 表示名の更新
		document.querySelector("#layoutName").textContent = layout.n;
		// グリッドスタイルの適用
		Object.assign(grid.style, {
			gridTemplateRows: `repeat(${layout.r}, 1fr)`,
			gridTemplateColumns: `repeat(${layout.c}, 1fr)`
		});
		// セルの生成（DocumentFragmentで一括追加）
		const fragment = document.createDocumentFragment();
		const cellCount = Math.min(layout.r * layout.c, 24);
		grid.innerHTML = ""; // クリア
		for (let i = 0; i < cellCount; i++) {
			const cell = document.createElement('div');
			cell.className = "mini-cell";
			fragment.appendChild(cell);
		}
		grid.appendChild(fragment);
		// パラメータ保存と再描画
		setCssPropertyMatrixNxM(layout.r, layout.c);
		dispatchMakeCalendar();
	}

	/* -------------------------------------------------------------------
	 * 表示行列数のCSS変数設定
	 *	※ CSSグローバルカスタムプロパティの設定
	 *		"--hq-calendar-N-months-row"
	 *		"--hq-calendar-N-months-column"
	 * ------------------------------------------------------------------- */
	function setCssPropertyMatrixNxM(row, column) {
		Parameter.__calendar_row = row;
		Parameter.__calendar_column = column;
		cssroot("--hq-calendar-N-months-row", row);
		cssroot("--hq-calendar-N-months-column", column);
		setCssPropertyCalendarSettingsMultiplier();
	}

	/* -------------------------------------------------------------------
	 *	背景スライドショー
	 *	┌─────────────┐
	 *	│　　スライドショー選択　▼│
	 *	└─────────────┘
	 * ------------------------------------------------------------------- */

	//-----------------------------------------------------
	// スライドショーの選択のoptionを追加
	//-----------------------------------------------------
	//	2. Background Slideshow Options
	// ※ ここに定義していない場合はキーワードがそのまま選択肢として表示されます
	const CATEGORY_TRANSLATIONS = {
		"-": "なし(None)",
		ALL: "全て",
		nature: "自然",
		universe: "宇宙",
		"still-life": "静物",
		"sci-fi": "サイエンス・フィクション",
		fractal: "フラクタル",
		sweets: "スイーツ",
		ornaments: "装飾品",
		watch: "時計",
		historic: "歴史的",
		thanksgiving: "感謝祭",
		city: "都市",
		castle: "城",
		twilight: "夕暮れ",
		leather: "革製品",
		temple: "寺院",
		nightview: "夜景",
		festival: "祭り",
		library: "図書館",
		museum: "博物館",
		illustration: "イラスト",
		wovencity: "ウーブン・シティ",
		texture: "テクスチャー",
		JP: "日本の風景",
		US: "アメリカの風景",
		GB: "イギリスの風景"
	};

	function remakeSlideShowOption() {
		if (!window.globalSlideShowCurrentMonthArray?.length) return;

		// 1. カテゴリごとの件数を集計
		const counts = new Map();
		globalSlideShowCurrentMonthArray.flatMap(item => item.category).forEach(cat => {
			counts.set(cat, (counts.get(cat) || 0) + 1);
		});
		// 2. ソート処理（件数降順、同数の場合は文字列順）
		const sortedCategories = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([key, count]) => ({
			key,
			count
		}));
		// 3. 固定オプションの追加と切り出し
		const finalOptions = [{
			key: "-",
			count: 0
		}, {
			key: "ALL",
			count: 0
		}, ...sortedCategories].slice(0, 102); // 上限100件 + 固定2件
		// 4. Select要素への反映
		const select = document.querySelector(".slide-show select");
		select.innerHTML = ""; // 既存をクリア
		finalOptions.forEach(({
			key,
			count
		}) => {
			const option = document.createElement('option');
			const label = CATEGORY_TRANSLATIONS[key] || key;
			const suffix = ["-", "ALL"].includes(key) ? "" : ` (${count})`;
			option.value = key;
			option.textContent = label + suffix;
			select.appendChild(option);
		});
	}

	/* ===================================================================
	 * # 全体的な外観
	 *
	 * ------------------------------------------------------------------- */
	function creatModalContainer() {

		const template = `
			<!-- 設定モーダル本体 -->
			<div class="container" id="modalContainer">
				<!-- 1. Visual & Theme -->
				<div class="wraper">
					<section>
						<div class="section-label">⚙️全体的な外観</div>
						<div class="grid-1">
							<div>
								<label>Monitor Layout Preview</label>
								<div class="monitor m-bkimg" id="layoutBtn">
									<div class="monitor-content"></div>
									<div id="miniGrid" class="mini-grid"></div>
								</div>
								<div id="layoutName" style="text-align:center; margin-top:10px; font-size:11px; font-weight:900; opacity:0.6;">1ヶ月表示</div>
							</div>
							<div style="display:flex; flex-direction:column; gap:18px;margin-top: 30px;">
								<div class="toggle-row" id="darkmode-toggle">
									<span style="font-size:11px; font-weight:900;">ダークモード</span>
									<div class="switch"></div>
								</div>
								<div>
									<label>Opacity<span id="opacity-range-value" style="padding-left: 1rem;"></span></label>
									<input type="range" id="input-background-opacity-range" style="width:100%" min="0" max="1.0" step="0.01" value="-1">
								</div>
								<div class="grid-3" style="gap:15px;">
									<div class="slide-show">
										<label>背景スライドショー</label>
										<select>
											<option value="-">なし(None)</option>
											<option value="ALL">全て</option>
										</select>
									</div>
									<div>
										<label>間隔 (秒)</label>
										<input type="number" id="interval" value="-1" min="5" step="1">
									</div>
								</div>
								<div class="grid-2" style="gap:15px;">
									<div>
										<label>欧文フォント</label>
										<select id="latinF">
											<option value="Helvetica" data-font-family="'Helvetica Neue',Helvetica, Arimo" data-font-specific-size-multiplie="0.9" style="font-family: Helvetica;">Helvetica</option>
											<option value="Stardos-Stencil" data-font-family="'Stardos Stencil'" style="font-family: 'Stardos Stencil';">Stardos Stencil</option>
											<option value="EB-Garamond" data-font-family="'EB Garamond', Garamond" style="font-family: 'EB Garamond';">EB Garamond</option>
											<option value="Josefin-Slab" data-font-family="'Josefin Slab'" style="font-family: 'Josefin Slab';">Josefin Slab</option>
											<option value="Anton" data-font-family="Anton, Impact" style="font-family: Anton;">Anton</option>
											<option value="Aldrich" data-font-family="Aldrich, Arial" data-font-specific-size-multiplie="0.8" style="font-family: Aldrich;">Aldrich</option>
											<option value="Gravitas-One" data-font-family="'Gravitas One'" data-font-specific-size-multiplie="0.7" style="font-family: 'Gravitas One';">Gravitas One</option>
											<option value="Ballet" data-font-family="Ballet" style="font-family: Ballet;">Ballet</option>
											<option value="Miss-Fajardose" data-font-family="'Miss Fajardose'" style="font-family: 'Miss Fajardose';">Miss Fajardose</option>
											<option value="MonteCarlo" data-font-family="MonteCarlo" style="font-family: MonteCarlo;">MonteCarlo</option>
											<option value="Pristina" data-font-family="Pristina" style="font-family: Pristina; font-size: small;">Pristina</option>
											<option value="Ink-Free" data-font-family="'Ink Free'" data-font-specific-size-multiplie="0.8" style="font-family: 'Ink Free'; font-size: small;">Ink Free</option>
											<option value="-">和文fontと同じ</option>
										</select>
									</div>
									<div>
										<label>和文フォント</label>
										<select id="jpF">
											<option value="Kosugi-Maru" data-font-family="'Kosugi Maru', Meiryo" style="font-family: 'Kosugi Maru';">小杉丸</option>
											<option value="Noto-Sans-JP" data-font-family="'Noto Sans JP'" style="font-family: 'Noto Sans JP';">ノトサンズ Japanese</option>
											<option value="Klee-One" data-font-family="'Klee One'" data-font-specific-size-multiplie="0.9" style="font-family: 'Klee One';">クレー Ｏｎｅ</option>
											<option value="Shippori-Mincho" data-font-family="'Shippori Mincho'" style="font-family: 'Shippori Mincho';">しっぽり明朝</option>
											<option value="Yu-Mincho" data-font-family="'Yu Mincho'" style="font-family: 'Yu Mincho';">游明朝</option>
											<option value="UD-Digi-Kyokasho-N" data-font-family="'UD Digi Kyokasho N'" style="font-family: 'UD Digi Kyokasho N'; font-size: small;">UD デジタル 教科書体 N</option>
											<option value="HGP-Gyosho-tai" data-font-family="'HGP行書体'" style="font-family: 'HGP行書体'; font-size: small;">HGP行書体</option>
										</select>
									</div>
								</div>
							</div>
					</section>
					<!-- 2. Calendar & Cells -->
					<section>
						<div class="section-label">📅表示要素の選択</div>
						<div class="grid-4">
							<div style="display:flex; justify-content:center">
								<div class="date-box" id="fontPreview">
									<div class="date-top">
										<div class="date-num">99</div>
										<div class="date-moon">
											<button class="moon-btn" title="月の満ち欠け表示">
												<div class="moon-icon"></div>
											</button>
										</div>
									</div>
									<div class="date-bottom">
										<button class="tag-btn holiday-name">祝日：振替休日</button>
										<button class="tag-btn fest-name">祭日：二十四節気</button>
										<button class="tag-btn schedule-name">予定日</button>
									</div>
								</div>
							</div>
							<div style="display:flex; flex-direction:column; gap:12px;">
								<button id="input-tips" class="btn"><span>日付吹出しを表示</span></button>
								<button id="input-monday-start" class="btn"><span>月曜日始まり</span></button>
								<button id="input-saturday-coloring" class="btn"><span>土曜日色付け</span></button>
							</div>
							<div>
								<label>大きな時刻の表示形式</label>
								<input type="text" id="input-large-time-format" value="hh:mm:ss">
								<div class="preset-row">
									<button class="preset-btn" onclick="setClock('input-large-time-format','hh:mm:ss')">hh:mm:ss</button>
									<button class="preset-btn large-time" onclick="setClock('input-large-time-format','YYYY/M/D hh:mm:ss')">YYYY/M/D hh:mm:ss</button>
								</div>
								<label>小さな時刻の表示形式</label>
								<input type="text" id="input-small-time-format" value="hh:mm">
								<div class="preset-row">
									<button class="preset-btn" onclick="setClock('input-small-time-format','hh:mm:ss')">hh:mm:ss</button>
									<button class="preset-btn small-time" onclick="setClock('input-small-time-format','M/D hh:mm:ss')">M/D hh:mm:ss</button>
								</div>
							</div>
						</div>
					</section>
					<section class="country-selection">
						<div class="section-label">🌏国セレクション</div>
						<div>
							<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(56px, 1fr)); gap:12px;" id="cRow"></div>
							<div id="regionArea" style="display:none; margin-top:16px;">
								<label>地域の選択</label>
								<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(56px, 1fr)); gap:10px;" id="regionRow"></div>
							</div>
						</div>
					</section>
				</div>
				<div class="wraper">
					<!-- 4. Keyboard & Mouse Shortcuts -->
					<section>
						<div class="section-label">⌨ショートカット</div>
						<div class="sc-grid">
							<div class="sc-column">
								<div style="font-size:10px; font-weight:900; opacity:0.4; margin-bottom:10px;">過去への操作 (BACK)</div>
								<div class="sc-item"><span>－１月</span><span class="sc-key">←</span></div>
								<div class="sc-item"><span>－１年</span><span class="sc-key">↑</span></div>
								<div class="sc-item"><span>－１０年</span><span class="sc-key">Shift＋↑</span></div>
								<div class="sc-item"><span>－１００年</span><span class="sc-key">Ctrl＋↑</span></div>
								<div class="sc-item"><span>－表示月数</span><span class="sc-key">Wheel Up</span></div>
								<div class="sc-item"><span>－１年</span><span class="sc-key">Shift＋Wheel Up</span></div>
								<div class="sc-item"><span>－１０年</span><span class="sc-key">Ctrl＋Wheel Up</span></div>
								<div class="sc-item"><span>－１月</span><span class="sc-key">Swipe ↑</span></div>
								<div class="sc-item"><span>－１年</span><span class="sc-key">Swipe ←</span></div>
							</div>
							<div class="sc-column">
								<div style="font-size:10px; font-weight:900; opacity:0.4; margin-bottom:10px;">未来への操作 (FORWARD)</div>
								<div class="sc-item"><span>＋１月</span><span class="sc-key">→</span></div>
								<div class="sc-item"><span>＋１年</span><span class="sc-key">↓</span></div>
								<div class="sc-item"><span>＋１０年</span><span class="sc-key">Shift＋↓</span></div>
								<div class="sc-item"><span>＋１００年</span><span class="sc-key">Ctrl＋↓</span></div>
								<div class="sc-item"><span>＋表示月数</span><span class="sc-key">Wheel Down</span></div>
								<div class="sc-item"><span>＋１年</span><span class="sc-key">Shift＋Wheel Down</span></div>
								<div class="sc-item"><span>＋１０年</span><span class="sc-key">Ctrl＋Wheel Down</span></div>
								<div class="sc-item"><span>＋１月</span><span class="sc-key">Swipe ↓</span></div>
								<div class="sc-item"><span>＋１年</span><span class="sc-key">Swipe →</span></div>
							</div>
						</div>
					</section>
				</div>
			</div>
		`;
		const parent = document.querySelector("#modalOverlay") || document.body;
		parent.insertAdjacentHTML('beforeend', template);
	}

	function addEvent() {

		/* -------------------------------------------------------------------
		 * Monitor Layout Preview
		 * レイアウト
		 *	┌──┬──┬──┐　┌─┬─┬─┬─┐
		 *	│　　│　　│　　│　│　│　│　│　│
		 *	│　　│　　│　　│　├─┼─┼─┼─┤
		 *	├──┼──┼──┤→│　│　│　│　│
		 *	│　　│　　│　　│　├─┼─┼─┼─┤
		 *	│　　│　　│　　│　│　│　│　│　│
		 *	└──┴──┴──┘　└─┴─┴─┴─┘
		 * ------------------------------------------------------------------- */
		//-----------------------------------------------------
		// カレンダー並びオプション切換え
		//-----------------------------------------------------
		document.querySelector("#layoutBtn").addEventListener('click', () => {
			globalMatrixLayoutIndex = (globalMatrixLayoutIndex + 1) % matrixLayouts.length;
			drawLayout();
		}, {
			passive: true
		});


		/* -------------------------------------------------------------------
		 * Darkmode
		 *
		 * ┌─────────────────┐
		 * │　ダークモード　　　　　　　　○　│
		 * └─────────────────┘
		 *	 Opacity0.5
		 *	 ━━━━━━━━◎━━━━━━━━
		 * ------------------------------------------------------------------- */

		//-----------------------------------------------------
		// ダークモード切換え click イベント
		//-----------------------------------------------------
		const darkmode_toggle = document.querySelector("#darkmode-toggle");

		darkmode_toggle.addEventListener('click', () => {
			if(darkmode_toggle.classList.contains('disabled')) {
				return;
			}
			// 状態の反転とクラスのトグル
			Parameter.dark_mode = darkmode_toggle.classList.toggle('active');
			// 外部関数の実行（存在確認付き）
			if (typeof darkmodeSwitch === 'function') {
				darkmodeSwitch(Parameter.dark_mode);
			}
		}, {
			passive: true
		});

		//-----------------------------------------------------
		// 背景の透過度切換え input イベント
		//-----------------------------------------------------
		const opacityRange = document.querySelector("#input-background-opacity-range");

		opacityRange.addEventListener('input', (e) => {
			// パラメータへの保存
			Parameter.background_opacity_range = parseFloat(e.currentTarget.value);
			// CSS変数への反映とラベル更新
			backgroundOpacityRange(Parameter.background_opacity_range);
		}, {
			passive: true
		});

		/* -------------------------------------------------------------------
		 * Slide Show Category selection
		 *	 背景スライドショー			   間隔 (秒)
		 * ┌─────────────┐┌────────┐
		 * │　　スライドショー選択　▼││スライド切替間隔│
		 * └─────────────┘└────────┘
		 * ------------------------------------------------------------------- */

		//-----------------------------------------------------
		// スライドショーの選択のoptionを追加
		//-----------------------------------------------------
		remakeSlideShowOption();

		//-----------------------------------------------------
		// 背景スライドショーカテゴリー選択 change イベント
		//-----------------------------------------------------
		const selectSlide = document.querySelector(".slide-show select");
		const slideInterval = document.querySelector("#interval");

		selectSlide.addEventListener('change', (e) => {
			const selectedValue = e.target.value;

			if (e.target.selectedIndex != -1) {
				// 初回は選択していないので-1になるため、取得しない
				Parameter.background_select_slide = selectedValue;
			}

			//-----------------------------------------------------
			// 背景スライドショー＝なしになったら、パラメータの値に制御を戻す
			//-----------------------------------------------------

			// --- 状態判定 (スライドショー無効時: "-" の場合) ---
			const isDisabled = (selectedValue === "-");
			// UI要素の活性・非活性を一括制御
			slideInterval.disabled = isDisabled;
			opacityRange.disabled = isDisabled;
			if (isDisabled) {
				// 1. パラメータの状態に戻す
				Parameter.background_opacity_range = 0.5;
				// CSS変数への反映とラベル更新
				backgroundOpacityRange(Parameter.background_opacity_range);
				// 2. ダークモードを元の設定と同期
				darkmode_toggle.classList.toggle('active', Parameter.dark_mode);
				// 3. 各種スイッチの実行
				if (typeof darkmodeSwitch === 'function') darkmodeSwitch(Parameter.dark_mode);
				if (typeof backgroundImageSwitch === 'function') backgroundImageSwitch(false);
			} else {
				// スライドショー有効時の処理
				if (typeof backgroundImageSwitch === 'function') backgroundImageSwitch(true);
			}
			// --- スライドショーデータの更新と実行 ---
			if (typeof dailySlideShowCategoryFilter === 'function') {
				dailySlideShowCategoryFilter();
			}
			if (typeof nextSlideShowSwitchBackgroundImage === 'function') {
				nextSlideShowSwitchBackgroundImage();
			}
		});

		//-----------------------------------------------------
		// 背景スライドショーのインターバル input イベント
		//-----------------------------------------------------
		slideInterval.addEventListener('input', (e) => {
			const seconds = parseFloat(e.currentTarget.value);
			// 秒をミリ秒に変換してパラメータに保存
			Parameter.background_slide_show_interval = seconds * 1000;
			// スライドショーのタイマーを即座に更新
			if (typeof nextSlideShowSwitchBackgroundImage === 'function') {
				nextSlideShowSwitchBackgroundImage();
			}
		}, {
			passive: true
		});

		/* -------------------------------------------------------------------
		 * Font selection
		 *	欧文フォント					   和文フォント
		 * ┌───────────────┐┌───────────────┐
		 * │　Helvetica 　　　　　　　　▼││　小杉丸　　　　　　　　　　▼│
		 * └───────────────┘└───────────────┘
		 * ------------------------------------------------------------------- */
		/**
		 * フォント設定の一括更新
		 * 欧文・和文の組み合わせと、サイズ補正（マルチプライヤー）を計算して反映する
		 */
		const updateCalendarFont = (selectedLatinOption, selectedJapaneseOption) => {
			// 1. data属性からフォントファミリーを取得
			const latinFontFamily = selectedLatinOption.getAttribute("data-font-family") || "";
			const japaneseFontFamily = selectedJapaneseOption.getAttribute("data-font-family") || "";
			// 個別のフォント変数を更新
			cssroot("--hq-latin-font", latinFontFamily || ' ');
			cssroot("--hq-japanese-font", japaneseFontFamily || ' ');
			// 全体フォントを組み立て (--hq-calendar-font)
			cssroot("--hq-calendar-font", [latinFontFamily, japaneseFontFamily].filter(Boolean).join(','));

			// 2. data属性から補正値を取得
			let latinMultiplierAttr = parseFloat(selectedLatinOption.getAttribute("data-font-specific-size-multiplie") || "");
			let japaneseMultiplierAttr = parseFloat(selectedJapaneseOption.getAttribute("data-font-specific-size-multiplie") || "");
			// サイズ補正値の計算
			if (!Number.isFinite(latinMultiplierAttr) || latinMultiplierAttr === 0) {
				latinMultiplierAttr = 1.0;
			}
			if (!Number.isFinite(japaneseMultiplierAttr) || japaneseMultiplierAttr === 0) {
				japaneseMultiplierAttr = 1.0;
			}
			// 反映（和文更新時は、欧文側の補正値と比較して小さい方を採用）
			cssroot("--font-specific-size-multiplie", Math.min(latinMultiplierAttr, japaneseMultiplierAttr));
		};
		/* --- イベントリスナーの登録 --- */
		//-----------------------------------------------------
		// 欧文フォント選択 change イベント
		//-----------------------------------------------------
		const selectLatin = document.querySelector('#latinF');
		selectLatin.addEventListener('change', (e) => {
			if (selectLatin.selectedIndex === -1) return;
			Parameter.latin_font = selectLatin.value;
			updateCalendarFont(selectLatin.options[selectLatin.selectedIndex], selectJapanese.options[selectJapanese.selectedIndex]);
		});
		//-----------------------------------------------------
		// 和文フォント選択 change イベント
		//-----------------------------------------------------
		const selectJapanese = document.querySelector("#jpF");
		selectJapanese.addEventListener('change', (e) => {
			if (selectJapanese.selectedIndex === -1) return;
			Parameter.japanese_font = selectJapanese.value;
			updateCalendarFont(selectLatin.options[selectLatin.selectedIndex], selectJapanese.options[selectJapanese.selectedIndex]);
		});


		/* ===================================================================
		 * # 表示要素の選択
		 *
		 * ------------------------------------------------------------------- */

		/* -------------------------------------------------------------------
		 * Date Box
		 * カレンダーの日のエリア
		 *	┌──┬──┐
		 *	│　　│　　│
		 *	│９９│ ○ │
		 *	├──┴──┤
		 *	│　祝　日　│
		 *	│　祭　日　│
		 *	│　予定日　│
		 *	└─────┘
		 * ------------------------------------------------------------------- */
		/**
		 * プレビュー用ボタンのトグルイベントを設定する共通関数
		 * @param {string} selector - 要素のセレクタ
		 * @param {string} paramKey - Parameterオブジェクトの対応するキー
		 */
		const setupToggleEvent = (selector, paramKey) => {
			const btn = document.querySelector(selector);
			if (!btn) return;
			btn.addEventListener('click', () => {
				// 1. クラスのトグル
				const isActive = btn.classList.toggle('active');
				// 2. パラメータの更新 (active状態の逆が hidden)
				Parameter[paramKey] = !isActive;
				// 3. カレンダーの再描画
				if (typeof dispatchMakeCalendar === 'function') {
					dispatchMakeCalendar();
				}
			}, {
				passive: true
			});
		};
		/* --- 各ボタンにイベントを適用 --- */
		//-----------------------------------------------------
		// 月アイコン 表示切換え click イベント
		//-----------------------------------------------------
		setupToggleEvent(".date-box .moon-btn", "moon_hidden");
		//-----------------------------------------------------
		// 祝日 表示切換え click イベント
		//-----------------------------------------------------
		setupToggleEvent(".date-box .holiday-name", "holiday_name_hidden");
		//-----------------------------------------------------
		// 祭日 表示切換え click イベント
		//-----------------------------------------------------
		setupToggleEvent(".date-box .fest-name", "fest_name_hidden");
		//-----------------------------------------------------
		// 予定 表示切換え click イベント
		//-----------------------------------------------------
		setupToggleEvent(".date-box .schedule-name", "schedule_name_hidden");

		/* -------------------------------------------------------------------
		 * Date Box
		 * カレンダーの日のエリア
		 * ┌─────────────────┐
		 * │　日付吹出しを表示　　　　　　○　│
		 * └─────────────────┘
		 * ┌─────────────────┐
		 * │　月曜日始まり　　　　　　　　○　│
		 * └─────────────────┘
		 * ┌─────────────────┐
		 * │　土曜日色付け　　　　　　　　○　│
		 * └─────────────────┘
		 * ------------------------------------------------------------------- */
		/**
		 * 設定用ボタン（トグル）のイベントを一括設定
		 * @param {string} selector - 要素のIDセレクタ
		 * @param {string} paramKey - Parameterオブジェクトのキー
		 * @param {boolean} needsRedraw - 再描画が必要かどうか
		 */
		const setupSettingToggle = (selector, paramKey, needsRedraw = true) => {
			const btn = document.querySelector(selector);
			if (!btn) return;
			btn.addEventListener('click', () => {
				// 1. クラスのトグル（戻り値の真偽値を利用）
				const isActive = btn.classList.toggle('active');
				// 2. パラメータの更新（active = true）
				Parameter[paramKey] = isActive;
				// 3. 必要に応じてカレンダーを再描画
				if (needsRedraw && typeof dispatchMakeCalendar === 'function') {
					dispatchMakeCalendar();
				}
			}, {
				passive: true
			});
		};
		/* --- 各設定ボタンにイベントを適用 --- */
		//-----------------------------------------------------
		// 日付吹出し（再描画なし）
		//-----------------------------------------------------
		setupSettingToggle("#input-tips", "tips_disp", false);
		//-----------------------------------------------------
		// 月曜日始まり
		//-----------------------------------------------------
		setupSettingToggle("#input-monday-start", "monday_start");
		//-----------------------------------------------------
		// 土曜日色付け
		//-----------------------------------------------------
		setupSettingToggle("#input-saturday-coloring", "saturday_coloring");

		/* ===================================================================
		 * # 時刻の表示設定
		 *
		 * ------------------------------------------------------------------- */
		/* -------------------------------------------------------------------
		 * Font selection
		 *	大きな時刻の表示形式			  小さな時刻の表示形式
		 * ┌───────────────┐┌───────────────┐
		 * │　hh:mm:ss　　　　　　　　　▼││　hh:mm:ss　　　　　　　　　▼│
		 * └───────────────┘└───────────────┘
		 * ------------------------------------------------------------------- */
		/**
		 * 時刻フォーマット入力のイベントを設定
		 * @param {string} selector - 要素のIDセレクタ
		 * @param {string} paramKey - Parameterオブジェクトのキー
		 */
		const setupTimeFormatEvent = (selector, paramKey) => {
			const input = document.querySelector(selector);
			if (!input) return;
			// inputイベント（リアルタイム）とchangeイベント（確定時）の両方に対応
			['input', 'change'].forEach(type => {
				input.addEventListener(type, () => {
					// 適用フラグをリセットし、パラメータを更新
					Parameter.__time_format_apply = false;
					Parameter[paramKey] = input.value;
				});
			});
		};
		/* --- 各入力フィールドにイベントを適用 --- */
		//-----------------------------------------------------
		// 大きな時刻
		//-----------------------------------------------------
		setupTimeFormatEvent("#input-large-time-format", "large_time_format");
		//-----------------------------------------------------
		// 小さな時刻
		//-----------------------------------------------------
		setupTimeFormatEvent("#input-small-time-format", "small_time_format");
		//-----------------------------------------------------
		// 時刻フォーマットのプリセットヘルパー
		// ボタンクリック時に指定のinputへ値をセットし、イベントを発火させる
		//-----------------------------------------------------
		window.setClock = (id, val) => {
			const input = document.querySelector(`#${id}`);
			if (!input) return;
			input.value = val;
			// dispatchEventにより、上記のsetupTimeFormatEvent内の処理を強制的に動かす
			input.dispatchEvent(new Event('input'));
		};



		/* ===================================================================
		 * # 国セレクション
		 *
		 * ------------------------------------------------------------------- */
		// Country logic
		const countries = [{
			id: "JP",
			n: "日本",
			i: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Flag_of_Japan.svg/330px-Flag_of_Japan.svg.png",
			r: []
		}, {
			id: "GB",
			n: "イギリス",
			i: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Flag_of_the_United_Kingdom_%281-2%29.svg/250px-Flag_of_the_United_Kingdom_%281-2%29.svg.png",
			r: [{
				id: "GB_ENG",
				n: "イングランド",
				i: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Flag_of_England.svg/250px-Flag_of_England.svg.png"
			}, {
				id: "GB_SCT",
				n: "スコットランド",
				i: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Flag_of_Scotland.svg/330px-Flag_of_Scotland.svg.png"
			}, {
				id: "GB_WLS",
				n: "ウェールズ",
				i: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Flag_of_Wales.svg/250px-Flag_of_Wales.svg.png"
			}, {
				id: "GB_NIR",
				n: "北アイルランド",
				i: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Saint_Patrick%27s_Saltire.svg/250px-Saint_Patrick%27s_Saltire.svg.png"
			}]
		}, {
			id: "US",
			n: "アメリカ",
			i: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Flag_of_the_United_States_%28DDD-F-416E_specifications%29.svg/330px-Flag_of_the_United_States_%28DDD-F-416E_specifications%29.svg.png",
			r: [{
				id: "US_DC",
				n: "コロンビア特別区(ワシントン, D.C.)",
				i: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Flag_of_Washington%2C_D.C.svg/250px-Flag_of_Washington%2C_D.C.svg.png"
			}, {
				id: "US_OH",
				n: "オハイオ州",
				i: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Flag_of_Ohio.svg/250px-Flag_of_Ohio.svg.png"
			}, {
				id: "US_CO",
				n: "コロラド州",
				i: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Flag_of_Colorado.svg/330px-Flag_of_Colorado.svg.png"
			}, {
				id: "US_ID",
				n: "アイダホ州",
				i: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Flag_of_Idaho.svg/250px-Flag_of_Idaho.svg.png"
			}, {
				id: "US_WA",
				n: "ワシントン州",
				i: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Flag_of_Washington.svg/250px-Flag_of_Washington.svg.png"
			}, {
				id: "US_HI",
				n: "ハワイ州",
				i: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Flag_of_Hawaii.svg/250px-Flag_of_Hawaii.svg.png"
			}]
		}];
		let curR = Parameter.calendar.local.constructor.name.replace(/Calc/,'');
		let curC = curR.replace(/_.*/,'');

		// 1. 最初にすべての国と地域のHTMLを生成してしまう
		function initApp() {
			// 国ボタンの生成
			document.querySelector("#cRow").innerHTML = countries.map(c => `
					<button class="btn country-btn ${(!c.r || c.r.length == 0) ? 'js-country' : ''} ${c.id === curC ? 'active' : ''}" id="btn-${c.id}" onclick="selC('${c.id}')">
					  <img alt="${c.n}" title="${c.n}" src="${c.i}">
					</button>
				  `).join('');
			// 各国ごとの地域グループを生成（すべて非表示で配置）
			document.querySelector('#regionRow').innerHTML = countries.map(c => `
				<div id="group-${c.id}" class="region-group" style="display:none; grid-column: 1 / -1; display: grid; grid-template-columns: repeat(auto-fill, minmax(56px, 1fr)); gap: 10px;">
					${c.r.map(r => `
						<button class="btn country-btn js-country ${r.id === curR ? 'active' : ''}" id="btn-${r.id}" style="padding:3px; font-size:10px" onclick="selR('${r.id}')">
							<img alt="${r.n}" title="${r.n}" src="${r.i}">
						</button>
					`).join('')}
				</div>
		  `).join('');
			updateVisibility_C();
			updateVisibility_R();
		}
		// 2. 表示・非表示だけを切り替える（HTMLは書き換えない）
		function updateVisibility_C() {
			const area = document.querySelector("#regionArea");
			let hasRegion = false;
			countries.forEach(c => {
				const btn = document.querySelector(`#btn-${c.id}`);
				const group = document.querySelector(`#group-${c.id}`);
				if (c.id === curC) {
					btn.classList.add('active');
					if (c.r.length > 0) {
						group.style.display = 'grid';
						hasRegion = true;
					} else {
						group.style.display = 'none';
					}
				} else {
					btn.classList.remove('active');
					group.style.display = 'none';
				}
			});
			// 地域が一つもなければエリア自体を隠す
			area.style.display = hasRegion ? 'block' : 'none';
		}
		function updateVisibility_R() {
			countries.forEach(c => {
				if (c.id === curC) {
					c.r.map(r => {
						const btn = document.querySelector(`#btn-${r.id}`);
						if (r.id === curR) {
							btn.classList.add('active');
						} else {
							btn.classList.remove('active');
						}
					});
				} else {
					c.r.map(r => {
						const btn = document.querySelector(`#btn-${r.id}`);
						btn.classList.remove('active');
					});
				}
			});
		}
		window.selC = (id) => {
			curC = id;
			let r = countries.find(c => c.id == curC).r;
			curR = r.length > 0 ? r[0].id : '';
			updateVisibility_C();
			updateVisibility_R();
			const btn = document.querySelector(`#btn-${curR}`);
			if(btn) {
				btn.dispatchEvent(new Event('click'));
			}
		};
		window.selR = (id) => {
			curR = id;
			updateVisibility_R();
		};
		// 実行
		initApp();

		//-----------------------------------------------------
		// 国のカレンダー切り替えイベント
		//-----------------------------------------------------
		[ ...document.querySelectorAll(".js-country")].forEach( c => c.addEventListener('click', async (event) => {
			// --- 1. 現在の設定を保存 ---
			const saveDt = {
				...Parameter
			};
			delete saveDt.calendar;
			// undefinedプロパティの除去
			Object.keys(saveDt).forEach(key => {
				if (saveDt[key] === undefined) delete saveDt[key];
			});
			// クラス名から特定のリージョンコード(GB_XXX, US_XXX等)を抽出
			// await を実行するとバックグランドで実行される。すると currentTarget が nullになる(仕様の)ため、
			// その前に areaKey を取得する
			const areaKey = event.currentTarget.id.replace('btn-','');
			// 【Parameter保存】
			await idbPut(DB_NAME, OBJ_STORE_PARAMETER, saveDt);
			// --- 2. ターゲットからキーを判定 ---
			// 大本の国コード (GB, US, JP) を判定
			const restoreKey = areaKey.startsWith("GB") ? "GB" : areaKey.startsWith("US") ? "US" : "JP";
			// --- 3. 新しい国の設定を復元 ---
			const idbDt = await idbGet(DB_NAME, OBJ_STORE_PARAMETER, restoreKey);
			// パラメータの同期
			if (idbDt) {
				Object.assign(Parameter, idbDt);
			} else {
				let timeJSON = Parameter.calendar.toJSON();
				Parameter = getDefaultParameter(restoreKey);
				Parameter.calendar = new Calendar.Date(timeJSON);
			}
			// 大きな時刻の表示形式の切替え
			let lfmt = "YYYY/M/D";
			if(restoreKey == "GB") {
				lfmt = "D MMM YYYY";
			} else
			if(restoreKey == "US") {
				lfmt = "MMM D, YYYY";
			}
			lfmt += " hh:mm:ss";
			const lbtn = document.querySelector(".preset-btn.large-time");
			lbtn.textContent = lfmt;
			lbtn.onclick = (e) => setClock('input-large-time-format', lfmt);
			// 小きな時刻の表示形式の切替え
			let sfmt = "M/D";
			if(restoreKey == "GB") {
				sfmt = "D MMM";
			} else
			if(restoreKey == "US") {
				sfmt = "MMM D";
			}
			sfmt += " hh:mm:ss";
			const sbtn = document.querySelector(".preset-btn.small-time");
			sbtn.textContent = sfmt;
			sbtn.onclick = (e) => setClock('input-large-time-format', sfmt);

			// --- 4. カレンダーオブジェクトの再生成と画面更新 ---
			Parameter.calendar.local = Calendar.Date.LocaleKeyEnum[areaKey];
			// 画面のリフレッシュ（再描画など）
			if (typeof refresh === 'function') {
				refresh();
			}
		}, {
			passive: true
		}));

	} // addEvent


	// 【dispatch】
	function refresh() {
		//-----------------------------------------------------
		// カレンダー並びオプション切換え
		//-----------------------------------------------------
		globalMatrixLayoutIndex = matrixLayouts.findIndex(e => e.r == Parameter.__calendar_row && e.c == Parameter.__calendar_column);
		drawLayout();

		//-----------------------------------------------------
		// 背景スライドショーカテゴリー選択 change イベント
		//-----------------------------------------------------
		/**
		 * 現在の Parameter を UI に反映（同期）させる
		 */
		// 1. セレクトボックス・テキスト・レンジ入力の同期ヘルパー
		const syncInput = (selector, value, eventType = 'input') => {
			const el = document.querySelector(selector);
			if (el && el.value != value) {
				el.value = value;
				el.dispatchEvent(new Event(eventType));
			}
		};
		// 2. トグルボタン（activeクラス）の同期ヘルパー
		const syncToggle = (selector, shouldBeActive) => {
			const el = document.querySelector(selector);
			if (el && el.classList.contains('active') !== shouldBeActive) {
				el.dispatchEvent(new Event('click'));
			}
		};
		// --- 背景・スライドショー設定 ---
		//-----------------------------------------------------
		// 背景スライドショーカテゴリー選択 change イベント
		//-----------------------------------------------------
		const selectSlide = document.querySelector(".slide-show select");
		if (selectSlide) {
			// オプションが存在するかチェック
			const hasOption = !!selectSlide.querySelector(`option[value="${Parameter.background_select_slide}"]`);
			if (!hasOption) Parameter.background_select_slide = "-";
			if (selectSlide.value !== Parameter.background_select_slide) {
				selectSlide.value = Parameter.background_select_slide;
				selectSlide.dispatchEvent(new Event('change'));
			}
		}
		//-----------------------------------------------------
		// 背景スライドショーのインターバル input イベント
		//-----------------------------------------------------
		syncInput("#interval", Parameter.background_slide_show_interval / 1000);
		//-----------------------------------------------------
		// 背景の透過度切換え input イベント
		//-----------------------------------------------------
		syncInput("#input-background-opacity-range", Parameter.background_opacity_range);
		// --- モード・デザイン ---
		//-----------------------------------------------------
		// ダークモード切換え click イベント
		//-----------------------------------------------------
		syncToggle("#darkmode-toggle", Parameter.dark_mode);
		//-----------------------------------------------------
		// 欧文フォント選択 change イベント
		//-----------------------------------------------------
		syncInput("#latinF", Parameter.latin_font, 'change');
		//-----------------------------------------------------
		// 和文フォント選択 change イベント
		//-----------------------------------------------------
		syncInput("#jpF", Parameter.japanese_font, 'change');
		// --- カレンダー表示要素 (Parameterは _hidden なので論理反転させる) ---
		//-----------------------------------------------------
		// 月アイコン 表示切換え click イベント
		//-----------------------------------------------------
		syncToggle(".date-box .moon-btn", !Parameter.moon_hidden);
		syncToggle(".date-box .holiday-name", !Parameter.holiday_name_hidden);
		syncToggle(".date-box .fest-name", !Parameter.fest_name_hidden);
		syncToggle(".date-box .schedule-name", !Parameter.schedule_name_hidden);
		// --- カレンダー設定 (こちらは true で active) ---
		syncToggle("#input-tips", Parameter.tips_disp);
		syncToggle("#input-monday-start", Parameter.monday_start);
		syncToggle("#input-saturday-coloring", Parameter.saturday_coloring);
		// --- 時刻フォーマット ---
		syncInput("#input-large-time-format", Parameter.large_time_format);
		syncInput("#input-small-time-format", Parameter.small_time_format);
	}


   /* Initialize
	* ------------------------------------------------------ */
	const init = () => {

		// 重複実行防止
		if (document.querySelector('#modalContainer')) return;

		// 1. モニターの解像度に従った縮尺率を変更
		setScreenCalendarMultiplier();
		// 2. 設定モーダルのHTMLを生成・注入
		creatModalContainer();
		// 3. 各ボタンや入力欄にイベントリスナーを登録
		// ※ 内部で dailySlideShowCategoryFilter 等も実行される想定
		addEvent();
		// 4. 現在のParameterをUI（ボタンの点灯等）に反映し、カレンダーを再描画
		// ※ 前工程で整理した syncParameterToUI を含む refresh を実行
		if (typeof refresh === 'function') {
			refresh();
		}

	};
	/**
	 * パラメータロード完了後の実行制御
	 */
	if (typeof GlovalParameterLoadPromise !== 'undefined') {
		GlovalParameterLoadPromise.then(() => {
			if (document.readyState === 'complete') {
				init();
			} else {
				window.addEventListener('load', init, {
					once: true
				});
			}
		});
	}
})();

/* ======================================================================
	Calendar/menu-04-backToToday.js
   ====================================================================== */

(function() {

	'use strict';

	/* -------------------------------------------------------------------
	 * Back to Today Button
	 *	ボタン作成とイベント登録を非同期で行う
	 *	   _..._
	 *	 .'		'.
	 *	:		  :
	 *	:  今 日  :
	 *	`.		 :'
	 *	  `-...-'
	 * ------------------------------------------------------------------- */
	const initBackToToday = () => {
		// 1. ボタンの生成
		const isJP = Parameter.calendar.local.constructor.name.includes("CalcJP");
		const btn = document.createElement('button');
		btn.id = "hq-backToToday";
		btn.textContent = isJP ? "今日" : "Today";
		document.body.appendChild(btn);
		// 2. マウス移動検知 (表示/非表示)
		const BIAS_SIZE = 100;
		window.addEventListener('mousemove', (e) => {
			const isNearBottomRight = (e.clientX > window.innerWidth - BIAS_SIZE) && (e.clientY > window.innerHeight - BIAS_SIZE);
			if (isNearBottomRight) {
				// 言語設定が動的に変わる可能性がある場合のみテキストを更新
				const currentText = Parameter.calendar.local.constructor.name.includes("CalcJP") ? "今日" : "Today";
				if (btn.textContent !== currentText) btn.textContent = currentText;
				btn.classList.add('active');
			} else {
				btn.classList.remove('active');
			}
		}, {
			passive: true
		});
		window.addEventListener('mouseout', (e) => {
			btn.classList.remove('active');
		}, {
			passive: true
		});
		// 3. クリックイベント
		const handleBackToToday = () => {
			Parameter.calendar.from().round({
				smallestUnit: 'day',
				roundingMode: 'trunc'
			});
			Parameter.calendar.day = 1;
			if (typeof dispatchMakeCalendar === 'function') {
				dispatchMakeCalendar();
			}
		};
		btn.addEventListener('click', handleBackToToday, {
			passive: true
		});
	};


   /* Initialize
	* ------------------------------------------------------ */
	const init = () => {

		// 重複実行防止
		if (document.querySelector('#hq-backToToday')) return;
		initBackToToday();

	};
	/**
	 * パラメータロード完了後の実行制御
	 */
	if (typeof GlovalParameterLoadPromise !== 'undefined') {
		GlovalParameterLoadPromise.then(() => {
			if (document.readyState === 'complete') {
				init();
			} else {
				window.addEventListener('load', init, {
					once: true
				});
			}
		});
	}
})();

/* ======================================================================
	Calendar/menu-05-keyControl.js
   ====================================================================== */

(function() {

	'use strict';

	/* -------------------------------------------------------------------
	 *  コントロールイベント
	 * ------------------------------------------------------------------- */
	const initKeyControl = () => {
		// カレンダー更新の共通処理
		const updateCalendar = () => {
			if (typeof dispatchMakeCalendar === 'function') {
				dispatchMakeCalendar();
			}
		};

		//-----------------------------------------------------
		// 1. キーボードイベント (ArrowKeys)
		//-----------------------------------------------------
		window.addEventListener('keydown', (e) => {
			switch (e.key) {
				case 'ArrowLeft':  Parameter.calendar.month -= 1; break;
				case 'ArrowRight': Parameter.calendar.month += 1; break;
				case 'ArrowUp':    Parameter.calendar.year -= e.ctrlKey ? 100 : (e.shiftKey ? 10 : 1); break;
				case 'ArrowDown':  Parameter.calendar.year += e.ctrlKey ? 100 : (e.shiftKey ? 10 : 1); break;
				default: return; // 対象外のキーは無視
			}
			updateCalendar();
		});

		//-----------------------------------------------------
		// 2. ホイールイベント
		//-----------------------------------------------------
		window.addEventListener('wheel', (e) => {
			const isUp = e.deltaY < 0;
			const diff = isUp ? -1 : 1;
			const MONTH_NUM = Parameter.__calendar_row * Parameter.__calendar_column;

			if (e.ctrlKey) {
				e.preventDefault(); // ズーム抑制
				Parameter.calendar.year += diff * 10;
			} else if (e.shiftKey) {
				Parameter.calendar.year += diff;
			} else {
				Parameter.calendar.month += diff * MONTH_NUM;
			}
			updateCalendar();
		}, { passive: false });

		//-----------------------------------------------------
		// 3. スワイプイベント
		//-----------------------------------------------------
		let startX = 0, startY = 0;

		window.addEventListener('touchstart', (e) => {
			startX = e.touches[0].pageX;
			startY = e.touches[0].pageY;
		}, { passive: true });

		window.addEventListener('touchend', (e) => {
			const endX = e.changedTouches[0].pageX;
			const endY = e.changedTouches[0].pageY;
			const distX = endX - startX;
			const distY = endY - startY;
			const absX = Math.abs(distX);
			const absY = Math.abs(distY);
			const MIN_DISTANCE = 30;

			if (Math.max(absX, absY) < MIN_DISTANCE) return;

			if (absX > absY) {
				// 左右スワイプ (月移動)
				Parameter.calendar.month += (distX > 0) ? -1 : 1;
			} else {
				// 上下スワイプ (年移動)
				Parameter.calendar.year += (distY > 0) ? -1 : 1;
			}
			updateCalendar();
		}, { passive: true });
	};

   /* Initialize
	* ------------------------------------------------------ */
	const init = () => {

		initKeyControl();

	};
	/**
	 * パラメータロード完了後の実行制御
	 */
	if (typeof GlovalParameterLoadPromise !== 'undefined') {
		GlovalParameterLoadPromise.then(() => {
			if (document.readyState === 'complete') {
				init();
			} else {
				window.addEventListener('load', init, {
					once: true
				});
			}
		});
	}

})();

