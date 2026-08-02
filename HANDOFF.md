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

## 水深データソース調査ログ（2026-08-02）
「海しるAPI」（海洋状況表示システム公開API, portal.msil.go.jp）が水深データの代替になるか調査した結果、現状のGMRTより優れた無料の代替は見つからなかった。

- 海しる「等深線」API (`https://api.msil.go.jp/depth-contour/v2`)
  - 提供は20m/50m/100m/150m/200m間隔の等深線（ポリライン）のみ、最細でも20m刻み
  - 波当津海岸周辺のような沿岸浅場（危険/注意しきい値が1.5m/4m）はほぼ全域が等深線の内側になり実質データなし → 不採用
  - 要サブスクリプションキー（試用キーあり、個別発行は海保へ要問合せ）
- 海しる「潮汐推算 [リンク]」API (`https://api.msil.go.jp/oceanography/tide/prediction/links/v2`)
  - 数値そのものは返さず、験潮所一覧＋海保ページへの外部リンクを返すだけの仕様
  - 佐伯（験潮所コードX5、対象エリアに近い）は収録あり
  - 実際の毎時潮位数値が欲しい場合は気象庁(JMA)の無料公開データが直接使える：
    `https://ds.data.jma.go.jp/kaiyou/db/tide/suisan/suisan.php?stn=X5&ys=YYYY&ms=M&ds=D&ye=YYYY&me=M&de=D`
    （テキストデータ版もあり、APIキー不要。潮汐補正を実装する際はここが候補）
- J-EGG500（JODC, 500mメッシュ）、国土数値情報 沿岸海域メッシュ（1kmメッシュ、1990年データ）はGMRT(50〜60m)より粗く不採用
- M7000シリーズ（日本水路協会、海図ベース、沿岸部1〜10m間隔の等深線）は精度面で最有力だが**有料（68,200円/海域、税込）**、かつポリライン形式なので現状のOSM海岸線補正と同様の変換作業が別途必要
  - 商品ページ: https://www.jha.or.jp/jp/shop/products/btdd/

結論: 無料の範囲でGMRTを上回る水深データソースは無し。精度を上げるならM7000購入が唯一の現実的な選択肢。潮汐補正を追加するならJMA佐伯(X5)データが有力候補。
