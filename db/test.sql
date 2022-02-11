UPDATE SQLITE_SEQUENCE SET SEQ=2 WHERE NAME='api_keys';

CREATE TABLE "checkin-template" (
	"barcodeNum"	INTEGER NOT NULL UNIQUE,
	"attended"	INTEGER NOT NULL DEFAULT 0,
	"lastModified"	TEXT,
	"modifiedBy"	TEXT,
	FOREIGN KEY("modifiedBy") REFERENCES "api_keys"("prefix"),
	FOREIGN KEY("barcodeNum") REFERENCES "users"("barcodeNum")
);

SELECT strftime('%Y-%m-%d %H:%M:%S', 'now') as now;
SELECT prefix as pre FROM api_keys WHERE key = '3dcf00d80e90468723b097f23cefc2f2';
INSERT INTO checkin (barcodeNum, attended, lastModified, modifiedBy) values (123, 1, strftime('%Y-%m-%d %H:%M:%S', 'now'), 'asdhusdk');

SELECT datetime(lastModified) FROM checkin;