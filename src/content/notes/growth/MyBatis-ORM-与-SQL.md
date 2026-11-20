---
title: "MyBatis ORM 与 SQL"
date: 2026-07-09
planet: growth
tags: ["面试", "复习", 二、MyBatis ORM 与 SQL, growth]
summary: "问题本身：  问：你项目里 SQL 参数是用 {} 还是 ${}？为什么？  追问：两者底层实现有什么不同？  追问：什么时候必须用 ${}？"
private: false
---

## 二、MyBatis ORM 与 SQL

### 问题 3：#{} 和 ${} 有什么区别？

**问题本身**：
> 问：你项目里 SQL 参数是用 #{} 还是 ${}？为什么？
> 追问：两者底层实现有什么不同？
> 追问：什么时候必须用 ${}？

**为什么要这么做**：
- `#{}` 是预编译，安全防 SQL 注入
- `${}` 是字符串拼接，有注入风险
- 需要动态表名、排序字段时必须用 `${}`

**具体怎么做**：

| 对比项 | #{} | ${} |
|--------|-----|-----|
| 处理方式 | 预编译（PreparedStatement） | 字符串拼接 |
| SQL注入 | 无 | 有风险 |
| 适用场景 | 参数传递（WHERE条件值） | 动态表名、排序字段 |
| 底层 | `?` 占位符 | 直接替换 |

**项目实战**：
- 所有参数用 `#{}`，如 `WHERE id = #{id}`
- 排序字段用 `${}`，但后端写死枚举值，如 `ORDER BY ${sortField} ${order}`，不存在注入风险

**如何验证**：
1. 用 `#{}` 传参，观察 SQL 日志中参数用 `?` 占位
2. 尝试用 SQL 注入字符串测试，验证被转义
3. 用 `${}` 传排序字段，观察 SQL 日志中直接替换

---

### 问题 4：resultType 和 resultMap 有什么区别？

**问题本身**：
> 问：你项目里 MyBatis 查询用的是 resultType 还是 resultMap？为什么？

**为什么要这么做**：
- resultType 自动映射，开发效率高
- resultMap 手动映射，适合复杂场景（列名不一致、关联查询）

**具体怎么做**：
- **resultType**：要求数据库列名和 Java 字段名一致，或通过 `map-underscore-to-camel-case=true` 自动转驼峰
- **resultMap**：手动配置映射关系，用于一对一/一对多关联查询

**项目实战**：
- 项目开启 `map-underscore-to-camel-case: true`
- 大部分查询用 resultType 自动映射
- 复杂关联查询（如快递员+订单）才用 resultMap

**如何验证**：
1. 查看 application.yml，确认 `map-underscore-to-camel-case` 配置
2. 写一个查询，确认数据库下划线命名的字段能正确映射到 Java 驼峰字段
3. 写一个关联查询，确认 resultMap 能正确映射关联对象

---
