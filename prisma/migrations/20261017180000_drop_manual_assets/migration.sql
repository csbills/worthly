-- Manual crypto and market assets were removed: the portfolio now comes only
-- from Pluggy.
PRAGMA foreign_keys=OFF;
DROP TABLE "ManualCryptoOrder";
DROP TABLE "ManualCryptoAsset";
DROP TABLE "ManualMarketOrder";
DROP TABLE "ManualMarketAsset";
PRAGMA foreign_keys=ON;
