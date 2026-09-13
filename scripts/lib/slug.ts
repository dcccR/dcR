/** 去變音符：cestina 也要找得到 čeština（§9），slug 與搜尋共用。 */
export function deaccent(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function slugify(cz: string): string {
  const base = deaccent(cz)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base || "x";
}

export function uniqueId(prefix: string, cz: string, taken: Set<string>): string {
  const base = `${prefix}${slugify(cz)}`;
  if (!taken.has(base)) {
    taken.add(base);
    return base;
  }
  let i = 2;
  while (taken.has(`${base}_${i}`)) i++;
  const id = `${base}_${i}`;
  taken.add(id);
  return id;
}
