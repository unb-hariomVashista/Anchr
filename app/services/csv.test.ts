import test from "node:test";
import assert from "node:assert/strict";
import { csvCell, csvRecords, parseCsv } from "./csv.server.ts";

test("parseCsv handles quotes, embedded newlines, CRLF and BOM", () => {
  const rows = parseCsv('﻿a,b\r\n"x, y","line1\nline2"\r\n"say ""hi""",z\r\n');
  assert.deepEqual(rows, [["a", "b"], ["x, y", "line1\nline2"], ['say "hi"', "z"]]);
});

test("csvRecords keys cells by header and numbers lines", () => {
  const { records, headers } = csvRecords("name,value\nA,1\n\nB,2");
  assert.deepEqual(headers, ["name", "value"]);
  assert.equal(records[1].values.name, "B");
  assert.equal(records[1].line, 3);
});

test("export guard round-trips and numbers stay raw", () => {
  assert.equal(csvCell("=SUM(A1)"), `"'=SUM(A1)"`);
  assert.equal(csvCell(-5), `"-5"`);
  const { records } = csvRecords(`v\n${csvCell("=SUM(A1)")}`);
  assert.equal(records[0].values.v, "=SUM(A1)");
});
