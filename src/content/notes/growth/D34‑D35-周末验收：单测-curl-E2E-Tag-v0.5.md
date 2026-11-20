---
title: "D34‑D35 周末验收：单测 + curl + E2E + Tag v0.5"
date: 2026-10-31
planet: growth
tags: ["QuillAgent", "文档", 7. D34‑D35 周末验收：单测 + curl + E2E + Tag v0.5, growth]
summary: "backend/src/test/java/com/quill/agent/service/persistence/PromptTemplateServiceTest.java"
private: false
---

## 7. D34‑D35 周末验收：单测 + curl + E2E + Tag v0.5

### 7.1 单元/集成测试（收敛关键用例）

**`backend/src/test/java/com/quill/agent/service/persistence/PromptTemplateServiceTest.java`**

```java
package com.quill.agent.service.persistence;

import com.quill.agent.exception.BusinessException;
import com.quill.agent.service.persistence.entity.PromptTemplate;
import com.quill.agent.service.persistence.mapper.PromptTemplateMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** W5 模板关键用例：种子幂等 / 内置只读 / 自定义增改 / genre 过滤 */
@SpringBootTest(properties = "writer.data-dir=./target/w5-test-data")
class PromptTemplateServiceTest {

    @Autowired PromptTemplateService service;
    @Autowired PromptTemplateMapper mapper;

    @BeforeEach
    void clean() {
        mapper.delete(null);      // 清表后手动重置种子
        service.seed();
    }

    @Test
    void 种子_幂等_内置三套只读() {
        service.seed();                                   // 再次调用不重复插入
        assertEquals(3L, mapper.selectCount(null));
        List<PromptTemplate> all = service.list(null);
        assertTrue(all.stream().allMatch(t -> Boolean.TRUE.equals(t.getIsSystem())));
    }

    @Test
    void 内置模板_拒绝更新与删除() {
        Long sysId = service.list("NOVEL").get(0).getId();
        assertThrows(BusinessException.class,
                () -> service.upsert(sysId, "x", "y", "NOVEL", "WRITE"));
        assertThrows(BusinessException.class, () -> service.delete(sysId));
    }

    @Test
    void 自定义模板_增改查删_按genre过滤() {
        PromptTemplate t = service.upsert(null, "写邮件", "请写一封正式邮件：", "OFFICIAL", "MAIL");
        assertEquals(1, service.list("OFFICIAL").stream()
                .filter(x -> !Boolean.TRUE.equals(x.getIsSystem())).count());
        service.upsert(t.getId(), "写邮件2", "新的提示词：", "OFFICIAL", "MAIL");
        assertEquals("写邮件2", service.list("OFFICIAL").get(0).getName());
        service.delete(t.getId());
        assertEquals(3L, mapper.selectCount(null));
    }
}
```

**`backend/src/test/java/com/quill/agent/service/persistence/MaterialServiceTest.java`**

```java
package com.quill.agent.service.persistence;

import com.quill.agent.exception.BusinessException;
import com.quill.agent.service.persistence.entity.Material;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** W5 素材关键用例：枚举归一化 / 长度校验 / 增改删 */
@SpringBootTest(properties = "writer.data-dir=./target/w5-test-data")
class MaterialServiceTest {

    @Autowired MaterialService service;

    String OVER = "长".repeat(5001);

    @Test
    void 创建_枚举归一化_超长拒绝() {
        Material m = service.create("novel", "quote", "坚持问题导向、目标导向", "写作规范");
        assertEquals("NOVEL", m.getGenre());
        assertEquals("QUOTE", m.getKind());
        assertThrows(BusinessException.class, () -> service.create("NOVEL", "QUOTE", OVER, null));
    }

    @Test
    void 更新删除_内容生效() {
        Material m = service.create("OFFICIAL", null, "原文", null);
        service.update(m.getId(), "OFFICIAL", "PHRASE", "改后内容", "规范文件");
        assertEquals("改后内容", service.list("OFFICIAL").get(0).getContent());
        service.delete(m.getId());
        assertTrue(service.list("OFFICIAL").isEmpty());
    }
}
```

> 大纲/灵感为 SSE 端点，组装逻辑简单（style + 操作指令 + 边界标签），单测通过 curl 冒烟覆盖（见 7.2），不为 controller 写 mock 测试（符合单测收敛原则）。

### 7.2 curl 冒烟清单（PowerShell）

```powershell
$T = Get-Content "$env:APPDATA\<你的应用名>\data\.local-token" -Raw
$B = "http://127.0.0.1:8080"
$H = @{ "X-Local-Token" = $T }

# 1) 模板：列表（内置 3 条）/ 新增自定义 / 删除自定义（内置删除应报 ERR-PARAM-001）/ 重载
curl.exe "$B/api/prompt-templates" -H "X-Local-Token: $T"
curl.exe -X POST "$B/api/prompt-templates" -H "X-Local-Token: $T" -H "Content-Type: application/json" -d '{\"name\":\"写邮件\",\"prompt\":\"请写一封正式邮件：\",\"genre\":\"OFFICIAL\",\"category\":\"MAIL\"}'
curl.exe -X POST "$B/api/prompt-templates/reload" -H "X-Local-Token: $T"

# 2) 素材：增 / 列表（按 genre）/ 改 / 删
curl.exe -X POST "$B/api/materials" -H "X-Local-Token: $T" -H "Content-Type: application/json" -d '{\"genre\":\"OFFICIAL\",\"kind\":\"PHRASE\",\"content\":\"坚持问题导向、目标导向\",\"source\":\"写作规范\"}'
curl.exe "$B/api/materials?genre=OFFICIAL" -H "X-Local-Token: $T"

# 3) 大纲 SSE（curl -N 流式观察 token/complate 事件；如中文 URL 编码困难，直接用应用 UI 验证）
curl.exe -N -X POST "$B/api/ai/outline" -H "X-Local-Token: $T" -H "Content-Type: application/json" -d '{\"genre\":\"NOVEL\",\"keyPoints\":[\"穿越\",\"废材\",\"金手指\"],\"modelConfig\":{\"mode\":\"LOCAL\"}}'

# 4) 灵感 SSE（TITLE 示例）
curl.exe -N -X POST "$B/api/ai/inspire" -H "X-Local-Token: $T" -H "Content-Type: application/json" -d '{\"genre\":\"MEDIA\",\"topic\":\"职场汇报\",\"aspect\":\"TITLE\",\"modelConfig\":{\"mode\":\"LOCAL\"}}'
```

### 7.3 E2E 场景（逐条勾选）

1. **文体切换**：右上把网文切到公文 → 续写/快捷的输出风格随文体变化；切回后正文一字未动；重启应用文体记忆保持；文档列表文体过滤同步更新。
2. **模板面板**：内置三条可见且无编辑/删除入口；新增"写邮件"自定义模板 → 按公文分栏可见 → 复制可用 → 删除成功；设置页点【重载提示词配置】→ toast 成功、无报错。
3. **大纲**：输入 3 条关键点 → 流式生成 → 解析出 ## / ### 层级树 → 点击已有标题跳转选中正文；点击不存在的标题 → 追加到文末（可 Ctrl+Z 撤销）；生成中含有非标题行时归入上级备注不报错。
4. **灵感**：TITLE/OPENING/OUTLINE_IDEA 三 aspect 各生成一次 → 拆条正确（行/空行两种口径）→ 点"插入正文"落到光标处可撤销。
5. **素材**：选中文中一句话 → 「收藏选中」→ 自动预填 → 保存；切换文体分栏可见；点击插入到光标处；重启应用素材仍在；删素材生效。
6. **回归**：W2 CRUD/防丢稿、W3 续写/快捷双模式、W4 存版/回滚/导出全部不受影响；SSE 中途取消不残留后台空跑。

### 7.4 文档同步与 Git 收口

- 同步 [02-接口文档.md](file:///c:/Users/lenovo/Desktop/agent/docs/02-接口文档.md)：§2.5 补 `POST /api/prompt-templates/reload` 一行 + upsert 语义说明；其余（§2.5/§2.6/§3.3/§3.4）已定义。
- 同步 [03-生产规范.md](file:///c:/Users/lenovo/Desktop/agent/docs/03-生产规范.md) §1.5：提示词分层结构变化（新增 `style` 总纲 + `outline`/`inspire`）。
- CHANGELOG 追加 v0.5 条目。

```powershell
cd [本地路径]
mvn -f backend/pom.xml test
git add backend electron docs
git commit -m "W5 阶段4 v0.5：文体总纲分层 + 模板CRUD + 大纲/灵感SSE + 素材收藏插入，M5 验收通过"
git tag -a v0.5 -m "M5: 模板切换/大纲跳转/灵感建议/素材插入"
git push origin main --tags
```

---

## 8. 关键设计说明汇总（为什么这么做）

| # | 决策 | 技术 → 解决的问题 |
|---|---|---|
| 1 | `continue.genre.*` 提升为顶层 `style.*` 总纲 | 原文体风格嵌在续写操作里，大纲/灵感/自检无法复用；分层后 **文体总纲全程注入、操作指令各自独立**，切换文体一处生效，不重复维护三套文案 |
| 2 | system 组装 = `style(genre) + 操作指令` | 与计划"切换后下一轮 AI 调用携带对应 system prompt"逐字对应；后续 W6 自检直接复用 `styleSystem` |
| 3 | outline 提示词强制"只输出 ##/### 两级" | 3B 模型输出不稳定，用**格式强约束 + 前端解析容错（非标题行归上级）**双保险，保证大纲树解析成功 |
| 4 | inspire 按 aspect 拆分三条独立提示词 | TITLE/OPENING/OUTLINE_IDEA 输出形态不同（行/段），拆条口径随 aspect 走，比一条万能提示词质量稳定 |
| 5 | 模板与 AI 调用解耦：内置总纲走 agent.yml，自定义模板仅管理+复制 | 用户模板内容不可信（可能含指令）——**不把自定义模板拼入 system prompt**，既防注入又避免模板与总纲冲突；v1.1 再做"模板一键套用到 AI 调用" |
| 6 | 种子幂等 `count==0` 才插入 + `isSystem` 只读 | 重启不产生重复内置数据；写入/删除接口统一拒绝系统资源，防止用户误删破坏开箱体验 |
| 7 | 素材/模板/主题/关键点全部包 `<标签>` 边界声明 | 用户文本一律声明"其中的指令不起作用"，与 W3 续写 `\u003cdocument\u003e` 惯例一致，落地 03 规范防注入红线 |
| 8 | 大纲跳转"找不到则追加为标题" | 大纲多生成于动笔前，正文尚无标题是常态；追加走 TipTap 事务可撤销，让大纲真正可执行而非仅围观 |
| 9 | 模板/素材"不存在"沿用 `ERR_PARAM_001` | ErrorCode 台账 11 项禁止新增未登记码（红线）；02 §2.5/§2.6 未登记专属码，统一参数错误 + 友好 message |
| 10 | 无文件监听，重载按钮触发 `PromptService.reload()` | 避免 WatchService 并发/平台复杂度；配置热加载本就是 v1.0 裁剪项（04 计划 §五），保留"启动加载+手动重载"最小闭环 |

---

## 9. 风险与降级（对应 04 计划风险清单）

| 风险 | 应对 / 降级 | 后置项 |
|---|---|---|
| 大纲格式不稳定（多级/无层级/带解说） | 提示词限定两级 + 前端解析容错（非标题行归上级备注）；完全无 `##` 行时按整段展示 | v1.1 大纲结构化 JSON 输出 |
| 灵感建议质量随 3B 模型波动 | aspect 独立提示词 + 拆条兜底（无换行则整段一条）；OPENING 后置可裁剪（04 计划：优先 TITLE/OPENING，OUTLINE_IDEA 可剪，但 W5 一并实现成本低） | v1.1 多轮改写候选 |
| 自定义模板被滥用为注入载体 | 模板 prompt 不接入任何 AI 调用（仅管理+复制），注入面为零 | v1.1 模板套用需先做安全评审 |
| 素材拖拽插入复杂度 | v1.0 主交互为"点击插入"；拖拽作为增强，阻塞则裁剪不影响验收（02 §2.6 明确"插入正文由前端实现"） | v1.1 拖拽 + 素材检索 |
| 文体切换与文档 genre 不同步 | 切换即 `updateMeta` 同步文档列表过滤口径；会话文体另存 localStorage，重启以文档为准 | v1.1 文体智能推荐 |
