"use strict";
/**
 * IndexedDB library with Promises 1.0.0
 * Copyright 2025 Kazuhiro Hosoya
 * Released under the MIT License
 * Released on: 2025-10-24
 */

/* ===================================================================
 *
 *	Promise を使用したIndexed DBのライブラリ
 *
 *		## ＤＢ 接続
 *		## ＤＢ 接続を閉じる
 *		## データロード
 *		## データクリア
 *		## データ削除
 *		## データ更新
 *		## データ取得
 *		## 全データ取得
 * ------------------------------------------------------------------ */
const __META_KEY__ = 'last_updated';
// true:debug文を表示, false:debug文非表示
var	__DEBUG__ = false;
function promiseIndexedDB_debug(debug_bool) {
	__DEBUG__ = debug_bool;
}

var __NO_OP__ = false;
function promiseIndexedDB_noop(noop_bool) {
	__NO_OP__ = noop_bool;
}

//-------------------------------------------------------------------------
//	ＤＢ 接続
//-------------------------------------------------------------------------
function promiseIndexedDB_open(dbname, version, versionchange) {
	__DEBUG__ ? console.log("【promiseIndexedDB_open】"+dbname) : ()=>{};
	return new Promise((resolve, reject) => {
		if (__NO_OP__) {
			// 何もしない処理
			resolve();
			return;
		}
		const req = indexedDB.open(dbname, version);
		req.onerror = e => {
			__DEBUG__ ? console.error("【"+(req.constructor.name)+"】[onerror]", e) : ()=>{};
			reject();
		}
		req.onblocked = e => {
			__DEBUG__ ? console.warn("【"+(req.constructor.name)+"】[onblocked]", e) : ()=>{};
			reject();
		}
		req.onsuccess = e => {
			__DEBUG__ ? console.info("【"+(req.constructor.name)+"】[onsuccess]") : ()=>{};
			resolve(e.target.result);
		}
		req.onupgradeneeded = e => {
			__DEBUG__ ? console.info("【"+(req.constructor.name)+"】[onupgradeneeded]") : ()=>{};
			const db = e.target.result;
			db.onabort = e => __DEBUG__ ? console.error("【"+(db.constructor.name)+"】[onabort]", e) : ()=>{};
			db.onclose = e => __DEBUG__ ? console.info("【"+(db.constructor.name)+"】[onclose]", e) : ()=>{};
			db.onerror = e => __DEBUG__ ? console.error("【"+(db.constructor.name)+"】[onerror]", e) : ()=>{};
			db.onversionchange = e => __DEBUG__ ? console.info("【"+(db.constructor.name)+"】[onversionchange]", e) : ()=>{};
			if(versionchange) versionchange(db);
		};
	});
}

//-------------------------------------------------------------------------
//	ＤＢ 接続を閉じる
//-------------------------------------------------------------------------
function promiseIndexedDB_close(db) {
	__DEBUG__ ? console.log("【promiseIndexedDB_close】") : ()=>{};
	if (__NO_OP__) {
		// 何もしない処理
		return db;
	}
	if(db) {
		db.close();
	}
	return db;
}

//-------------------------------------------------------------------------
//	ＤＢ 削除
//-------------------------------------------------------------------------
function promiseIndexedDB_drop(dbname) {
	__DEBUG__ ? console.log("【promiseIndexedDB_drop】") : ()=>{};
	return new Promise(resolve => {
		if (__NO_OP__) {
			// 何もしない処理
			resolve();
			return;
		}
		const req = indexedDB.deleteDatabase(dbname);

		req.onsuccess = () => resolve(true);
		req.onerror = () => resolve(false);
		req.onblocked = () => resolve(false);
	});
}

//-------------------------------------------------------------------------
//	データロード
//-------------------------------------------------------------------------
function promiseIndexedDB_load(db, osname, datalist) {
	__DEBUG__ ? console.log("【promiseIndexedDB_load】") : ()=>{};
	if (__NO_OP__) {
		// 何もしない処理
		return db;
	}
	const t = db.transaction(osname, "readwrite");
	t.onabort = e => __DEBUG__ ? console.error("【"+(t.constructor.name)+"】[onabort]", e) : ()=>{};
	t.oncomplete = e => __DEBUG__ ? console.info("【"+(t.constructor.name)+"】[oncomplete]") : ()=>{};
	t.onerror = e => __DEBUG__ ? console.error("【"+(t.constructor.name)+"】[onerror]", e) : ()=>{};
	const objstr = t.objectStore(osname);
	datalist.forEach( data => {
		data[__META_KEY__] = (new Date).toISOString();
		const req = objstr.add(data);
		req.onerror = e => __DEBUG__ ? console.error("【"+(req.constructor.name)+"】[onerror]", e) : ()=>{};
		req.onsuccess = e => __DEBUG__ ? console.info("【"+(req.constructor.name)+"】[onsuccess]") : ()=>{};
	});
	return db;
}

//-------------------------------------------------------------------------
//	データクリア
//-------------------------------------------------------------------------
function promiseIndexedDB_clear(db, osname) {
	__DEBUG__ ? console.log("【promiseIndexedDB_clear】") : ()=>{};
	return new Promise((resolve, reject) => {
		if (__NO_OP__) {
			// 何もしない処理
			resolve();
			return;
		}
		const t = db.transaction([osname], 'readwrite');
		t.onabort = e => {
			__DEBUG__ ? console.error("【"+(t.constructor.name)+"】[onabort]", e) : ()=>{};
			reject(t.error || "abort");
		}
		t.onerror = e => {
			__DEBUG__ ? console.error("【"+(t.constructor.name)+"】[onabort]", e) : ()=>{};
			reject(t.error);
		}
		t.oncomplete = e => __DEBUG__ ? console.info("【"+(t.constructor.name)+"】[oncomplete]") : ()=>{};
		const obj_store = t.objectStore(osname);
		const req = obj_store.clear();
		req.onerror = e => reject(req.error);
		req.onsuccess = e => resolve(req.result);
	});
}

//-------------------------------------------------------------------------
//	データ削除
//-------------------------------------------------------------------------
function promiseIndexedDB_delete(db, osname, key) {
	__DEBUG__ ? console.log("【promiseIndexedDB_delete】") : ()=>{};
	return new Promise((resolve, reject) => {
		if (__NO_OP__) {
			// 何もしない処理
			resolve();
			return;
		}
		const t = db.transaction([osname], 'readwrite');
		t.onabort = e => {
			__DEBUG__ ? console.error("【"+(t.constructor.name)+"】[onabort]", e) : ()=>{};
			reject(t.error || "abort");
		}
		t.onerror = e => {
			__DEBUG__ ? console.error("【"+(t.constructor.name)+"】[onabort]", e) : ()=>{};
			reject(t.error);
		}
		t.oncomplete = e => __DEBUG__ ? console.info("【"+(t.constructor.name)+"】[oncomplete]") : ()=>{};
		const obj_store = t.objectStore(osname);
		const req = obj_store.delete(key);
		req.onerror = e => reject(req.error);
		req.onsuccess = e => resolve(req.result);
	});
}

//-------------------------------------------------------------------------
//	データ更新
//-------------------------------------------------------------------------
function promiseIndexedDB_put(db, osname, data) {
	__DEBUG__ ? console.log("【promiseIndexedDB_put】") : ()=>{};
	return new Promise((resolve, reject) => {
		if (__NO_OP__) {
			// 何もしない処理
			resolve();
			return;
		}
		const t = db.transaction([osname], 'readwrite');
		t.onabort = e => {
			__DEBUG__ ? console.error("【"+(t.constructor.name)+"】[onabort]", e) : ()=>{};
			reject(t.error || "abort");
		}
		t.onerror = e => {
			__DEBUG__ ? console.error("【"+(t.constructor.name)+"】[onabort]", e) : ()=>{};
			reject(t.error);
		}
		t.oncomplete = e => __DEBUG__ ? console.info("【"+(t.constructor.name)+"】[oncomplete]") : ()=>{};
		const obj_store = t.objectStore(osname);
		data[__META_KEY__] = (new Date).toISOString();
		const req = obj_store.put(data);
		req.onerror = e => reject(req.error);
		req.onsuccess = e => resolve(req.result);
	});
}

//-------------------------------------------------------------------------
//	データ取得
//-------------------------------------------------------------------------
// promiseIndexedDB_get と promiseIndexedDB_getAll はPromiseを返すように修正
// 元のコードには欠陥があり、`get`と`getAll`はdbを返し、Promiseは変数に格納されるだけで返されていなかったため、修正が必要です。
function promiseIndexedDB_get(db, osname, key) {
	__DEBUG__ ? console.log("【promiseIndexedDB_get】") : ()=>{};
	return new Promise((resolve, reject) => {
		if (__NO_OP__) {
			// 何もしない処理
			resolve();
			return;
		}
		const t = db.transaction([osname], 'readonly');
		t.onabort = e => {
			__DEBUG__ ? console.error("【"+(t.constructor.name)+"】[onabort]", e) : ()=>{};
			reject(t.error || "abort");
		}
		t.onerror = e => {
			__DEBUG__ ? console.error("【"+(t.constructor.name)+"】[onabort]", e) : ()=>{};
			reject(t.error);
		}
		const obj_store = t.objectStore(osname);
		const req = obj_store.get(key);
		req.onerror = e => reject(req.error);
		req.onsuccess = e => resolve(req.result);
	});
}

//-------------------------------------------------------------------------
//	全データ取得
//-------------------------------------------------------------------------
function promiseIndexedDB_getAll(db, osname) {
	__DEBUG__ ? console.log("【promiseIndexedDB_getAll】") : ()=>{};
	return new Promise((resolve, reject) => {
		if (__NO_OP__) {
			// 何もしない処理
			resolve();
			return;
		}
		const t = db.transaction([osname], 'readonly');
		t.onabort = e => {
			__DEBUG__ ? console.error("【"+(t.constructor.name)+"】[onabort]", e) : ()=>{};
			reject(t.error || "abort");
		}
		t.onerror = e => {
			__DEBUG__ ? console.error("【"+(t.constructor.name)+"】[onabort]", e) : ()=>{};
			reject(t.error);
		}
		const obj_store = t.objectStore(osname);
		const req = obj_store.getAll();
		req.onerror = e => reject(req.error);
		req.onsuccess = e => resolve(req.result);
	});
}


/* ===================================================================
 *
 *	promiseIndexedDB を使った function
 *
 *		### ＤＢ スキーマ変更
 *		### ＤＢ データロード
 *		### ＤＢ データ更新
 *		### ＤＢ データ取得
 *		### ＤＢ 全データ取得
 * ------------------------------------------------------------------ */

//===========================
//	ＤＢ スキーマ変更 (CREATE DATABASE & CREATE TABLE データストア)
//===========================
async function idbSchema(dbname, version, versionchange) {
	promiseIndexedDB_open(dbname, version, versionchange).then(db => promiseIndexedDB_close(db));
}

//===========================
//	ＤＢ 削除 (DROP DATABASE)
//===========================
async function idbDrop(dbname) {
	return await promiseIndexedDB_drop(dbname);
}

//===========================
//	ＤＢ データロード (INNSERT INTO データストア)
//===========================
async function idbLoad(dbname, osname, datalist) {
	let db;
	try {
		db = await promiseIndexedDB_open(dbname);
		await promiseIndexedDB_load(db, osname, datalist);
	} finally {
		promiseIndexedDB_close(db);
	}
}

//===========================
//	ＤＢ データクリア (TRUNCATE データストア)
//===========================
async function idbClear(dbname, osname, key) {
	let db;
	try {
		db = await promiseIndexedDB_open(dbname);
		await promiseIndexedDB_clear(db, osname, key);
	} finally {
		promiseIndexedDB_close(db);
	}
}

//===========================
//	ＤＢ データ削除 (DELETE データストア)
//===========================
async function idbDelete(dbname, osname, key) {
	let db;
	try {
		db = await promiseIndexedDB_open(dbname);
		await promiseIndexedDB_delete(db, osname, key);
	} finally {
		promiseIndexedDB_close(db);
	}
}

//===========================
//	ＤＢ データ更新 (UPDATE データストア)
//===========================
async function idbPut(dbname, osname, data) {
	let db;
	try {
		db = await promiseIndexedDB_open(dbname);
		await promiseIndexedDB_put(db, osname, data);
	} finally {
		promiseIndexedDB_close(db);
	}
}

//===========================
//	ＤＢ データ取得 (SELECT FROM データストア WHERE KEY)
//===========================
async function idbGet(dbname, osname, key) {
	let db;
	try {
		db = await promiseIndexedDB_open(dbname);
		return await promiseIndexedDB_get(db, osname, key);
	} finally {
		promiseIndexedDB_close(db);
	}
}

//===========================
//	ＤＢ 全データ取得 (SELECT FROM データストア)
//===========================
async function idbGetAll(dbname, osname) {
	let db;
	try {
		db = await promiseIndexedDB_open(dbname);
		return await promiseIndexedDB_getAll(db, osname);
	} finally {
		promiseIndexedDB_close(db);
	}
}

//===========================
//	ＤＢ 存在確認
//	[使い方]
//		idbCheckDBExists("MyDB").then(exists => {
//			console.log(exists ? "存在する" : "存在しない");
//		});
//===========================
async function idbCheckDBExists(dbname) {
	async function validateIndexedDB(dbname) {
		// 既存 DB の一覧を取得
		const dbList = await indexedDB.databases();

		// DB が存在するか確認
		const targetDB = dbList.find(db => db.name === dbname);

		if (!targetDB) {
			return false;
		}

		// 存在する場合 → オブジェクトストアの有無を確認
		const hasStores = await idbIsDatabaseEmpty(dbname);

		if (!hasStores) {
			// オブジェクトストアが 0 個 → DB を削除
			await promiseIndexedDB_drop(dbname);
			return false;
		}

		// DB は存在し、オブジェクトストアもある
		return true;
	}

	return await validateIndexedDB(dbname);
}

//===========================
//	ＤＢ オブジェクトストア存在確認
//	[使い方]
//		idbCheckStoreExists("MyDB", "IncidentStore").then(exists => {
//			console.log(exists ? "存在する" : "存在しない");
//		});
//===========================
function idbCheckStoreExists(dbname, storeName) {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(dbname);
		req.onsuccess = () => {
			const db = req.result;
			const exists = db.objectStoreNames.contains(storeName);
			db.close();
			resolve(exists);
		};
		req.onerror = () => {
			indexedDB.deleteDatabase(dbname);
			reject(req.error);
		}

		// DBが存在しなかった場合、自動的に空のDBが作られここを通る
		req.onupgradeneeded = (event) => {
			// 新規作成時は必ずストア0個の状態から始まる
			indexedDB.deleteDatabase(dbname);
		};
	});
}
//===========================
//	ＤＢ オブジェクトストア空確認
//	@returns {Promise<boolean>} - ストアが0個ならtrue、1つ以上あればfalse
//	[使い方]
//		// 実行例
//		idbIsDatabaseEmpty('my_database').then(empty => {
//			if (empty) {
//				console.log("オブジェクトストアは1つもありません");
//			} else {
//				console.log("オブジェクトストアが存在します");
//			}
//		});
//===========================
function idbIsDatabaseEmpty(dbname) {
	return new Promise(resolve => {
		const req = indexedDB.open(dbname);

		req.onsuccess = (event) => {
			const db = event.target.result;

			// objectStoreNames（ストア名のリスト）の長さを確認
			const isEmpty = db.objectStoreNames.length === 0;

			db.close();
			if(isEmpty) {
				indexedDB.deleteDatabase(dbname);
			}
			resolve(! isEmpty);
		};

		req.onerror = () => {
			indexedDB.deleteDatabase(dbname);
			resolve(false);
		};

		// DBが存在しなかった場合、自動的に空のDBが作られここを通る
		req.onupgradeneeded = (event) => {
			// 新規作成時は必ずストア0個の状態から始まる
			indexedDB.deleteDatabase(dbname);
		};

	});
}
