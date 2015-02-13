function encrype_id(song_id) {
    var buf1 = new Buffer('3go8&$8*3*3h0k(2)2'), len1 = buf1.length,
        buf2 = new Buffer('' + song_id), len2 = buf2.length;
    for (var i = 0; i < len2; i++) {
        buf2[i] = buf2[i] ^ buf1[i % len1];
    }
    var md5 = require('crypto').createHash('md5');
    md5.update(buf2);
    var res = md5.digest('base64').toString();

    res = res.replace(/\//g, '_');
    res = res.replace(/\+/g, '-');

    return res;
}

// NOTE: DO NOT OVERWRITE EXISTING KEY/VALUE
function extend(src, dst) {
    dst = dst || {};
    for (key in src) {
        if (src.hasOwnProperty(key)) {
            var value = src[key];
            if (typeof value === 'string') {
                dst[key] = dst[key] || value;
            } else if (Array.isArray(value)) {
                // TODO: not support yet
                return;
            } else {
                dst[key] = dst[key] || {};
                extend(value, dst[key]);
            }
        }
    }
    return dst;
}

exports.encrype_id = encrype_id;
exports.extend = extend;
