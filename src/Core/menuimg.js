const axios = require('axios');

const IMAGE_URLS = [
       'https://i.ibb.co/qL6ZC4fW/Xploader1.jpg',
       'https://i.ibb.co/hxRfBdrB/Xploader2.jpg',
       'https://i.ibb.co/yndVvFvm/Xploader3.jpg',
       'https://i.ibb.co/ZRd6nc1c/Xploader4.jpg',
       'https://i.ibb.co/36CQBhD/Xploader5.jpg'
];

const IGNORED_URLS = [
    "https://example.com/image1.jpg",
    "https://example.com/image2.png"
];

async function getBuffer(url, options = {}) {
    try {
        const res = await axios.get(url, {
            headers: {
                'DNT': 1,
                'Upgrade-Insecure-Requests': 1
            },
            ...options,
            responseType: 'arraybuffer'
        });
        return res.data;
    } catch (err) {
        console.error("Failed to fetch buffer from URL:", url);
        return null;
    }
}

async function getMenuImage() {
    if (typeof global.menuimage === 'string') {
        global.menuimage = global.menuimage.split(',').map(url => url.trim());
    }

    if (Array.isArray(global.menuimage)) {
        const validUrls = global.menuimage.filter(url => 
            url && !IGNORED_URLS.includes(url)
        );

        if (validUrls.length > 0) {
            const randomUrl = validUrls[Math.floor(Math.random() * validUrls.length)];
            const buffer = await getBuffer(randomUrl);
            if (buffer) return buffer;
        }
    }

    const randomDefaultUrl = IMAGE_URLS[Math.floor(Math.random() * IMAGE_URLS.length)];
    return await getBuffer(randomDefaultUrl);
}

module.exports = { getMenuImage };