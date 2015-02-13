// https://github.com/yanunon/NeteaseCloudMusic/wiki/%E7%BD%91%E6%98%93%E4%BA%91%E9%9F%B3%E4%B9%90API%E5%88%86%E6%9E%90

var http = require('http'),
    fs = require('fs'),
    url = require('url'),
    async = require('async'),
    querystring = require('querystring'),
    q = require('q'),
    util = require('util'),
    utility = require('./lib/utility');
var statusLog = require('single-line-log').stdout;

var app_config = {
    hostname: 'music.163.com',
    method: 'GET',
    headers: {
        'Accept':'application/json',
        'User-Agent': 'neteasy-music-downloader',
        'Cookie': 'appver=2.0.2',
        'Referer': 'http://music.163.com'
    }
};


var ENUM_TYPE = {
    'song': 1,
    'album': 10,
    'singer': 100,
    'playlist': 1000,
    'user': 1002
};

// TODO: 如何消除循环中出现的层层异步回调？
function download_album_by_search(keyword, folder) {
    folder = folder || "./";
    search_album(keyword).then(function (json) {
        var album_list = json.albums;
        if (album_list.length === 0) {
            console.log('[WARNINGO]:', 'NOTHING FOUND');
        } else {
            album_list.forEach(function (album) {
                fetch_album(album.id).then(function (album_info) {
                    var songs = album_info.songs;
                    songs.forEach(function (song) {
                        download_song(song);
                    });
                }, function (err) {
                    console.error('[ERROR]:', err);
                });
            });
        }
    }, function (err) {
        console.error('[ERROR]:', err);
    });
    return;
}

function search_album(keyword) {
    var defer = q.defer();
    var type = 'album';
    var query = {
        's': keyword,
        'type': ENUM_TYPE[type], // 指明是搜索album
        'offset': 0,
        'sub': 'false',
        'limit': 10
    };

    var option = {
        path: '/api/search/get',
        headers: {
            'Content-Length': querystring.stringify(query).length,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        method: 'POST'
    };
    option = utility.extend(app_config, option);

    var req = http.request(option, function (res) {
        if (res.statusCode !== 200) {
            return;
        }
        var buf = [];

        res.on('error', function (err) {
            defer.reject(err);
        });
        res.on('data', function (chunk) {
            buf.push(chunk);
        });
        res.on('end', function () {
            buf = Buffer.concat(buf);
            // fs.writeFile('search-example-' + keyword + '.json', buf, function (err) {
            // });
            var json = res.body = JSON.parse(buf.toString());
            if (json.code !== 200) {
                defer.reject(new Error('获取信息代码有误'));
                return;
            }
            defer.resolve(json.result);
        });
    }).on('error', function (err) {
        defer.reject(new Error('获取搜索信息 - 请求出错'));
    });

    req.write(querystring.stringify(query));

    req.end();
    return defer.promise;
}

function fetch_album(album_id) {
    var defer = q.defer();
    var option = {
        path: '/api/album/' + album_id,
        method: 'GET'
    };
    option = utility.extend(app_config, option);

    var req = http.request(option, function (res) {
        if (res.statusCode !== 200) {
            return;
        }

        var buf = [];
        res.on('error', function (err) {
            defer.reject(err);
        });
        res.on('data', function (chunk) {
            buf.push(chunk);
        });
        res.on('end', function () {
            buf = Buffer.concat(buf);
            // fs.writeFile('album-example-' + album_id + '.json', buf, function (err) {
            // });
            var json = res.body = JSON.parse(buf.toString());
            if (json.code !== 200) {
                defer.reject(new Error('获取信息代码有误'));
                return;
            }
            defer.resolve(json.album);
        });
    }).on('error', function (err) {
        defer.reject(new Error('获取专辑信息 - 请求出错'));
    });

    req.end();

    return defer.promise;
}

var queue = async.queue(function (task, callback) {
    var option = task.option;
    console.log('开始下载歌曲 ', task.songname);
    var req = http.get('http://' + option.hostname + '/' + option.path, function (res) {
        var size = 0;
        if (res.statusCode !== 200) {
            callback(new Error('[ERROR]: FAILED DOWNLOAD DUE TO INCORRECT STATUS CODE ' + task.songname + ' ' + res.statusCode));
            return;
        }
        var filestream = fs.createWriteStream('songs/' + task.songname + "." + task.extension);
        filestream.on('finish', function () {
            callback();
        });
        res.on('data', function (chunk) {
            size += chunk.length;
            statusLog('Downloading [' + (100 * size  / task.size).toFixed(2) + '%] data');
        });
        res.on('error', function (err) {
            callback(new Error('[ERROR]: response error when trying to download ' + task.songname));
        }).pipe(filestream).on('error', function () {
            callback(new Error('[ERROR]: 歌曲存盘错误 ' + task.songname));
        });
    }).on('error', function (err) {
        callback(new Error('[ERROR]: 下载歌曲时请求有误 ' + task.songname));
    });
    req.end();
}, 1);

var iter = 0;
// TODO: 有些歌曲无法成功下载
function download_song(song) {
    var music = song.lMusic;
    var id = music.dfsId; // || (song.hMusic && song.hMusic.dfsId) || (song.mMusic && song.mMusic.dfsId);
    var encryped_id = utility.encrype_id(id);

    var option = {
        hostname: util.format('m%d.music.126.net', iter % 2 + 1),
        path: encryped_id + '/' + id + '.mp3',
        method: 'GET'
    };

    iter += 1;      // FOR DEBUG USAGE
    queue.push({
        option: option, 
        songname: song.name,
        size: music.size,
        extension: music.extension
    }, function (err) {
        if (err) {
            console.log('下载出错', err);
        } else {
            console.log('\n成功下载歌曲 ', song.name, '\n');
        }
    });
}

download_album_by_search('eason')
