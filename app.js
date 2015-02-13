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
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'en-US,en;q=0.8,zh-CN;q=0.6,zh;q=0.4',
        'User-Agent': 'neteasy-music-downloader',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
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

var callbacks = {
    'song': function (json, folder) {
        var song_list = json.songs;
        if ((json.songCount === 0 && !song_list) || song_list.length === 0) {
            console.log('[WARNINGO]:', '啥也没搜到……');
        } else {
            console.log('[INFO]:', '共搜到' + json.songCount + '首歌');
            song_list.forEach(function (song, index) {
                console.log(index, "    ", song.name);
                var option = {
                    path: '/api/song/' + song.id,
                    method: 'GET'
                };
                option = utility.extend(app_config, option);

                http.request(option, function (res) {
                    console.log(res.statusCode);
                }).on('error', function (err) {
                    console.log(err);
                }).end();
            });
        }
    },
    'album': function (json, folder) {
        var album_list = json.albums;
        if ((json.albumCount === 0 && !album_list) || album_list.length === 0) {
            console.log('[WARNINGO]:', '啥也没搜到……');
        } else {
            console.log('[INFO]:', '共搜到' + json.albumCount + '个专辑');
            album_list.forEach(function (album, index) {
                console.log(index, ":\t", album.name);
                fetch_album(album.id).then(function (album_info) {
                    var songs = album_info.songs;
                    songs.forEach(function (song) {
                        download_song(song, folder);
                    });
                }, function (err) {
                    console.error('[ERROR]:', err);
                });
            });
        }
    }
};

function album_callback() {

}

// TODO: 如何消除循环中出现的层层异步回调？
function download_album_by_search(keyword, type, folder) {
    type = type || 1;
    folder = folder || "./";
    search_album(keyword, type).then(function (json) {
        callbacks[type](json, folder);
    }, function (err) {
        console.error('[ERROR]:', err);
    });
    return;
}

function search_album(keyword, type) {
    var defer = q.defer();
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
            console.log(res.statusCode);
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

            // TODO: remove this line since it's for debug only
            fs.writeFile('search-example-' + keyword + '.json', buf, function (err) {
            });

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
        var filestream = fs.createWriteStream(task.folder + '/' + task.songname + "." + task.extension);
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
function download_song(song, folder) {
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
        extension: music.extension,
        folder: folder
    }, function (err) {
        if (err) {
            console.log('下载出错', err);
        } else {
            console.log('\n成功下载歌曲 ', song.name, '\n');
        }
    });
}

download_album_by_search('棋子', 'song')
