/* ========================
   Global Setup
   ======================== */
const swup = new Swup();
const fN = (num) => Number(num).toLocaleString('en-US');
let content = "";

if (document.getElementById("file")) {
    const file = document.getElementById("file");
    file.addEventListener("change", getFile);
}

let dragCounter = 0;
document.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    const overlay = document.getElementById("dropOverlay");
    if (overlay) overlay.classList.add('drag-over');
});
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter === 0) {
        const overlay = document.getElementById("dropOverlay");
        if (overlay) overlay.classList.remove('drag-over');
    }
});
document.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCounter = 0;
    const overlay = document.getElementById("dropOverlay");
    if (overlay) overlay.classList.remove('drag-over');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        if (document.getElementById("file")) {
            getFile.call({ files: e.dataTransfer.files });
        }
    }
});

function showLoading() {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) overlay.classList.add("active");
}
function hideLoading() {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) overlay.classList.remove("active");
}

function getFile() {
    showLoading();
    const fr = new FileReader();
    fr.onload = function () {
        content = this.result;
        changePage();
    }
    fr.readAsText(this.files[0]);
}

async function samplefile() {
    showLoading();
    const text = await fetch('./sample/sample.txt');
    content = (await text.text());
    changePage();
}

function changePage() {
    swup.loadPage({
        url: './analyze.html',
        method: 'GET',
        data: "",
        customTransition: ''
    });
}

document.addEventListener('swup:contentReplaced', (event) => {
    if (document.querySelector('[chat-title]'))
        analyse();
});

/* ========================
   App State
   ======================== */
const AppState = {
    chatname: "",
    environment: 0,
    moreThanAHour: 0,
    messageInADayAll: [],
    callTimeInADay: [],
    callSecondInADay: [],
    members: [],
    memberStats: {},
    maxCallTime: [0, 0, 0],
    maxCallDate: "",
    dates: [],
    lines: [],
    length: 0,
    memberMessageList: {},
    dayTime: { hour: 0, min: 0, sec: 0, calls: 0 },
    time: { hour: 0, min: 0, sec: 0, calls: 0 },
    memberMessageNum: {},
    maxDate: "",
    maxMessage: 0,
    totalDays: 0,
    totalMessages: 0,
    messageNumAll: 0,
    unsent: 0
};

function resetAppState() {
    AppState.chatname = "";
    AppState.environment = 0;
    AppState.moreThanAHour = 0;
    AppState.messageInADayAll = [];
    AppState.callTimeInADay = [];
    AppState.callSecondInADay = [];
    AppState.members = [];
    AppState.memberStats = {};
    AppState.maxCallTime = [0, 0, 0];
    AppState.maxCallDate = "";
    AppState.dates = [];
    AppState.lines = [];
    AppState.length = 0;
    AppState.memberMessageList = {};
    AppState.dayTime = { hour: 0, min: 0, sec: 0, calls: 0 };
    AppState.time = { hour: 0, min: 0, sec: 0, calls: 0 };
    AppState.memberMessageNum = {};
    AppState.maxDate = "";
    AppState.maxMessage = 0;
    AppState.totalDays = 0;
    AppState.totalMessages = 0;
    AppState.messageNumAll = 0;
    AppState.unsent = 0;
}

const options = { minimumCount: 30 };

/* ========================
   Helpers
   ======================== */
function isSystemMessage(name) {
    if (!name) return true;
    const sysKeywords = ["已收回", "收回訊息", "邀請", "加入", "退出", "更改了群組圖片", "通話", "相簿", "群組名稱", "已讓", "離開"];
    for (let k of sysKeywords) {
        if (name.includes(k)) return true;
    }
    return false;
}

function getCallTime(parts, timeObj) {
    if (parts.length < 3) return false;
    const msg = parts[2];

    let match = msg.match(/(?:☎\s*)?通話時間\s*([0-9:]+)/);
    let isCall = false;

    if (match) {
        let callTimeStr = match[1];
        let splited = callTimeStr.split(":");
        addTime(splited, timeObj);
        isCall = true;
    } else {
        let pureTimeMatch = msg.match(/^([0-9]{1,2}):([0-9]{2})(?::([0-9]{2}))?$/);
        if (pureTimeMatch) {
            let splited = pureTimeMatch[0].split(":");
            addTime(splited, timeObj);
            isCall = true;
        }
    }

    if (isCall && !AppState.environment) AppState.environment = 1;
    return isCall;
}

function processlist(cloudlist) {
    let newlist = [];
    const maxfontsize = (window.screen.width > 768) ? 80 : 20;
    for (let i = 0; i < cloudlist.length; i++) {
        let validkey = 1;
        for (let j = 0; j < AppState.members.length; j++) {
            let k = cloudlist[i][0];
            let m = AppState.members[j];
            if (m === k || m.includes(k) || k.includes(m) ||
                k.includes("貼圖") || k.includes("照片") || k.includes("Sticker") || k.includes("Photo") ||
                k.includes("上午") || k.includes("下午") || k.includes("通話") || k.includes("未接來電") || k.includes("時間")) {
                validkey = 0;
            }
        }
        if (validkey) newlist.push(cloudlist[i]);
    }
    let max = 0;
    for (let i = 0; i < newlist.length; i++) {
        if (newlist[i][1] > max) max = newlist[i][1];
    }
    if (max === 0) return newlist;
    let ratio = max / maxfontsize;
    for (let i = 0; i < newlist.length; i++) {
        newlist[i][1] = Math.round(newlist[i][1] / ratio);
    }

    // 取得前 30% 的文字，且最多不超過 20 個避免畫面過度壅擠
    let takeCount = Math.ceil(newlist.length * 0.30);
    if (takeCount > 20) takeCount = 20;
    newlist = newlist.slice(0, takeCount);

    return newlist;
}

function getMaxCallTime(timeObj) {
    if (parseInt(timeObj.hour) > parseInt(AppState.maxCallTime[0])) {
        AppState.maxCallTime[0] = timeObj.hour;
        AppState.maxCallTime[1] = timeObj.min;
        AppState.maxCallTime[2] = timeObj.sec;
        AppState.maxCallDate = AppState.dates[AppState.dates.length - 1];
    }
    else if (parseInt(timeObj.hour) === parseInt(AppState.maxCallTime[0]) && parseInt(timeObj.min) > parseInt(AppState.maxCallTime[1])) {
        AppState.maxCallTime[0] = timeObj.hour;
        AppState.maxCallTime[1] = timeObj.min;
        AppState.maxCallTime[2] = timeObj.sec;
        AppState.maxCallDate = AppState.dates[AppState.dates.length - 1];
    }
    else if (parseInt(timeObj.hour) === parseInt(AppState.maxCallTime[0]) && parseInt(timeObj.min) === parseInt(AppState.maxCallTime[1]) && parseInt(timeObj.sec) > parseInt(AppState.maxCallTime[2])) {
        AppState.maxCallTime[0] = timeObj.hour;
        AppState.maxCallTime[1] = timeObj.min;
        AppState.maxCallTime[2] = timeObj.sec;
        AppState.maxCallDate = AppState.dates[AppState.dates.length - 1];
    }
}

function addTime(splited, timeObj) {
    if (splited.length === 2) {
        timeObj.sec += parseInt(splited[1]) || 0;
        timeObj.min += parseInt(splited[0]) || 0;
        if (!AppState.moreThanAHour) {
            if (parseInt(splited[0]) > parseInt(AppState.maxCallTime[1])) {
                AppState.maxCallTime[1] = splited[0];
                AppState.maxCallTime[2] = splited[1];
                AppState.maxCallDate = AppState.dates[AppState.dates.length - 1];
            }
            else if (parseInt(splited[0]) === parseInt(AppState.maxCallTime[1]) && parseInt(splited[1]) > parseInt(AppState.maxCallTime[2])) {
                AppState.maxCallTime[1] = splited[0];
                AppState.maxCallTime[2] = splited[1];
                AppState.maxCallDate = AppState.dates[AppState.dates.length - 1];
            }
        }
    }
    else if (splited.length === 3) {
        AppState.moreThanAHour = 1;
        timeObj.sec += parseInt(splited[2]) || 0;
        timeObj.min += parseInt(splited[1]) || 0;
        timeObj.hour += parseInt(splited[0]) || 0;
        if (parseInt(splited[0]) > parseInt(AppState.maxCallTime[0])) {
            AppState.maxCallTime[0] = splited[0];
            AppState.maxCallTime[1] = splited[1];
            AppState.maxCallTime[2] = splited[2];
            AppState.maxCallDate = AppState.dates[AppState.dates.length - 1];
        }
        else if (parseInt(splited[0]) === parseInt(AppState.maxCallTime[0]) && parseInt(splited[1]) > parseInt(AppState.maxCallTime[1])) {
            AppState.maxCallTime[0] = splited[0];
            AppState.maxCallTime[1] = splited[1];
            AppState.maxCallTime[2] = splited[2];
            AppState.maxCallDate = AppState.dates[AppState.dates.length - 1];
        }
        else if (parseInt(splited[0]) === parseInt(AppState.maxCallTime[0]) && parseInt(splited[1]) === parseInt(AppState.maxCallTime[1]) && parseInt(splited[2]) > parseInt(AppState.maxCallTime[2])) {
            AppState.maxCallTime[0] = splited[0];
            AppState.maxCallTime[1] = splited[1];
            AppState.maxCallTime[2] = splited[2];
            AppState.maxCallDate = AppState.dates[AppState.dates.length - 1];
        }
    }
    timeObj.calls++;
}

// Unified parser to deal with split variations
function parseLine(line) {
    let parts = line.split('\t');

    if (parts.length < 3 && line.trim().length > 0 && !line.includes('\t')) {
        // More permissive time regex to handle broken encodings like 銝见
        let timeRegex = /^([^\s0-9:]+)?\s*([0-9]{1,2}:[0-9]{1,2})\s*(AM|PM|am|pm)?/i;
        let timeMatch = line.match(timeRegex);
        if (timeMatch) {
            let timeStr = timeMatch[0];
            let rest = line.substring(timeStr.length).replace(/^\s+/, '');
            let firstSpaceIdx = rest.indexOf(' ');
            if (firstSpaceIdx !== -1) {
                let nameStr = rest.substring(0, firstSpaceIdx);
                let msgStr = rest.substring(firstSpaceIdx + 1);

                // Preserve unsent message logic without modifying name
                if (msgStr.includes("已收回訊息") || nameStr.endsWith("已收回訊息")) {
                    if (nameStr.endsWith("已收回訊息")) {
                        nameStr = nameStr.replace("已收回訊息", "");
                    }
                    msgStr = "已收回訊息";
                }

                parts = [timeStr.trim(), nameStr.trim(), msgStr];
            } else {
                let restTrimmed = rest.trim();
                if (restTrimmed === "已收回訊息" || restTrimmed === "收回訊息" || restTrimmed.endsWith("已收回訊息")) {
                    let nameStr = restTrimmed.replace("已收回訊息", "").replace("收回訊息", "").trim();
                    parts = [timeStr.trim(), nameStr, "已收回訊息"];
                } else {
                    parts = [timeStr.trim(), restTrimmed, ""];
                }
            }
        }
    }
    return parts;
}

function adjustTime(timeObj) {
    timeObj.min += parseInt(timeObj.sec / 60);
    timeObj.hour += parseInt(timeObj.min / 60);
    timeObj.sec = timeObj.sec % 60;
    timeObj.min = timeObj.min % 60;
}

/* ========================
   Main Analysis
   ======================== */
function analyse() {
    resetAppState();
    AppState.lines = content.split(/\r?\n/);
    AppState.length = AppState.lines.length;
    const dateRegex = new RegExp("^([0-9]{4})([./]{1})([0-9]{1,2})([./]{1})([0-9]{1,2})");
    // Relaxed regex to handle broken Chinese characters representing AM/PM before the time
    const messageRegex = new RegExp("^([^\\s0-9:]+)?\\s*([0-9]{1,2}):([0-9]{1,2})\\s*(AM|PM|am|pm)?$", "i");

    const header = AppState.lines[0].trim();
    // Resolve chatname properly from file input if possible
    const fileInput = document.getElementById("file");
    const filename = fileInput && fileInput.files && fileInput.files.length > 0 ? fileInput.files[0].name : "";

    // Pattern [LINE]XXXX.txt
    const nameMatch = filename.match(/\[LINE\]\s*(.+)\.txt/);
    if (nameMatch) {
        AppState.chatname = nameMatch[1].trim();
    } else if (filename.endsWith('.txt')) {
        AppState.chatname = filename.replace('.txt', '').trim();
    } else {
        if (dateRegex.test(header)) {
            AppState.chatname = "聊天紀錄分析報告";
        } else {
            const matchZH = header.match(/\[LINE\] 與(.+?)的聊天記錄/);
            const matchEN = header.match(/\[LINE\] Chat history with (.+)/);
            if (matchZH) {
                AppState.chatname = matchZH[1].trim();
            } else if (matchEN) {
                AppState.chatname = matchEN[1].trim();
            } else {
                AppState.chatname = header.split(" ")[1] || "聊天紀錄分析報告";
            }
        }
    }

    for (let i = 0; i < AppState.length; i++) {
        let currentLine = AppState.lines[i];
        if (dateRegex.test(currentLine.substring(0, 10))) {
            if (AppState.messageNumAll !== 0) { //date
                if (AppState.messageNumAll > AppState.maxMessage) {
                    AppState.maxMessage = AppState.messageNumAll;
                    AppState.maxDate = AppState.dates[AppState.dates.length - 1];
                }
                AppState.messageInADayAll.push(AppState.messageNumAll);
                Object.keys(AppState.memberMessageList).forEach(k => AppState.memberMessageList[k].push(AppState.memberMessageNum[k]));
                Object.keys(AppState.memberMessageNum).forEach(k => AppState.memberMessageNum[k] = 0);
                AppState.messageNumAll = 0;
                adjustTime(AppState.dayTime); //call time a day
                getMaxCallTime(AppState.dayTime);
                AppState.callTimeInADay.push([AppState.dayTime.hour, AppState.dayTime.min, AppState.dayTime.sec]);
                AppState.callSecondInADay.push(AppState.dayTime.hour * 3600 + AppState.dayTime.min * 60 + AppState.dayTime.sec);
                Object.keys(AppState.dayTime).forEach(v => AppState.dayTime[v] = 0);
            }
            AppState.dates.push(currentLine);
            AppState.totalDays++;
        }

        let parts = parseLine(currentLine);

        if (parts.length >= 3 && messageRegex.test(parts[0].trim())) {
            let membername = parts[1].trim();
            let msg = parts[2].trim();

            if (membername !== undefined && membername !== "") {
                // Tracking total unsent directly from message
                let isUnsent = false;
                if (msg.includes("已收回訊息") || msg.includes("收回訊息")) {
                    AppState.unsent++;
                    isUnsent = true;
                }

                if (!isUnsent && !AppState.members.includes(membername) && !isSystemMessage(membername)) {
                    AppState.members.push(membername);
                    AppState.memberStats[membername] = { messages: 0, stickers: 0, photos: 0 };
                    AppState.memberMessageNum[membername] = 0;
                    AppState.memberMessageList[membername] = new Array(AppState.dates.length > 1 ? AppState.dates.length - 1 : 0).fill(0);
                }

                if (!isUnsent) {
                    let isCallLine = getCallTime(parts, AppState.dayTime); //Phone call
                    getCallTime(parts, AppState.time);

                    if (!isCallLine && !isSystemMessage(membername)) {
                        if (AppState.memberStats[membername]) {
                            AppState.memberStats[membername].messages++;
                        }
                        AppState.messageNumAll++;
                        AppState.totalMessages++;
                    }

                    if (!isSystemMessage(membername)) {
                        AppState.memberMessageNum[membername]++;
                    }
                }
            }
        }

        if (i === AppState.length - 1) { //last day
            if (AppState.messageNumAll > AppState.maxMessage) {
                AppState.maxMessage = AppState.messageNumAll;
                AppState.maxDate = currentLine;
            }
            AppState.callTimeInADay.push([AppState.dayTime.hour, AppState.dayTime.min, AppState.dayTime.sec]);
            AppState.messageInADayAll.push(AppState.messageNumAll);
            Object.keys(AppState.memberMessageList).forEach(k => AppState.memberMessageList[k].push(AppState.memberMessageNum[k]));
            Object.keys(AppState.memberMessageNum).forEach(k => AppState.memberMessageNum[k] = 0);
        }

        // Exact sticker / photo matches (to rule out normal messages that happen to contain the word)
        if (parts.length >= 3 && messageRegex.test(parts[0].trim())) {
            let msg = parts[2].trim();
            let msgMember = parts[1].trim();
            if (AppState.memberStats[msgMember]) {
                if (msg.startsWith("[貼圖]") || msg.startsWith("[Sticker]") || msg === "貼圖" || msg === "貼圖\t")
                    AppState.memberStats[msgMember].stickers++;
                else if (msg.startsWith("[照片]") || msg.startsWith("[Photo]") || msg === "圖片" || msg === "照片" || msg === "圖片\t" || msg === "照片\t") {
                    AppState.memberStats[msgMember].photos++;
                }
            }
        }
    }

    adjustTime(AppState.time);

    displayResult();

    // Dynamically draw Pie Charts for all members (Message Proportion)
    let sortedKeys = Object.keys(AppState.memberStats).sort((a, b) => AppState.memberStats[b].messages - AppState.memberStats[a].messages);

    const palette = ['#7C7877', '#F0E5DE', '#EB9F9F', '#8EB8B6', '#699FC6', '#E8D8A6', '#A2C0A0', '#D1A5B2', '#B4A0E5', '#E5A0C2', '#A0E5D1'];
    let chartValues = [];
    let chartColors = [];
    let legendHTML = '';
    const formatNum = (num) => Number(num).toLocaleString('en-US');

    sortedKeys.forEach((member, index) => {
        let msgCount = AppState.memberStats[member].messages || 0;
        if (msgCount > 0) {
            chartValues.push(msgCount);
            let color = palette[index % palette.length];
            chartColors.push(color);

            legendHTML += `
                <div class="flex flex-col items-center">
                    <span class="w-4 h-4 rounded-full block mb-1 border border-gray-300" style="background-color: ${color}"></span>
                    <div class="font-bold text-textPrimary truncate max-w-[80px]" title="${member}">${member}</div>
                    <div class="text-sm text-textPrimary/80">${formatNum(msgCount)} 則</div>
                </div>
            `;
        }
    });

    generateDonut('myCanvas', chartValues, chartColors);

    let legendContainer = document.getElementById('myCanvasLegend');
    if (legendContainer) {
        legendContainer.innerHTML = legendHTML;
    }

    // Removed legacy duplicate memberCanvas1 and memberCanvas2 generation

    generatePlots();

    if (typeof WordFreqSync !== 'undefined') {
        let cloudlist = WordFreqSync(options).process(content);
        cloudlist = processlist(cloudlist);

        let wordcloudEl = document.getElementById('wordcloud');
        if (wordcloudEl) {
            // Set explicit dimensions for WordCloud.js
            wordcloudEl.width = wordcloudEl.clientWidth || 300;
            wordcloudEl.height = Math.max(wordcloudEl.clientHeight, 300);

            WordCloud(wordcloudEl, {
                list: cloudlist,
                shrinktofit: true,
                drawOutOfBound: false,
                backgroundColor: 'transparent'
            });
        }
    }

    setTimeout(hideLoading, 500);
}

function displayResult() {
    let sortedKeys = Object.keys(AppState.memberStats).sort((a, b) => AppState.memberStats[b].messages - AppState.memberStats[a].messages);
    const chatTitle = document.querySelector('[chat-title]');
    const statDay = document.querySelector('[stat-day]');
    const statMessage = document.querySelector('[stat-message]');
    const statCall = document.querySelector('[stat-call]');
    const statCalltime = document.querySelector('[stat-calltime]');

    const maxMessageResult = document.querySelector('[max-message]');
    const maxDateFull = document.querySelector('[max-date-full]');

    const maxCalltime = document.querySelector('[max-calltime]');
    const maxCalltimeFull = document.querySelector('[max-calltime-full]');

    const statUnsent = document.querySelector('[stat-unsent]');

    if (chatTitle) chatTitle.textContent = AppState.chatname + ':';

    if (statDay) statDay.textContent = fN(AppState.totalDays);
    if (statMessage) statMessage.textContent = fN(AppState.totalMessages);
    if (statCall) statCall.textContent = fN(AppState.time.calls);
    if (statCalltime) statCalltime.textContent = `${fN(AppState.time.hour)}小時${fN(AppState.time.min)}分${fN(AppState.time.sec)}秒`;
    if (statUnsent) statUnsent.textContent = fN(AppState.unsent);

    let formatMaxDate = (dateStr) => {
        if (!dateStr) return '';
        let maxlist = dateStr.split(/[/（ ()]+/);
        if (maxlist.length >= 3) {
            let week = maxlist.length > 3 ? maxlist[3] : '';
            return `${maxlist[0]}.${maxlist[1]}.${maxlist[2]} 星期${week}`.trim();
        }
        return dateStr;
    }

    if (maxMessageResult) maxMessageResult.textContent = fN(AppState.maxMessage);
    if (maxDateFull) maxDateFull.textContent = formatMaxDate(AppState.maxDate);

    if (AppState.time.calls > 0 && maxCalltime) {
        maxCalltime.textContent = fN(AppState.maxCallTime[0] * 3600 + AppState.maxCallTime[1] * 60 + AppState.maxCallTime[2]);
        if (maxCalltimeFull) {
            maxCalltimeFull.textContent = formatMaxDate(AppState.maxCallDate);
        }
    }

    const getPct = (val, total) => total > 0 ? (val / total * 100).toFixed(1) : "0.0";

    let individualStatsContainer = document.getElementById('individualStatsContainer');
    if (individualStatsContainer) {
        individualStatsContainer.innerHTML = ''; // clear previous
        sortedKeys.forEach((member, index) => {
            let st = AppState.memberStats[member];
            if (!st || st.messages === 0) return;

            let mTxt = Math.max(0, st.messages - st.stickers - st.photos);
            let mTxtPct = getPct(mTxt, st.messages);
            let mStickersPct = getPct(st.stickers, st.messages);
            let mPhotosPct = st.messages > 0 ? (100.0 - parseFloat(mTxtPct) - parseFloat(mStickersPct)).toFixed(1) : "0.0";

            let canvasId = `memberCanvas_${index}`;

            individualStatsContainer.innerHTML += `
            <div class="flex flex-col gap-4 w-full md:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)]">
                <div class="bg-cardPrimary rounded-xl shadow-md p-6 flex flex-col justify-center items-center flex-grow">
                     <div class="font-bold text-lg text-center text-textPrimary w-full border-b border-textPrimary/20 pb-2 mb-4 truncate" title="${member}">${member}</div>
                     <div class="w-full flex justify-center items-center py-2 min-h-[170px]">
                         <canvas id="${canvasId}" class="block mx-auto"></canvas>
                     </div>
                </div>
                <div class="bg-cardPrimary rounded-xl shadow-md p-4">
                    <div class="space-y-2 text-sm w-full">
                         <div class="flex items-center justify-between px-2">
                             <div class="flex items-center gap-2"><span class="w-3 h-3 rounded bg-[#EB9F9F]"></span> 文字</div>
                             <div class="font-semibold text-textPrimary">${fN(mTxt)} 訊息 (${mTxtPct}%)</div>
                         </div>
                         <div class="flex items-center justify-between px-2">
                             <div class="flex items-center gap-2"><span class="w-3 h-3 rounded bg-[#F0E5DE] border border-gray-300"></span> 貼圖</div>
                             <div class="font-semibold text-textPrimary">${fN(st.stickers)} 貼圖 (${mStickersPct}%)</div>
                         </div>
                         <div class="flex items-center justify-between px-2">
                             <div class="flex items-center gap-2"><span class="w-3 h-3 rounded bg-[#7C7877]"></span> 照片</div>
                             <div class="font-semibold text-textPrimary">${fN(st.photos)} 照片 (${mPhotosPct}%)</div>
                         </div>
                    </div>
                </div>
            </div>`;
        });

        // After DOM update, draw the charts
        sortedKeys.forEach((member, index) => {
            let st = AppState.memberStats[member];
            if (!st || st.messages === 0) return;
            let mTxt = Math.max(0, st.messages - st.stickers - st.photos);
            let canvasId = `memberCanvas_${index}`;
            // Let the DOM catch up before we initialize pie charts to prevent sizing issues
            setTimeout(() => {
                let cvs = document.getElementById(canvasId);
                if (cvs) {
                    generateDonut(canvasId, [mTxt, st.stickers, st.photos], ['#EB9F9F', '#F0E5DE', '#7C7877']);
                }
            }, 300);
        });
    }

    const exportChatTitle = document.getElementById('exportChatTitle');
    if (exportChatTitle) exportChatTitle.textContent = '與 ' + AppState.chatname + ':';

    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) exportBtn.style.display = 'flex';
}

function exportCard() {
    const exportBtn = document.getElementById('exportBtn');
    if (!exportBtn) return;
    const originalText = exportBtn.innerHTML;
    exportBtn.innerHTML = "匯出中...";
    exportBtn.style.pointerEvents = "none";

    const container = document.getElementById('exportContainer');
    const title = document.getElementById('exportChatTitle');
    if (title) title.style.display = 'block';

    setTimeout(() => {
        if (typeof html2canvas !== 'undefined') {
            html2canvas(container, { backgroundColor: '#F0E5DE', scale: 2 }).then(canvas => {
                if (title) title.style.display = 'none';
                let link = document.createElement('a');
                link.download = AppState.chatname + '_戰力圖卡.png';
                link.href = canvas.toDataURL();
                link.click();

                exportBtn.innerHTML = originalText;
                exportBtn.style.pointerEvents = "auto";
            }).catch(err => {
                if (title) title.style.display = 'none';
                exportBtn.innerHTML = originalText;
                exportBtn.style.pointerEvents = "auto";
                alert("匯出失敗，請稍後再試。");
            });
        } else {
            alert("匯出套件尚未載入完成，請稍後再試。");
            if (title) title.style.display = 'none';
            exportBtn.innerHTML = originalText;
            exportBtn.style.pointerEvents = "auto";
        }
    }, 100);
}

function findword() {
    let wordInADay = [];
    let wordNum = 0;
    let dayCounter = 0;

    const searchbox = document.getElementById("findingWordInput");
    if (!searchbox) return;

    let wordtofind = searchbox.value.trim();
    searchbox.value = "";

    if (!wordtofind) {
        alert("請輸入欲尋找的字眼！");
        return;
    }

    let fontsize = (window.screen.width > 768) ? 18 : 12;
    let margin = (window.screen.width > 768) ? 50 : 45;

    const dateRegex = new RegExp("^([0-9]{4})([./]{1})([0-9]{1,2})([./]{1})([0-9]{1,2})");
    const messageRegex = new RegExp("^(\\u4e0a\\u5348|\\u4e0b\\u5348)?\\s*([0-9]{1,2}):([0-9]{1,2})\\s*(AM|PM|am|pm)?$", "i");

    for (let i = 0; i < AppState.length; i++) {
        if (dateRegex.test(AppState.lines[i].substring(0, 10))) {
            if (dayCounter > 0) {
                wordInADay.push(wordNum);
            }
            wordNum = 0;
            dayCounter++;
        }

        let parts = parseLine(AppState.lines[i]);
        if (parts.length >= 3 && messageRegex.test(parts[0].trim())) {
            let msg = parts[2];
            if (msg.includes(wordtofind)) {
                wordNum++;
            }
        }
        if (i === AppState.length - 1) {
            wordInADay.push(wordNum);
        }
    }

    let totalFound = wordInADay.reduce((a, b) => a + b, 0);
    let wordplot = document.getElementById('findingWord');
    if (totalFound === 0) {
        alert("找不到包含「" + wordtofind + "」的訊息，試試其他關鍵字吧！");
        if (wordplot) wordplot.classList.add('hidden');
        return;
    }

    let specificWord = {
        x: AppState.dates,
        y: wordInADay,
        line: { shape: 'spline' },
        type: 'scatter',
        marker: { color: '#eb9f9f' } // Use theme color
    };
    let wordLayout = {
        title: '每日說「' + wordtofind + '」次數',
        font: { family: 'Inter, Noto Sans TC, sans-serif' },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        xaxis: { title: '日期', showgrid: false, zeroline: false },
        yaxis: { title: '次數', showgrid: false, zeroline: false },
        legend: { font: { size: fontsize } },
        margin: { t: margin + 30, r: margin, l: margin + 10, b: margin + 20 }
    };

    if (wordplot) {
        // Tailwind hidden toggle on the container itself
        wordplot.classList.remove('hidden');
        Plotly.newPlot('findingWordChart', [specificWord], wordLayout, { displayModeBar: false, responsive: true });

        // Force resize for plotly SVG to calculate correctly within flex layouts
        setTimeout(() => window.dispatchEvent(new Event('resize')), 100);

        setTimeout(() => {
            wordplot.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }
}

function generateDonut(id, valuelist, colorlist) {
    let canvas = document.getElementById(id);
    if (!canvas) return;

    // Fix canvas width and height so rpie.js doesn't stretch it
    let parentWidth = canvas.parentElement?.clientWidth || 250;
    let size = Math.min(parentWidth, 250);
    canvas.width = size;
    canvas.height = size;

    generatePieGraph(id, {
        values: valuelist,
        colors: colorlist,
        animation: true,
        animationSpeed: 5,
        fillTextData: true,
        fillTextColor: 'black',
        fillTextAlign: 1.5,
        fillTextPosition: 'inner',
        doughnutHoleSize: 50,
        doughnutHoleColor: '#F1BBBA',
        offset: 1,
    });
}

function generatePlots() {
    let memberMessage = [];
    let fontsize = (window.screen.width > 768) ? 18 : 12;
    let margin = (window.screen.width > 768) ? 50 : 45;

    for (let i = 0; i < AppState.members.length; i++) {
        memberMessage.push({
            y: AppState.memberMessageList[AppState.members[i]],
            line: { shape: 'spline', width: 3 },
            type: 'scatter',
            name: AppState.members[i],
            opacity: 0.5,
            font: { size: 30 }
        });
    }

    let allMessage = {
        y: AppState.messageInADayAll,
        line: { shape: 'spline' },
        type: 'scatter'
    };

    let callTime = {
        y: AppState.callSecondInADay,
        line: { shape: 'spline' },
        type: 'scatter'
    };

    let commonLayout = {
        font: { family: 'Inter, Noto Sans TC, sans-serif' },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        xaxis: {
            title: '天數',
            showgrid: false,
            zeroline: false
        },
        yaxis: {
            showgrid: false,
            zeroline: false
        },
        legend: {
            font: { size: fontsize },
            orientation: 'h',
            yanchor: 'bottom',
            y: 1.02,
            xanchor: 'right',
            x: 1
        },
        margin: {
            t: margin + 30,
            r: margin,
            l: margin + 10,
            b: margin + 20
        }
    };

    let layout1 = Object.assign({}, commonLayout, {
        title: '每日訊息數',
        yaxis: { title: '訊息數', showgrid: false, zeroline: false }
    });

    let layout2 = Object.assign({}, commonLayout, {
        title: '各自訊息數',
        yaxis: { title: '訊息數', showgrid: false, zeroline: false }
    });

    let layout3 = Object.assign({}, commonLayout, {
        title: '每日通話秒數',
        yaxis: { title: '秒', showgrid: false, zeroline: false }
    });

    if (document.getElementById('allMessage')) Plotly.newPlot('allMessage', [allMessage], layout1, { displayModeBar: false, responsive: true });
    if (document.getElementById('memberMessage')) Plotly.newPlot('memberMessage', memberMessage, layout2, { displayModeBar: false, responsive: true });
    if (document.getElementById('callTime')) Plotly.newPlot('callTime', [callTime], layout3, { displayModeBar: false, responsive: true });

    // Force a resize event shortly after rendering to fix incorrect widths caused by transition animations
    setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
    setTimeout(() => window.dispatchEvent(new Event('resize')), 500);
}
