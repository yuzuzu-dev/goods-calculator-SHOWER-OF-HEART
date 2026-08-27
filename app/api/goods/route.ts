import { NextResponse } from "next/server";

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTGN0iL3gF_yElNQiR8TwYzDRNrDpLjfvaHkRZYTIbOa4Dfyn2o8vMmXd_3mwgfO6JTAsm7IKfvLGMX/pub?gid=0&single=true&output=csv";

function parseCSV(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    const nextChar = csv[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      cell += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if (
      (char === "\n" || char === "\r") &&
      !inQuotes
    ) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }

      row.push(cell);
      cell = "";

      if (row.some((value) => value.trim() !== "")) {
        rows.push(row);
      }

      row = [];
    } else {
      cell += char;
    }
  }

  if (cell !== "" || row.length > 0) {
    row.push(cell);

    if (row.some((value) => value.trim() !== "")) {
      rows.push(row);
    }
  }

  return rows;
}

export async function GET() {
  try {
    console.log("API: Google Sheets取得開始");

    const response = await fetch(SHEET_URL, {
      cache: "no-store",
    });

    console.log(
      "API: Google Sheets response",
      response.status,
      response.ok
    );

    if (!response.ok) {
      throw new Error(
        `Google Sheets取得失敗: ${response.status}`
      );
    }

    const csv = await response.text();

    console.log(
      "API: CSV取得完了",
      csv.slice(0, 200)
    );

    const rows = parseCSV(csv);
    const updatedAt = rows[0]?.[9]?.trim() || null;
    const dataRows = rows.slice(1);
    const errors: string[] = [];
    const seenIds = new Map<number, number>();
    const goods = dataRows
      .map((columns, index) => {
        const [
          id,
          name,
          price,
          limit,
          group,
          categories,
          variants,
          sort,
        ] = columns;

        const rowNumber = index + 2;

        const numericId = Number(id?.trim());

        if (!Number.isFinite(numericId)) {
        errors.push(`${rowNumber}行目: IDが数値ではありません。`);
        return null;
        }

        if (seenIds.has(numericId)) {
        errors.push(
            `${rowNumber}行目: ID ${numericId} は ${seenIds.get(numericId)}行目と重複しています。`
        );
        return null;
        }

        seenIds.set(numericId, rowNumber);

        if (!name?.trim()) {
          errors.push(`${rowNumber}行目: 商品名が空欄です。`);
          return null;
        }

        const priceText = price?.trim() ?? "";
        if (priceText === "") {
        errors.push(`${rowNumber}行目: 価格が空欄です。`);
        return null;
        }

        const numericPrice = Number(priceText);
        if (!Number.isFinite(numericPrice) || numericPrice < 0) {
        errors.push(
            `${rowNumber}行目: 価格が正しい数値ではありません。`
        );
        return null;
        }

        const numericLimit =
        limit?.trim() === ""
            ? null
            : Number(limit.trim());

        if (numericLimit !== null &&
        (!Number.isFinite(numericLimit) || numericLimit < 0)
        ) {
        errors.push(
            `${rowNumber}行目: 個数制限が正しい数値ではありません。`
        );
        return null;
        }
        const groupText = group?.trim() ?? "";

        if (!groupText) {
          errors.push(`${rowNumber}行目: 大カテゴリが空欄です。`);
          return null;
        }

        const categoriesText = categories?.trim() ?? "";

        if (!categoriesText) {
          errors.push(`${rowNumber}行目: 小カテゴリが空欄です。`);
          return null;
        }

        const sortText = sort?.trim() ?? "";

        if (sortText === "") {
        errors.push(`${rowNumber}行目: 表示順（sort）が空欄です。`);
        return null;
        }

        const numericSort = Number(sortText);

        if (!Number.isInteger(numericSort) || numericSort < 1) {
        errors.push(
            `${rowNumber}行目: 表示順（sort）が正しい整数ではありません。`
        );
        return null;
        }

        return {
          id: numericId,
          name: name?.trim() ?? "",
          price: Number.isFinite(numericPrice)
            ? numericPrice
            : 0,
          limit:
            numericLimit === null
              ? null
              : Number.isFinite(numericLimit)
                ? numericLimit
                : null,

          group: groupText,
          categories: categoriesText
            .split("・")
            .map((v) => v.trim())
            .filter(Boolean),
          variants: variants?.trim()
            ? variants
                .trim()
                .replace(/^"+|"+$/g, "")
                .split("|")
                .map((v) => v.trim())
                .filter(Boolean)
            : undefined,
          sort: numericSort,
        };
      })
      .filter((item) => item !== null);

    console.log(
      "API: 商品データ解析完了",
      goods.length,
      "件"
    );

    if (errors.length > 0) {
        console.error(
            "API: 商品データエラー",
            errors
        );

        return NextResponse.json(
            {
            error: "商品データに問題があります",
            details: errors,
            },
            {
            status: 500,
            }
        );
        }

        return NextResponse.json({
        goods,
        updatedAt,
        });
  } catch (error) {
    console.error(
      "API: 商品データ取得エラー",
      error
    );

    return NextResponse.json(
      {
        error: "商品データを取得できませんでした",
      },
      {
        status: 500,
      }
    );
  }
}