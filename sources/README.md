# 來源教材

把兩份原始 HTML 放進這個資料夾，檔名要完全一致：

```
cestina-L1-L7-slovicka.html
cestina-L1-L7-gramatika.html
```

放進來之後重跑 `npm run ingest`，`scripts/lib/raw.ts` 就會改讀這裡的 HTML
（解析 `const T` / `const D` 與 `div.gram`），不再使用 `content/seed/` 的種子資料。
兩條路徑產出的形狀完全相同，管線其餘部分不需要任何改動。

檔案本身不進版控（見 `.gitignore`）。
