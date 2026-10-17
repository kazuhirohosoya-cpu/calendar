"use strict";
/**
 * High Quality Calendar 1.0.0
 * Copyright 2022-2025 Kazuhiro Hosoya
 * Released under the MIT License
 * Released on: 2025-01-17
 */
//=====================================================
// テキストのサイズ（幅）を測る (canvas版)
//=====================================================
function calcTextWidth_ToUseCanvas(textString, fsize, ffamily) {
	var canvas = document.createElement('canvas');
	var context = canvas.getContext('2d');
	if(fsize && ffamily) {
		context.font = (fsize ? fsize : "") + " " + (ffamily ? ffamily : "");
	}
	var metrics = context.measureText(String(textString));
	return {width:metrics.width};
}
//=====================================================
// テキストのサイズ（幅ｘ高さ）を測る (DOM版)
//=====================================================
function calcTextWidth_ToUseDOM(textString, fsize, ffamily, fweight) {
	var span = document.createElement('span');
	span.style.position = 'absolute';
	span.style.top = '-1000px';
	span.style.left = '-1000px';
	span.style.whiteSpace = 'nowrap';
	span.innerHTML = textString;
	if(fsize) span.style.fontSize = parseFloat(fsize) + "px";;
	if(fweight) span.style.fontWeight = fweight;
	if(ffamily) span.style.fontFamily = ffamily;
	document.body.appendChild(span);
	var size = {width:span.clientWidth, height:span.clientHeight};
	span.parentElement.removeChild(span);
	return size;
}
function loadEvent_11() {
	//=====================================================
	// 時刻の更新
	//=====================================================
		const	local_time = document.querySelector(".time");	// hh:mm:ss
		const	time_standard = document.querySelector(".time-standard");	// (UTC+x)

		var	time_format = Parameter.large_time_format;
		var setClockTime = () => {
			// calendar.local が使える場合(Time Zone毎の時刻を使う)
			if(Parameter.calendar && local_time) {
				var	currtTime = Parameter.calendar.Now;
				if(! Parameter.__time_format_apply) {
					Parameter.__time_format_apply = true;
					// 大きな時刻の表示形式のサイズにより縮尺を調整
					if(document.querySelector(".hq-small-time-toggle")) {
					// small 指定がある場合
						time_format = Parameter.small_time_format;
					} else {
					// small 指定が無い場合
						time_format = Parameter.large_time_format;
					}
					var	dttime = currtTime.toString(time_format);
					// テキストの文字数によって、縮尺を調整
					var	fsize = cssroot("--clock-font-size-main-base");
					var	ffamily = cssroot("--hq-calendar-font");
					var	textSize = calcTextWidth_ToUseDOM(dttime, fsize, ffamily, 700);
					var	rate = Math.min(1161 /textSize.width, 334 /textSize.height);	//基準：{"width":1161,"height":334}
					cssroot("--clock-length-multiplier", rate);
				}
				// 時刻を表示する
				var	dttime = currtTime.toString(time_format);
				local_time.innerHTML = dttime;
				local_time.setAttribute('datetime', currtTime.toString("YYYY-MM-DDThh:mm:ss.SSS"));
				time_standard.innerHTML = "(" + currtTime.utcString() + ")";
			}
			setTimeout(setClockTime, 200);
		}
		setClockTime();

	//=====================================================
	// resize幅に合わせて時刻のサイズを変更
	//=====================================================
	// resizeで (window.innerWidth/window.screen.availWidth) 率
	window.addEventListener("resize", () => cssroot("--clock-settings-multiplier", (window.innerWidth/1920)));
	cssroot("--clock-settings-multiplier", (window.innerWidth/1920));
}
GlovalParameterLoadPromise.then( () => {
	window.addEventListener('load', loadEvent_11);
	if (document.readyState == "complete") {
		setTimeout(loadEvent_11, 0);
	}
});
