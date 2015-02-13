### 说明

由于最近在学习NodeJS及其HTTP相关的内容，所以基于网易云音乐API分析（见参考链接）编写了一个网易云音乐下载器，纯粹是为了熟悉node及几个相关的包如[async](https://github.com/caolan/async), [request](https://github.com/request/request), [q](https://github.com/kriskowal/q)等的使用。

TODO(s):    

1. 状态进度条显示
2. 异步式非阻塞请求（目前似乎网易云音乐只允许一个下载时间段内发一个请求）
3. 用Promise重构
4. 抽象出公共的SDK部分，使得抽象的代码能够更广泛地被复用

### 参考链接

* [网易云音乐API分析](https://github.com/yanunon/NeteaseCloudMusic/wiki/%E7%BD%91%E6%98%93%E4%BA%91%E9%9F%B3%E4%B9%90API%E5%88%86%E6%9E%90)

