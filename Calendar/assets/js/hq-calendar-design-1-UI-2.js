"use strict";
/**
 * High Quality Calendar 1.0.0
 * Copyright 2022-2025 Kazuhiro Hosoya
 * Released under the MIT License
 * Released on: 2025-01-17
 */

var top_element = null;
var year_element = null;
var calendar_element_list = [];
var __nowMonth = null;

//=====================================================
// 月カレンダー 作成
//=====================================================
function makeCalendar(e) {
	var MONTH_NUM = Parameter.__calendar_row * Parameter.__calendar_column;
	if (calendar_element_list.length > MONTH_NUM) {
		while (calendar_element_list.length > MONTH_NUM) {
			var calendar_element = calendar_element_list.pop();
			calendar_element.remove();
		}
	}
	if(! top_element) {
		top_element = document.querySelector("section.body-section .hq-calendar");
	}
	if(! year_element) {
		year_element = document.querySelector(".year-title span.editable-label");
	}
	if (!e) {
		// 初回のカレンダー作成の場合
		// 又は モーダルメニューで表示の切換えが行われた場合
		// カレンダーがある場合、全て削除
		calendar_element_list.forEach((e) => {
			if (e) e.remove();
		});
		// カレンダーを全て作る
		// 当日の日付で月を＋1すると、当日が31日の場合、翌月に31日が存在しないため、
		// 日付が翌々月の1日となり、結果的に2か月先になってしまいます。
		//  そのため、月を＋1する際は、当月の1日を基準にして処理を行うようにします。
		var cw = new Calendar.Date(Parameter.calendar);
		cw.day = 1;
		for (let i = 0; i < MONTH_NUM; i++) {
			calendar_element_list[i] = creatCalendar(cw, Parameter);
			top_element.append(calendar_element_list[i]);
			cw.month += 1;
		}
		year_element.innerText = Parameter.calendar.toString("YYYY") + (Parameter.calendar.local.constructor.name.includes("CalcJP") ? "年" : "");
	} else {
		// keydown,touchendでカレンダー月が変更された場合

		if (Math.abs(__nowMonth.julian - Parameter.calendar.julian) > MONTH_NUM * 31) {
			// 表示月数以上の差がある場合、全て削除して全て作る
			makeCalendar();
		} else {
			while (__nowMonth.julian - Parameter.calendar.julian < 0) {
				// 未来の場合
				__nowMonth.month += 1;
				var calendar_element = calendar_element_list.shift();
				calendar_element.remove();
				var cw = new Calendar.Date(__nowMonth);
				cw.month += (MONTH_NUM - 1);
				calendar_element = creatCalendar(cw, Parameter);
				top_element.append(calendar_element);
				calendar_element_list.push(calendar_element);
			}
			while (__nowMonth.julian - Parameter.calendar.julian > 0) {
				// 過去の場合
				__nowMonth.month -= 1;
				var calendar_element = calendar_element_list.pop();
				calendar_element.remove();
				calendar_element = creatCalendar(__nowMonth, Parameter);
				top_element.prepend(calendar_element);
				calendar_element_list.unshift(calendar_element);
			}
		}
		year_element.innerText = Parameter.calendar.toString("YYYY") + (Parameter.calendar.local.constructor.name.includes("CalcJP") ? "年" : "");
	}
	__nowMonth = new Calendar.Date(Parameter.calendar);

	//-----------------------------------------------------
	// 画面上の年とカレンダー左上の年が同じ場合は非表示にする
	//-----------------------------------------------------
	// 年跨ぎが無い(カレンダーの年と画面上に表示されている年が同じ)で初期化
	var	overYear = false;
	if(MONTH_NUM <= 12) {
		// 最後のカレンダーの年
		var cw = new Calendar.Date(Parameter.calendar);
		cw.month += (MONTH_NUM - 1);
		if(Parameter.calendar.month > cw.month) {
			// 最初のカレンダーの年 > 最後のカレンダーの年となり、
			// 年跨ぎのカレンダーが表示されている
			overYear = true;
		}
	} else {
		// 12か月以上の表示があるため、年跨ぎのカレンダーが表示されている
		overYear = true;
	}
	var	mc1 = document.querySelectorAll(".mc1");
	mc1.forEach(e => e.style["visibility"] = overYear ? "unset" : "hidden");

	// 日付表示エリアの縮尺変更による変更
	calendarMultiplierChangeForDisp();
}

//=====================================================
// キーボード・ホイール・スワイプ イベントによるカレンダー切換え
//=====================================================
function loadEvent_01() {
	window.addEventListener("keydown", makeCalendar);
	window.addEventListener("wheel", makeCalendar);
	window.addEventListener('touchend', makeCalendar);
	makeCalendar();
}
GlovalParameterLoadPromise.then( () => {
	window.addEventListener('load', loadEvent_01);
	if (document.readyState == "complete") {
		setTimeout(loadEvent_01, 0);
	}
});

//=====================================================
// 時計とカレンダーの大小の切換え
//=====================================================
function loadEvent_02() {
	const article = document.querySelector(".hq-article");
	window.addEventListener('wheel', (e) => {
		if (e.deltaY > 0) {
			//[下スクロール]
			// 時計⇒小のフォーマット
			article.classList.remove('big-clock');
		} else {
			//[上スクロール]
			//	時計⇒大、カレンダー⇒小
			article.classList.add('big-clock');
		}
	});
}
GlovalParameterLoadPromise.then( () => {
	window.addEventListener('load', loadEvent_02);
	if (document.readyState == "complete") {
		setTimeout(loadEvent_02, 0);
	}
});

//=====================================================
// クリックで編集できるラベル
//=====================================================
// YYYY または YYYY-MM（年は正負、0は不正、月は1〜12、月なし可）
const yearMonthRegex = /^-?(?:[1-9][0-9]*)(?:-(?:0?[1-9]|1[0-2]))?$/;
const yearMonthExtraction = /^(-?[1-9][0-9]*)(?:-(0?[1-9]|1[0-2]))?$/;

function parseYearMonth(value) {
	if (!yearMonthRegex.test(value)) return null;

	// 年と月を正しく抽出
	const match = value.match(yearMonthExtraction);

	const year = parseInt(match[1], 10);
	if (year === 0) return null;

	const month = match[2] ? parseInt(match[2], 10) : null;

	return {
		year,
		month
	};
}
//	console.log(parseYearMonth("2024"));      // { year: 2024, month: null }
//	console.log(parseYearMonth("-500"));      // { year: -500, month: null }
//	console.log(parseYearMonth("2024-01"));   // { year: 2024, month: 1 }
//	console.log(parseYearMonth("2024-12"));   // { year: 2024, month: 12 }
//	
//	console.log(parseYearMonth("0"));         // null
//	console.log(parseYearMonth("2024-00"));   // null
//	console.log(parseYearMonth("2024-13"));   // null
//	console.log(parseYearMonth("abc"));       // null

document.addEventListener('click', function(e) {
	const label = e.target.closest('.editable-label');
	if (!label) return;

	// すでに編集中なら何もしない
	if (label.dataset.editing === 'true') return;
	label.dataset.editing = 'true';

	const currentText = label.textContent.trim();
	const formatText = label.dataset.format || '';

	// ラベルを非表示にして、代わりに編集用コンテナを作る
	label.style.display = 'none';

	const container = document.createElement('span');
	container.className = 'edit-container';

	const input = document.createElement('input');
	input.type = 'text';
	input.className = 'edit-input';
	input.value = currentText;
	input.placeholder = formatText; // ガイドをプレースホルダにも表示

	const guide = document.createElement('div');
	guide.className = 'format-guide';
	guide.textContent = '入力フォーマット: ' + formatText;

	container.appendChild(input);
	container.appendChild(guide);
	label.after(container);

	input.focus();
	input.select();

	// 編集完了処理（共通）
	function finishEdit(save) {
		if (!container || !container.parentNode) {
			return;
		}
		if (save) {
			const newValue = input.value.trim();
			if (newValue !== '') {
				var oldValue = label.textContent;
				label.textContent = newValue;
				var	val = parseYearMonth(newValue);
				if(val) {
					Parameter.calendar.year = val.year;
					Parameter.calendar.month = val.month ? val.month : Parameter.calendar.month;
				//	if(parseInt(oldValue) != parseInt(newValue)) {
				//		idbPut(DB_NAME, OBJ_STORE_INCIDENT, { incident: "Work Notes", detail: `${oldValue}から${newValue}へ変更しました。` });
				//	}
				}
			}
		}
		if(container && container.parentNode) {
			container.remove();
		}
		label.style.display = '';
		label.dataset.editing = 'false';
	}

	// フォーカスが外れたら保存して戻す
	input.addEventListener('blur', function(e) {
		finishEdit(true);
		makeCalendar(e);
	});

	// Enterで保存、Escでキャンセル
	input.addEventListener('keydown', function(e) {
		if (e.key === 'Enter') {
			finishEdit(true);
		} else if (e.key === 'Escape') {
			finishEdit(false);
		}
		makeCalendar(e);
	});
});
