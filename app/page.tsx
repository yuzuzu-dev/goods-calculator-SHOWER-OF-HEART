"use client";

import { useEffect, useState } from "react";
type Good = {
  id: number;
  name: string;
  price: number;
  limit: number | null;
  group: string;
  categories: string[];
  variants?: string[];
  sort: number;
};

export default function Home() {
  // 通常商品 → "default"
  // サイズ付き商品 → "S", "M", "L" など
  const [quantities, setQuantities] = useState<
    Record<number, Record<string, number>>
  >({});

  const [search, setSearch] = useState("");

  // 大カテゴリ
  const [selectedGroup, setSelectedGroup] = useState("すべて");

  // 小カテゴリ
  const [selectedCategory, setSelectedCategory] =
    useState("すべて");

  const [loaded, setLoaded] = useState(false);
    const [goods, setGoods] = useState<Good[]>([]);
    const [goodsLoading, setGoodsLoading] = useState(true);
    const [goodsError, setGoodsError] = useState<string[]>([]);
    const [updatedAt, setUpdatedAt] = useState<string | null>(null);
    const [cleaned, setCleaned] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);

      useEffect(() => {
    const loadGoods = async () => {
      try {
    const response = await fetch("/api/goods");

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.details?.join("\n") ||
          data.error ||
          "商品データを取得できませんでした。"
      );
    }

    setGoods(data.goods ?? []);
    setUpdatedAt(data.updatedAt ?? null);
    } catch (error) {

      console.error("商品データ取得エラー:", error);

      if (error instanceof Error) {
        setGoodsError([error.message]);
      } else {
        setGoodsError(["商品データを取得できませんでした。"]);
      }

    } finally {
      setGoodsLoading(false);
    }
    };

    loadGoods();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("goods-quantities");

    if (saved) {
      try {
        setQuantities(JSON.parse(saved));
      } catch {
        localStorage.removeItem("goods-quantities");
      }
    }

    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    localStorage.setItem(
      "goods-quantities",
      JSON.stringify(quantities)
    );
  }, [quantities, loaded]);

    // スクロール量を監視し、一定以上下がったらボタンを表示
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // 保存データと現在の商品リストを照合し、
  // 存在しない商品・サイズ・上限超過分を自動で掃除する
  useEffect(() => {
    if (!loaded || goodsLoading || cleaned) {
      return;
    }

    // 商品データの取得に失敗している場合は、
    // 保存済みデータを誤って消さないよう何もしない
    if (goods.length === 0) {
      return;
    }

    setQuantities((current) => {
      const next: Record<number, Record<string, number>> = {};

      for (const item of goods) {
        const itemQuantities = current[item.id];

        if (!itemQuantities) {
          continue;
        }

        const allowedVariants =
          item.variants && item.variants.length > 0
            ? item.variants
            : ["default"];

        const cleanedItem: Record<string, number> = {};

        for (const variant of allowedVariants) {
          let quantity = itemQuantities[variant] ?? 0;

          if (item.limit !== null && quantity > item.limit) {
            quantity = item.limit;
          }

          if (quantity > 0) {
            cleanedItem[variant] = quantity;
          }
        }

        if (Object.keys(cleanedItem).length > 0) {
          next[item.id] = cleanedItem;
        }
      }

      return next;
    });

    setCleaned(true);
  }, [loaded, goodsLoading, goods, cleaned]);

  // 数量変更
  const changeQuantity = (
    id: number,
    amount: number,
    variant = "default"
  ) => {
    setQuantities((current) => {
      const item = goods.find((good) => good.id === id);

      if (!item) {
        return current;
      }

      const currentQuantity =
        current[id]?.[variant] ?? 0;

      const newQuantity =
        currentQuantity + amount;

      if (newQuantity < 0) {
        return current;
      }

      if (
        item.limit !== null &&
        newQuantity > item.limit
      ) {
        return current;
      }

      return {
        ...current,
        [id]: {
          ...current[id],
          [variant]: newQuantity,
        },
      };
    });
  };

  // 商品1つ分の合計数量
  const getItemQuantity = (id: number) => {
    const itemQuantities = quantities[id];

    if (!itemQuantities) {
      return 0;
    }

    return Object.values(itemQuantities).reduce(
      (sum, quantity) => sum + quantity,
      0
    );
  };

  // 全部リセット
  const resetQuantities = () => {
    const confirmed = window.confirm(
      "選択中のグッズをすべてリセットしますか？"
    );

    if (confirmed) {
      setQuantities({});
    }
  };

  // 表示中の商品をすべて選択(各1個、サイズありは各サイズ1個)
  const selectAllVisible = () => {
    setQuantities((current) => {
      const next = { ...current };

      for (const item of filteredGoods) {
        const targetVariants =
          item.variants && item.variants.length > 0
            ? item.variants
            : ["default"];

        const existing = { ...(next[item.id] ?? {}) };

        for (const variant of targetVariants) {
          const already = existing[variant] ?? 0;

          if (already > 0) {
            continue;
          }

          const desired = 1;

          existing[variant] =
            item.limit !== null
              ? Math.min(desired, item.limit)
              : desired;
        }

        next[item.id] = existing;
      }

      return next;
    });
  };


  // 大カテゴリ一覧
  const groups = [
    "すべて",
    ...Array.from(
      new Set(goods.map((item) => item.group))
    ),
  ];

  // 小カテゴリ一覧
  const categories = [
    "すべて",
    ...Array.from(
      new Set(
        goods
          .filter(
            (item) =>
              selectedGroup === "すべて" ||
              item.group === selectedGroup
          )
          .flatMap((item) => item.categories)
      )
    ),
  ];

  // 商品を絞り込み
  const filteredGoods = goods.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesGroup =
      selectedGroup === "すべて" ||
      item.group === selectedGroup;

    const matchesCategory =
      selectedCategory === "すべて" ||
      item.categories.includes(selectedCategory);

    return (
      matchesSearch &&
      matchesGroup &&
      matchesCategory
    );
  })
  .sort((a, b) => a.sort - b.sort);
    

  // 選択中の商品
  const selectedGoods = goods.filter(
    (item) => getItemQuantity(item.id) > 0
  );

  // 合計点数
  const totalCount = goods.reduce(
    (sum, item) =>
      sum + getItemQuantity(item.id),
    0
  );

  // 合計金額
  const totalPrice = goods.reduce(
    (sum, item) =>
      sum +
      item.price * getItemQuantity(item.id),
    0
  );

  return (
    <main className="min-h-screen bg-[#FDF1F4] pb-32">
      {/* ヘッダー */}
      <header className="relative bg-gradient-to-br from-[#4A90E2] via-[#5B9BD5] to-[#7BB8E8] px-4 py-4 text-white">
        <p className="text-[10px] font-medium tracking-[0.2em] text-white">
          GOODS CALCULATOR
        </p>

        <h1 className="mt-1 text-lg font-bold leading-tight">
          SHOWER OF HEART
        </h1>

        <p className="mt-1 text-xs text-white">
          ～輝く光のプレゼント～
        </p>

        <div className="absolute bottom-2 right-4 text-right text-xs text-white/80">
          <p>※非公式アプリです</p>
          {updatedAt && (
            <p className="mt-1">更新日: {updatedAt}</p>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-xl space-y-2 p-4">
        <div className="sticky top-0 z-40 -mx-4 bg-[#FDF1F4] px-4 pb-2 pt-0">

          {/* 検索 */}
          <input
            type="text"
            placeholder="🔍 商品を検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm outline-none focus:border-gray-400"
          />

          {/* 大カテゴリ */}
          <div className="mt-4">
            <p className="mb-1 text-sm font-bold text-gray-600">
              グッズカテゴリ
            </p>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {groups.map((group) => (
                <button
                  key={group}
                  onClick={() => {
                    setSelectedGroup(group);
                    setSelectedCategory("すべて");
                  }}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold transition ${
                    selectedGroup === group
                      ? "bg-[#5B9BD5] text-white shadow-sm"
                      : "bg-white text-gray-700 shadow-sm"
                  }`}
                >
                  {selectedGroup === group && "✓ "}
                  {group}
                </button>
              ))}
            </div>
          </div>

          {/* 小カテゴリ */}
          {selectedGroup !== "すべて" && (
            <div className="mt-2">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() =>
                      setSelectedCategory(category)
                    }
                    className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold ${
                      selectedCategory === category
                        ? "bg-[#5B9BD5] text-white shadow-sm"
                        : "bg-white text-gray-700 shadow-sm"
                    }`}
                  >
                    {selectedCategory === category && "✓ "}
                    {category}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>


        {/* 全部選択 */}
        {!goodsLoading && filteredGoods.length > 0 && (
          <div className="flex justify-end">
            <button
              onClick={selectAllVisible}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#5B9BD5] shadow-sm"
            >
              ✓ 表示中を全部選択
            </button>
          </div>
        )}

        {/* 商品一覧 */}
        {goodsError.length > 0 && (
          <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-bold">
              商品データに問題があります。
            </p>

            <ul className="mt-2 space-y-1">
              {goodsError.map((error, index) => (
                <li key={index}>
                  {error}
                </li>
              ))}
            </ul>

            <p className="mt-3">
              スプレッドシートの内容を確認してください。
            </p>
          </div>
        )}
        
        {filteredGoods.map((item) => {
          const hasVariants =
            item.variants &&
            item.variants.length > 0;

          return (
            <div
              key={item.id}
              className="rounded-md bg-white px-3 py-2 shadow-sm"
            >
              <p className="text-xs text-gray-600">
                {item.group} /{" "}
                {item.categories.join("・")}
              </p>

              <h2 className="text-sm font-bold leading-snug text-gray-900">
                {item.name}
              </h2>

              {/* サイズあり商品 */}
              {hasVariants ? (
                <div className="mt-3">
                  <p className="text-sm text-gray-700">
                    ¥{item.price.toLocaleString()}
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    {item.variants?.map(
                      (variant) => {
                        const quantity =
                          quantities[item.id]?.[
                            variant
                          ] ?? 0;

                        const reachedLimit =
                          item.limit !== null &&
                          quantity >= item.limit;

                        return (
                          <div
                            key={variant}
                            className="rounded-md border p-1.5 text-center"
                          >
                            <p className="text-sm font-bold text-gray-900">
                              {variant}
                            </p>

                            <div className="mt-1 flex items-center justify-center gap-1">
                              <button
                                onClick={() =>
                                  changeQuantity(
                                    item.id,
                                    -1,
                                    variant
                                  )
                                }
                                className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-900"
                              >
                                −
                              </button>

                              <span className="w-5 text-center font-bold text-gray-900">
                                {quantity}
                              </span>

                              <button
                                onClick={() =>
                                  changeQuantity(
                                    item.id,
                                    1,
                                    variant
                                  )
                                }
                                disabled={reachedLimit}
                                className="flex h-6 w-6 items-center justify-center rounded-full bg-[#5B9BD5] text-lg font-bold text-white disabled:bg-gray-300"
                              >
                                ＋
                              </button>
                            </div>

                            {item.limit !== null && (
                              <p className="mt-0.5 text-[9px] text-gray-500">
                                {reachedLimit
                                  ? "上限です"
                                  : `あと${item.limit - quantity}個`}
                              </p>
                            )}
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              ) : (
            
              <div className="mt-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-700">
                    ¥{item.price.toLocaleString()}
                  </p>

                  {item.limit !== null && (
                    <p className="text-[10px] text-gray-500">
                      {item.limit -
                        (quantities[item.id]?.default ?? 0) >
                      0
                        ? `あと${
                            item.limit -
                            (quantities[item.id]?.default ?? 0)
                          }個まで`
                        : "上限に達しました"}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      changeQuantity(item.id, -1)
                    }
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-base font-bold text-gray-900"
                  >
                    −
                  </button>

                  <span className="w-5 text-center text-base font-bold text-gray-900">
                    {quantities[item.id]?.default ?? 0}
                  </span>

                  <button
                    onClick={() =>
                      changeQuantity(item.id, 1)
                    }
                    disabled={
                      item.limit !== null &&
                      (quantities[item.id]?.default ?? 0) >=
                        item.limit
                    }
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-[#5B9BD5] text-base font-bold text-white disabled:bg-gray-300"
                  >
                    ＋
                  </button>
                </div>
              </div>
              )}
            </div>
          );
        })}

        {/* 読み込み中 */}
        {goodsLoading && (
          <div className="rounded-2xl bg-white p-8 text-center text-gray-600">
            読み込み中です...
          </div>
        )}

        {/* 商品がない場合 */}
        {!goodsLoading &&
          goodsError.length === 0 &&
          filteredGoods.length === 0 && (
            <div className="rounded-2xl bg-white p-8 text-center text-gray-600">
              該当するグッズがありません。
            </div>
          )}

        {/* 選択中のグッズ */}
        {selectedGoods.length > 0 && (
          <div
            id="selected-goods"
            className="mt-3 rounded-md border border-[#93C5FD] bg-[#EFF6FF] p-3 shadow-sm"
          >
            <h2 className="text-base font-bold text-gray-900">
              選択中のグッズ
            </h2>

            <button
              onClick={resetQuantities}
              className="mt-1 text-xs font-bold text-red-600"
            >
              🗑 全部リセット
            </button>

            <div className="mt-3 space-y-2">
              {selectedGoods.map((item) => {
                const itemQuantities =
                  quantities[item.id] ?? {};

                return (
                  <div
                    key={item.id}
                    className="border-b pb-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium leading-tight text-gray-900">
                          {item.name}
                        </p>

                        <p className="mt-0.5 text-[10px] text-gray-500">
                          {item.group}
                        </p>

                        <p className="mt-0.5 text-xs text-gray-600">
                          ¥{item.price.toLocaleString()}
                        </p>
                      </div>

                      <p className="font-bold text-gray-900">
                        ¥
                        {(
                          item.price *
                          getItemQuantity(item.id)
                        ).toLocaleString()}
                      </p>
                    </div>

                     {/* サイズあり商品 */}
                    {item.variants &&
                    item.variants.length > 0 ? (
                      <div className="mt-0.5 space-y-1">
                        {item.variants.map(
                          (variant) => {
                            const quantity =
                              itemQuantities[
                                variant
                              ] ?? 0;

                            if (quantity === 0) {
                              return null;
                            }

                            const reachedLimit =
                              item.limit !== null &&
                              quantity >= item.limit;

                            return (
                              <div
                                key={variant}
                                className="flex items-center justify-between"
                              >
                                <p className="text-sm text-gray-900">
                                  {variant} × {quantity}
                                </p>

                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() =>
                                      changeQuantity(
                                        item.id,
                                        -1,
                                        variant
                                      )
                                    }
                                    className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-900"
                                  >
                                    −
                                  </button>

                                  <span className="w-5 text-center text-sm font-bold text-gray-900">
                                    {quantity}
                                  </span>

                                  <button
                                    onClick={() =>
                                      changeQuantity(
                                        item.id,
                                        1,
                                        variant
                                      )
                                    }
                                    disabled={reachedLimit}
                                    className="flex h-6 w-6 items-center justify-center rounded-full bg-[#5B9BD5] font-bold text-white disabled:bg-gray-300"
                                  >
                                    ＋
                                  </button>

                                  <button
                                    onClick={() =>
                                      changeQuantity(
                                        item.id,
                                        -quantity,
                                        variant
                                      )
                                    }
                                    className="ml-1 text-xs font-bold text-red-600"
                                  >
                                    削除
                                  </button>
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    ) : (

                      <div className="-mt-1 flex items-center justify-end gap-1">
                        <button
                          onClick={() =>
                            changeQuantity(item.id, -1)
                          }
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-900"
                        >
                          −
                        </button>

                        <span className="w-5 text-center text-sm font-bold text-gray-900">
                          {itemQuantities.default ?? 0}
                        </span>

                        <button
                          onClick={() =>
                            changeQuantity(item.id, 1)
                          }
                          disabled={
                            item.limit !== null &&
                            (itemQuantities.default ?? 0) >=
                              item.limit
                          }
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-[#5B9BD5] text-sm font-bold text-white disabled:bg-gray-300"
                        >
                          ＋
                        </button>

                        <button
                          onClick={() =>
                            changeQuantity(
                              item.id,
                              -(itemQuantities.default ?? 0)
                            )
                          }
                          className="ml-1 text-xs font-bold text-red-600"
                        >
                          削除
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 注意書き */}
        <div className="mt-3 rounded-md border border-gray-200 bg-white p-3 text-xs leading-relaxed text-gray-600">
          <p className="font-bold text-gray-700">
            こちらはグッズ購入参考用の非公式計算アプリです。
          </p>

          <p className="mt-1">
            ファンメイドであり、SHOWER OF HEART公式とは一切関係ありません。
          </p>

          <p className="mt-2">
            表示される金額・個数等は実際の販売価格や在庫状況と異なる場合がありますので、購入前に公式ページにて最新情報をご確認ください。
          </p>

          <p className="mt-2">
            入力内容はお使いの端末(ブラウザ)にのみ保存されます。運営者が個人情報や入力内容を取得・収集することはありません。
          </p>

          <p className="mt-2">
            本アプリの内容を無断で複製・改変し、公式または第三者を騙る形で再配布・公開することはおやめください。
          </p>
        </div>
      </section>

      {/* 合計 */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-[#B8D8EF] bg-[#F5FAFE] p-3 shadow-lg">
        <div className="mx-auto max-w-xl">
          <button
            onClick={() => {
              const target = document.getElementById(
                "selected-goods"
              );

              if (target) {
                const top =
                  target.getBoundingClientRect().top +
                  window.scrollY -
                  120;

                window.scrollTo({
                  top,
                  behavior: "smooth",
                });
              }
            }}
            disabled={selectedGoods.length === 0}
            className="block w-full text-left disabled:cursor-default"
          >
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-500">
                  合計 {totalCount}点
                </p>

                {selectedGoods.length > 0 && (
                  <p className="text-xs font-bold text-[#5B9BD5]">
                    ▼ 選択中グッズの確認
                  </p>
                )}
              </div>

              <p className="text-2xl font-bold text-gray-900">
                ¥{totalPrice.toLocaleString()}
              </p>
            </div>
          </button>

          <p className="mt-2 text-xs text-gray-600">
            入力内容は自動保存されます。ブラウザのキャッシュ・サイトデータを削除すると消える場合があります。
          </p>
        </div>
      </div>

      {/* 上に戻るボタン */}
      {showScrollTop && (
        <button
          onClick={() =>
            window.scrollTo({ top: 0, behavior: "smooth" })
          }
          className="fixed bottom-32 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-[#7BB8E8] text-white shadow-lg"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
      )}
    </main>
  );
}
