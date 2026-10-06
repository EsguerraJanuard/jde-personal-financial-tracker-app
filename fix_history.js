const fs = require('fs');

// Fix HistoryClient.tsx
let historyContent = fs.readFileSync('src/components/HistoryClient.tsx', 'utf-8');
const historyTarget = "} else if (tx.type === 'INCOME_SPLIT' || tx.type === 'INCOME_DIRECT' || tx.type === 'MANUAL_ADJUSTMENT') {";
const historyReplacement = "} else if (tx.type === 'INCOME_SPLIT' || tx.type === 'INCOME_DIRECT') {\n       const w = tx.wallet_ledger?.find(l => l.amount > 0);\n       amount = w ? w.amount : 0;\n       color = 'text-green-500';\n       sign = '+';\n       if (!tx.description) title = tx.type === 'INCOME_SPLIT' ? 'Split Income' : 'Direct Income';\n     } else if (tx.type === 'MANUAL_ADJUSTMENT') {\n       const wPos = tx.wallet_ledger?.find(l => l.amount > 0);\n       const wNeg = tx.wallet_ledger?.find(l => l.amount < 0);\n       if (wNeg && !wPos) {\n         amount = Math.abs(wNeg.amount);\n         color = 'text-orange-400';\n         sign = '-';\n         if (!tx.description) title = 'Balance Adjustment';\n       } else {\n         amount = wPos ? wPos.amount : 0;\n         color = 'text-green-500';\n         sign = '+';\n         if (!tx.description) title = 'Direct Income';\n       }\n     ";

// We will find the target and replace the block up to the next else if
let startIdx = historyContent.indexOf(historyTarget);
if (startIdx !== -1) {
    let endIdx = historyContent.indexOf("} else if (tx.type === 'EXPENSE') {", startIdx);
    if (endIdx !== -1) {
        historyContent = historyContent.substring(0, startIdx) + historyReplacement + historyContent.substring(endIdx);
        fs.writeFileSync('src/components/HistoryClient.tsx', historyContent);
        console.log("HistoryClient.tsx fixed");
    } else {
        console.log("Could not find EXPENSE block in HistoryClient");
    }
} else {
    console.log("Could not find target block in HistoryClient");
}

// Fix TransactionDetailsModal.tsx
let modalContent = fs.readFileSync('src/components/TransactionDetailsModal.tsx', 'utf-8');
const modalTarget = "} else if (tx.type === 'INCOME_SPLIT' || tx.type === 'INCOME_DIRECT' || tx.type === 'MANUAL_ADJUSTMENT') {";
const modalReplacement = "} else if (tx.type === 'INCOME_SPLIT' || tx.type === 'INCOME_DIRECT') {\n     const w = tx.wallet_ledger?.find((l: any) => l.amount > 0);\n     mainAmount = w ? w.amount : 0;\n     color = 'text-green-500';\n     typeLabel = tx.type === 'INCOME_SPLIT' ? 'Split Income' : 'Direct Income';\n     toWallet = dWallet?.name || 'Unknown';\n  } else if (tx.type === 'MANUAL_ADJUSTMENT') {\n     const wPos = tx.wallet_ledger?.find((l: any) => l.amount > 0);\n     const wNeg = tx.wallet_ledger?.find((l: any) => l.amount < 0);\n     if (wNeg && !wPos) {\n       mainAmount = Math.abs(wNeg.amount);\n       color = 'text-orange-400';\n       typeLabel = 'Balance Adjustment';\n       fromWallet = sWallet?.name || 'Unknown';\n     } else {\n       mainAmount = wPos ? wPos.amount : 0;\n       color = 'text-green-500';\n       typeLabel = 'Direct Income';\n       toWallet = dWallet?.name || 'Unknown';\n     }\n  ";

let mStartIdx = modalContent.indexOf(modalTarget);
if (mStartIdx !== -1) {
    let mEndIdx = modalContent.indexOf("} else if (tx.type === 'EXPENSE') {", mStartIdx);
    if (mEndIdx !== -1) {
        modalContent = modalContent.substring(0, mStartIdx) + modalReplacement + modalContent.substring(mEndIdx);
        fs.writeFileSync('src/components/TransactionDetailsModal.tsx', modalContent);
        console.log("TransactionDetailsModal.tsx fixed");
    } else {
        console.log("Could not find EXPENSE block in Modal");
    }
} else {
    console.log("Could not find target block in Modal");
}
