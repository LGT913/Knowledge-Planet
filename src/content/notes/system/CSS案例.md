---
title: "CSS案例"
date: 2023-09-26
planet: system
tags: ["Java", "基础", CSS案例, system]
summary: "/中间表单样式/ .center{     background: white;      /背景色/     width: 40%;             /宽度/     margin: auto;           /水平居中外边"
private: false
---

## CSS案例

```css
/*背景图片*/
body{
    background: url("../img/bg.png");
}

/*中间表单样式*/
.center{
    background: white;      /*背景色*/
    width: 40%;             /*宽度*/
    margin: auto;           /*水平居中外边距*/
    margin-top: 100px;      /*上外边距*/
    border-radius: 15px;    /*边框弧度*/
    text-align: center;     /*文本水平居中*/
}

/*表头样式*/
thead th{
    font-size: 30px;    /*字体大小*/
    color: orangered;   /*字体颜色*/
}

/*表体提示信息样式*/
tbody label{
    font-size: 20px;    /*字体大小*/
}

/*表体输入框样式*/
tbody input{
    border: 1px solid gray; /*边框*/
    border-radius: 5px;     /*边框弧度*/
    width: 90%;             /*输入框的宽度*/
    height: 40px;           /*输入框的高度*/
    outline: none;          /*取消轮廓的样式*/
}

/*表底确定按钮样式*/
tfoot button{
    border: 1px solid crimson;  /*边框*/
    border-radius: 5px;         /*边框弧度*/
    width: 95%;                 /*宽度*/
    height: 40px;               /*高度*/
    background: crimson;        /*背景色*/
    color: white;               /*文字的颜色*/
    font-size: 20px;            /*字体大小*/
}

/*表行高度*/
tr{
    line-height: 60px;  /*行高*/
}

/*底部页脚样式*/
.footer{
    width: 35%; /*宽度*/
    margin: auto;   /*水平居中外边距*/
    font-size: 15px;    /*字体大小*/
    color: gray;    /*字体颜色*/
}

/*超链接样式*/
a{
    text-decoration: none;  /*去除超链接的下划线*/
    color: blue;            /*超链接颜色*/
}
```

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>登录页面</title>
    <link rel="stylesheet" href="../css/login.css"/>
</head>
<body>
    <!--顶部公司图标-->
    <div>
        <img src="../img/logo.png"/>
    </div>

    <!--中间表单-->
    <div class="center">
        <form action="#" method="get" autocomplete="off">
            <table width="100%">
                <thead>
                    <tr>
                        <th colspan="2">账&nbsp;密&nbsp;登&nbsp;录<hr/></th>
                    </tr>
                </thead>

                <tbody>
                    <tr>
                        <td>
                            <label for="username">账号</label>
                        </td>
                        <td>
                            <input type="text" id="username" name="username" placeholder=" 请输入账号" required/>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <label for="password">密码</label>
                        </td>
                        <td>
                            <input type="password" id="password" name="password" placeholder=" 请输入密码" required/>
                        </td>
                    </tr>
                </tbody>

                <tfoot>
                    <tr>
                        <td colspan="2">
                            <button type="submit">确&nbsp;定</button>
                        </td>
                    </tr>
                </tfoot>
            </table>
        </form>
    </div>

    <!--底部页脚-->
    <div class="footer">
        <br/><br/>
        登录/注册即表示您同意&nbsp;&nbsp;
        <a href="#" target="_blank">用户协议</a>&nbsp;&nbsp;
        和&nbsp;&nbsp;
        <a href="#" target="_blank">隐私条款</a>&nbsp;&nbsp;&nbsp;&nbsp;
        <a href="#" target="_blank">忘记密码?</a>
    </div>
</body>
</html>
```







***





# HTTP
