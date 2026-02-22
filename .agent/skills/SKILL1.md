markdown
---
name: line-parser-fix
description: 修復 LINE 聊天記錄解析器的問題，包括名稱包含空格和英文時間格式。當使用者提到 LINE 解析問題、Issue #2、Issue #4 或英文聊天記錄時使用。
---

# LINE 解析器修復 Skill

這個 Skill 專門用來修復 LINE 訊息分析器的解析問題。

## 問題背景

這個專案有兩個主要問題：
1. **Issue #2**：使用者名稱包含空格時（如 "Tony Chou"），解析器會錯誤地將名稱拆開
2. **Issue #4**：英文時間格式（如 "7:18 AM"）會導致解析錯誤

## 修復方案

### 1. 修改解析邏輯（analyze.js）

找到大約第 230 行的程式碼，將：

```javascript
var membername = lines[i].split(/(\s+)/)[2];
修改為：

javascript
// 使用 Tab 作為分隔符（這是 LINE 原始檔案的標準分隔符）
var columns = lines[i].split('\t');

if (columns.length >= 3) {
    var timeColumn = columns[0];  // 時間欄位（可能是 "下午04:46" 或 "7:18 AM"）
    var membername = columns[1];  // 使用者名稱（即使包含空格也能正確取得）
    var message = columns[2];     // 訊息內容
    
    // 處理時間格式（支援多種語系）
    var timeFormat = 'unknown';
    if (timeColumn.includes('上午') || timeColumn.includes('下午')) {
        timeFormat = 'zh-tw';
    } else if (timeColumn.match(/\d{1,2}:\d{2}\s*(AM|PM)/i)) {
        timeFormat = 'en-12h';
    }
} else {
    // 如果 Tab 分割失敗，fallback 到原來的邏輯
    console.warn('Warning: Line does not contain tab separators, falling back to space split');
    var membername = lines[i].split(/(\s+)/)[2];
}
2. 修改特殊訊息過濾邏輯
找到過濾貼圖、照片等特殊訊息的程式碼，修改為：

javascript
// 支援中英文的過濾條件
function isSpecialMessage(message) {
    const specialKeywords = [
        '貼圖', 'Sticker', 'sticker',
        '照片', 'Photo', 'photo',
        '通話', 'Call', 'call',
        '未接來電', 'Missed call',
        '檔案', 'File', 'file'
    ];
    
    return specialKeywords.some(keyword => message.includes(keyword));
}
3. 修改字詞雲過濾邏輯
找到字詞雲相關的程式碼，修改過濾條件：

javascript
// 過濾掉特殊訊息和時間標記
function shouldFilterFromWordCloud(word) {
    const filterList = [
        '貼圖', 'Sticker', 'sticker',
        '照片', 'Photo', 'photo',
        '通話', 'Call', 'call',
        'AM', 'PM', 'am', 'pm',
        '上午', '下午', 'time'
    ];
    
    return filterList.some(filter => word.includes(filter));
}
測試案例
修改完成後，請用以下測試檔案驗證：

測試檔案 1：中文格式（含空格名稱）
text
2026/02/20（五）
下午04:46	Tony Chou	Hello, this is a test
下午04:46	Tony Chou	貼圖
下午04:46	Tony Chou	照片
測試檔案 2：英文格式
text
2026/02/20 (Fri)
7:18 AM	test_user	Hello, this is a test
7:19 AM	test_user	Sticker
7:20 AM	test_user	Photo
驗證方法
執行程式處理測試檔案

確認使用者名稱正確顯示為 "Tony Chou"（而不是 "Tony"）

確認英文時間 "7:18 AM" 被正確解析

確認貼圖、照片等特殊訊息被正確分類，不會出現在字詞雲中

text

### 步驟 3：建立測試 Skill（可選）

再建立一個專門用來產生測試案例的 Skill：

```powershell
# 建立測試 skill 資料夾
mkdir .agent\skills\generate-line-tests -Force

# 建立 SKILL.md 檔案
New-Item .agent\skills\generate-line-tests\SKILL.md -ItemType File
編輯 generate-line-tests/SKILL.md：

markdown
---
name: generate-line-tests
description: 為 LINE 訊息分析器產生測試案例。當需要測試解析器功能或驗證修改時使用。
---

# LINE 測試案例生成 Skill

這個 Skill 幫助產生各種 LINE 聊天記錄格式的測試案例。

## 測試案例範本

### 1. 基本中文格式
2026/02/20（五）
下午04:46 User1 Hello
下午04:46 User2 Hi

text

### 2. 包含空格的名稱
2026/02/20（五）
下午04:46 Tony Chou Hello
下午04:46 John Doe How are you?
下午04:46 Mary Jane 貼圖

text

### 3. 英文格式（12小時制）
2026/02/20 (Fri)
7:18 AM John Smith Good morning
7:20 AM Jane Doe Sticker
7:22 AM John Smith Photo

text

### 4. 混合格式（用於壓力測試）
2026/02/20（五）
下午04:46 User1 Normal message
下午04:46 Tony Chou Message with 貼圖
7:18 AM English User Sticker
下午04:46 User3 照片
7:20 AM Another User Photo

text

## 測試驗證清單

產生測試案例後，請驗證：

- [ ] 所有使用者名稱正確解析（包含空格的名稱）
- [ ] 所有時間格式正確識別（中文/英文）
- [ ] 特殊訊息（貼圖/Sticker）正確分類
- [ ] 字詞雲正確過濾掉特殊訊息
- [ ] 統計數據準確（訊息數、貼圖數等）
🚀 如何使用這些 Skills
方法 1：讓 AI 自動使用
當你在 Antigravity 中打開專案並開始對話時，AI 會自動：

掃描 .agent/skills 資料夾

讀取所有 SKILL.md 的 name 和 description

根據你的問題判斷是否需要使用這些 Skills

方法 2：手動指定使用 Skill
你也可以直接在對話中提及 Skill 名稱：

「請用 line-parser-fix 幫我修復 Issue #2 和 #4 的問題」

「幫我用 generate-line-tests 產生一些測試案例來驗證修改」