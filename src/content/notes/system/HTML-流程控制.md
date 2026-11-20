---
title: "流程控制"
date: 2023-09-26
planet: system
tags: ["Java", "基础", 流程控制, system]
summary: ""
private: false
---

### 流程控制

* **if语句**

  ```js
  let month = 3;
  if(month >= 3 && month <= 5) {
      document.write("春季");
  }else if(month >= 6 && month <= 8) {
      document.write("夏季");
  }else if(month == 12 || month == 1 || month == 2) {
      document.write("冬季");
  }else {
      document.write("月份有误");
  }
  
  document.write("<br>");
  ```

* **switch语句**

  ```js
  switch(sex){
      case 1:
          document.write("男性");
          break;
      case 2:
          document.write("女性");
          break;
      default:
          document.write("性别有误");
          break;
  }
  ```

* **for循环**

  ```js
  for(let i = 1; i <= 5; i++) {
      document.write(i + "<br>");
  }
  ```

* **while循环**

  ```js
  let n = 6;
  while(n <= 10) {
      document.write(n + "<br>");
      n++;
  }
  ```




***
