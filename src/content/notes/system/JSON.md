---
title: "JSON"
date: 2023-09-26
planet: system
tags: ["Java", "基础", JSON, system]
summary: "JSONJavaScript Object Notation：是一种轻量级的数据交换格式。"
private: false
---

### JSON

#### JSON入门

JSON(JavaScript Object Notation)：是一种轻量级的数据交换格式。

- 基于 ECMAScript 规范的一个子集，采用完全独立于编程语言的文本格式来存储和表示数据
- 简洁和清晰的层次结构使得 JSON 成为理想的数据交换语言，易于人阅读和编写，同时也易于计算机解析和 生成，并有效的提升网络传输效率。

* 创建格式：
  **name是字符串类型**
  ![](https://seazean.oss-cn-beijing.aliyuncs.com/img/Web/JSON创建格式.png)

* json常用方法

  | 方法            | 说明                           |
  | --------------- | ------------------------------ |
  | stringify(对象) | 将指定对象转换为json格式字符串 |
  | parse(字符串)   | 将指定json格式字符串解析成对象 |

* 入门案例

  ```js
   //定义天气对象
  let weather = {
      city : "北京",
      date : "2088-08-08",
      wendu : "10° ~ 23°",
  };
  
  //1.将天气对象转换为JSON格式的字符串
  let str = JSON.stringify(weather);
  document.write(str + "<br>");
  
  //2.将JSON格式字符串解析成JS对象
  let weather2 = JSON.parse(str);
  document.write("城市：" + weather2.city + "<br>");
  ```

  



***



#### 转换工具

我们除了可以在 JavaScript 中来使用 JSON 以外，在 JAVA 中同样也可以使用 JSON。

JSON 的转换工具是通过 JAVA 封装好的一些 JAR 工具包，可以将 JAVA 对象或集合转换成 JSON 格式的字符串，也可以将 JSON 格式的字符串转成 JAVA 对象。

Jackson：开源免费的 JSON 转换工具，SpringMVC 转换默认使用 Jackson。

* 常用类

  | 类名          | 说明                                                         |
  | ------------- | ------------------------------------------------------------ |
  | ObjectMapper  | 是Jackson工具包的核心类，提供方法来实现JSON字符串和对象之间的转换 |
  | TypeReference | 对集合泛型的反序列化，使用TypeReference可以明确的指定反序列化的对象类型 |

* ObjectMapper常用方法

  | 方法                                                     | 说明                       |
  | -------------------------------------------------------- | -------------------------- |
  | String writeValueAsString(Object obj)                    | 将Java对象转换成JSON字符串 |
  | <T> T readValue(String json, Class<T> valueType)         | 将JSON字符串转换成Java对象 |
  | <T> T readValue(String json, TypeReference valueTypeRef) | 将JSON字符串转换成Java对象 |



方法练习：

* 对象转 JSON，JSON 转对象

  ```java
  public void test01() throws Exception{
      //User对象转json
      User user = new User("张三",23);
      String json = mapper.writeValueAsString(user);
      System.out.println("json字符串：" + json//json字符串 = {"name":"张三","age":23}
      //json转User对象
      User user2 = mapper.readValue(json, User.class);
      System.out.println("user对象：" + user2);//user对象 = User{name='张三', age=23}
  }
  ```

* Map转 JSON，JSON 转 Map

  ```java
  public void test02() throws Exception{
      //map<String,String>转json
      HashMap<String,String> map = new HashMap<>();
      map.put("姓名","张三");
      map.put("性别","男");
      String json = mapper.writeValueAsString(map);
      System.out.println("json字符串：" + json);
  
      //json转map<String,String>
      HashMap<String,String> map2 = mapper.readValue(json, HashMap.class);
      System.out.println("map对象：" + map2);
  }
  //json字符串 = {"姓名":"张三","性别":"男"}
  //map对象 = {姓名=张三, 性别=男}
  ```

* Map转 JSON，JSON 转 Map<自定义类>

  ```java
  public void test03() throws Exception{
      //map<String,User>转json
      HashMap<String,User> map = new HashMap<>();
      map.put("sea一班",new User("张三",23));
      map.put("sea二班",new User("李四",24));
      String json = mapper.writeValueAsString(map);
      System.out.println("json字符串：" + json);
  
      //json转map<String,User>
      HashMap<String,User> map2=mapper.readValue(json,
                                   new TypeReference<HashMap<String,User>>(){});
      System.out.println("java对象：" + map2);
  }
  //json字符串 = {"sea一班":{"name":"张三","age":23},"sea二班":{....}
  //map对象 = {sea一班=User{name='张三', age=23}, sea二班=User{name='李四', age=24}}
  ```

* List

  ```java
  public void test05() throws Exception{
      //List<User>转json
      ArrayList<User> list = new ArrayList<>();
      list.add(new User("张三",23));
      list.add(new User("李四",24));
      String json = mapper.writeValueAsString(list);
      System.out.println("json字符串：" + json);
  
      //json转List<User>
      ArrayList<User> list2 = mapper.readValue(json,
  								new TypeReference<ArrayList<User>>(){});
      System.out.println("java对象：" + list2);
  }
  //json字符串 = [{"name":"张三","age":23},{"name":"李四","age":24}]
  //list对象 = [User{name='张三', age=23}, User{name='李四', age=24}]
  ```




***
