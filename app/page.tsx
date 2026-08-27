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
    const [cleaned, setCleaned] = useState(false);

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
      <header className="bg-[#4A90E2] px-4 py-4 text-white">
        <p className="text-[10px] font-medium tracking-[0.2em] text-white">
          GOODS CALCULATOR
        </p>

        <h1 className="mt-1 text-lg font-bold leading-tight">
          SHOWER OF HEART
        </h1>

        <p className="mt-1 text-xs text-white">
          ～輝く光のプレゼント～
        </p>
      </header>

      <section className="mx-auto max-w-xl space-y-2 p-4">
        <div className="sticky top-0 z-40 -mx-4 bg-[#FDF1F4] px-4 pb-2 pt-4">

          {/* 検索 */}
          <input
            type="text"
            placeholder="🔍 商品を検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-gray-400"
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

        {/* 商品一覧 */}
        {goodsError.length > 0 && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
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
              className="rounded-xl bg-white px-3 py-2 shadow-sm"
            >
              <p className="text-xs text-gray-600">
                {item.group} /{" "}
                {item.categories.join("・")}
              </p>

              <h2 className="text-sm font-bold leading-snug">
                {item.name}
              </h2>

              {/* サイズあり商品 */}
              {hasVariants ? (
                <div className="mt-3">


                  <div className="grid grid-cols-3 gap-2">
                    {item.variants?.map(
                      (variant) => {
                        const quantity =
                          quantities[item.id]?.[
                            variant
                          ] ?? 0;

                        return (
                          <div
                            key={variant}
                            className="rounded-xl border p-1.5 text-center"
                          >
                            <p className="text-sm font-bold">
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
                                className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-sm font-bold"
                              >
                                −
                              </button>

                              <span className="w-5 text-center font-bold">
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
                                className="flex h-7 w-7 items-center justify-center rounded-full bg-[#5B9BD5] text-lg font-bold text-white"
                              >
                                ＋
                              </button>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              ) : (
            
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-sm text-gray-700">
                  ¥{item.price.toLocaleString()}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      changeQuantity(item.id, -1)
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-base font-bold"
                  >
                    −
                  </button>

                  <span className="w-5 text-center text-base font-bold">
                    {quantities[item.id]?.default ?? 0}
                  </span>

                  <button
                    onClick={() =>
                      changeQuantity(item.id, 1)
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5B9BD5] text-base font-bold text-white"
                  >
                    ＋
                  </button>
                </div>
              </div>
              )}
            </div>
          );
        })}

        {/* 商品がない場合 */}
        {filteredGoods.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center text-gray-600">
            該当するグッズがありません。
          </div>
        )}

        {/* 選択中のグッズ */}
        {selectedGoods.length > 0 && (
          <div className="mt-3 rounded-xl border border-[#93C5FD] bg-[#EFF6FF] p-3 shadow-sm">
            <h2 className="text-base font-bold">
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
                        <p className="text-sm font-medium leading-tight">
                          {item.name}
                        </p>

                        <p className="mt-0.5 text-xs text-gray-600">
                          ¥{item.price.toLocaleString()}
                        </p>
                      </div>

                      <p className="font-bold">
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
                      <div className="mt-1 space-y-1">
                        {item.variants.map(
                          (variant) => {
                            const quantity =
                              itemQuantities[
                                variant
                              ] ?? 0;

                            if (quantity === 0) {
                              return null;
                            }

                            return (
                              <div
                                key={variant}
                                className="flex items-center justify-between"
                              >
                                <p className="text-sm">
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
                                    className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-sm font-bold"
                                  >
                                    −
                                  </button>

                                  <span className="w-5 text-center text-sm font-bold">
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
                                    className="flex h-6 w-6 items-center justify-center rounded-full bg-[#5B9BD5] font-bold text-white"
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
                                    className="ml-1 text-sm font-bold text-red-600"
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

                      <div className="mt-0 flex items-center justify-end gap-1">
                        <button
                          onClick={() =>
                            changeQuantity(item.id, -1)
                          }
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-sm font-bold"
                        >
                          −
                        </button>

                        <span className="w-5 text-center text-sm font-bold">
                          {itemQuantities.default ?? 0}
                        </span>

                        <button
                          onClick={() =>
                            changeQuantity(item.id, 1)
                          }
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-[#5B9BD5] text-sm font-bold text-white"
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
      </section>

      {/* 合計 */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-[#B8D8EF] bg-[#F5FAFE] p-3 shadow-lg">
        <div className="mx-auto max-w-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-500">
                合計 {totalCount}点
              </p>

              <p className="text-2xl font-bold text-gray-900">
                ¥{totalPrice.toLocaleString()}
              </p>
            </div>
          </div>

          <p className="mt-2 text-xs text-gray-600">
            入力内容は自動保存されます。ブラウザのキャッシュ・サイトデータを削除すると消える場合があります。
          </p>
        </div>
      </div>
    </main>
  );
}
