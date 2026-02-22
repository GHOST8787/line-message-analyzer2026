const fs = require('fs');

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

function isSystemMessage(name) {
    if (!name) return true;
    const sysKeywords = ["已收回", "收回訊息", "邀請", "加入", "退出", "更改了群組圖片", "通話", "相簿", "群組名稱", "已讓", "離開"];
    for (let k of sysKeywords) {
        if (name.includes(k)) return true;
    }
    return false;
}

function addTime(splited, timeObj) {
    if (splited.length === 2) {
        timeObj.sec += parseInt(splited[1]) || 0;
        timeObj.min += parseInt(splited[0]) || 0;
    }
    else if (splited.length === 3) {
        timeObj.sec += parseInt(splited[2]) || 0;
        timeObj.min += parseInt(splited[1]) || 0;
        timeObj.hour += parseInt(splited[0]) || 0;
    }
    timeObj.calls++;
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

function parseLine(line) {
    let parts = line.split('\t');

    if (parts.length < 3 && line.trim().length > 0 && !line.includes('\t')) {
        let timeRegex = /^(\u4e0a\u5348|\u4e0b\u5348)?\s*([0-9]{1,2}:[0-9]{1,2})\s*(AM|PM|am|pm)?/i;
        let timeMatch = line.match(timeRegex);
        if (timeMatch) {
            let timeStr = timeMatch[0];
            let rest = line.substring(timeStr.length).replace(/^\s+/, '');
            let firstSpaceIdx = rest.indexOf(' ');
            if (firstSpaceIdx !== -1) {
                let nameStr = rest.substring(0, firstSpaceIdx);
                let msgStr = rest.substring(firstSpaceIdx + 1);

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

console.log("Reading test data...");
let filePath = 'TEST/[LINE]老弟.txt';
let fIndex = process.argv.indexOf('-f');
if (fIndex > -1 && process.argv.length > fIndex + 1) {
    filePath = process.argv[fIndex + 1];
}
const content = fs.readFileSync(filePath, 'utf8');
AppState.lines = content.split(/\r?\n/);
AppState.length = AppState.lines.length;

const dateRegex = new RegExp("^([0-9]{4})([./]{1})([0-9]{1,2})([./]{1})([0-9]{1,2})");
const messageRegex = new RegExp("^(\\u4e0a\\u5348|\\u4e0b\\u5348)?\\s*([0-9]{1,2}):([0-9]{1,2})\\s*(AM|PM|am|pm)?$", "i");

for (let i = 0; i < AppState.length; i++) {
    let currentLine = AppState.lines[i];
    if (dateRegex.test(currentLine.substring(0, 10))) {
        AppState.totalDays++;
    }

    let parts = parseLine(currentLine);

    if (parts.length >= 3 && messageRegex.test(parts[0].trim())) {
        let membername = parts[1].trim();
        let msg = parts[2].trim();

        if (membername !== undefined && membername !== "") {
            let isUnsent = false;
            if (msg.includes("已收回訊息") || msg.includes("收回訊息")) {
                AppState.unsent++;
                isUnsent = true;
            }

            if (!isUnsent && !AppState.members.includes(membername) && !isSystemMessage(membername)) {
                AppState.members.push(membername);
                AppState.memberStats[membername] = { messages: 0, stickers: 0, photos: 0 };
            }

            if (!isUnsent) {
                let isCallLine = getCallTime(parts, AppState.dayTime);
                getCallTime(parts, AppState.time);

                if (!isCallLine && !isSystemMessage(membername)) {
                    if (AppState.memberStats[membername]) {
                        AppState.memberStats[membername].messages++;
                    }
                    AppState.messageNumAll++;
                    AppState.totalMessages++;
                }
            }
        }
    }

    if (parts.length >= 3 && messageRegex.test(parts[0].trim())) {
        let msg = parts[2].trim();
        let msgMember = parts[1].trim();
        if (AppState.memberStats[msgMember]) {
            if (msg.startsWith("[貼圖]") || msg.startsWith("[Sticker]") || msg === "貼圖" || msg === "貼圖\t")
                AppState.memberStats[msgMember].stickers++;
            else if (msg.startsWith("[照片]") || msg.startsWith("[Photo]") || msg === "圖片" || msg === "照片" || msg === "圖片\t" || msg === "照片\t")
                AppState.memberStats[msgMember].photos++;
        }
    }
}

adjustTime(AppState.time);

console.log("=== PARSING RESULTS ===");
console.log("Total Days:", AppState.totalDays);
console.log("Total Messages:", AppState.totalMessages);
console.log("Total Unsent:", AppState.unsent);
console.log("Total Calls:", AppState.time.calls);
console.log(`Total Call Time: ${AppState.time.hour}h ${AppState.time.min}m ${AppState.time.sec}s`);
console.log("Members:", AppState.members);

let sortedKeys = Object.keys(AppState.memberStats).sort((a, b) => AppState.memberStats[b].messages - AppState.memberStats[a].messages);
for (let m of sortedKeys) {
    let stat = AppState.memberStats[m];
    let pct = AppState.totalMessages > 0 ? (stat.messages / AppState.totalMessages * 100).toFixed(1) : 0;
    console.log(`\n--- Member: ${m} ---`);
    console.log(`% Total Messages: ${pct}%`);
    console.log(`Messages (all): ${stat.messages}`);
    console.log(`Stickers: ${stat.stickers}`);
    console.log(`Photos:   ${stat.photos}`);
}
