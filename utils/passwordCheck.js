// utils/passwordCheck.js

// 判断是否是简单连续字符串，如 "123456", "abcdef", "ABCDEF" 等
function isSimpleSequence(pwd) {
    const sequences = ["123456", "abcdef", "ABCDEF"];
    return sequences.some(seq => pwd.includes(seq));
}

// 判断是否符合自定义规则：长度>=6，包含大小写字母和数字
function isStrongPassword(pwd) {
    if (pwd.length < 6) return false;

    // 至少包含1个数字、1个大写字母、1个小写字母
    const hasDigit = /[0-9]/.test(pwd);
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);

    return hasDigit && hasUpper && hasLower;
}

module.exports = {
    isSimpleSequence,
    isStrongPassword
};
