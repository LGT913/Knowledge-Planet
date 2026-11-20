---
title: "HTML拓展"
date: 2023-09-26
planet: system
tags: ["Java", "基础", HTML拓展, system]
summary: "<audio：用于播放声音，比如音乐或其他音频流，是 HTML 5 的新标签。"
private: false
---

## HTML拓展

### 音频标签

`<audio>`：用于播放声音，比如音乐或其他音频流，是 HTML 5 的新标签。

常用属性：

| 属性名   | 取值     | 描述                                                         |
| -------- | -------- | ------------------------------------------------------------ |
| src      | URL      | 音频资源的路径                                               |
| autoplay | autoplay | 音频准备就绪后自动播放                                       |
| controls | controls | 显示控件，比如播放按钮。                                     |
| loop     | loop     | 表示循环播放                                                 |
| preload  | preload  | 音频在页面加载时进行预加载。<br />如果使用 "autoplay"，则忽略该属性。 |

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>HTML5媒体标签-音频audio</title>
</head>
<body>
    <audio src="media/horse.ogg" controls>
        你的浏览器不支持 audio 标签。
    </audio>
</body>
</html>


***



### 视频标签

`<video>` 标签用于播放视频，比如电影片段或其他视频流，是 HTML 5 的新标签。

常用属性：

| 属性名   | 取值     | 描述                                                         |
| -------- | -------- | ------------------------------------------------------------ |
| src      | *URL*    | 要播放的视频的 URL。                                         |
| width    |          | 设置视频播放器的宽度。                                       |
| height   |          | 设置视频播放器的高度。                                       |
| autoplay | autoplay | 视频在就绪后自动播放。                                       |
| control  | controls | 显示控件，比如播放按钮。                                     |
| loop     | loop     | 如果出现该属性，则当媒介文件完成播放后再次开始播放。         |
| preload  | preload  | 视频在页面加载时进行加载。<br />如果使用 "autoplay"，则忽略该属性。 |
| mute     | muted    | 规定视频的音频输出应该被静音。                               |
| poste    | *URL*    | 视频下载时显示的图像，或者视频播放前显示的图像。             |

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>HTML5媒体标签-视频video</title>
</head>
<body>

    <video src="media/movie.ogg" controls>
        你的浏览器不支持 video 标签
    </video>

</body>
</html>
```

![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Web/HTML标签video.png)



***



### 回到顶部

在html里面锚点的作用: 通过a标签跳转到指定的位置.

```html
<a href="#aId">回到顶部</a>
```

<!DOCTYPE html>
<html lang="en">
    <a href="#aId">回到顶部</a>



### 详情概要

summary标签来描述概要信息, 利用details标签来描述详情信息. 默认情况下是折叠展示, 想看见详情必须点击

```html
<details>
    <summary>概要信息</summary>
        详情信息
</details>
```

<details>
    <summary>概要信息</summary>
    详情信息
</details>





***





# CSS
