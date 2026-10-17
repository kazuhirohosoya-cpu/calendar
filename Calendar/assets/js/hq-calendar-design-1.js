"use strict";
/**
 * High Quality Calendar 1.0.0
 * Copyright 2022-2025 Kazuhiro Hosoya
 * Released under the MIT License
 * Released on: 2025-01-17
 */
//=====================================================
// resizeに合わせてカレンダーのサイズを変更
//=====================================================
function loadEvent_91() {
	// resizeが発生して、windows幅がMIN_WIDTHより小さくなった場合、Calendarを表示するために
	// Calendarのサイズに0～1の縮尺率を掛けて調整する。
	// 縮尺率は (window幅÷MIN_WIDTH) とする。
	window.addEventListener("resize", () => {
		// 標準の縮尺で初期化
		setCssPropertyCalendarSettingsMultiplier();
		var __margin = cssroot("--hq-calendar-month-margin-2");
		var __width = cssroot("--hq-calendar-month-width");
		// カレンダーが1か月分になった場合の幅（マージンも考慮する）	12+540+12+1=565
		var MIN_WIDTH = (__margin + __width + __margin + 1) + 15 /*ゆとり*/ ;
		if (window.innerWidth < MIN_WIDTH) {
			// 1か月のカレンダーの幅がウィンドウサイズになった場合、ウィンドウサイズに合わせて縮尺を変更
			cssroot("--hq-calendar-settings-multiplier", Math.min(1, window.innerWidth / MIN_WIDTH));
		}
		// --hq-calendar-multiplier に合わせて日付表示エリアの縮尺変更による変更
		calendarMultiplierChangeForDisp();
	});
	// 起動時に強制発火
	setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
}
GlovalParameterLoadPromise.then( () => {
	window.addEventListener('load', loadEvent_91);
	if (document.readyState == "complete") {
		setTimeout(loadEvent_91, 0);
	}
});

//=====================================================
// イベント登録
//=====================================================
/* -------------------------------------------------------------------
 * ### --hq-calendar-multiplier に合わせて日付表示エリアの縮尺変更による変更
 *   ※ resize イベントなどからの呼び出しメソッド
 *   ※ dispatchMakeCalendar カレンダー作成に呼び出しメソッド
 * ------------------------------------------------------------------- */
/*
	カレンダーの日のエリア (モーダルは含まない)
	┌──┬──┐　　　┌─────┐
	│　　│　　│　　　│　　　　　│
	│　a1│　a2│　　　│　　　　　│
	├──┴──┤　⇒　│　　a1　　│
	│　　　　　│　　　│　　　　　│
	│　　a3　　│　　　│　　　　　│
	│　　　　　│　　　│　　　　　│
	└─────┘　　　└─────┘
 */
// 縮尺率 --hq-calendar-multiplier が 1 より小さくなった場合、
// 日付表示エリアのa2,a3を非表示にして、a1を最大に広げる。
function calendarMultiplierChangeForDisp() {
	cssroot("--hq-calendar-border-width-now-base", 3); // 今日の枠の幅3px
	const a2 = document.querySelectorAll(".m-body .cell .a2");
	const a3 = document.querySelectorAll(".m-body .cell .a3");
	if ((a2.length == 0 && a3.length == 0) || cssroot("--hq-calendar-settings-multiplier") < 1.0) {
		// a2,a3 が作られていない。又は 縮尺が1より小さくなった場合
		cssroot("--cell-font-size-day-multiplie", 1.5); // a1の日付フォントを大きく
		// カレンダーのcellのa1を最大、a2,a3を非表示
		document.querySelectorAll(".m-body .cell").forEach(e => e.classList.add("dismax"));
	} else {
		if (Parameter.__calendar_row == 1 && Parameter.__calendar_column == 1) {
			cssroot("--cell-font-size-day-multiplie", 1.136); // a1の日付フォント少し大きく
			cssroot("--hq-calendar-border-width-now-base", 1); // 今日の枠の幅
		} else {
			cssroot("--cell-font-size-day-multiplie", 1.0); // a1の日付フォント通常サイズ
		}
		// カレンダーのcellを通常サイズ
		document.querySelectorAll(".m-body .cell").forEach(e => e.classList.remove("dismax"));
	}
}

//=====================================================
// カレンダー作成(1か月)
//=====================================================
function creatCalendar(p_cd, p_parameter) {
	p_parameter = Object.assign({
		// p_parameter が省略されたときのデフォルト値
		calendar: new Calendar.Date().round({smallestUnit: 'day', roundingMode: 'trunc'}),
	}, p_parameter);

	var	is_jp = p_cd.local.constructor.name.includes("CalcJP");

	var	tips_info = {
		base_t_l: is_jp ? "令和９９年 神無月".length : "September".length,
		base_l: is_jp ? calcTextWidth_ToUseDOM("令和９９年 神無月").width : calcTextWidth_ToUseDOM("September").width,
		base_t_g: is_jp ? "2026年 9月".length : "99, 9999".length,
		base_g: is_jp ? calcTextWidth_ToUseDOM("9999年 9月").width : calcTextWidth_ToUseDOM("99, 9999").width,
		tips_w: cssroot("--hq-tips-width-tips"),
	}

	// 今日の日付を 時刻 00:00:00.000 で取得(getTime()の比較に使う)
	var today = p_cd.Now.round({smallestUnit: 'day', roundingMode: 'trunc'});

	var top_element = document.createElement('div');
	top_element.classList.add("hq-calendar-month");

	//----------------------------------------------------
	//	キャプション
	//----------------------------------------------------
	//		 2025年  1月  睦月		← ここを作成
	//		日 月 火 水 木 金 土
	//		29 30 31  1  2  3  4
	//		 5  6  7  8  9 10 11
	//		12 13 14 15 16 17 18
	//		19 20 21 22 23 24 25
	//		26 27 28 29 30 31  1
	//----------------------------------------------------
	var dummy = document.createElement('div');
	dummy.innerHTML = `
		<div class="m-caption">
			<div class="mc1" style="visibility: hidden;">
				<span class="year">${p_cd.toString("YYYY")}${is_jp ? '年' :''}</span>
			</div>
			<div class="mc2">
				<span class="month">${p_cd.month}${is_jp ? '月' : ''}</span>
			</div>
			<div class="mc3">
				<span class="local-month">${p_cd.toString("MMMMM")}</span>
			</div>
		</div>
	`;
	top_element.appendChild(dummy.firstElementChild);

	//----------------------------------------------------
	//	ヘッダ
	//----------------------------------------------------
	//		 2025年  1月  睦月
	//		日 月 火 水 木 金 土	← ここを作成
	//		29 30 31  1  2  3  4
	//		 5  6  7  8  9 10 11
	//		12 13 14 15 16 17 18
	//		19 20 21 22 23 24 25
	//		26 27 28 29 30 31  1
	//----------------------------------------------------

	var	html = `
		<div class="m-header">
	`;
	// 月曜日始まり(ISO 8601)の場合はw=1, 日曜日始まりの場合はw=0
	var	w = Parameter.monday_start ? 1 : 0;
	for(let i=0;i<7;i++,w++) {
		html += `
			<div class="cell week ${w%7 == 6 && p_parameter.saturday_coloring ? 'sat' : ''} ${w%7 == 0 ? 'sun' : ''}">
				<span>${p_cd.local.week(w%7, true)}</span>
			</div>
		`;
	}
	html += `
		</div>
	`;
	var dummy = document.createElement('div');
	dummy.innerHTML = html;

	top_element.appendChild(dummy.firstElementChild);

	//----------------------------------------------------
	//	ボディ
	//----------------------------------------------------
	//		 2025年  1月  睦月
	//		日 月 火 水 木 金 土
	//		29 30 31  1  2  3  4	←(i==0,1) ここを作成
	//		 5  6  7  8  9 10 11	←(i==1)   ここを作成
	//		12 13 14 15 16 17 18	←(i==1)   ここを作成
	//		19 20 21 22 23 24 25	←(i==1)   ここを作成
	//		26 27 28 29 30 31  1	←(i==1,2) ここを作成
	//----------------------------------------------------

	// １か月カレンダーの先頭エリアから末尾エリアの日付を
	// ループインデックスとして使うため、日付を算出する
	var bigen_dt, end_dt, first_dt, final_dt;
	{
		//----------------------------------------------------
		//	開始日
		//----------------------------------------------------
		//		 2025年  1月  睦月
		//		日 月 火 水 木 金 土
		//		┌──────────── bigen_dt.julian = この日(29日)を算出
		//		│        ┌─────── first_dt.julian = この日(1日)を算出
		//		↓        ↓
		//		29 30 31  1  2  3  4
		//		 5  6  7  8  9 10 11
		//		12 13 14 15 16 17 18
		//		19 20 21 22 23 24 25
		//		26 27 28 29 30 31  1
		//----------------------------------------------------
		// 今月の１日の前の余分な日付けエリアは、前月の末日を表示する
		// そのため、前月の最後の週の(日又は月)の日付を算出する
		first_dt = new Calendar.Date(p_cd);
		first_dt.day = 1;
		var	bigen_jd;
		if(Parameter.monday_start) {
			// 月曜日始まり(ISO 8601)の場合
			//	月 火 水 木 金 土 日
			if (first_dt.dayOfWeek == 1) {
				// 今月の１日が(月)の場合は表示しない
				bigen_jd = first_dt.julian; //先月の末日表示なし（今月の１日から表示）
			} else {
				bigen_jd = first_dt.julian - ((first_dt.dayOfWeek == 0 ? 7 : first_dt.dayOfWeek) - 1);
			}
		} else {
			// 日曜日始まりの場合
			//	日 月 火 水 木 金 土
			if (first_dt.dayOfWeek == 0) {
				// 今月の１日が(日)の場合は表示しない
				bigen_jd = first_dt.julian; //先月の末日表示なし（今月の１日から表示）
			} else {
				bigen_jd = first_dt.julian - first_dt.dayOfWeek;
			}
		}
		bigen_dt = new Calendar.Date(bigen_jd, p_cd.option);

		//----------------------------------------------------
		//	最終日
		//----------------------------------------------------
		//		 2025年  1月  睦月
		//		日 月 火 水 木 金 土
		//		29 30 31  1  2  3  4
		//		 5  6  7  8  9 10 11
		//		12 13 14 15 16 17 18
		//		19 20 21 22 23 24 25
		//		26 27 28 29 30 31  1
		//					  ↑  ↑
		//					  │  └───   end_jd.julian = この日(1日)を算出
		//					  └───── final_dt.julian = この日(31日)を算出
		//----------------------------------------------------
		// 今月の末日より後ろの余分な日付エリアは、来月の月初めを表示する
		// そのため、来月の第１週の(土又は日)の日付を算出する
		final_dt = new Calendar.Date(p_cd);
		final_dt.day = final_dt.daysInMonth;
		var	end_jd;
		if(Parameter.monday_start) {
			// 月曜日始まり(ISO 8601)の場合
			//	月 火 水 木 金 土 日
			if (final_dt.dayOfWeek == 0) {
				// 今月の末日が(日)の場合(今月の末日が(日)の場合)は表示しない
				end_jd = final_dt.julian;
			} else {
				end_jd = final_dt.julian + (7 - final_dt.dayOfWeek);
			}
		} else {
			// 日曜日始まりの場合
			//	日 月 火 水 木 金 土
			if (final_dt.dayOfWeek == 6) {
				// 今月の末日が(土)の場合は表示しない
				end_jd = final_dt.julian;
			} else {
				end_jd = final_dt.julian + (7 - (final_dt.dayOfWeek + 1));
			}
		}
		end_dt = new Calendar.Date(end_jd, p_cd.option);
	}

	var m_body = document.createElement('div');
	m_body.classList.add("m-body");
	top_element.appendChild(m_body);

	var	dismax = false;
	if (p_parameter.moon_hidden
	&&	p_parameter.holiday_name_hidden
	&&	p_parameter.fest_name_hidden
	&&	p_parameter.schedule_name_hidden) {
		// a2の月を非表示,a3の名称を非表示にする場合
		cssroot("--cell-font-size-day-multiplie", 1.5); // a1の日付フォントを大きく
		dismax = true;	// カレンダーのcellのa1を最大、a2,a3を非表示
	}

	var format_str;
	if (p_cd.local.constructor.name.includes("CalcGB")) {
		format_str = 'D MMM YYYY';
	} else
	if (p_cd.local.constructor.name.includes("CalcUS")) {
		format_str = 'MMM D, YYYY';
	} else
	if (p_cd.local.constructor.name.includes("CalcJP")) {
		format_str = 'P[Gｇ年] YYYY-M-D';
	} else {
		format_str = 'YYYY-MM-DD';	//ISO 8601
	}

	for (var jd = bigen_dt; jd <= end_dt; jd.day += 1) {

		var	this_month = true;
		if (jd < first_dt || final_dt < jd) {
			// jdが今月ではない場合
			this_month = false;
		}

		// 祝日、祭日、予定日の取得
		var holiday_name = jd.holidayCheck();
		var fest_name = jd.seasonFestCheck();
		var schedule_name = jd.scheduleCheck();

		var title = "";
		if (!Parameter.tips_disp) {
			// holiday_name, fest_name, schedule_nameは","(カンマ)区切りで結合する。
			// また、htmlタグは削除してテキストのみ抽出
			title = jd.toString(format_str) + " (" + jd.toString("aaa") + ")" +
				" " + [holiday_name, fest_name, schedule_name].filter(Boolean).join().replace(
					/<[\w]+[^>]*>([^<]*)<\/[\w]+[^>]*>/g, "$1");
		}

		var	html = `
			<div class="cell
					${(this_month && today.valueOf() == jd.valueOf()) ? 'now' : ''}
					${this_month ? '' : 'out'}
					${jd.dayOfWeek == 0 ? 'sun' : ''}
					${(jd.dayOfWeek == 6 && p_parameter.saturday_coloring) ? 'sat' : ''}
					${dismax ? 'dismax' : ''}
					${(holiday_name && !p_parameter.holiday_name_hidden) ? 'holiday-name' : ''}
					${(fest_name && !p_parameter.fest_name_hidden) ? 'fest-name' : ''}
					${(schedule_name && !p_parameter.schedule_name_hidden) ? 'schedule-name' : ''}
				"
				title="${title.trim()}"
				>
				<div class="a1">
					<time class="day" datetime="${jd.toString('YYYY-MM-DD')}">${jd.day}</time>
				</div>
		`;
		if (! dismax) {
			html += `
				<div class="a2">
					<canvas class="moon_canvas"></canvas>
				</div>
				<div class="a3">
			`;
			html += (holiday_name && !p_parameter.holiday_name_hidden) ? `<span class="holiday-name">${holiday_name}</span>` : "";
			html += (fest_name && !p_parameter.fest_name_hidden) ? `<span class="fest-name">${fest_name}</span>` : "";
			html += (schedule_name && !p_parameter.schedule_name_hidden) ? `<span class="schedule-name">${schedule_name}</span>` : "";
			html += `
				</div>
			`;
		}
		html += `
			</div>
		`;

		var dummy = document.createElement('div');
		dummy.innerHTML = html.replace(/[\s]+/g, ' ');

		// 月
		if (!p_parameter.moon_hidden) {
			Calendar.Physics.drawMoon(dummy.querySelector("canvas.moon_canvas")
				, jd.year, jd.month, jd.day, {
					fillColor: cssroot("--hq-calendar-color-moon"),
				});
		}

		var	cell = dummy.firstElementChild;
		m_body.appendChild(cell);

		//----------------------------------------------------
		//	吹き出し
		//----------------------------------------------------
		//		 2025年  1月  睦月
		//		日 月 火 水 木 金 土
		//		29 30 31  1  2  3  4
		//		 5  6  7  8  9 10 11
		//		12 13 14 15 16 17 18
		//		19 20 21 22 23 24 25
		//		26 27 28 29 30 31  1
		//		┌──────────┐	← 日ごとのここを作成
		//		│                    │	← 日ごとのここを作成
		//		│令和７年    26   ● │	← 日ごとのここを作成
		//		│2025年 2月      水曜│	← 日ごとのここを作成
		//		│                    │	← 日ごとのここを作成
		//		│祝日  スポーツの日  │	← 日ごとのここを作成
		//		│祭日  七夕,小暑     │	← 日ごとのここを作成
		//		│予定  オリンピック  │	← 日ごとのここを作成
		//		└──────────┘	← 日ごとのここを作成
		//----------------------------------------------------
		// 当月の日付の場合
		cell.appendChild(creatDailyBubble(jd, today, holiday_name, fest_name, schedule_name, is_jp, p_parameter, tips_info));
	}

	return top_element;
}
//=====================================================
// 吹き出し作成(日めくりカレンダーに近い)
//=====================================================
function creatDailyBubble(jd, today, holiday_name, fest_name, schedule_name, is_jp, p_parameter, p_tips_info) {

	var local_year_text;
	if (is_jp) {
		local_year_text = jd.toString('Gｇ年') + " " + jd.toString("MMMMM");
	} else {
		local_year_text = jd.toString("MMMMM");
	}

	var year_text;
	if (is_jp) {
		year_text = jd.toString('YYYY年#M月');
	} else {
		year_text = jd.toString('#M, YYYY');
	}

	var week_text;
	if (is_jp) {
		week_text = jd.toString("aaa曜");
	} else {
		week_text = jd.toString("aaaa");
	}

	//	┌──────────┐	← ここを作成
	//	│                    │	← ここを作成
	//	│令和７年    26   ● │	← ここを作成
	//	│2025年 2月      水曜│	← ここを作成
	//	│                    │	← ここを作成
	//	│祝日  スポーツの日  │	← ここを作成
	//	│祭日  七夕,小暑     │	← ここを作成
	//	│予定  オリンピック  │	← ここを作成
	//	└──────────┘	← ここを作成
	var style_tp_width = "";
	if(local_year_text.length >= p_tips_info.base_t_l || year_text.length >= p_tips_info.base_t_g) {
		var	target_l = calcTextWidth_ToUseDOM(local_year_text).width;
		var	target_g = calcTextWidth_ToUseDOM(year_text).width;
		if (target_l > p_tips_info.base_l || target_g > p_tips_info.base_g) {
			var	ratel = target_l/p_tips_info.base_l;
			var	rateg = target_g/p_tips_info.base_g;
			if(ratel > 1 || rateg > 1) {
				var	rate = Math.max(ratel, rateg);
				var	width = (Math.round(p_tips_info.tips_w * rate * 0.95 * 100)/100);
				width = Math.min(width, 600);
				style_tp_width = 'style="width:' + width + 'px;"';
			}
		}
	}

	var	html = `
		<div class="hq-tips
					${today.valueOf() == jd.valueOf() ? 'now' : ''}
					${jd.dayOfWeek == 0 ? 'sun' : ''}
					${(jd.dayOfWeek == 6 && p_parameter.saturday_coloring) ? 'sat' : ''}
					${(holiday_name && !p_parameter.holiday_name_hidden) ? 'holiday-name' : ''}
					${(fest_name && !p_parameter.fest_name_hidden) ? 'fest-name' : ''}
					${(schedule_name && !p_parameter.schedule_name_hidden) ? 'schedule-name' : ''}
					"
					${style_tp_width}
		>
			<div class="t-essence">
				<div class="sa1">
					<time class="t-local-year-month" datetime="${jd.toString('YYYY-MM-DD')}">${local_year_text}</time>
					<time class="t-global-year-month" datetime="${jd.toString('YYYY-MM-DD')}">${year_text}</time>
				</div>
				<div class="sa2">
					<time class="t-date" datetime="${jd.toString('YYYY-MM-DD')}">${jd.toString('#D')}</time>
				</div>
				<div class="sa3">
					<canvas class="t-moon"></canvas>
					<time class="t-week" datetime="${jd.toString('YYYY-MM-DD')}">${week_text}</time>
				</div>
			</div>
	`;

	if ((holiday_name && holiday_name.length > 0)
	|| (fest_name && fest_name.length > 0)
	|| (schedule_name && schedule_name.length > 0)) {

		html += `
			<div class="t-addition">
				<ul class="t-list">
					<li class="holiday">
						<dl class="t-dl">
		`;
				if(holiday_name) {
					if (is_jp) {
						html += `<dt class="t-dt">祝日</dt>`;
					} else {
						html += `<dt class="t-dt">holiday</dt>`;
					}
					holiday_name.forEach(name => {
						html += `<dd class="t-dd">${name}</dd>`;
					});
				}
		html += `
						</dl>
					</li>
					<li class="fest">
						<dl class="t-dl">
		`;
				if(fest_name) {
					if (is_jp) {
						html += `<dt class="t-dt">祭日</dt>`;
					} else {
						html += `<dt class="t-dt">festival</dt>`;
					}
					fest_name.forEach(name => {
						html += `<dd class="t-dd">${name}</dd>`;
					});
				}
		html += `
						</dl>
					</li>
					<li class="schedule">
						<dl class="t-dl">
		`;
				if(schedule_name) {
					if (is_jp) {
						html += `<dt class="t-dt">${jd.valueOf() >= today.valueOf() ? '予定' : ''}</dt>`;
					} else {
						html += `<dt class="t-dt">${jd.valueOf() >= today.valueOf() ? 'schedule' : ''}</dt>`;
					}
					schedule_name.forEach(name => {
						html += `<dd class="t-dd">${name}</dd>`;
					});
				}
		html += `
						</dl>
					</li>
				</ul>
			</div>
		`;
	}
	html += `
		</div>
	`;

	var dummy = document.createElement('div');
	dummy.innerHTML = html.replace(/[\s]+/g, ' ');

	// 月
	Calendar.Physics.drawMoon(dummy.querySelector("canvas.t-moon")
		, jd.year, jd.month, jd.day, {
			fillColor: cssroot("--hq-calendar-color-moon"),
		});

	return dummy.firstElementChild;
}
//=====================================================
// 吹き出しイベント
//=====================================================
// 今日の印(".now")を付け替えるためのチェック時刻
const __hq_maxInterval = 10 * 60 * 1000;	// 10minutes
var __GlovalPreTime;
var __GlovalPretimeoutID = 0;

function todaysChangeCheck() {

	document.querySelectorAll(".hq-calendar .hq-calendar-month .cell.now-blink").forEach(
	// 点滅させ終わったら不要なclassなので剥がしておく
		elm => {
			elm.classList.remove("now-blink");
		});

	var today = Parameter.calendar.Now.round({smallestUnit: 'day', roundingMode: 'trunc'});

	if (__GlovalPreTime
	&& (__GlovalPreTime.offset == today.offset)
	&& (__GlovalPreTime.year != today.year
	||	__GlovalPreTime.month != today.month
	||	__GlovalPreTime.day != today.day)) {
		// 初回、又は 年・月・日の何れかが不一致になった場合
		// ".now"を除去する
		document.querySelectorAll(".hq-calendar .hq-calendar-month .cell.now").forEach(
			elm => {
				elm.classList.remove("now");
			});

		var datetime = today.toString('YYYY-MM-DD');
		var dayNow = document.querySelector(".hq-calendar .hq-calendar-month .cell .day[datetime='" + (datetime) + "']");
		if (dayNow) {
			var todayCell = dayNow.closest(".cell");
			// カレンダーに今日が表示されている場合
			todayCell.classList.add("now");
			// 日付が変わったので、今日を点滅させる
			todayCell.classList.add("now-blink");
		}
	}
	__GlovalPreTime = { ...today.toJSON() };

	// interval の正時(1時間なら 00:00:00,01:00:00,.. 1分なら 00:00, 01:00,...)となるようにTimeoutを調整する
	// intervalが大きい場合、処理が重く時間がずることを考慮して小さいintervalで再帰実行して近づける
	var	curr = new Calendar.Date();
	var	next = new Calendar.Date(curr);
	next.round({
	  smallestUnit: 'day',
	  roundingIncrement: 1,
	  roundingMode: 'ceil'
	});
	var	nextInterval = next.valueOf() - curr.valueOf();
	clearTimeout(__GlovalPretimeoutID);
	__GlovalPretimeoutID = setTimeout(todaysChangeCheck, nextInterval > __hq_maxInterval ? __hq_maxInterval : nextInterval);
}

function loadEvent_51() {

	/*

		□基準の開き方
		┌─────────────────────────┐
		│                                                  │
		│                     ┌──┐                     │
		│                     │25●│                     │
		│               ┌────────┐---            │
		│               │    └──┘    │ ^             │
		│               │                │ |             │
		│               │                │tipsHeight     │
		│               │                │ |             │
		│               │                │ v             │
		│               └────────┘---            │
		│               |<--- tipsWidth -->|               │
		│                                                  │
		│                                                  │
		└─────────────────────────┘


	    □右寄りの開き方
	    ─────────────┐               ────────────┐
	                              │                                       │
	                              │                                       │
	                      ┌──┐│                               ┌──┐│
	                      │25●││                               │25●││
	                ┌─────┼──┐             ┌────────┐││
	                │    └──┘│  │             │            └─┼┘│
	                │            │  │  ⇒         │                │  │
	                │            │  │             │                │  │
	                │            │  │             │                │  │
	                │            │  │             │                │  │
	                └────────┘             └────────┘  │
	                              │                                       │
	                              │                                       │
	    ─────────────┘               ────────────┘

	    □左寄りの開き方
	        ┌─────────────         ┌─────────────
	        │                                   │
	        │ ┌──┐                          │ ┌──┐
	        │ │25●│                          │ │25●│
	    ┌─┼──────┐                     │ │  ┌────────┐
	    │  │ └──┘   │                     │ └─┼┘              │
	    │  │            │               ⇒    │     │                │
	    │  │            │                     │     │                │
	    │  │            │                     │     │                │
	    │  │            │                     │     │                │
	    └─┼──────┘                     │     └────────┘
	        │                                   │
	        │                                   │
	        │                                   │
	        └─────────────         └─────────────

	                                                                │                                                  │
	    □下寄りの開き方
	    │                                                  │      │               ┌────────┐               │
	    │                                                  │      │               │                │               │
	    │                                                  │      │               │                │               │
	    │                                                  │  ⇒  │               │                │               │
	    │                     ┌──┐                     │      │               │    ┌──┐    │               │
	    │                     │25●│                     │      │               │    │25●│    │               │
	    │               ┌────────┐               │      │               └────────┘               │
	    │               │    └──┘    │               │      │                     └──┘                     │
	    └─────────────────────────┘      └─────────────────────────┘
	                     │                │
	                     │                │
	                     │                │
	                     └────────┘

	*/
	CalenderGeneral.delegate(".cell:not(.out)", 'mousemove', (event, this_elm) => {

		if (!Parameter.tips_disp) {
			// 「日付吹き出し」非表示の場合は終了する
			return;
		}

		var isDispTips = Array.from(document.querySelectorAll(".hq-tips")).filter(e => e.style.display == "block");
		if (isDispTips && isDispTips.length > 0) {
			// 表示中のtipsが在る場合は他のtipsは表示させないため、終了する
			//	マウスがクリックされた位置が、ターゲット要素内であるかを判定
			var displayCount = isDispTips.length;
			isDispTips.forEach(elm => {
				var click = CalenderGeneral.isPointInElement([event.pageX, event.pageY], elm);
				if (!click) {
					// マウスから離れた吹き出しの場合、非表示にする
					// ※本来は当メソッドの'mouseleave'イベントで非表示になるハズだが
					//   漏れるものがあるので、ここで非表示にする。
					elm.style.display = "none";
					displayCount--;
				}
			});
			if (displayCount > 0) {
				// 表示中の吹き出しがある場合は終了する。
				// ここを通るのはtipsの上でマウス動かしているとき。
				// tipsの文言をコピーできるようにしている
				return;
			}
		}
		// tips のサイズ
		var tips = this_elm.querySelector(".hq-tips");
		if (!tips) {
			return;
		}
		// tips を表示 (次の処理でサイズを取得するため)
		tips.style.display = "block";

		// cell の端の情報
		let cellRect = this_elm.getBoundingClientRect();

		// cellの[flex-direction]が"row-reverse"の場合
		// tipsの水平方向の座標が反転する
		var	dir_reverse = window.getComputedStyle(this_elm, null)["flex-direction"] == "row-reverse";

		var transformX = "";
		var transformHorizontal = Number.MAX_SAFE_INTEGER;
		// □右寄りの開き方
		if (cellRect.right + tips.offsetWidth / 2 > window.innerWidth) {
			if(dir_reverse) {
				// cellの[flex-direction]が"row-reverse"の場合
				transformHorizontal = 0;
			} else {
				transformHorizontal = -tips.offsetWidth + cellRect.width;
			}
		}
		// □左寄りの開き方
		if (cellRect.left - tips.offsetWidth / 2 < 0) {
			if(dir_reverse) {
				// cellの[flex-direction]が"row-reverse"の場合
				transformHorizontal = tips.offsetWidth - cellRect.width;
			} else {
				transformHorizontal = 0;
			}
		}
		// □水平方向の基準の開き方
		if (transformHorizontal == Number.MAX_SAFE_INTEGER) {
			if(dir_reverse) {
				// cellの[flex-direction]が"row-reverse"の場合
				transformHorizontal =  tips.offsetWidth / 2 - cellRect.width / 2;
			} else {
				transformHorizontal = -tips.offsetWidth / 2 + cellRect.width / 2;
			}
		}
		if (transformHorizontal) {
			transformX += "translateX(" + (transformHorizontal) + "px)";
		}

		var transformY = "";
		var transformVertical = Number.MAX_SAFE_INTEGER;
		var overlap = cssroot("--hq-tips-bottom-overlap");
		// □下寄りの開き方
		if ((cellRect.bottom - overlap) + tips.offsetHeight > window.innerHeight) {
			transformVertical = (cellRect.bottom - overlap) + tips.offsetHeight - window.innerHeight;
			transformVertical = -tips.offsetHeight + overlap;
		}
		// □垂直方向の基準の開き方）
		if (transformVertical == Number.MAX_SAFE_INTEGER) {
			transformVertical = cellRect.height - overlap;
		}
		if (transformVertical) {
			transformY += "translateY(" + (transformVertical) + "px)";
		}

		// tipsを表示位置へ移動
		tips.style.transform = transformX + " " + transformY;

		// マウスのカーソルがcell又はtipsの外に移動したときにtipsを消します
		tips.addEventListener('mouseleave', e => e.currentTarget.style.display = "none");
		this_elm.addEventListener('mouseleave', e => e.currentTarget.querySelector(".hq-tips").style.display = "none");
	});

	clearTimeout(__GlovalPretimeoutID);
	__GlovalPretimeoutID = setTimeout(todaysChangeCheck, 0);
}
GlovalParameterLoadPromise.then( () => {
	window.addEventListener('load', loadEvent_51);
	if (document.readyState == "complete") {
		setTimeout(loadEvent_51, 0);
	}
});

