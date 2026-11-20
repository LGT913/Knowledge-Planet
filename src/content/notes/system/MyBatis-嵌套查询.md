---
title: "嵌套查询"
date: 2023-09-26
planet: system
tags: ["Java", "基础", 嵌套查询, system]
summary: ""
private: false
---

### 嵌套查询

子查询：

```java
public class Blog {
    private int id;
    private String msg;
    private Author author;
    // set + get
}
```

```xml
<resultMap id="blogResult" type="Blog" autoMapping = "true">
    <association property="author" column="author_id" javaType="Author" select="selectAuthor"/>
</resultMap>

<select id="selectBlog" resultMap="blogResult">
    SELECT * FROM BLOG WHERE ID = #{id}
</select>

<select id="selectAuthor" resultType="Author">
    SELECT * FROM AUTHOR WHERE ID = #{id}
</select>
```

循环引用：通过缓存解决

```xml
<resultMap id="blogResult" type="Blog" autoMapping = "true">
    <id column="id" property="id"/>
    <collection property="comment" ofType="Comment">
        <association property="blog" javaType="Blog" resultMap="blogResult"/><!--y-->
    </collection>
</resultMap
```





****
