# HANDOFF

## このプロジェクトについて
カヤックフィッシング中にスマホのGPSから現在地の海図水深を大きな数字だけで表示するPWA。
海釣図Vのような魚探アプリの画面が沖合・電波不安定な状況でも見やすいようにと作成。

## データについて
- 対象エリア: 大分県佐伯市 波当津海岸（蒲江）周辺（緯度32.55〜32.95、経度131.70〜132.05）
- 水深の値: GMRT (Global Multi-Resolution Topography, gmrt.org) の水深グリッド、解像度は約50〜60m四方
- 表示される水深は「海図水深の参考値」であり、リアルタイムの音響測深ではない。潮汐補正もしていない
- 海岸線の形状: GMRTの生データだけだと海岸線がかなり単純化されて実際のGoogleマップ等と似ても似つかない
  形になっていたため、OpenStreetMapのcoastlineデータ(Overpass API)から正確な海岸線を取得し、
  陸/海の判定(値の符号)だけをOSMの境界に置き換えている。水深の値自体はGMRT由来のまま（参考値）
- depth_data.bin: Int16(リトルエンディアン)、0.1m単位。値は「海抜(プラス=陸)」「マイナス=水深」。nodata=-32768
- グリッドの原点・刻み幅は index.html 内の META オブジェクトに直接埋め込み済み

## 技術ポイント
- 完全にクライアントサイドで動作（サーバー側ロジックなし、静的ファイルのみ）
- GPS取得: navigator.geolocation.watchPosition
- Service Worker (sw.js) で全アセットをキャッシュし、一度読み込めば圏外でも動作
- 陸地判定セルにヒットした場合、周辺セル(最大6マス四方)から最も近い水面下セルを探索してフォールバック（海岸線付近のGPS誤差対策）
- 深度に応じて文字色を変更（1.5m未満=赤/危険、4m未満=黄/注意、それ以上=緑/安全）

## 公開方法
GitHub Pages（xrkazz-creator/kayak-suishinkei）で公開。HTTPS必須（Service Worker・Geolocationの secure context 要件のため、LAN経由のプレーンHTTPでは正常動作しない）。

## 他エリアを追加する場合
1. GMRT GridServer APIで対象範囲のGeoTIFFを取得
   `https://www.gmrt.org/services/GridServer?minlongitude=X&maxlongitude=X&minlatitude=X&maxlatitude=X&format=geotiff&resolution=max&layer=topo`
2. Overpass APIで同じbboxのnatural=coastlineを取得し、wayを連結してポリゴン化、
   scipy.ndimage.labelで海側の連結成分を判定してis_seaマスクを作る（陸/海境界の精度はこちらが正）
3. GMRTのdepth値の絶対値 × is_seaマスクの符号 でInt16(0.1m単位)にしてdepth_data.binを作り直す
4. index.html内のMETAオブジェクト（width/height/lon0/lat0/dlon/dlat）を新しい値に更新
（詳細手順は会話ログのbuild_coastmask.py/build_corrected_bin.py相当のスクリプトを参照）

## 次にやること
（次回作業時にここを更新）
