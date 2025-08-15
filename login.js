// 檔案路徑: /api/login.js

module.exports = (req, res) => {
    // 設定 CORS 標頭
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: '僅允許 POST 方法' });
    }

    const { password } = req.body;
    const correctPassword = process.env.APP_PASSWORD;

    if (!correctPassword) {
        console.error('Security Error: APP_PASSWORD environment variable is not set.');
        return res.status(500).json({ success: false, message: '伺服器設定錯誤。' });
    }

    if (password === correctPassword) {
        res.status(200).json({ success: true });
    } else {
        res.status(401).json({ success: false, message: '密碼錯誤。' });
    }
};